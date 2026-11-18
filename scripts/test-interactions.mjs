import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const source=await readFile('dist/app.js','utf8');
const photos=JSON.parse(await readFile('dist/photos.json','utf8'));
class Element{
 constructor(){this.handlers={};this.attrs={};this.open=false;this.dataset={};this.classList={toggle(){},add(){},remove(){}};}
 addEventListener(name,fn){(this.handlers[name]??=[]).push(fn);}
 async fire(name,data={}){for(const fn of this.handlers[name]??[])await fn({preventDefault(){},...data});}
 setAttribute(k,v){this.attrs[k]=v;}
 querySelector(){return this.child??=new Element();}
 focus(){this.focused=true;}
 showModal(){this.open=true;}
 close(){this.open=false;this.fire('close');}
 matches(){return false;}
}
async function setup(hash='',reduced=false){
 const elements=new Map();const el=s=>{if(!elements.has(s))elements.set(s,new Element());return elements.get(s);};
 const links=photos.map(p=>{const a=new Element();a.dataset.photo=p.id;a.querySelector=s=>({textContent:p.title,alt:p.alt});return a;});
 const listeners={};const location={hash};let stack=[{hash,state:null}],at=0;
 const history={state:null,pushState(state,_,hash){stack=stack.slice(0,at+1);stack.push({state,hash});at++;this.state=state;location.hash=hash;},replaceState(state,_,hash){stack[at]={state,hash};this.state=state;location.hash=hash;},back(){if(at){at--;this.state=stack[at].state;location.hash=stack[at].hash;listeners.popstate?.();}},forward(){if(at<stack.length-1){at++;this.state=stack[at].state;location.hash=stack[at].hash;listeners.popstate?.();}}};
 const window={requestIdleCallback(){},addEventListener(name,fn){listeners[name]=fn;},scrollTo(){}};
 const context={document:{querySelector:el,querySelectorAll:s=>s==='[data-photo]'?links:[],getElementById:()=>null,body:new Element()},matchMedia:()=>({matches:reduced,addEventListener(){}}),localStorage:{getItem(){return null;},setItem(){}},window,requestIdleCallback(){},setTimeout,fetch:async()=>({ok:true,json:async()=>photos}),history,location,scrollY:123,innerHeight:800,IntersectionObserver:class{observe(){}unobserve(){}},Date,console};
 vm.runInNewContext(source,context);
 await new Promise(resolve=>setImmediate(resolve));
 return {el,links,history,location};
}
const s=await setup('#photography');
await s.links[0].fire('click',{button:0});
assert(s.el('#photo-dialog').open);assert.equal(s.location.hash,'#photo-winter');
await s.el('#viewer-prev').fire('click');assert.equal(s.location.hash,'#photo-river');
await s.el('#viewer-next').fire('click');assert.equal(s.location.hash,'#photo-winter');
await s.el('#viewer-close').fire('click');assert(!s.el('#photo-dialog').open);assert.equal(s.location.hash,'#photography');assert(s.links[0].focused);
s.history.forward();await new Promise(resolve=>setImmediate(resolve));assert(s.el('#photo-dialog').open);
await s.el('#photo-dialog').fire('keydown',{key:'ArrowRight'});assert.equal(s.location.hash,'#photo-architecture');
await s.el('#photo-dialog').fire('cancel');assert(!s.el('#photo-dialog').open);
const direct=await setup('#photo-forest');assert(direct.el('#photo-dialog').open);
await direct.el('#viewer-close').fire('click');assert.equal(direct.location.hash,'#photography');assert(!direct.el('#photo-dialog').open);
const reduced=await setup('',true);assert.equal(reduced.el('#motion-toggle').attrs['aria-pressed'],'true');
await reduced.el('#motion-toggle').fire('click');assert.equal(reduced.el('#motion-toggle').attrs['aria-pressed'],'false');
console.log('PASS: gallery open, wraparound, previous/next, close, focus return, browser back/forward state, arrow keys, Escape, direct-link close, reduced-motion default and explicit play. Mocked interaction checks; no browser rendering tested.');
