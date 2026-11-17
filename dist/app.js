const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const motionButton=document.querySelector('#motion-toggle');
let manualMotion=null;
try {const saved=localStorage.getItem('ng-motion');if(saved!==null)manualMotion=saved==='paused';}catch{}
let paused=reducedMotion.matches||manualMotion===true;
let scene;
function updateMotion(){
 document.body.classList.toggle('motion-off',paused);
 motionButton.setAttribute('aria-pressed',String(paused));
 motionButton.setAttribute('aria-label',paused?'Play animation':'Pause animation');
 motionButton.title=paused?'Play animation':'Pause animation';
 motionButton.querySelector('span').textContent=paused?'▷':'Ⅱ';
 scene?.setPaused(paused);
}
updateMotion();
motionButton.addEventListener('click',()=>{paused=!paused;manualMotion=paused;try{localStorage.setItem('ng-motion',paused?'paused':'playing');}catch{}updateMotion();});
reducedMotion.addEventListener('change',()=>{paused=reducedMotion.matches||manualMotion===true;updateMotion();});
const loadScene=()=>import('./scene.js').then(({createLattice})=>{scene=createLattice(document.querySelector('#lattice'),paused);}).catch(()=>{document.querySelector('.lattice-wrap').classList.remove('ready');motionButton.hidden=true;});
if('requestIdleCallback' in window)requestIdleCallback(loadScene,{timeout:1800});else setTimeout(loadScene,250);

const dialog=document.querySelector('#photo-dialog');
const photoLinks=[...document.querySelectorAll('[data-photo]')];
const viewerImage=document.querySelector('#viewer-image');
let photos=[];let activeIndex=0;let sourceLink;let savedScroll=0;
const photoData=fetch('./photos.json').then(r=>{if(!r.ok)throw Error('Photos unavailable');return r.json();}).then(data=>{photos=data;return data;}).catch(()=>{photos=photoLinks.map(a=>({id:a.dataset.photo,title:a.querySelector('figcaption span').textContent,alt:a.querySelector('img').alt}));return photos;});
function renderPhoto(index){
 activeIndex=(index+photos.length)%photos.length;const photo=photos[activeIndex];
 viewerImage.src=`assets/${photo.id}-2000.webp`;viewerImage.alt=photo.alt;
 document.querySelector('#viewer-title').textContent=photo.title;
 document.querySelector('#viewer-count').textContent=`Selected photographs / ${String(activeIndex+1).padStart(2,'0')} — ${String(photos.length).padStart(2,'0')}`;
 document.querySelector('#viewer-meta').textContent=[photo.location,photo.year].filter(Boolean).join(' / ');
 document.querySelector('#viewer-story').textContent=photo.story||'';
 document.querySelector('#viewer-original').href=viewerImage.src;
}
function closeViewer(){if(!dialog.open)return;dialog.close();}
function requestClose(){
 if(history.state?.photo)history.back();
 else{history.replaceState(null,'','#photography');closeViewer();}
}
for(const link of photoLinks)link.addEventListener('click',async e=>{
 if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button!==0||typeof dialog.showModal!=='function')return;
 e.preventDefault();await photoData;sourceLink=link;savedScroll=scrollY;renderPhoto(photos.findIndex(p=>p.id===link.dataset.photo));
 if(dialog.open)return;
 history.pushState({photo:link.dataset.photo},'',`#photo-${link.dataset.photo}`);
 dialog.showModal();document.body.classList.add('viewer-open');document.querySelector('#viewer-close').focus();
});
document.querySelector('#viewer-close').addEventListener('click',requestClose);
dialog.addEventListener('cancel',e=>{e.preventDefault();requestClose();});
dialog.addEventListener('close',()=>{document.body.classList.remove('viewer-open');sourceLink?.focus({preventScroll:true});window.scrollTo({top:savedScroll,behavior:'instant'});});
function navigatePhoto(step){renderPhoto(activeIndex+step);history.replaceState({photo:photos[activeIndex].id},'',`#photo-${photos[activeIndex].id}`);}
document.querySelector('#viewer-prev').addEventListener('click',()=>navigatePhoto(-1));
document.querySelector('#viewer-next').addEventListener('click',()=>navigatePhoto(1));
dialog.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();navigatePhoto(-1);}if(e.key==='ArrowRight'){e.preventDefault();navigatePhoto(1);}});
async function applyHash(){
 const match=location.hash.match(/^#photo-(.+)$/);
 if(!match){closeViewer();return;}
 await photoData;const index=photos.findIndex(p=>p.id===match[1]);if(index<0)return;
 renderPhoto(index);if(!dialog.open){savedScroll=scrollY;sourceLink=photoLinks.find(a=>a.dataset.photo===match[1]);dialog.showModal();document.body.classList.add('viewer-open');}
}
window.addEventListener('popstate',applyHash);
if(location.hash.startsWith('#photo-'))applyHash();
for(const details of document.querySelectorAll('.research-item'))details.addEventListener('toggle',()=>{if(details.open)for(const other of document.querySelectorAll('.research-item'))if(other!==details)other.open=false;});
const targeted=document.getElementById(location.hash.slice(1));if(targeted?.matches('details'))targeted.open=true;
document.querySelector('#year').textContent=new Date().getFullYear();
