import {Engine,Scene,FreeCamera,Camera,Vector3,Color3,Color4,HemisphericLight,DirectionalLight,DynamicTexture,Texture} from './vendor/babylon.mjs';
import {createForestMaterial} from './materials.mjs';
import {createWorld,cellPoint,posePoint,clampZoom,cameraFrame,applyCamera,projectPoint,headingRotation} from './world.mjs';

export function createTilesView({host,svg,readState,geometry,positionOverlays,onFailure}) {
  const canvas=document.createElement('canvas');canvas.className='tiles-canvas';canvas.setAttribute('aria-hidden','true');
  host.prepend(canvas);
  let engine;
  try{engine=new Engine(canvas,true,{alpha:true,stencil:true,powerPreference:'low-power',preserveDrawingBuffer:false},false)}catch(error){canvas.remove();throw error}
  const pixelRatio=Math.min(window.devicePixelRatio||1,1.7);
  engine.setHardwareScalingLevel(1/pixelRatio);
  const scene=new Scene(engine);scene.useRightHandedSystem=true;scene.clearColor=new Color4(0,0,0,0);
  const camera=new FreeCamera('forest-camera',Vector3.Zero(),scene);camera.minZ=.05;camera.maxZ=100;camera.mode=Camera.ORTHOGRAPHIC_CAMERA;scene.activeCamera=camera;
  const sky=new HemisphericLight('sky',new Vector3(0,1,0),scene);sky.diffuse=Color3.FromHexString('#fff6df');sky.groundColor=Color3.FromHexString('#71834e');sky.intensity=.85;
  const sun=new DirectionalLight('sun',new Vector3(4,-8,-5),scene);sun.diffuse=Color3.FromHexString('#fff1ce');sun.intensity=.8;
  const fogCanvas=document.createElement('canvas');fogCanvas.width=fogCanvas.height=1024;
  const ctx=fogCanvas.getContext('2d');if(!ctx){scene.dispose();engine.dispose();canvas.remove();throw Error('Canvas 2D unavailable')}
  const fogTexture=new DynamicTexture('forest-reveal',fogCanvas,scene,false,Texture.BILINEAR_SAMPLINGMODE);
  fogTexture.gammaSpace=false;fogTexture.wrapU=fogTexture.wrapV=Texture.CLAMP_ADDRESSMODE;
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

  let failing=false;
  function fail(error){if(disposed||failing)return;failing=true;queueMicrotask(()=>{if(!disposed)onFailure(error)})}
  function material(color,kind='object') {
    const key=color+kind;if(materials.has(key))return materials.get(key);
    const m=createForestMaterial(scene,color,kind,fogTexture,fogSize,fail);
    materials.set(key,m);return m;
  }
  function fog(s) {
    if(s.seenPath===lastSeen&&s.reveal===lastReveal)return;
    const scale=1024/(s.maze.n*60);ctx.setTransform(1,0,0,1,0,0);ctx.filter='none';ctx.fillStyle=s.reveal?'white':'black';ctx.fillRect(0,0,1024,1024);
    if(!s.reveal){ctx.setTransform(scale,0,0,scale,0,0);ctx.filter=`blur(${3.5*scale}px)`;ctx.fillStyle='white';ctx.fill(new Path2D(s.seenPath),'nonzero')}
    fogTexture.update(true,false);lastSeen=s.seenPath;lastReveal=s.reveal;
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
      const p=g.position,top=projectPoint(camera,{x:p.x,y:p.y+(g.metadata.height||.8),z:p.z},width,height),bottom=projectPoint(camera,p,width,height);
      const w=Math.max(8,Math.abs(bottom.y-top.y)*.55);
      a.node.removeAttribute('transform');a.rect.setAttribute('x',top.x-w/2);a.rect.setAttribute('y',Math.min(top.y,bottom.y));
      a.rect.setAttribute('width',w);a.rect.setAttribute('height',Math.max(6,Math.abs(bottom.y-top.y)));
    }
    place('adam',world.player);for(const [cell,g] of world.actors)place(`animal-${cell}`,g);for(const [id,g] of world.chests)place(`chest-${id}`,g);
    positionOverlays();anchorDirty=false;
  }
  function resize(){
    const r=host.getBoundingClientRect();width=Math.max(1,r.width);height=Math.max(1,r.height);
    engine.setSize(Math.round(width*pixelRatio),Math.round(height*pixelRatio));if(active)svg.setAttribute('viewBox',`0 0 ${width} ${height}`);cameraDirty=true;anchorDirty=true;
  }
  function sync(){
    const s=readState();if(maze!==s.maze){
      if(world){world.dispose();materials.forEach(m=>m.dispose());materials.clear()}
      maze=s.maze;fogSize.value=maze.n;world=createWorld(s,geometry,scene,material);zoom=1;follow=false;cameraDirty=true;lastSeen=null;
    }
    world.sync(s);resetAnchors(s);fog(s);resize();paint(performance.now(),true);
  }
  function animate(s,now){
    // Walking backwards changes position, not the direction Adam is facing.
    world.player.rotation.y=headingRotation(s.walking?.heading??s.facing);
    const moving=s.walking&&s.walking.started!==null;
    if(moving){
      const t=Math.min(1,(now-s.walking.started)/360),pose=geometry.walkPose(s.walking.from,s.walking.to,t),p=posePoint(pose);
      world.player.position.set(p.x,Math.abs(pose.bob)/60,p.z);
      world.player.metadata.limbs.forEach((limb,i)=>limb.rotation.x=Math.sin(t*Math.PI*4)*(i%2?1:-1)*.45);
      anchorDirty=true;if(follow)cameraDirty=true;
    }else world.player.metadata.limbs.forEach(limb=>limb.rotation.x=0);
    for(const [cell,g] of world.actors){
      if(!reducedMotion.matches){g.metadata.body.position.y=Math.sin(now*.002+Number(cell))*.008;g.metadata.body.rotation.z=Math.sin(now*.0015+Number(cell))*.012}
      if(s.fleeing&&Number(cell)===s.fleeing.cell&&s.fleeing.started!==null){
        const t=Math.min(1,(now-s.fleeing.started)/s.fleeing.duration),pose=geometry.fleePose(Number(cell),t,'map'),p=posePoint(pose);
        const next=posePoint(geometry.fleePose(Number(cell),Math.min(1,t+.005),'map'));
        g.position.set(p.x,Math.abs(Math.sin(t*Math.PI*12))*.035,p.z);g.rotation.y=Math.atan2(next.x-p.x,next.z-p.z);anchorDirty=true;
      }
    }
    const flight=s.heartFlight;world.gift.setEnabled(!!flight);
    if(flight){
      const t=flight.started===null?0:Math.min(1,(now-flight.started)/flight.duration),p=cellPoint(flight.cell,s.maze.n),u=Math.min(1,t/.8);
      world.gift.position.set(p.x+(13-27*u)/60,.55+Math.sin(Math.PI*u)*.50,p.z+11/60);world.gift.scaling.setAll(t>.8?Math.max(.01,(1-t)*5):1);
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
    if(anchorDirty)updateAnchors();engine.beginFrame();scene.render();engine.endFrame();
  }
  function loop(now){frameId=0;if(!active||disposed||document.hidden)return;try{paint(now)}catch(error){onFailure(error);return}frameId=requestAnimationFrame(loop)}
  function startLoop(){if(active&&!disposed&&!document.hidden&&!frameId)frameId=requestAnimationFrame(loop)}
  function setActive(value){
    active=!!value;host.classList.toggle('tiles-active',active);canvas.hidden=toolbar.hidden=compass.hidden=hint.hidden=!active;
    if(!active){cancelAnimationFrame(frameId);frameId=0}else{resize();startLoop()}
  }
  function blocked(){return !!document.querySelector('dialog[open]')}
  function down(e){if(blocked()||!active)return;canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});drag={x:e.clientX,azimuth};pinchDistance=null}
  function move(e){
    if(!pointers.has(e.pointerId)||blocked())return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===2){const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);if(pinchDistance)zoom=clampZoom(zoom*distance/pinchDistance);pinchDistance=distance;follow=zoom>1.05}
    else if(drag)azimuth=drag.azimuth-(e.clientX-drag.x)*.009;
    cameraDirty=true;
  }
  function up(e){pointers.delete(e.pointerId);drag=null;pinchDistance=null}
  function wheel(e){if(blocked()||!active)return;e.preventDefault();zoom=clampZoom(zoom*Math.exp(-e.deltaY*.0015));follow=zoom>1.05;cameraDirty=true}
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('wheel',wheel,{passive:false});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fail(Error('WebGL context lost'))});
  const observer=new ResizeObserver(()=>{resize();if(active)paint(performance.now(),true)});observer.observe(host);
  function visibility(){if(document.hidden){cancelAnimationFrame(frameId);frameId=0}else startLoop()}
  document.addEventListener('visibilitychange',visibility);
  const api={get active(){return active},setActive,sync,dispose(){disposed=true;setActive(false);observer.disconnect();document.removeEventListener('visibilitychange',visibility);world?.dispose();materials.forEach(m=>m.dispose());fogTexture.dispose();scene.dispose();engine.dispose();canvas.remove();toolbar.remove();compass.remove();hint.remove()}};
  return api;
}
