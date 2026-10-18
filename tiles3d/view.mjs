import * as THREE from './vendor/three.module.min.js';
import {createWorld,cellPoint,posePoint,clampZoom,cameraFrame,applyCamera,projectPoint} from './world.mjs';

export function createTilesView({host,svg,readState,geometry,positionOverlays,onFailure}) {
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
  renderer.debug.onShaderError=()=>{throw Error('Nie udało się przygotować widoku 3D')};
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.7));
  renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  renderer.domElement.className='tiles-canvas';renderer.domElement.setAttribute('aria-hidden','true');
  host.prepend(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-4,4,4,-4,.05,100);
  scene.add(new THREE.HemisphereLight('#fff6df','#71834e',2.1));
  const sun=new THREE.DirectionalLight('#fff1ce',2.0);sun.position.set(-4,8,5);scene.add(sun);
  const fogCanvas=document.createElement('canvas');fogCanvas.width=fogCanvas.height=1024;
  const ctx=fogCanvas.getContext('2d');if(!ctx){renderer.dispose();renderer.domElement.remove();throw Error('Canvas 2D unavailable')}
  const fogTexture=new THREE.CanvasTexture(fogCanvas);fogTexture.generateMipmaps=false;fogTexture.minFilter=THREE.LinearFilter;
  const fogSize={value:4},materials=new Map(),anchors=new Map();
  let world=null,maze=null,lastSeen=null,lastReveal=null,active=false,disposed=false,width=1,height=1;
  let azimuth=Math.PI/4,zoom=1,follow=false,lastFrame=0,frameId=0;
  let cameraDirty=true,anchorDirty=true,drag=null,pointers=new Map(),pinchDistance=null;
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const toolbar=document.createElement('div');toolbar.className='tiles-toolbar';toolbar.setAttribute('aria-label','Kamera mapy 3D');
  const controls=[];
  function button(label,text,action){const b=document.createElement('button');b.type='button';b.textContent=text;b.title=label;b.setAttribute('aria-label',label);b.onclick=()=>{action();cameraDirty=true;paint(performance.now(),true)};toolbar.append(b);controls.push(b);return b}
  button('Obróć mapę w lewo','↶',()=>{azimuth-=Math.PI/2});
  button('Obróć mapę w prawo','↷',()=>{azimuth+=Math.PI/2});
  const less=button('Oddal mapę','−',()=>{zoom=clampZoom(zoom/1.25);follow=zoom>1.05});
  const more=button('Przybliż do Adama','+',()=>{zoom=clampZoom(zoom*1.25);follow=zoom>1.05});
  button('Pokaż całą mapę','⌂',()=>{zoom=1;azimuth=Math.PI/4;follow=false});
  const compass=document.createElement('div');compass.className='tiles-compass';compass.setAttribute('aria-label','Północ na mapie');compass.innerHTML='<span>N</span><b aria-hidden="true">↑</b>';
  const hint=document.createElement('p');hint.className='tiles-hint';hint.textContent='Przeciągnij, aby obrócić · + / − przybliżenie';
  host.append(toolbar,compass,hint);

  function material(color,kind='object') {
    const key=color+kind;if(materials.has(key))return materials.get(key);
    const m=new THREE.MeshLambertMaterial({color,side:THREE.DoubleSide,transparent:kind!=='ground',opacity:kind==='shadow'?.18:1,depthWrite:kind!=='shadow'});
    m.customProgramCacheKey=()=>`tiles-fog-${kind}`;
    m.onBeforeCompile=shader=>{
      shader.uniforms.revealMap={value:fogTexture};shader.uniforms.forestSize=fogSize;
      shader.vertexShader='varying vec2 forestXZ;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nforestXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
      shader.fragmentShader='uniform sampler2D revealMap; uniform float forestSize; varying vec2 forestXZ;\n'+shader.fragmentShader;
      const blend=kind==='ground'?'diffuseColor.rgb = mix(vec3(0.56,0.62,0.46), diffuseColor.rgb, seen);':'diffuseColor.a *= seen; if(diffuseColor.a < 0.025) discard;';
      // The board bounds trim surfaces, never the volume of a tree or actor.
      // Overhanging branches inherit discovery at the nearest board edge.
      const clip=['ground','road','water','shadow'].includes(kind)?'if(forestUV.x < 0.0 || forestUV.y < 0.0 || forestUV.x > 1.0 || forestUV.y > 1.0) discard;':'';
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        vec2 forestUV = forestXZ / forestSize;
        ${clip}
        forestUV = clamp(forestUV, vec2(0.0), vec2(1.0));
        float seen = texture2D(revealMap, vec2(forestUV.x, 1.0-forestUV.y)).r;
        ${blend}`);
    };
    materials.set(key,m);return m;
  }
  function fog(s) {
    if(s.seenPath===lastSeen&&s.reveal===lastReveal)return;
    const scale=1024/(s.maze.n*60);ctx.setTransform(1,0,0,1,0,0);ctx.filter='none';ctx.fillStyle=s.reveal?'white':'black';ctx.fillRect(0,0,1024,1024);
    if(!s.reveal){ctx.setTransform(scale,0,0,scale,0,0);ctx.filter=`blur(${3.5*scale}px)`;ctx.fillStyle='white';ctx.fill(new Path2D(s.seenPath),'nonzero')}
    fogTexture.needsUpdate=true;lastSeen=s.seenPath;lastReveal=s.reveal;
  }
  function anchor(key,attributes) {
    const node=document.createElementNS('http://www.w3.org/2000/svg','g');
    Object.entries(attributes).forEach(([name,value])=>node.setAttribute(name,String(value)));
    const rect=document.createElementNS('http://www.w3.org/2000/svg','rect');rect.setAttribute('fill','transparent');node.append(rect);svg.append(node);anchors.set(key,{node,rect});
  }
  function resetAnchors(s){
    svg.replaceChildren();anchors.clear();anchor('adam',{'data-character':'adam'});
    for(const [cell,e] of Object.entries(s.encounters))anchor(`animal-${cell}`,{'data-character':'animal','data-encounter':cell,'data-category':e.category,...(e.category==='enemy'?{'data-wolf':'true'}:{})});
    for(const c of s.chests)anchor(`chest-${c.id}`,{'data-chest':c.id});
    anchorDirty=true;
  }
  function updateAnchors() {
    function place(key,g){
      const a=anchors.get(key);if(!a)return;
      const p=g.position,top=projectPoint(camera,{x:p.x,y:p.y+(g.userData.height||.8),z:p.z},width,height),bottom=projectPoint(camera,p,width,height);
      const w=Math.max(8,Math.abs(bottom.y-top.y)*.55);
      a.node.removeAttribute('transform');a.rect.setAttribute('x',top.x-w/2);a.rect.setAttribute('y',Math.min(top.y,bottom.y));
      a.rect.setAttribute('width',w);a.rect.setAttribute('height',Math.max(6,Math.abs(bottom.y-top.y)));
    }
    place('adam',world.player);for(const [cell,g] of world.actors)place(`animal-${cell}`,g);for(const [id,g] of world.chests)place(`chest-${id}`,g);
    positionOverlays();anchorDirty=false;
  }
  function resize(){
    const r=host.getBoundingClientRect();width=Math.max(1,r.width);height=Math.max(1,r.height);
    renderer.setSize(width,height,false);if(active)svg.setAttribute('viewBox',`0 0 ${width} ${height}`);cameraDirty=true;anchorDirty=true;
  }
  function sync(){
    const s=readState();if(maze!==s.maze){
      if(world){scene.remove(world.root);world.dispose();materials.forEach(m=>m.dispose());materials.clear()}
      maze=s.maze;fogSize.value=maze.n;world=createWorld(s,geometry,material);scene.add(world.root);zoom=1;follow=false;cameraDirty=true;lastSeen=null;
    }
    world.sync(s);resetAnchors(s);fog(s);resize();paint(performance.now(),true);
  }
  function animate(s,now){
    const moving=s.walking&&s.walking.started!==null;
    if(moving){
      const t=Math.min(1,(now-s.walking.started)/360),pose=geometry.walkPose(s.walking.from,s.walking.to,t),p=posePoint(pose);
      world.player.position.set(p.x,Math.abs(pose.bob)/60,p.z);
      world.player.rotation.y=[Math.PI,Math.PI/2,0,-Math.PI/2][s.walking.d];
      world.player.userData.limbs.forEach((limb,i)=>limb.rotation.x=Math.sin(t*Math.PI*4)*(i%2?1:-1)*.45);
      anchorDirty=true;if(follow)cameraDirty=true;
    }else world.player.userData.limbs.forEach(limb=>limb.rotation.x=0);
    for(const [cell,g] of world.actors){
      if(!reducedMotion.matches){g.userData.body.position.y=Math.sin(now*.002+Number(cell))*.008;g.userData.body.rotation.z=Math.sin(now*.0015+Number(cell))*.012}
      if(s.fleeing&&Number(cell)===s.fleeing.cell&&s.fleeing.started!==null){
        const t=Math.min(1,(now-s.fleeing.started)/s.fleeing.duration),pose=geometry.fleePose(Number(cell),t,'map'),p=posePoint(pose);
        const next=posePoint(geometry.fleePose(Number(cell),Math.min(1,t+.005),'map'));
        g.position.set(p.x,Math.abs(Math.sin(t*Math.PI*12))*.035,p.z);g.rotation.y=Math.atan2(next.x-p.x,next.z-p.z);anchorDirty=true;
      }
    }
    const flight=s.heartFlight;world.gift.visible=!!flight;
    if(flight){
      const t=flight.started===null?0:Math.min(1,(now-flight.started)/flight.duration),p=cellPoint(flight.cell,s.maze.n),u=Math.min(1,t/.8);
      world.gift.position.set(p.x+(13-27*u)/60,.55+Math.sin(Math.PI*u)*.50,p.z+11/60);world.gift.quaternion.copy(camera.quaternion);world.gift.scale.setScalar(t>.8?Math.max(.01,(1-t)*5):1);
    }
  }
  function paint(now,force=false){
    if(!active||!world||disposed)return;if(!force&&now-lastFrame<1000/30)return;lastFrame=now;
    const s=readState();animate(s,now);fog(s);
    if(cameraDirty){
      const focus=follow?{x:world.player.position.x,z:world.player.position.z}:undefined;
      applyCamera(camera,cameraFrame(s.maze.n,width/height,azimuth,zoom,focus));
      const north=projectPoint(camera,{x:s.maze.n/2,z:s.maze.n/2-1},width,height),middle=projectPoint(camera,{x:s.maze.n/2,z:s.maze.n/2},width,height);
      compass.querySelector('b').style.transform=`rotate(${Math.atan2(north.x-middle.x,middle.y-north.y)}rad)`;
      less.disabled=zoom<=.8;more.disabled=zoom>=3;cameraDirty=false;anchorDirty=true;
    }
    if(anchorDirty)updateAnchors();renderer.render(scene,camera);
  }
  function loop(now){frameId=0;if(!active||disposed||document.hidden)return;try{paint(now)}catch(error){onFailure(error);return}frameId=requestAnimationFrame(loop)}
  function startLoop(){if(active&&!disposed&&!document.hidden&&!frameId)frameId=requestAnimationFrame(loop)}
  function setActive(value){
    active=!!value;host.classList.toggle('tiles-active',active);renderer.domElement.hidden=toolbar.hidden=compass.hidden=hint.hidden=!active;
    if(!active){cancelAnimationFrame(frameId);frameId=0}else{resize();startLoop()}
  }
  function blocked(){return !!document.querySelector('dialog[open]')}
  function down(e){if(blocked()||!active)return;renderer.domElement.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});drag={x:e.clientX,azimuth};pinchDistance=null}
  function move(e){
    if(!pointers.has(e.pointerId)||blocked())return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===2){const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);if(pinchDistance)zoom=clampZoom(zoom*distance/pinchDistance);pinchDistance=distance;follow=zoom>1.05}
    else if(drag)azimuth=drag.azimuth-(e.clientX-drag.x)*.009;
    cameraDirty=true;
  }
  function up(e){pointers.delete(e.pointerId);drag=null;pinchDistance=null}
  function wheel(e){if(blocked()||!active)return;e.preventDefault();zoom=clampZoom(zoom*Math.exp(-e.deltaY*.0015));follow=zoom>1.05;cameraDirty=true}
  renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',up);renderer.domElement.addEventListener('wheel',wheel,{passive:false});
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();onFailure(Error('WebGL context lost'))});
  const observer=new ResizeObserver(()=>{resize();if(active)paint(performance.now(),true)});observer.observe(host);
  function visibility(){if(document.hidden){cancelAnimationFrame(frameId);frameId=0}else startLoop()}
  document.addEventListener('visibilitychange',visibility);
  const api={get active(){return active},setActive,sync,dispose(){disposed=true;setActive(false);observer.disconnect();document.removeEventListener('visibilitychange',visibility);world?.dispose();materials.forEach(m=>m.dispose());fogTexture.dispose();renderer.dispose();renderer.domElement.remove();toolbar.remove();compass.remove();hint.remove()}};
  return api;
}
