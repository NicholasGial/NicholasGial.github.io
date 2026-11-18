import * as THREE from 'three';
import {EffectComposer} from './vendor/postprocessing/EffectComposer.js';
import {RenderPass} from './vendor/postprocessing/RenderPass.js';
import {UnrealBloomPass} from './vendor/postprocessing/UnrealBloomPass.js';
import {OutputPass} from './vendor/postprocessing/OutputPass.js';

// A schematic of logical-qubit teleportation by lattice surgery, following arXiv:2611.23165.
// It shows the code layout and the order of the protocol steps; it is not a simulation, and the
// timing, glow and the way the state "spreads" are illustrative.
//
// Layout: a 3×7 rotated surface code, 21 data + 20 auxiliary qubits (12 X-type, 8 Z-type), all in
// one plane. Data columns 0–2 and 4–6 are the two distance-3 patches, column 3 is the seam.
// Auxiliary qubits sit at plaquette centres; weight-2 ones sit half a cell outside the boundary.
export const CAMERA = {fov: 30, position: [6.9, 7.3, 12.4], target: [-1.7, -1.2, 0]};
export const STEPS = [
  'Prepare the target patch in the logical state |0⟩',
  'Merge: measure the joint logical operator X⊗X of the two patches',
  'Split: read out the three seam data qubits',
  'Measure logical Z on the source patch',
  'The state is on the target patch, up to a Pauli frame update'
];

export function layout() {
  const data = [];
  for (let c = 0; c < 7; c++) for (let r = 0; r < 3; r++) data.push({x: c - 3, z: r - 1, c, seam: c === 3});
  const q = (c, r) => c * 3 + r;
  const plaqs = [];
  // A weight-2 stabilizer is a triangle: edge midpoint (ex, ez), auxiliary half a cell away in the
  // direction given by rot (0 points to -z).
  const tri = (ex, ez, rot) => ({x: ex - 3, z: ez - 1, rot});
  const aux = t => [t.x - Math.sin(t.rot) * .5, t.z - Math.cos(t.rot) * .5];
  const role = cx => cx < 2.4 ? 'left' : cx > 3.6 ? 'right' : null;
  for (let c = 0; c < 6; c++) for (let r = 0; r < 2; r++) {
    const type = (c + r) % 2 === 0 ? 'X' : 'Z', qubits = [q(c, r), q(c + 1, r), q(c, r + 1), q(c + 1, r + 1)];
    const p = {type, qubits, half: false, split: null, tri: null, x: c - 2.5, z: r - .5, role: role(c + .5) ?? 'seam'};
    // The two Z-type auxiliaries next to the seam belong to a patch: weight-2 while the patches
    // are separate, weight-4 once the seam data qubits join.
    if (c === 2 && type === 'Z') Object.assign(p, {role: 'left', split: [q(2, r), q(2, r + 1)], tri: tri(2, r + .5, -Math.PI / 2)});
    if (c === 3 && type === 'Z') Object.assign(p, {role: 'right', split: [q(4, r), q(4, r + 1)], tri: tri(4, r + .5, Math.PI / 2)});
    plaqs.push(p);
  }
  const boundary = (type, qubits, t) => { const [x, z] = aux(t); plaqs.push({type, qubits, half: true, split: null, tri: t, x, z, role: role(t.x + 3) ?? 'seam'}); };
  for (const c of [1, 3, 5]) boundary('X', [q(c, 0), q(c + 1, 0)], tri(c + .5, 0, 0));
  for (const c of [0, 2, 4]) boundary('X', [q(c, 2), q(c + 1, 2)], tri(c + .5, 2, Math.PI));
  boundary('Z', [q(0, 0), q(0, 1)], tri(0, .5, Math.PI / 2));
  boundary('Z', [q(6, 1), q(6, 2)], tri(6, 1.5, -Math.PI / 2));
  return {data, plaqs};
}

const clamp = x => Math.min(1, Math.max(0, x));
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const bump = x => Math.sin(Math.PI * x);
const rand = i => { const s = Math.sin(i * 127.1 + 11.7) * 43758.5453; return s - Math.floor(s); };

