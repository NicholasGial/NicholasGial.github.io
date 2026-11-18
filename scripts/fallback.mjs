// Still fallback for the hero: the two patches before the merge (source holding the state, target
// prepared, seam idle), drawn from the same layout and camera as dist/scene.js.
import * as THREE from 'three';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {layout, CAMERA} from '../dist/scene.js';
const W = 1094, H = 810, XCOL = '#5d9cc0', ZCOL = '#79b88f', IDLE = '#3a4743';
const camera = new THREE.PerspectiveCamera(CAMERA.fov, W / H, .1, 100);
camera.position.fromArray(CAMERA.position); camera.lookAt(...CAMERA.target); camera.updateMatrixWorld();
const p = (x, z) => { const q = new THREE.Vector3(x, 0, z).project(camera); return [((q.x + 1) * W / 2).toFixed(1), ((1 - q.y) * H / 2).toFixed(1)]; };
const {data, plaqs} = layout();

// The layout must be the code in the paper: 21 data qubits, 12 X-type and 8 Z-type auxiliaries,
// 12 weight-4 and 8 weight-2 stabilizers, each separate patch with 4 X and 4 Z, all commuting.
const count = f => plaqs.filter(f).length;
assert.deepEqual([data.length, count(q => q.type === 'X'), count(q => q.type === 'Z'), count(q => !q.half), count(q => q.half), count(q => q.role === 'seam' && q.type === 'X')], [21, 12, 8, 12, 8, 4]);
for (const side of ['left', 'right']) assert.deepEqual([count(q => q.role === side && q.type === 'X'), count(q => q.role === side && q.type === 'Z')], [4, 4]);
for (const a of plaqs) for (const b of plaqs) if (a.type !== b.type) {
  assert.equal(a.qubits.filter(j => b.qubits.includes(j)).length % 2, 0, 'merged stabilizers must commute');
  if (a.role !== 'seam' && a.role === b.role) assert.equal((a.split ?? a.qubits).filter(j => (b.split ?? b.qubits).includes(j)).length % 2, 0, 'patch stabilizers must commute');
}

const out = [];
for (const q of plaqs) {
  const active = q.role !== 'seam', color = q.type === 'X' ? XCOL : ZCOL, [ax, ay] = p(q.x, q.z);
  if (active) {
    let points;
    if (q.tri) { const s = Math.sin(q.tri.rot), c = Math.cos(q.tri.rot); points = [[-.45, -.03], [.45, -.03], [0, -.47]].map(([u, v]) => p(q.tri.x + u * c + v * s, q.tri.z - u * s + v * c)); }
    else points = [[-.45, -.45], [.45, -.45], [.45, .45], [-.45, .45]].map(([u, v]) => p(q.x + u, q.z + v));
    out.push(`<polygon points="${points.map(v => v.join(',')).join(' ')}" fill="${color}" opacity=".22"/>`);
  }
  for (const j of q.qubits) {
    const used = active && (q.split ?? q.qubits).includes(j), [dx, dy] = p(data[j].x, data[j].z);
    out.push(`<line x1="${ax}" y1="${ay}" x2="${dx}" y2="${dy}" stroke="${used ? color : IDLE}" opacity="${used ? .55 : .7}"/>`);
  }
  out.push(`<circle cx="${ax}" cy="${ay}" r="4" fill="${active ? color : IDLE}"/>`);
}
for (const d of data) {
  const [cx, cy] = p(d.x, d.z), color = d.seam ? IDLE : d.c < 3 ? '#ffd9a0' : '#8ea6a2';
  if (d.c < 3) out.push(`<circle cx="${cx}" cy="${cy}" r="16" fill="${color}" opacity=".25" filter="url(#glow)"/>`);
  out.push(`<circle cx="${cx}" cy="${cy}" r="${d.seam ? 4.5 : 6.5}" fill="${color}"/>`);
}
await writeFile(new URL('../dist/assets/lattice.svg', import.meta.url), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"><defs><filter id="glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="7"/></filter></defs>${out.join('')}</svg>`);
