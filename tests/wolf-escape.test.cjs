const { test } = require('node:test');
const assert = require('node:assert/strict');
const { game } = require('./helpers/game.cjs');
const { route, direction, explore } = require('./helpers/routes.cjs');

const all=node=>[node,...node.children.flatMap(all)];
const wolfCell=g=>g.run('Number(Object.keys(encounters).find(id=>(encounters[id].category==="enemy")))');
function encounter(mode='map',options={}){
  const g=game({animation:true,...options});
  g.run(`closeEvent();pos=Number(Object.keys(encounters).find(id=>(encounters[id].category==="enemy")));viewMode='${mode}';facing=1;render();showEvent()`);
  g.$('#dialogue-next').onclick();
  g.control=key=>[...all(g.$('#answers')),...all(g.$('#dialogue-actions'))].find(b=>b.dataset.wolfAction===key||b.dataset.wolfDir===String(key));
  g.answer=()=>{const e=g.run('encounters[pos]');for(let i=0;i<e.count;i++)g.control(e.direction).onclick();return g.control('submit')};
  return g;
}

for(const mode of ['map','fpv'])test(`${mode}: wolf follows a route, moves once and waits with a fresh task`,()=>{
  const g=encounter(mode),{$,run,tick,buttons,answer,pendingFrames}=g;
  const old=run('pos'),task=run('encounters[pos].text'),submit=answer();submit.onclick();submit.onclick();
  const f=run('fleeing'),destination=f.route.at(-1);
  assert.notEqual(destination,old);assert.equal(f.route[0],old);
  assert.equal(run('hearts'),3);assert.equal(run('dangerPending()'),false);assert.equal($('#event').open,false);
  assert.match($('#map').innerHTML,/data-wolf="true"/);assert(buttons.every(b=>b.disabled));
  run('handleDirection(0)');assert.equal(run('pos'),old);
  tick(0);const start=$('#map [data-wolf="true"]').attrs.transform;
  tick(f.duration*.35);assert.notEqual($('#map [data-wolf="true"]').attrs.transform,start);
  if(mode==='map'){
    assert.equal($('#map [data-wolf="true"]').attrs.opacity,1,'no fade out');
    const end=run(`fleePose(${old},1,'map')`);
    assert(Math.abs(end.x-(destination%run('maze.n')*60+43))<1e-9);
    assert(Math.abs(end.y-(Math.floor(destination/run('maze.n'))*60+41))<1e-9);
    assert.equal(end.scale,.72);
  }
  tick(f.duration+1);assert.equal(run('fleeing'),null);assert.equal(pendingFrames(),0);
  assert.equal(wolfCell(g),destination);assert.equal(run('Object.values(encounters).filter(e=>(e.category==="enemy")).length'),1);
  assert.equal(run(`animalPresent(${old})`),false);assert.equal(run(`animalPresent(${destination})`),true);
  assert.equal(run('done.has(pos)'),false,'no stale completed tile');
  assert.notEqual(run(`encounters[${destination}].text`),task);assert.equal(run(`encounters[${destination}].steps.length`),0);
  run('setView("map")');assert.match($('#map').innerHTML,new RegExp(`data-encounter="${destination}"`));
  run('setView("fpv")');assert.equal(wolfCell(g),destination);
  run(`pos=${destination};facing=1;render();showEvent()`);$('#dialogue-next').onclick();
  submit.onclick();assert.equal(run('hearts'),3);assert.equal(run('dangerPending()'),true,'old submit cannot solve new task');
  assert.equal(run('encounters[pos].steps.length'),0);
});

for(const mode of ['map','fpv'])test(`${mode}: legally walking to the relocated wolf requires solving it again`,()=>{
  const g=encounter(mode,{animation:false}),{run,$,answer,control,buttons}=g;
  const start=run('pos');answer().onclick();const destination=wolfCell(g),maze=run('maze');
  for(const next of route(maze,start,destination,run('gateOpen'))){
    const d=direction(maze,run('pos'),next);
    if(mode==='fpv'){for(let i=0;run('facing')!==d&&i<4;i++)buttons[1].onclick();buttons[0].onclick()}
    else buttons[d].onclick();
    assert.equal(run('pos'),next);
  }
  assert.equal($('#event').open,true);assert.equal(run('dangerPending()'),true);
  $('#dialogue-next').onclick();control((run('encounters[pos].direction')+1)%4).onclick();control('submit').onclick();
  assert.equal(run('hearts'),2);assert.equal(wolfCell(g),destination);
  answer().onclick();assert.equal(run('hearts'),2);assert.notEqual(wolfCell(g),destination);
  assert.equal(run('dangerPending()'),false);assert.equal(run('Object.values(encounters).filter(e=>(e.category==="enemy")).length'),1);
});

