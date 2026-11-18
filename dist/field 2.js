import * as THREE from 'three';
// same version suffix as this module was loaded with, so the browser shares one copy of scene.js
const {layout} = await import('./scene.js' + new URL(import.meta.url).search);

// A cloud of points that settles into one of a few physical pictures and morphs between them.
// Each shape is a function (i, t, position, colour) for point i at time t.
const SIDE = 104, COUNT = SIDE * SIDE, RANGE = 3.4, SCALE = .62;
const rand = (i, k) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };
const GOLD = [1, .78, .46], BLUE = [.36, .61, .75], GREEN = [.47, .72, .56], PEARL = [.56, .65, .64], DIM = [.13, .17, .16];
const LOGICAL_Z = [.15, 1, .4], LOGICAL_X = [.15, .5, 1];
const mix = (c, a, b, t) => c.setRGB(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
const phase = i => [((i % SIDE) / (SIDE - 1) - .5) * 2 * RANGE, (Math.floor(i / SIDE) / (SIDE - 1) - .5) * 2 * RANGE];
// phase-space sheets fade out towards a round edge
const edge = (x, y) => { const r = clamp((Math.hypot(x, y) - 2.3) / 1.1); return 1 - r * r * (3 - 2 * r); };
const clamp = v => Math.min(1, Math.max(0, v));
const pulse = (t, offset) => Math.max(0, Math.sin(t * .6 + offset)) ** 1.5;

// One distance-3 patch taken from the hero layout: 9 data qubits, 4 X-type and 4 Z-type auxiliaries.
const patch = (() => {
  const {data, plaqs} = layout(), S = 1.45;
  const qubits = data.filter(d => d.c < 3).map(d => ({x: (d.x + 2) * S, z: d.z * S, row: d.z, col: d.c}));
  const stabs = plaqs.filter(p => p.role === 'left').map(p => ({x: (p.x + 2) * S, z: p.z * S, type: p.type, qubits: p.split ?? p.qubits}));
  const links = stabs.flatMap(s => s.qubits.map(j => ({s, q: qubits[j]})));   // patch data indices are 0–8
  return {qubits, stabs, links};
})();

export const SHAPES = {
  // Logical Z (a row) and logical X (a column) light up in turn.
  code: {
    caption: 'A distance-three rotated surface code: nine data qubits, four X-type and four Z-type stabilizers. Highlighted in turn: a logical Z (Z on a row of three data qubits) and a logical X (X on a column of three).',
    point(i, t, p, c) {
      const a = rand(i, 1), b = rand(i, 2), d = rand(i, 3);
      if (i < 3420) {
        // The qubits of the highlighted logical operator grow and take a saturated colour; the rest stay
        // dim, because hundreds of overlapping additive points would otherwise wash out to white.
        const q = patch.qubits[i % 9], z = q.row === 0 ? pulse(t, 0) : 0, x = q.col === 1 ? pulse(t, Math.PI) : 0, lit = Math.max(z, x);
        const r = .2 * (1 + .7 * lit) * Math.cbrt(a), th = b * 6.283, ph = Math.acos(2 * d - 1);
        p.set(q.x + r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), q.z + r * Math.sin(ph) * Math.sin(th));
        mix(c, PEARL, z > x ? LOGICAL_Z : LOGICAL_X, lit).multiplyScalar(.3 + .5 * lit);
      } else if (i < 5500) {
        const s = patch.stabs[i % 8], r = .13 * Math.cbrt(a), th = b * 6.283, ph = Math.acos(2 * d - 1);
        p.set(s.x + r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), s.z + r * Math.sin(ph) * Math.sin(th));
        c.setRGB(...(s.type === 'X' ? BLUE : GREEN)).multiplyScalar(.75);
      } else if (i < 9100) {
        const l = patch.links[i % patch.links.length];
        p.set(l.s.x + (l.q.x - l.s.x) * a, (b - .5) * .03, l.s.z + (l.q.z - l.s.z) * a);
        c.setRGB(...(l.s.type === 'X' ? BLUE : GREEN)).multiplyScalar(.45);
      } else {
        // a faint fill inside each stabilizer's plaquette: the auxiliary plus two of its data qubits
        const s = patch.stabs[i % 8], q1 = patch.qubits[s.qubits[Math.floor(a * s.qubits.length)]], q2 = patch.qubits[s.qubits[Math.floor(b * s.qubits.length)]];
        const u = d, w = rand(i, 4) * (1 - u);
        p.set(s.x + (q1.x - s.x) * u + (q2.x - s.x) * w, -.02, s.z + (q1.z - s.z) * u + (q2.z - s.z) * w);
        c.setRGB(...(s.type === 'X' ? BLUE : GREEN)).multiplyScalar(.28);
      }
    }
  },
  // W(x,p) of |α> + e^{iφ}|−α>, α = 1.9: two coherent lobes and interference fringes that go negative.
  cat: {
    caption: 'Wigner function of the cat state |α⟩ + e^iφ |−α⟩ with α = 1.9 and a slowly varying phase φ. Blue marks the negative values in the interference fringes.',
    point(i, t, p, c) {
      const [x, y] = phase(i), A = 1.9;
      const w = Math.exp(-2 * ((x - A) ** 2 + y * y)) + Math.exp(-2 * ((x + A) ** 2 + y * y)) + 2 * Math.exp(-2 * (x * x + y * y)) * Math.cos(4 * A * y - t * .35);
      p.set(x * SCALE, w * .95, y * SCALE);
      mix(c, DIM, w > 0 ? GOLD : BLUE, Math.min(1, Math.abs(w) * 2.4)).multiplyScalar(edge(x, y) * 1.25);
    }
  },
  // W(x,p) of squeezed vacuum (r = 0.7), slowly rotating in phase space.
  squeezed: {
    caption: 'Wigner function of squeezed vacuum with squeezing parameter r = 0.7 (about 6 dB), the squeezing angle slowly rotating. The ring is the vacuum state’s contour at 1/e of the peak.',
    point(i, t, p, c) {
      const [x, y] = phase(i), R = .7, co = Math.cos(t * .22), si = Math.sin(t * .22), u = x * co + y * si, v = y * co - x * si;
      const w = Math.exp(-2 * (u * u * Math.exp(2 * R) + v * v * Math.exp(-2 * R)));
      p.set(x * SCALE, w * 1.7, y * SCALE);
      mix(c, DIM, GOLD, Math.min(1, w * 2.2)).multiplyScalar(edge(x, y) * 1.25);
    }
  },
  // A Bloch sphere with a precessing state vector.
  qubit: {
    caption: '',
    point(i, t, p, c) {
      const a = rand(i, 1), b = rand(i, 2), R = 1.65, k = i % 20;
      if (k < 12) { const y = 1 - 2 * a, r = Math.sqrt(1 - y * y), th = b * 6.283; p.set(r * Math.cos(th), y, r * Math.sin(th)).multiplyScalar(R); c.setRGB(...DIM).multiplyScalar(1.6); }
      else if (k < 15) { const th = a * 6.283, ring = i % 3; p.set(Math.cos(th), ring === 0 ? 0 : Math.sin(th), ring === 0 ? Math.sin(th) : 0).multiplyScalar(R); if (ring === 2) p.set(0, p.y, p.x); c.setRGB(...PEARL).multiplyScalar(.6); }
      else if (k < 17) { const axis = i % 3, s = (a * 2 - 1) * R; p.set(axis === 0 ? s : 0, axis === 1 ? s : 0, axis === 2 ? s : 0); c.setRGB(...PEARL).multiplyScalar(.35); }
      else {
        const th = 1.05, ph = t * .5, tip = k === 19 && b < .5, s = tip ? 1 : a;
        p.set(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)).multiplyScalar(R * s);
        if (tip) p.x += (rand(i, 3) - .5) * .16, p.y += (rand(i, 4) - .5) * .16, p.z += (rand(i, 5) - .5) * .16;
        c.setRGB(...GOLD).multiplyScalar(tip ? 1 : .7);
      }
    }
  }
};

