const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {game}=require('./helpers/game.cjs');
const root=process.env.GAME_ROOT||path.resolve(__dirname,'..');
const modulePromise=import(pathToFileURL(path.join(root,'tiles3d/world.mjs')));
const babylonPromise=import(pathToFileURL(path.join(root,'tiles3d/vendor/babylon.mjs')));
async function engineFixture(t){
  const B=await babylonPromise,engine=new B.NullEngine({renderWidth:600,renderHeight:600,textureSize:512}),scene=new B.Scene(engine);scene.useRightHandedSystem=true;
  t.after(()=>{scene.dispose();engine.dispose()});
  function camera(){const c=new B.FreeCamera('test-camera',B.Vector3.Zero(),scene);c.minZ=.05;c.maxZ=100;scene.activeCamera=c;return c}
  return {scene,engine,camera,B};
}

function snapshot(g){return g.run(`({maze,pos,facing,encounters,chests:loot.chests,gateOpen,landscape:landscapeObjects(),animalPresent})`)}
function geometry(g){return g.run('({roadCurve,roadPoint,roadHalfWidth,edgePoint,walkPose,fleePose})')}
function enable(g){
  g.$('#view-mode').prepend=()=>{};g.$('#view-mode').after=()=>{};
  g.run(`window.enableForestTiles(()=>({active:false,setActive(value){this.active=value},sync(){},dispose(){}}))`);
  return g;
}
for(const size of [4,6,8])test(`3D board ${size}: same cells, landmarks, actors, gate and chest world positions`,async(t)=>{
  const {createWorld,cellPoint}=await modulePromise,g=game({size,seed:42}),state=snapshot(g),fixture=await engineFixture(t),world=createWorld(state,geometry(g),fixture.scene);
  assert.equal(world.root.getChildren().filter(o=>o.name.startsWith('tile-')).length,size*size);
  for(const t of state.landscape.filter(t=>['tree','water','hill'].includes(t.type))){
    const o=fixture.scene.getNodeByName(t.id);assert.ok(o,t.id);assert.equal(o.position.x,t.x/60);assert.equal(o.position.z,t.y/60);
  }
  for(const [cell,o] of world.actors){const p=cellPoint(Number(cell),size,13,11);assert.equal(o.position.x,p.x);assert.equal(o.position.z,p.z);assert.ok(o.getChildren().length)}
  for(const c of state.chests){const o=world.chests.get(c.id);assert.equal(o.position.x,c.position.x/60);assert.equal(o.position.z,c.position.z/60)}
  const [x,z]=geometry(g).edgePoint(...state.maze.gate),gate=fixture.scene.getNodeByName('gate');assert.equal(gate.position.x,x/60);assert.equal(gate.position.z,z/60);
  assert.ok(fixture.scene.getNodeByName('hill-volume'));
  world.dispose();
});
test('rotation and zoom change projection without moving the world or mutating game state',async(t)=>{
  const {createWorld,applyCamera,cameraFrame,projectPoint}=await modulePromise;
  const fixture=await engineFixture(t);
  const g=game(),state=snapshot(g),world=createWorld(state,geometry(g),fixture.scene),camera=fixture.camera();
  const before=world.player.position.clone(),p=world.player.position;
  applyCamera(camera,cameraFrame(4,1,Math.PI/4));const first=projectPoint(camera,p,600,600);
  for(const a of [Math.PI*.75,Math.PI*1.25,Math.PI*1.75]){
    applyCamera(camera,cameraFrame(4,1,a,2));const next=projectPoint(camera,p,600,600);
    assert.ok(Number.isFinite(next.x)&&Number.isFinite(next.y));assert.notDeepEqual(first,next);
    assert.deepEqual(world.player.position.asArray(),before.asArray());assert.equal(g.run('pos'),state.pos);
  }
  world.dispose();
});
test('all board corners fit the camera at default zoom on portrait and landscape screens',async(t)=>{
  const {cameraFrame,applyCamera,projectPoint}=await modulePromise;
  const fixture=await engineFixture(t);
  for(const n of [4,6,8])for(const aspect of [.5,1,2])for(const angle of [0,Math.PI/4,Math.PI/2,Math.PI]){
    const camera=fixture.camera();applyCamera(camera,cameraFrame(n,aspect,angle));
    for(const x of [0,n])for(const z of [0,n])for(const y of [-.22,.9]){
      const p=projectPoint(camera,{x,y,z},600*aspect,600);assert.ok(p.x>=0&&p.x<=600*aspect&&p.y>=0&&p.y<=600,JSON.stringify({n,aspect,angle,p}));
    }
  }
});
test('3D curved paths join at the original shared edge and retain varying width',async(t)=>{
  const {roadGeometry}=await modulePromise,g=game(),geo=geometry(g),maze=g.run('maze');
  for(const cell of maze.cells)for(const to of cell.links){
    const road=roadGeometry(cell.id,to,geo),positions=road.positions;
    const edge=geo.edgePoint(cell.id,to),last=positions.length/3-2;
    assert.ok(Math.abs((positions[last*3]+positions[(last+1)*3])/2-edge[0]/60)<1e-6);
    assert.ok(Math.abs((positions[last*3+2]+positions[(last+1)*3+2])/2-edge[1]/60)<1e-6);
    for(const value of positions)assert.ok(Number.isFinite(value));
    for(let i=1;i<road.normals.length;i+=3)assert.ok(road.normals[i]>.99,'road faces the sky');
  }
});
test('complete edge tree canopies fit the default camera after rotation',async(t)=>{
  const {createWorld,cameraFrame,applyCamera,projectPoint}=await modulePromise;
  for(const n of [6,8]){
    const g=game({size:n,seed:42}),state=snapshot(g),fixture=await engineFixture(t),world=createWorld(state,geometry(g),fixture.scene);
    const edgeTrees=state.landscape.filter(t=>t.type==='tree'&&(t.x<30||t.y<30||t.x>n*60-30||t.y>n*60-30));
    assert.ok(edgeTrees.length>0);
    for(const aspect of [.5,1,2])for(const angle of [0,Math.PI/4,Math.PI/2,Math.PI,Math.PI*1.5]){
      const camera=fixture.camera();applyCamera(camera,cameraFrame(n,aspect,angle));
      for(const tree of edgeTrees){
        const bounds=fixture.scene.getNodeByName(tree.id).getHierarchyBoundingVectors(true);
        for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
          const p=projectPoint(camera,{x,y,z},600*aspect,600);
          assert.ok(p.visible&&p.x>=0&&p.x<=600*aspect&&p.y>=0&&p.y<=600,`${tree.id}: ${JSON.stringify({n,aspect,angle,p})}`);
        }
      }
    }
    world.dispose();
  }
});
test('world synchronization reflects opened chests and gate',async(t)=>{
  const {createWorld}=await modulePromise,g=game(),s=snapshot(g),fixture=await engineFixture(t),world=createWorld(s,geometry(g),fixture.scene);
  assert.equal(world.door.rotation.y,0);g.run('gateOpen=true;loot.chests[0].itemIds=[]');world.sync(snapshot(g));
  assert.ok(world.door.rotation.y<0);assert.ok(world.chests.get(s.chests[0].id).metadata.lid.rotation.x<0);world.dispose();
});
test('switching 3D to 2D and back keeps the same map, inventory, hearts and permanent discovery',()=>{
  const g=enable(game()),before=g.run('({maze,loot,hearts,pos,seenPath})');
  g.run("closeEvent();setView('map');setView('tiles')");
  assert.equal(g.run('maze'),before.maze);assert.equal(g.run('loot'),before.loot);assert.equal(g.run('hearts'),before.hearts);assert.equal(g.run('pos'),before.pos);assert.equal(g.run('seenPath'),before.seenPath);assert.equal(g.run('tileRenderer.active'),true);
});
test('3D movement animates and commits one legal step with permanent sight',()=>{
  const g=enable(game({animation:true})),before=g.run('pos');g.run('closeEvent();const to3d=maze.cells[pos].links[0];startWalk(to3d,0)');
  assert.equal(g.run('pos'),before);g.tick(0);g.tick(180);assert.equal(g.run('pos'),before);g.tick(360);
  assert.equal(g.run('pos'),g.run('to3d'));assert.equal(g.run('walking'),null);assert.ok(g.run('seenSamples.size')>1);
});
test('3D wolf escapes once to another cell without giving a heart',()=>{
  const g=enable(game({animation:true}));g.run('closeEvent();const wolf3d=Number(Object.keys(encounters).find(id=>isEnemy(encounters[id])));pos=wolf3d;done.add(pos);startFlee(pos)');
  const before=g.run('hearts'),destination=g.run('fleeing.route.at(-1)'),duration=g.run('fleeing.duration');
  assert.notEqual(destination,g.run('wolf3d'));g.tick(0);g.tick(duration);
  assert.equal(g.run('hearts'),before);assert.equal(g.run('encounters[wolf3d]'),undefined);assert.equal(g.run('isEnemy(encounters['+destination+'])'),true);assert.equal(g.run('fleeing'),null);
});
test('zoom is bounded on phones',async(t)=>{const {clampZoom}=await modulePromise;assert.equal(clampZoom(.01),.8);assert.equal(clampZoom(100),3);assert.equal(clampZoom(1.4),1.4)});