test('wrong answers keep the wolf in place; reduced motion and missing RAF still relocate it',()=>{
  const wrong=encounter();const old=wolfCell(wrong);
  wrong.control((wrong.run('encounters[pos].direction')+1)%4).onclick();wrong.control('submit').onclick();
  assert.equal(wrong.run('hearts'),2);assert.equal(wrong.run('fleeing'),null);assert.equal(wrong.pendingFrames(),0);assert.equal(wolfCell(wrong),old);
  for(const options of [{reducedMotion:true},{animation:false}]){
    const g=encounter('map',options),cell=wolfCell(g);g.answer().onclick();
    assert.equal(g.run('hearts'),3);assert.equal(g.pendingFrames(),0);assert.equal(g.run('fleeing'),null);
    assert.notEqual(wolfCell(g),cell);assert.match(g.$('#map').innerHTML,/data-wolf="true"/);
  }
});

test('restart cancels the old route without moving the new wolf',()=>{
  const g=encounter(),{run,tick,answer,pendingFrames}=g;answer().onclick();tick(0);tick(100);run('start()');
  const snapshot=run('JSON.stringify({pos,encounters,maze})');tick(5000);
  assert.equal(run('JSON.stringify({pos,encounters,maze})'),snapshot);
  assert.equal(run('fleeing'),null);assert.equal(pendingFrames(),0);assert.equal(run('done.size'),0);assert.equal(run('hearts'),3);
});

test('switching view, opening menu or revealing the map completes the same route once',()=>{
  for(const action of ['setView("fpv")','$("#menu-toggle").onclick()','$("#reveal").onchange()']){
    const g=encounter(),{run,tick,answer,pendingFrames}=g;answer().onclick();tick(0);
    const destination=run('fleeing.route.at(-1)');run(action);const task=run(`encounters[${destination}]`);tick(5000);
    assert.equal(run('fleeing'),null);assert.equal(pendingFrames(),0);assert.equal(run('hearts'),3);
    assert.equal(wolfCell(g),destination);assert.equal(run(`encounters[${destination}]`),task);
  }
});

test('a narrow reachable area uses an empty gate endpoint without crossing the closed gate',()=>{
  const g=game();g.run(`maze={n:2,start:0,exit:3,gate:[2,3],cells:[{id:0,links:[1]},{id:1,links:[0,2]},{id:2,links:[1,3]},{id:3,links:[2]}]};
    pos=1;gateOpen=false;encounters={0:createEncounter(bank[0]),1:createWolf()};loot={chests:[]}`);
  assert.deepEqual(Array.from(g.run('wolfRoute(1)')),[1,2]);
});

for(const size of [4,6,8])test(`${size}x${size}: repeated wolf routes preserve reachability, friends and chests`,()=>{
  const g=game({size});
  for(let seed=0;seed<100;seed++){
    g.run(`maze=generateMaze(${size});keeper=maze.keeper;pos=maze.start;encounters={};
      maze.places.forEach((cell,i)=>encounters[cell]=createEncounter(bank[i]));addDanger();terrain=[];createLoot();done=new Set();gateOpen=${seed%2===0}`);
    const maze=g.run('maze'),friends=g.run('Object.entries(encounters).filter(([,e])=>!(e.category==="enemy"))'),chests=g.run('JSON.stringify(loot)');
    for(let encounterIndex=0;encounterIndex<8;encounterIndex++){
      const cell=wolfCell(g);g.run(`pos=${cell}`);
      const path=Array.from(g.run(`wolfRoute(${cell})`)),dest=path.at(-1),area=explore(maze,cell,g.run('gateOpen'));
      assert(path.length>1,`size=${size} seed=${seed} encounter=${encounterIndex}`);
      assert.notEqual(dest,cell);assert.notEqual(dest,maze.exit);assert(!friends.some(([id])=>Number(id)===dest));
      assert.deepEqual(path.slice(1),route(maze,cell,dest,g.run('gateOpen')),'route uses actual links and respects the gate');
      const free=[...area.parent.keys()].filter(id=>id!==cell&&id!==maze.exit&&!g.run(`encounters[${id}]`));
      const clear=free.filter(id=>id!==maze.start&&!maze.gate.includes(id)&&!g.run(`loot.chests.some(c=>c.cell===${id})`));
      if(clear.length)assert(clear.includes(dest),'prefer a field without a chest or gate');
      g.run(`{const previous=encounters[${cell}];delete encounters[${cell}];encounters[${dest}]=createWolf(previous)}`);
      for(const [id,e] of friends)assert.equal(g.run(`encounters[${id}]`),e);
      assert.equal(g.run('JSON.stringify(loot)'),chests);assert.equal(g.run('Object.values(encounters).filter(e=>(e.category==="enemy")).length'),1);
    }
  }
});
