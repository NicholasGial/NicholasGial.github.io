import * as THREE from 'three';
import {writeFile} from 'node:fs/promises';
const camera=new THREE.PerspectiveCamera(35,900/700,.1,100);camera.position.set(9,10.2,14.5);camera.lookAt(0,0,0);camera.updateMatrixWorld();
const p=(x,y,z)=>{const q=new THREE.Vector3(x,y,z).project(camera);return [(q.x+1)*450,(1-q.y)*350];};
const fmt=a=>a.map(v=>v.toFixed(2)).join(',');
const lines=[],tiles=[],nodes=[];
function line(a,b,color,opacity=.5){const [x1,y1]=p(...a),[x2,y2]=p(...b);lines.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" opacity="${opacity}"/>`);}
for(let patch=0;patch<2;patch++){
 const ox=patch===0?-4.6:.6;const color=patch===0?'#d8b681':'#77a2b9';
 for(let x=0;x<4;x++)for(let z=0;z<4;z++)tiles.push(`<polygon points="${[[ox+x,0,z-2],[ox+x+1,0,z-2],[ox+x+1,0,z-1],[ox+x,0,z-1]].map(v=>fmt(p(...v))).join(' ')}" fill="${(x+z)%2===0?'#d8b681':'#77a2b9'}" opacity=".13"/>`);
 for(let x=0;x<5;x++)for(let z=0;z<5;z++){
  if(x<4)line([ox+x,0,z-2],[ox+x+1,0,z-2],color);
  if(z<4)line([ox+x,0,z-2],[ox+x,0,z-1],color);
  if(x===0||x===4||z===0||z===4)line([ox+x,0,z-2],[ox+x,-.7,z-2],color,.25);
  const [cx,cy]=p(ox+x,0,z-2);nodes.push(`<circle cx="${cx}" cy="${cy}" r="9" fill="${color}" opacity=".14" filter="url(#glow)"/><circle cx="${cx}" cy="${cy}" r="2.5" fill="${color}"/>`);
 }
}
for(let z=-2;z<=2;z++)line([-.6,0,z],[.6,0,z],'#d8b681',.6);
await writeFile('dist/assets/lattice.svg',`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 700"><defs><filter id="glow"><feGaussianBlur stdDeviation="4"/></filter></defs>${tiles.join('')}${lines.join('')}${nodes.join('')}</svg>`);
