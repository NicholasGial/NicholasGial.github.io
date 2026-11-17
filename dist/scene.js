import * as THREE from './vendor/three.module.min.js';

export function createLattice(container, pausedInitially = false) {
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setClearColor(0x111614,0);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.5;
  container.append(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(35,1,.1,100);
  camera.position.set(9,10.2,14.5);
  camera.lookAt(0,0,0);
  const assembly = new THREE.Group(); scene.add(assembly);
  scene.add(new THREE.AmbientLight(0xd1dfdc,1.6));
  const key = new THREE.DirectionalLight(0xffe3b2,4);key.position.set(-4,8,5);scene.add(key);
  const rim = new THREE.PointLight(0x80b9dc,65,30);rim.position.set(4,4,-4);scene.add(rim);
  const pearl = new THREE.MeshStandardMaterial({color:0xe0d9c4,roughness:.23,metalness:.65});
  const sphereGeo = new THREE.SphereGeometry(.075,16,12);
  const nodes = new THREE.InstancedMesh(sphereGeo,pearl,50);
  const dummy = new THREE.Object3D(); let nodeIndex=0;
  const lights = [];
  const gold = new THREE.Color('#d8b681'), blue = new THREE.Color('#77a2b9');
  const glowCanvas=document.createElement('canvas');glowCanvas.width=64;glowCanvas.height=64;
  const ctx=glowCanvas.getContext('2d');const gradient=ctx.createRadialGradient(32,32,0,32,32,32);
  gradient.addColorStop(0,'rgba(255,255,255,1)');gradient.addColorStop(.1,'rgba(255,255,255,.8)');gradient.addColorStop(.4,'rgba(255,255,255,.12)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
  const glowTexture = new THREE.CanvasTexture(glowCanvas);
  const positions=[];
  function edge(a,b){positions.push(...a,...b);}
  for(let patch=0;patch<2;patch++){
    const ox=patch===0?-4.6:.6;
    for(let x=0;x<5;x++)for(let z=0;z<5;z++){
      dummy.position.set(ox+x,0,z-2);dummy.updateMatrix();nodes.setMatrixAt(nodeIndex,dummy.matrix);
      nodes.setColorAt(nodeIndex++,patch===0?gold:blue);
      if(x<4)edge([ox+x,0,z-2],[ox+x+1,0,z-2]);
      if(z<4)edge([ox+x,0,z-2],[ox+x,0,z-1]);
      if(x===0||x===4||z===0||z===4){edge([ox+x,0,z-2],[ox+x,-.7,z-2]);}
      if((x+z)%2===0){
        const material=new THREE.SpriteMaterial({map:glowTexture,color:patch===0?gold:blue,transparent:true,opacity:.45,depthWrite:false,blending:THREE.AdditiveBlending});
        const light=new THREE.Sprite(material);light.position.set(ox+x,.06,z-2);light.scale.setScalar(.5);assembly.add(light);lights.push({light,phase:x*.8+z*.7+patch*2});
      }
    }
    for(let x=0;x<4;x++)for(let z=0;z<4;z++){
      const material=new THREE.MeshPhysicalMaterial({color:(x+z)%2===0?gold:blue,metalness:.28,roughness:.35,transparent:true,opacity:(x+z)%2===0?.22:.11,side:THREE.DoubleSide,depthWrite:false});
      const tile=new THREE.Mesh(new THREE.PlaneGeometry(.94,.94),material);
      tile.rotation.x=-Math.PI/2;tile.position.set(ox+x+.5,-.035,z-1.5);assembly.add(tile);
    }
    const lower=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(ox,-.7,-2),new THREE.Vector3(ox+4,-.7,-2),new THREE.Vector3(ox+4,-.7,2),new THREE.Vector3(ox,-.7,2)]),new THREE.LineBasicMaterial({color:patch===0?gold:blue,transparent:true,opacity:.28}));assembly.add(lower);
  }
  assembly.add(nodes);
  const connections=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(positions,3)),new THREE.LineBasicMaterial({color:0xb8c9bd,transparent:true,opacity:.53}));assembly.add(connections);
  for(let z=-2;z<=2;z++){
    const curve=new THREE.CubicBezierCurve3(new THREE.Vector3(-.6,0,z),new THREE.Vector3(-.15,.25,z),new THREE.Vector3(.15,.25,z),new THREE.Vector3(.6,0,z));
    assembly.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(20)),new THREE.LineBasicMaterial({color:0xe9c58b,transparent:true,opacity:.5})));
  }
  const dustPositions=[];for(let i=0;i<55;i++){const r=5+((Math.sin(i*78.231)*43758.54)%1)*2;const angle=i*2.399;dustPositions.push(Math.cos(angle)*r,(Math.sin(i*23.2))*2,Math.sin(angle)*r*.6);}
  const dust=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(dustPositions,3)),new THREE.PointsMaterial({color:0xc1b494,size:.018,transparent:true,opacity:.35}));scene.add(dust);
  let paused=pausedInitially,visible=true,lost=false,px=0,py=0,elapsed=0,last=0,slowFrames=0,frameCount=0;
  function draw(time=0){
    const delta=last?Math.min((time-last)/1000,.05):0;last=time;
    if(!paused){elapsed+=delta;assembly.rotation.y+=(px*.08+Math.sin(elapsed*.13)*.055-assembly.rotation.y)*.025;assembly.rotation.x+=(py*.03-assembly.rotation.x)*.025;assembly.position.y=Math.sin(elapsed*.5)*.07;for(const {light,phase} of lights)light.material.opacity=.25+.23*(.5+.5*Math.sin(elapsed*.8-phase));}
    renderer.render(scene,camera);
    if(!paused&&delta>.025)slowFrames++;
    if(++frameCount===180&&slowFrames>90){renderer.setPixelRatio(1);resize();}
  }
  function resize(){const {width,height}=container.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.position.set(9,10.2,14.5);if(camera.aspect<1.3)camera.position.multiplyScalar(1.16);camera.updateProjectionMatrix();draw();}
  function sync(){last=0;renderer.setAnimationLoop(!paused&&visible&&!document.hidden&&!lost?draw:null);if(!lost)draw();}
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();},{rootMargin:'100px'});observer.observe(container);
  const resizer=new ResizeObserver(resize);resizer.observe(container);
  document.addEventListener('visibilitychange',sync);
  container.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'||paused)return;const r=container.getBoundingClientRect();px=(e.clientX-r.left)/r.width-.5;py=(e.clientY-r.top)/r.height-.5;});
  container.addEventListener('pointerleave',()=>{px=py=0;});
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;renderer.setAnimationLoop(null);container.parentElement.classList.remove('ready');});
  renderer.domElement.addEventListener('webglcontextrestored',()=>{lost=false;resize();container.parentElement.classList.add('ready');sync();});
  resize();container.parentElement.classList.add('ready');sync();
  return {setPaused(value){paused=value;sync();},dispose(){renderer.setAnimationLoop(null);observer.disconnect();resizer.disconnect();document.removeEventListener('visibilitychange',sync);scene.traverse(object=>{object.geometry?.dispose();if(object.material){for(const material of [object.material].flat())material.dispose();}});glowTexture.dispose();renderer.dispose();renderer.domElement.remove();}};
}