// background: the colour of the section behind the canvas. An opaque canvas avoids the dark halo
// that additive points leave on a transparent one.
export function createField(container, names, pausedInitially = false, background = 0x111614) {
  const renderer = new THREE.WebGLRenderer({antialias: true, powerPreference: 'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(background);
  container.append(renderer.domElement);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(32, 1, .1, 50), group = new THREE.Group();
  scene.add(group);
  const sprite = document.createElement('canvas'); sprite.width = sprite.height = 32;
  const ctx = sprite.getContext('2d'), gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, '#fff'); gradient.addColorStop(.4, 'rgba(255,255,255,.5)'); gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 32, 32);
  const texture = new THREE.CanvasTexture(sprite);
  const additive = {transparent: true, blending: THREE.AdditiveBlending, depthWrite: false};
  const positions = new Float32Array(COUNT * 3), colours = new Float32Array(COUNT * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({...additive, map: texture, vertexColors: true, size: .085}));
  points.frustumCulled = false; group.add(points);
  // vacuum reference for the squeezed state: the vacuum Wigner function's 1/e contour, radius 1/√2
  const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({length: 96}, (_, i) => new THREE.Vector3(Math.cos(i / 96 * 6.283), 0, Math.sin(i / 96 * 6.283)).multiplyScalar(Math.SQRT1_2 * SCALE))),
    new THREE.LineBasicMaterial({...additive, color: 0x9fb4c0, opacity: 0}));
  ring.position.y = 1.7 / Math.E; group.add(ring);

  const p = new THREE.Vector3(), c = new THREE.Color();
  let active = 0, paused = pausedInitially, visible = false, lost = false, elapsed = 3, last = 0, snap = true, px = 0, py = 0;
  function draw(time = 0) {
    const delta = last ? Math.min((time - last) / 1000, .05) : 0; last = time;
    if (!paused) elapsed += delta;
    const shape = SHAPES[names[active]];
    for (let i = 0; i < COUNT; i++) {
      shape.point(i, elapsed, p, c);
      // each point travels at its own pace, so shapes dissolve into one another
      const k = snap ? 1 : 1 - Math.exp(-delta * (1.5 + 5 * rand(i, 9))), j = i * 3;
      positions[j] += (p.x - positions[j]) * k; positions[j + 1] += (p.y - positions[j + 1]) * k; positions[j + 2] += (p.z - positions[j + 2]) * k;
      colours[j] += (c.r - colours[j]) * k; colours[j + 1] += (c.g - colours[j + 1]) * k; colours[j + 2] += (c.b - colours[j + 2]) * k;
    }
    snap = false;
    geometry.attributes.position.needsUpdate = true; geometry.attributes.color.needsUpdate = true;
    ring.material.opacity += ((names[active] === 'squeezed' ? .55 : 0) - ring.material.opacity) * (paused ? 1 : .06);
    group.rotation.y = elapsed * .1 + px * .5; group.rotation.x = py * .2;
    renderer.render(scene, camera);
  }
  function resize() {
    const {width, height} = container.getBoundingClientRect(); if (!width || !height) return;
    renderer.setSize(width, height, false); camera.aspect = width / height;
    camera.position.set(0, 4, 7.7).multiplyScalar(Math.max(1, 1 / camera.aspect)); camera.lookAt(0, .25, 0);
    camera.updateProjectionMatrix(); draw();
  }
  function sync() { last = 0; renderer.setAnimationLoop(!paused && visible && !document.hidden && !lost ? draw : null); if (!lost && visible) draw(); }
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, {rootMargin: '100px'}); observer.observe(container);
  new ResizeObserver(resize).observe(container);
  document.addEventListener('visibilitychange', sync);
  addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { px = e.clientX / innerWidth - .5; py = e.clientY / innerHeight - .5; } });
  renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); lost = true; renderer.setAnimationLoop(null); });
  renderer.domElement.addEventListener('webglcontextrestored', () => { lost = false; snap = true; resize(); sync(); });
  resize();
  return {
    setActive(index) { if (index === active) return; active = index; if (paused) { snap = true; if (visible) draw(); } },
    setPaused(value) { paused = value; sync(); }
  };
}
