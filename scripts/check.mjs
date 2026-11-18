import {readFile,access,stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const html=await readFile('dist/index.html','utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(new Set(ids).size,ids.length,'Duplicate HTML IDs');
const refs=[...html.matchAll(/(?:href|src)="([^"]+)"/g)].map(m=>m[1]);
for(const ref of refs){
 if(ref.startsWith('#'))assert(ids.includes(ref.slice(1)),`Missing anchor ${ref}`);
 else if(!/^(https?:|mailto:)/.test(ref))await access(`dist/${ref.split('?')[0]}`);
}
const photos=JSON.parse(await readFile('content/photos.json','utf8'));
assert.equal(new Set(photos.map(p=>p.id)).size,photos.length,'Duplicate photo ids');
assert.deepEqual(JSON.parse(await readFile('dist/photos.json','utf8')),photos,'Published manifest is stale');
assert.equal([...html.matchAll(/data-photo="/g)].length,photos.length,'Gallery and manifest differ');
for(const p of photos){
 assert(html.includes(`data-photo="${p.id}"`),`Missing photo ${p.id}`);
 assert(p.alt?.length>10,`Missing alt text ${p.id}`);
 for(const size of [640,1200,2000])assert((await stat(`dist/assets/${p.id}-${size}.webp`)).size>0);
}
for(const file of ['dist/app.js','dist/scene.js','dist/field.js'])execFileSync(process.execPath,['--check',file]);
const vendor=await readFile('dist/vendor/three.module.min.js','utf8');
assert(vendor.includes('./three.core.min.js'));await access('dist/vendor/three.core.min.js');
console.log(`PASS: ${ids.length} unique anchors, ${refs.length} references, ${photos.length} photographs with 3 sizes, manifest consistency, JavaScript syntax and local Three.js dependency.`);