export function createLattice(container, pausedInitially = false, onStep = () => {}) {
  const {data, plaqs} = layout();
  const hero = container.closest('section') ?? container;
  const BG = 0x111614;
  const renderer = new THREE.WebGLRenderer({antialias: true, powerPreference: 'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  // no tone mapping: the canvas background must match the page colour exactly
  container.append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  const camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, .1, 100);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .5, .55, .22);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const assembly = new THREE.Group(); scene.add(assembly);
  const additive = {transparent: true, blending: THREE.AdditiveBlending, depthWrite: false};
  // Plaquette colours follow the paper's figures: X-type blue, Z-type green.
  const XCOL = new THREE.Color('#5d9cc0'), ZCOL = new THREE.Color('#79b88f'), GOLD = new THREE.Color('#e2b574');
  const HOT = new THREE.Color(1, .8, .5), READY = new THREE.Color('#8ea6a2'), IDLE = new THREE.Color('#2c3633'), WIRE = new THREE.Color('#6d7b75'), WHITE = new THREE.Color(1, 1, 1);
  const typeColor = p => p.type === 'X' ? XCOL : ZCOL;

  // soft round sprite, shared by dust and the pool of light under the logical state
  const glowCanvas = document.createElement('canvas'); glowCanvas.width = glowCanvas.height = 64;
  const ctx = glowCanvas.getContext('2d'), gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, '#fff'); gradient.addColorStop(.25, 'rgba(255,255,255,.35)'); gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64);
  const glowTexture = new THREE.CanvasTexture(glowCanvas);

  const dataMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(.085, 24, 16), new THREE.MeshBasicMaterial(), data.length);
  const auxMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(.055, 16, 12), new THREE.MeshBasicMaterial(), plaqs.length);
  for (const mesh of [dataMesh, auxMesh]) { mesh.frustumCulled = false; assembly.add(mesh); }

  const squareGeo = new THREE.PlaneGeometry(.9, .9).rotateX(-Math.PI / 2);
  const triGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([-.45, 0, -.03, .45, 0, -.03, 0, 0, -.47], 3));
  const tile = (p, geometry) => { const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({...additive, color: typeColor(p), side: THREE.DoubleSide})); assembly.add(mesh); return mesh; };
  const squares = plaqs.map(p => p.half ? null : tile(p, squareGeo));
  const triangles = plaqs.map(p => { if (!p.tri) return null; const mesh = tile(p, triGeo); mesh.rotation.y = p.tri.rot; return mesh; });

  // one line per physical data–auxiliary coupling; there are no data–data couplings
  const segments = plaqs.reduce((n, p) => n + p.qubits.length, 0);
  const linePos = new Float32Array(segments * 6), lineCol = new Float32Array(segments * 6);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
  lineGeo.setAttribute('color', new THREE.BufferAttribute(lineCol, 3));
  const lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({...additive, vertexColors: true}));
  lines.frustumCulled = false; assembly.add(lines);

  const pool = new THREE.Mesh(new THREE.PlaneGeometry(7, 7).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({...additive, map: glowTexture, color: GOLD, opacity: .07}));
  pool.position.y = -1.5; assembly.add(pool);

  const dustPos = [];
  for (let i = 0; i < 700; i++) dustPos.push((rand(i) - .5) * 44, (rand(i + .3) - .5) * 20, (rand(i + .7) - .5) * 34 - 6);
  const dust = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(dustPos, 3)),
    new THREE.PointsMaterial({...additive, map: glowTexture, color: 0xcdbf9d, size: .11, opacity: .55}));
  scene.add(dust);

  // per-frame state
  const dataPos = data.map(() => new THREE.Vector3()), level = new Float32Array(data.length);
  const scatter = i => new THREE.Vector3(rand(i + 1) - .5, rand(i + 2) - .35, rand(i + 3) - .5).multiplyScalar(22);
  const dataScatter = data.map((_, i) => scatter(i)), auxScatter = plaqs.map((_, i) => scatter(i + 50));
  const dummy = new THREE.Object3D(), color = new THREE.Color(), tint = new THREE.Color(), v = new THREE.Vector3();
  const wave = (x, z, e) => .04 * Math.sin(e * .9 + x * .7 + z * .9);
  const arrive = (i, e) => 1 - (1 - clamp((e - rand(i + 9) * .9) / 1.7)) ** 3;
  // Seven stabilizer rounds per loop: two while the target patch is prepared, three with the patches
  // merged (the merge round plus two further rounds), two after the split.
  const ROUND = 2.4, T = 7 * ROUND;
  let step = -1;

  function update(e) {
    // One loop teleports the state across; the next loop runs it back the other way.
    const built = ss(1.5, 2.8, e), tc = Math.max(0, e - 2.4), cycle = Math.floor(tc / T), t = tc - cycle * T, dir = cycle % 2 ? -1 : 1;
    const prepared = ss(0, .8, t);                            // target patch initialised in |0>
    const merged = ss(4.8, 5.8, t) * (1 - ss(12, 13, t));    // seam qubits and seam X-stabilizers in use
    const measured = ss(13, 14.2, t);                         // source patch read out
    const source = dir > 0 ? 'left' : 'right';
    const now = t < 4.8 ? 0 : t < 12 ? 1 : t < 13 ? 2 : t < 14.4 ? 3 : 4;
    if (now !== step) onStep(STEPS[step = now]);

    let weight = 0, centre = 0;
    data.forEach((d, i) => {
      const u = dir > 0 ? d.c / 6 : 1 - d.c / 6, inSource = u < .5 && !d.seam, arrives = ss(4.8 + u * 1.4, 5.8 + u * 1.4, t);
      const active = d.seam ? merged : inSource ? 1 - measured : prepared;   // part of an encoded patch
      level[i] = d.seam ? Math.min(arrives, merged) : inSource ? 1 - measured : arrives;   // carries the logical state
      weight += level[i]; centre += level[i] * d.x;
      dataPos[i].set(d.x, wave(d.x, d.z, e), d.z).lerp(dataScatter[i], 1 - arrive(i, e));
      dummy.position.copy(dataPos[i]); dummy.rotation.set(0, 0, 0);
      // readout: the qubit swells and whitens briefly, in a wave across the patch, then goes idle
      const read = d.seam ? bump(ss(11.9, 13.1, t)) : inSource ? bump(ss(12.9 + u * 1.5, 14.1 + u * 1.5, t)) : 0;
      dummy.scale.setScalar((.7 + .3 * active) * (1 + .12 * level[i] + .2 * read) * (1 + .06 * Math.sin(e * 2.2 + i)));
      dummy.updateMatrix(); dataMesh.setMatrixAt(i, dummy.matrix);
      dataMesh.setColorAt(i, color.copy(IDLE).lerp(READY, active).lerp(HOT, level[i]).lerp(WHITE, .45 * read).multiplyScalar(.85 + .2 * level[i]));
    });
    pool.position.x = weight ? centre / weight : 0;
    pool.material.opacity = .07 * built * Math.min(1, weight / 9);

    let k = 0;
    plaqs.forEach((p, i) => {
      const on = p.role === 'seam' ? merged : p.role === source ? 1 - measured : prepared;
      // Pipelined rounds: each type's gates run while the other type's auxiliaries are read out.
      const beat = t / ROUND + (p.type === 'X' ? 0 : .5), f = beat - Math.floor(beat);
      // slow, smooth breathing rather than a flash: gates swell on the couplings, then the auxiliary glows
      const read = (.5 + .5 * Math.cos(2 * Math.PI * f)) ** 2, gates = (.5 + .5 * Math.cos(2 * Math.PI * (f + .3))) ** 2;
      const energy = p.qubits.reduce((sum, j) => sum + level[j], 0) / p.qubits.length;
      v.set(p.x, wave(p.x, p.z, e), p.z).lerp(auxScatter[i], 1 - arrive(i + 30, e));
      dummy.position.copy(v); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(.75 + .25 * on); dummy.updateMatrix(); auxMesh.setMatrixAt(i, dummy.matrix);
      auxMesh.setColorAt(i, color.copy(IDLE).lerp(tint.copy(typeColor(p)).multiplyScalar(.7 + .4 * read), on));
      for (const j of p.qubits) {
        const used = on * (p.split && !p.split.includes(j) ? merged : 1);
        color.copy(WIRE).multiplyScalar(.16).add(tint.copy(typeColor(p)).multiplyScalar(used * (.22 + .2 * gates) * (.7 + .5 * energy))).multiplyScalar(built);
        linePos.set([v.x, v.y, v.z, dataPos[j].x, dataPos[j].y, dataPos[j].z], k);
        lineCol.set([color.r, color.g, color.b, color.r, color.g, color.b], k); k += 6;
      }
      const glow = on * built * (.1 + .04 * read + .1 * energy);
      if (squares[i]) { squares[i].position.set(p.x, wave(p.x, p.z, e), p.z); squares[i].material.opacity = glow * (p.split ? merged : 1); }
      if (triangles[i]) { triangles[i].position.set(p.tri.x, wave(p.tri.x, p.tri.z, e), p.tri.z); triangles[i].material.opacity = glow * (p.split ? 1 - merged : 1); }
    });
    for (const mesh of [dataMesh, auxMesh]) { mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true; }
    lineGeo.attributes.position.needsUpdate = true; lineGeo.attributes.color.needsUpdate = true;

    // camera: slow dolly-in on arrival, then pointer, drag and scroll steer the sculpture
    const scroll = clamp(scrollY / (hero.offsetHeight || 1));
    yaw += (px * .22 + drag + Math.sin(e * .11) * .09 + scroll * .7 - yaw) * .05;
    pitch += (py * .09 + scroll * .22 - pitch) * .05;
    if (!dragging) drag *= .94;
    assembly.rotation.set(pitch, yaw, 0);
    assembly.position.y = scroll * 1.4;
    camera.position.fromArray(CAMERA.position).multiplyScalar(reach * (1.35 - .35 * (1 - (1 - clamp(e / 3)) ** 3)));
    camera.lookAt(...(narrow ? [0, -.2, 0] : CAMERA.target));
    dust.rotation.y = e * .012 + px * .03;
  }

  // start past the entrance when motion is off, so the still frame is the composed one
  let paused = pausedInitially, visible = true, lost = false, elapsed = pausedInitially ? 6 : 0, last = 0, slowFrames = 0, frameCount = 0;
  let px = 0, py = 0, yaw = 0, pitch = 0, drag = 0, dragging = false, narrow = false, reach = 1;
  function draw(time = 0) {
    const delta = last ? Math.min((time - last) / 1000, .05) : 0; last = time;
    if (!paused) elapsed += delta;
    update(elapsed); composer.render();
    if (!paused && delta > .03) slowFrames++;
    // ponytail: one-step quality drop for slow GPUs; add finer tiers if real devices need them
    if (++frameCount === 180 && slowFrames > 90) { renderer.setPixelRatio(1); bloom.enabled = false; resize(); }
  }
  function resize() {
    const {width, height} = container.getBoundingClientRect(); if (!width || !height) return;
    renderer.setSize(width, height, false); composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(width, height);
    narrow = width < 760; camera.aspect = width / height;
    reach = narrow ? Math.max(.8, 1 / camera.aspect) : Math.max(1, 1.25 / camera.aspect);
    camera.updateProjectionMatrix(); draw();
  }
  function sync() { last = 0; renderer.setAnimationLoop(!paused && visible && !document.hidden && !lost ? draw : null); if (!lost) draw(); }
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, {rootMargin: '100px'}); observer.observe(container);
  const resizer = new ResizeObserver(resize); resizer.observe(container);
  const onMove = e => { if (e.pointerType !== 'mouse') return; px = e.clientX / innerWidth - .5; py = e.clientY / innerHeight - .5; if (dragging) drag += e.movementX * .004; };
  const onUp = () => { dragging = false; container.classList.remove('dragging'); };
  document.addEventListener('visibilitychange', sync);
  addEventListener('pointermove', onMove); addEventListener('pointerup', onUp);
  container.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || paused) return; dragging = true; container.classList.add('dragging'); e.preventDefault(); });
  renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); lost = true; renderer.setAnimationLoop(null); container.parentElement.classList.remove('ready'); });
  renderer.domElement.addEventListener('webglcontextrestored', () => { lost = false; resize(); container.parentElement.classList.add('ready'); sync(); });
  resize(); container.parentElement.classList.add('ready'); sync();
  return {
    setPaused(value) { paused = value; if (paused) elapsed = Math.max(elapsed, 6); sync(); },
    dispose() {
      renderer.setAnimationLoop(null); observer.disconnect(); resizer.disconnect();
      document.removeEventListener('visibilitychange', sync); removeEventListener('pointermove', onMove); removeEventListener('pointerup', onUp);
      scene.traverse(object => { object.geometry?.dispose(); for (const material of [object.material ?? []].flat()) material.dispose(); });
      glowTexture.dispose(); composer.dispose(); renderer.dispose(); renderer.domElement.remove();
    }
  };
}
