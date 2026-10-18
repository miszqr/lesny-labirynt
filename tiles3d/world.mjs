import * as THREE from './vendor/three.module.min.js';

// Game coordinates are 60 units per cell. The scene uses one metre per cell,
// with Y up and +Z south. Camera changes never rewrite game coordinates.
export const TILE_SIZE = 60;
export function headingRotation(facing=2){return [Math.PI,Math.PI/2,0,-Math.PI/2][facing]}
export function cellPoint(cell, n, dx = 0, dz = 0) {
  return { x: cell % n + .5 + dx / TILE_SIZE, z: Math.floor(cell / n) + .5 + dz / TILE_SIZE };
}
export function posePoint(pose) { return { x: pose.x / TILE_SIZE, z: pose.y / TILE_SIZE }; }
export function clampZoom(value) { return Math.max(.8, Math.min(3, value)); }
export function cameraFrame(n, aspect, azimuth, zoom = 1, focus = {x:n/2,z:n/2}) {
  const span = (n * 1.52 + 1.25) / Math.min(1, aspect);
  return {
    left: -span * aspect / 2, right: span * aspect / 2,
    top: span / 2, bottom: -span / 2, zoom: clampZoom(zoom),
    position: new THREE.Vector3(focus.x + Math.sin(azimuth) * n * 1.6, n * 1.8, focus.z + Math.cos(azimuth) * n * 1.6),
    target: new THREE.Vector3(focus.x, .1, focus.z)
  };
}
export function applyCamera(camera, frame) {
  Object.assign(camera, {left:frame.left,right:frame.right,top:frame.top,bottom:frame.bottom,zoom:frame.zoom});
  camera.position.copy(frame.position); camera.lookAt(frame.target);
  camera.updateProjectionMatrix(); camera.updateMatrixWorld();
}
export function projectPoint(camera, point, width, height) {
  const p = new THREE.Vector3(point.x, point.y || 0, point.z).project(camera);
  return {x:(p.x+1)*width/2,y:(1-p.y)*height/2,visible:p.z>=-1&&p.z<=1};
}
export function roadGeometry(a, b, geometry, shoulder = 0) {
  const curve = geometry.roadCurve(a,b), positions=[], indices=[];
  for(let i=0;i<=24;i++) {
    const t=i/24,p=geometry.roadPoint(curve,t),v=1-t;
    const d=[0,1].map(k=>3*v*v*(curve[1][k]-curve[0][k])+6*v*t*(curve[2][k]-curve[1][k])+3*t*t*(curve[3][k]-curve[2][k]));
    const length=Math.hypot(...d)||1,width=geometry.roadHalfWidth(a,b,t)+shoulder;
    for(const side of [-1,1])positions.push((p[0]-d[1]/length*width*side)/60,.023+(.8-shoulder)*.001,(p[1]+d[0]/length*width*side)/60);
    if(i<24){const j=i*2;indices.push(j,j+1,j+2,j+1,j+3,j+2)}
  }
  const result=new THREE.BufferGeometry();
  result.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));result.setIndex(indices);result.computeVertexNormals();return result;
}