function relativeGame(options={}){
  const g=enable(game({size:6,...options}));
  g.run('closeEvent();pos=14;maze.exit=35;maze.gate=[34,35];encounters={};gateOpen=true;visited=new Set([14]);maze.cells[14].links=[8,15,20,13];for(const id of [8,15,20,13])maze.cells[id].links=[14];render()');
  return g;
}
test('3D turns rotate Adam in place; keyboard, buttons and help use relative controls',()=>{
  const g=relativeGame(),start=g.run('facing'),seen=g.run('seenPath'),position=g.run('pos');
  assert.equal(g.buttons[1].textContent,'↷');assert.equal(g.buttons[3].textContent,'↶');assert.equal(g.buttons[2].attrs['aria-label'],'Idź do tyłu');assert.equal(g.$('#fpv-hint').hidden,false);
  for(let i=0;i<4;i++)g.buttons[1].onclick();
  assert.equal(g.run('facing'),start);assert.equal(g.run('pos'),position);assert.equal(g.run('seenPath'),seen);assert.equal(g.run('visited.size'),1);
  const key=(key,repeat=false)=>g.events.keydown({key,repeat,target:{tagName:'BODY'},preventDefault(){}});
  key('ArrowLeft');assert.equal(g.run('facing'),(start+3)%4);
  key('ArrowLeft',true);assert.equal(g.run('facing'),(start+3)%4);
  key('ArrowRight');assert.equal(g.run('facing'),start);
  g.$('#menu').showModal();key('ArrowRight');assert.equal(g.run('facing'),start);g.$('#menu').close();
  g.$('#event').show();key('ArrowLeft');assert.equal(g.run('facing'),start);
});
for(const mode of ['animated','instant','reduced'])for(let facing=0;facing<4;facing++)test(`3D ${mode}: back then forward preserves heading ${facing}`,()=>{
  const g=relativeGame({animation:mode!=='instant',reducedMotion:mode==='reduced'});
  g.run(`facing=${facing};render()`);g.buttons[2].onclick();
  if(mode==='animated'){
    assert.equal(g.run('walking.heading'),facing);assert.equal(g.run('walking.d'),(facing+2)%4);
    g.tick(0);g.tick(180);assert.equal(g.run('facing'),facing);assert.equal(g.run('pos'),14);g.tick(360);
  }
  assert.equal(g.run('pos'),[8,15,20,13][(facing+2)%4]);assert.equal(g.run('facing'),facing);
  g.run('closeEvent()');g.buttons[0].onclick();
  if(mode==='animated'){g.tick(1000);g.tick(1360)}
  assert.equal(g.run('pos'),14);assert.equal(g.run('facing'),facing);
});
test('3D movement still respects walls, closed gates and wolf tasks',()=>{
  const g=relativeGame();g.run('facing=1;maze.cells[pos].links=[15];render()');
  assert.equal(g.buttons[2].disabled,true);g.buttons[2].onclick();assert.equal(g.run('pos'),14);
  assert.equal(g.buttons[1].disabled,false);assert.equal(g.buttons[3].disabled,false);
  g.run('maze.gate=[14,15];gateOpen=false;render()');g.buttons[0].onclick();assert.equal(g.run('pos'),14);assert.equal(g.$('#event').open,true);
  g.run('closeEvent();gateOpen=true;encounters[pos]=createWolf(null,true);render()');g.buttons[1].onclick();assert.equal(g.run('facing'),2);assert.equal(g.run('pos'),14);
  g.buttons[0].onclick();assert.equal(g.run('pos'),14);assert.equal(g.run('hearts'),3);assert.equal(g.$('#event').open,true);
});
test('switching to 2D restores cardinal controls without changing position or heading',()=>{
  const g=relativeGame();g.run('facing=1;setView("map")');
  assert.equal(g.buttons[1].textContent,'→');assert.equal(g.buttons[0].attrs['aria-label'],'Idź w górę');assert.equal(g.run('pos'),14);assert.equal(g.run('facing'),1);assert.equal(g.$('#fpv-hint').hidden,true);
  g.buttons[0].onclick();assert.equal(g.run('pos'),8);g.run('closeEvent();setView("tiles")');assert.equal(g.run('pos'),8);assert.equal(g.buttons[1].textContent,'↷');
});
test('finishing a backward animation during a view change keeps its heading',()=>{
  const g=relativeGame({animation:true});g.run('facing=0;render();handleDirection(2)');g.tick(0);g.tick(120);g.run('setView("map")');
  assert.equal(g.run('pos'),20);assert.equal(g.run('facing'),0);assert.equal(g.run('walking'),null);
  g.run('setView("tiles")');g.tick(1000);assert.equal(g.run('pos'),20);assert.equal(g.run('facing'),0);
});
test('the 3D model visibly faces the game heading while standing in place',async(t)=>{
  const {createWorld}=await modulePromise,{Vector3}=await babylonPromise,g=relativeGame(),s=snapshot(g),fixture=await engineFixture(t),world=createWorld(s,geometry(g),fixture.scene);
  const initial=world.player.position.clone(),directions=[[0,0,-1],[1,0,0],[0,0,1],[-1,0,0]];
  for(let facing=0;facing<4;facing++){
    g.run(`facing=${facing}`);world.sync(snapshot(g));const front=Vector3.TransformNormal(new Vector3(0,0,1),world.player.computeWorldMatrix(true));
    assert.ok(Vector3.Distance(front,new Vector3(...directions[facing]))<1e-7);assert.deepEqual(world.player.position.asArray(),initial.asArray());
  }
  world.dispose();
});

test('Babylon scene processes native fog materials, merged terrain and cleanup', {timeout:15000}, async(t)=>{
  const {createForestMaterial}=await import(pathToFileURL(path.join(root,'tiles3d/materials.mjs')));
  const {createWorld,applyCamera,cameraFrame}=await modulePromise;
  const {scene,engine,camera,B}=await engineFixture(t),g=game({size:6}),state=snapshot(g),materials=new Map(),errors=[];
  const texture=B.RawTexture.CreateRGBATexture(new Uint8Array([255,255,255,255]),1,1,scene,false,false,B.Texture.NEAREST_SAMPLINGMODE);
  const makeMaterial=(color,kind='object')=>{
    const key=color+kind;
    if(!materials.has(key))materials.set(key,createForestMaterial(scene,color,kind,texture,{value:6},e=>errors.push(e)));
    return materials.get(key);
  };
  const world=createWorld(state,geometry(g),scene,makeMaterial);applyCamera(camera(),cameraFrame(6,1,Math.PI/4));
  new B.HemisphericLight('test-light',new B.Vector3(0,1,0),scene);
  const batches=scene.meshes.filter(m=>m.name==='static-batch');assert.ok(batches.length>0&&batches.length<40);
  assert.ok(batches.every(m=>m.isEnabled()&&m.getTotalVertices()>0));
  const visible=scene.meshes.filter(m=>m.isEnabled()&&m.material);
  await Promise.all(visible.map(m=>m.material.forceCompilationAsync(m)));
  engine.beginFrame();scene.render();engine.endFrame();
  assert.deepEqual(errors,[]);
  assert.ok(scene.getActiveMeshes().length>0);
  for(const kind of ['ground','road','object']){
    const m=visible.find(m=>m.material.pluginManager.getPlugin('ForestFog').kind===kind);
    assert.ok(m,kind);
    const effect=m.subMeshes[0].effect;
    assert.ok(effect.isReady());
    assert.match(effect.fragmentSourceCode,/vec2 forestUV = vPositionW.xz \/ forestSize/);
    assert.match(effect.fragmentSourceCode,/uniform sampler2D revealMap/);
    assert.equal(m.subMeshes[0].materialDefines.FOREST_CLIP,kind!=='object');
  }
  world.dispose();materials.forEach(m=>m.dispose());texture.dispose();
  assert.equal(scene.meshes.length,0);assert.equal(scene.transformNodes.length,0);assert.equal(scene.materials.length,0);
});