export function createWorld(state, geometry, material = color => new THREE.MeshLambertMaterial({color})) {
  const root=new THREE.Group(),actors=new Map(),chests=new Map(),animated=[];
  root.name='forest-world';
  const forms={box:new THREE.BoxGeometry(1,1,1),ball:new THREE.SphereGeometry(1,10,8),cone:new THREE.ConeGeometry(1,1,7),cylinder:new THREE.CylinderGeometry(1,1,1,10)};
  function mesh(parent,form,color,x,y,z,sx,sy=sx,sz=sx,kind='object') {
    const m=new THREE.Mesh(forms[form],material(color,kind));m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;
  }
  function shadow(parent,r=.22) { return mesh(parent,'cylinder','#5e7446',0,.006,0,r,.006,r*.65,'shadow'); }
  function group(parent,x=0,y=0,z=0){const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g;}
  const n=state.maze.n;
  for(const cell of state.maze.cells) {
    const p=cellPoint(cell.id,n),tile=group(root,p.x,-.105,p.z);tile.name=`tile-${cell.id}`;tile.userData.cell=cell.id;
    mesh(tile,'box','#9a7750',0,0,0,.994,.21,.994,'ground');
    mesh(tile,'box',cell.id%3===0?'#a8bd80':'#afc48a',0,.105,0,.994,.024,.994,'ground');
    for(const next of cell.links)for(const [extra,color] of [[2.8,'#b7c28a'],[1.6,'#c4c894'],[.7,'#d0cc9c'],[0,'#ded0a5']]) {
      const road=new THREE.Mesh(roadGeometry(cell.id,next,geometry,extra),material(color,'road'));root.add(road);
    }
  }
  for(const t of state.landscape) {
    const p=posePoint(t),g=group(root,p.x,0,p.z);g.name=t.id;
    if(t.type==='tree') {
      g.scale.setScalar(t.scale);shadow(g,.34);mesh(g,'cylinder','#8c6745',0,.32,0,.07,.64,.07);
      if(t.variant>.42) {
        mesh(g,'cone','#2f7051',0,.68,0,.40,.68,.40);
        mesh(g,'cone','#43835b',0,.93,0,.32,.59,.32);
        mesh(g,'cone','#689a64',0,1.17,0,.21,.44,.21);
      } else {
        mesh(g,'ball','#51844e',0,.89,0,.43,.50,.38);
        mesh(g,'ball','#6b9d58',-.18,1.03,.07,.29,.30,.27);
        mesh(g,'ball','#93b86e',-.20,1.15,.09,.15,.16,.15);
      }
    } else if(t.type==='hill') {
      const hill=mesh(g,'ball','#92ae68',0,-.02,0,.44,.27+t.variant*.1,.37);hill.name='hill-volume';
      mesh(g,'ball','#a9bf7b',-.1,.06,-.03,.27,.23,.26);
      mesh(g,'ball','#a8a98d',.28,.025,.16,.075,.055,.055);
    } else if(t.type==='water') {
      mesh(g,'ball','#c2cca0',0,.005,0,.37,.017,.30);
      mesh(g,'ball','#65afb3',0,.018,0,.32,.016,.25,'water');
      mesh(g,'ball','#8ac9c6',-.04,.027,.03,.22,.006,.13,'water');
      for(let i=0;i<2;i++)mesh(g,'box','#c6ece0',-.11+i*.15,.034,-.06+i*.13,.12,.004,.012,'water');
      for(let i=0;i<3;i++)mesh(g,'cylinder','#688a51',-.28+i*.035,.08,.13,.008,.16,.008);
    }
  }
  const stationary=[...root.children];
  function boy() {
    const g=group(root);g.name='adam';shadow(g,.2);const body=group(g);
    const limbs=[];
    for(const side of [-1,1]) {
      const leg=group(body,side*.075,.23,0);mesh(leg,'box','#365d73',0,-.08,0,.11,.25,.12);
      mesh(leg,'ball','#74583d',0,-.185,.035,.07,.035,.105);limbs.push(leg);
    }
    mesh(body,'cylinder','#eea63e',0,.38,0,.15,.30,.12);
    for(const side of [-1,1]) {
      const arm=group(body,side*.17,.48,0);mesh(arm,'cylinder','#f6bc80',0,-.11,0,.048,.24,.048);limbs.push(arm);
    }
    mesh(body,'ball','#ffd09d',0,.65,0,.17,.19,.15);
    mesh(body,'ball','#4a342c',0,.76,-.025,.174,.10,.15);
    for(const side of [-1,1]) {
      mesh(body,'ball','#f4ba87',side*.17,.64,0,.036,.05,.036);
      mesh(body,'ball','#fffaf0',side*.058,.67,.137,.043,.048,.018);
      mesh(body,'ball','#493c34',side*.058,.666,.153,.022,.028,.009);
      mesh(body,'ball','#f2a281',side*.107,.604,.113,.037,.022,.016);
      mesh(body,'box','#49342c',side*.058,.73,.136,.065,.015,.015);
    }
    mesh(body,'ball','#f4ba87',0,.62,.158,.031,.028,.028);
    mesh(body,'ball','#fff6de',0,.566,.13,.049,.018,.013);
    g.userData={body,limbs,height:.88};return g;
  }
  function animal(id) {
    const g=new THREE.Group(),palette={cat:'#df9a45',dog:'#b28253',rabbit:'#c5b9a5',bear:'#9d6b46',hedgehog:'#8a6950',owl:'#b09563',wolf:'#596674'};
    const fur=palette[id]||palette.wolf,body=group(g);shadow(g,.22);
    mesh(body,'ball',fur,0,.22,0,.18,.22,.16);mesh(body,'ball','#eee0bc',0,.23,.14,.12,.15,.045);
    mesh(body,'ball',fur,0,.47,.015,.21,.19,.18);
    for(const side of [-1,1]) {
      mesh(body,'ball',fur,side*.12,.05,.07,.09,.05,.13);
      if(id==='rabbit'){
        mesh(body,'ball',fur,side*.10,.78,.005,.065,.22,.055);
        mesh(body,'ball','#d8a49c',side*.10,.80,.049,.033,.15,.015);
      }else if(['cat','wolf'].includes(id)){
        const ear=mesh(body,'cone',fur,side*.145,.68,0,.09,.22,.065);ear.rotation.z=-side*.2;
        mesh(body,'cone',id==='wolf'?'#9babb2':'#edbf92',side*.145,.69,.048,.047,.12,.015);
      }else if(id==='dog'){
        const ear=mesh(body,'ball','#71513d',side*.19,.46,-.005,.065,.18,.075);ear.rotation.z=side*.2;
      }else if(id==='bear')mesh(body,'ball',fur,side*.16,.625,0,.075,.08,.06);
      if(id==='owl')mesh(body,'ball','#f5e4b8',side*.1,.50,.15,.10,.115,.055);
      mesh(body,'ball',id==='wolf'?'#e9d791':'#fffaf0',side*.082,.49,.17,.055,.061,.024);
      mesh(body,'ball','#263e34',side*.082,.49,.19,.026,.035,.012);
      if(id==='wolf'){
        const brow=mesh(body,'box','#34414c',side*.09,.555,.19,.13,.028,.025);brow.rotation.z=side*.27;
        const cheek=mesh(body,'cone',fur,side*.20,.40,.03,.08,.16,.07);cheek.rotation.z=side*2.0;
      }
      if(id==='owl')mesh(body,'ball','#887147',side*.19,.25,0,.08,.18,.11);
    }
    mesh(body,'ball',id==='wolf'?'#ccd1ce':'#eee0bc',0,.39,.17,.11,.075,.06);
    mesh(body,id==='owl'?'cone':'ball',id==='owl'?'#d69c3d':'#37433b',0,.42,.23,.036,.035,.026);
    if(id==='wolf')for(const side of [-1,1]){
      const tooth=mesh(body,'cone','#fff5d6',side*.047,.344,.215,.017,.043,.015);tooth.rotation.z=Math.PI;
    }
    if(id==='hedgehog')for(let i=0;i<10;i++){
      const a=i*Math.PI*2/10,spine=mesh(body,'cone','#604c3c',Math.cos(a)*.18,.28+Math.sin(a)*.12,-.11,.075,.15,.075);spine.rotation.z=a-Math.PI/2;
    }
    if(['cat','dog','wolf'].includes(id)){
      const tail=mesh(body,'ball',fur,.14,.19,-.19,.06,.14,.09);tail.rotation.x=-.7;
    }
    g.userData={body,height:id==='rabbit'?1.03:.80};return g;
  }
  const player=boy();
  function makeChest(c) {
    const g=group(root,c.position.x/60,0,c.position.z/60);g.name=`chest-${c.id}`;shadow(g,.18);
    mesh(g,'box','#ae793d',0,.09,0,.29,.17,.22);
    const lid=group(g,0,.17,-.11);mesh(lid,'box','#d4a963',0,.025,.11,.31,.05,.24);
    for(const x of [-.10,.10])mesh(g,'box','#f0d082',x,.10,.115,.025,.18,.012);
    mesh(g,'box','#ffe2a0',0,.14,.13,.045,.045,.018);g.userData={lid,height:.30};return g;
  }
  for(const c of state.chests)chests.set(c.id,makeChest(c));
  const [a,b]=state.maze.gate,[gx,gz]=geometry.edgePoint(a,b),gate=group(root,gx/60,0,gz/60);
  gate.name='gate';gate.rotation.y=Math.abs(a-b)===1?Math.PI/2:0;
  for(const side of [-1,1])mesh(gate,'box','#977043',side*.26,.30,0,.055,.60,.06);
  const door=group(gate,-.23,0,0);
  for(let i=0;i<5;i++)mesh(door,'box','#bf8c4d',i*.105,.29,0,.075,.48,.035);
  for(const y of [.14,.43])mesh(door,'box','#9c6f3c',.21,y,.025,.49,.045,.045);
  const diagonal=mesh(door,'box','#dab174',.21,.28,.055,.51,.035,.025);diagonal.rotation.z=.5;
  const lock=mesh(door,'box','#f4cf60',.37,.30,.065,.06,.08,.035);
  const h=cellPoint(state.maze.exit,n),home=group(root,h.x,0,h.z);home.name='home';
  mesh(home,'box','#f0d79b',0,.25,0,.55,.50,.48);
  const roof=mesh(home,'cone','#c37650',0,.63,0,.46,.32,.40);roof.rotation.y=Math.PI/4;
  mesh(home,'box','#705039',0,.16,.248,.13,.31,.015);
  for(const side of [-1,1])mesh(home,'box','#82bec3',side*.18,.29,.25,.1,.12,.02);
  mesh(home,'cylinder','#9e7954',.19,.64,-.07,.045,.28,.045);
  stationary.push(home);
  // Batch stationary geometry by material. Camera orbit does not require a
  // draw call for every tree leaf or path segment, especially on an 8×8 phone map.
  root.updateMatrixWorld(true);
  const batches=new Map();
  for(const node of stationary)node.traverse(o=>{
    if(!o.isMesh)return;
    const source=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();source.applyMatrix4(o.matrixWorld);
    const batch=batches.get(o.material)||{positions:[],normals:[]};batches.set(o.material,batch);
    batch.positions.push(...source.attributes.position.array);batch.normals.push(...source.attributes.normal.array);
    source.dispose();o.visible=false;
  });
  for(const [m,batch] of batches){
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(batch.positions,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(batch.normals,3));
    const merged=new THREE.Mesh(geo,m);merged.name='static-batch';root.add(merged);
  }
  const gift=new THREE.Group(),heartShape=new THREE.Shape();
  heartShape.moveTo(0,-.1);heartShape.bezierCurveTo(-.3,.09,-.12,.28,0,.13);heartShape.bezierCurveTo(.12,.28,.3,.09,0,-.1);
  const heartMesh=new THREE.Mesh(new THREE.ExtrudeGeometry(heartShape,{depth:.04,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.015,bevelThickness:.015,curveSegments:8}),material('#ef647d','gift'));
  gift.add(heartMesh);root.add(gift);gift.visible=false;
  function sync(s) {
    for(const [cell,g] of actors)if(!s.encounters[cell]){root.remove(g);actors.delete(cell)}
    for(const [cell,e] of Object.entries(s.encounters)) {
      let actor=actors.get(cell);
      if(!actor){actor=animal(e.id||'wolf');actor.name=`animal-${cell}`;actors.set(cell,actor);root.add(actor);animated.push(actor)}
      const p=cellPoint(Number(cell),n,13,11);actor.position.set(p.x,0,p.z);
      actor.visible=s.animalPresent(Number(cell));
    }
    const p=cellPoint(s.pos,n,s.encounters[s.pos]?-14:0,12);player.position.set(p.x,0,p.z);player.rotation.y=headingRotation(s.facing);
    for(const c of s.chests)chests.get(c.id).userData.lid.rotation.x=c.itemIds.length?0:-1.15;
    door.rotation.y=s.gateOpen?-Math.PI*.53:0;lock.visible=!s.gateOpen;
  }
  sync(state);
  return {root,player,actors,chests,door,gift,animated,sync,dispose(){
    const geometries=new Set(Object.values(forms));root.traverse(o=>{if(o.geometry)geometries.add(o.geometry)});geometries.forEach(g=>g.dispose());root.clear();
  }};
}
