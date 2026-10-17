const {test}=require('node:test');
const assert=require('node:assert/strict');
const L=require('../loot.js'),{generateMaze}=require('../maze.js');
const {seededRandom}=require('./helpers/random.cjs');
const {game}=require('./helpers/game.cjs');
const {explore}=require('./helpers/routes.cjs');
const all=node=>[node,...node.children.flatMap(all)];

// Carry real instances with the two-slot limit, returning unwanted loot before each trip.
function exerciseCapacity(maze,initial){
 for(const order of [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]]){
  const state=JSON.parse(JSON.stringify(initial)),first=state.chests[0];
  for(const id of first.itemIds.slice(0,2))assert(L.take(state,first.id,id));
  for(let step=0;step<state.requests.length;step++){
   const area=explore(maze,maze.start,state.unlockedGateIds.length>0).parent;
   const r=order.map(i=>state.requests[i]).find(r=>!state.completedRequestIds.includes(r.id)&&area.has(r.cell));assert(r);
   if(!L.count(state,r.requiredTypeId)){
    const chest=state.chests.find(c=>area.has(c.cell)&&c.itemIds.some(id=>state.items[id].typeId===r.requiredTypeId));assert(chest);
    if(state.inventoryItemIds.length===2)assert(L.putBack(state,chest.id,state.inventoryItemIds[0]));
    assert(L.take(state,chest.id,chest.itemIds.find(id=>state.items[id].typeId===r.requiredTypeId)));
   }
   const reward=L.deliver(state,r.id);assert(reward);if(reward.rewardId)assert(L.unlock(state,'forest-gate',reward.rewardId));
   assert(state.inventoryItemIds.length<=2);assert(L.invariant(state));
  }
  assert(explore(maze,maze.start,state.unlockedGateIds.length>0).parent.has(maze.exit));
 }
}

for(const n of [4,6,8])test(`${n}x${n}: 1000 generated inventories remain solvable in every delivery order, including duplicate types`,()=>{
 for(let seed=0;seed<1000;seed++){
  const random=seededRandom(seed),maze=generateMaze(n,random);
  const requests=maze.places.map((cell,i)=>({id:'request-'+cell,cell,requiredTypeId:seed%2?'apple':['apple','milk','apple'][i],rewardId:cell===maze.keeper?'forest-key':null}));
  const spots=maze.cells.filter(c=>!maze.places.includes(c.id)&&!maze.gate.includes(c.id)&&c.id!==maze.exit).map(c=>({cell:c.id,position:{x:c.id%n*60+48,z:Math.floor(c.id/n)*60+48}}));
  const state=L.create({maze,requests,spots,typeIds:['apple','milk','ball'],random});
  assert(L.validate(maze,state).ok,`size=${n} seed=${seed}`);
  assert(L.invariant(state));exerciseCapacity(maze,state);
  const reachable=explore(maze,maze.start,false).parent,stock={};
  for(const chest of state.chests){
   const types=new Set(chest.itemIds.map(id=>state.items[id].typeId));assert(types.size>=2&&types.size<=3);
   if(reachable.has(chest.cell))for(const id of chest.itemIds){const type=state.items[id].typeId;stock[type]=(stock[type]||0)+1}
  }
  for(const r of requests){stock[r.requiredTypeId]--;assert(stock[r.requiredTypeId]>=0,'early stock covers every request, even optional requests')}
 }
});

test('validator rejects a key item behind its gate and an order-dependent duplicate shortage',()=>{
 const maze={n:5,start:0,exit:4,keeper:2,gate:[2,3],cells:Array.from({length:5},(_,id)=>({id,links:[id-1,id+1].filter(i=>i>=0&&i<5)}))};
 const state={items:{a:{id:'a',typeId:'apple'},b:{id:'b',typeId:'apple'}},chests:[{id:'early',cell:0,position:{x:0,z:0},itemIds:['a']},{id:'late',cell:4,position:{x:4,z:0},itemIds:['b']}],inventoryItemIds:[],consumedItemIds:[],completedRequestIds:[],unlockedGateIds:[],keyIds:[],requests:[{id:'keeper',cell:2,requiredTypeId:'apple',rewardId:'forest-key'},{id:'friend',cell:1,requiredTypeId:'apple',rewardId:null}]};
 assert.equal(L.validate(maze,state).ok,false,'keeper first succeeds, optional friend first deadlocks');
 state.chests[0].itemIds.push(state.chests[1].itemIds.pop());assert.equal(L.validate(maze,state).ok,true);
 state.chests[1].itemIds.push(...state.chests[0].itemIds.splice(0));assert.equal(L.validate(maze,state).ok,false,'all apples behind the dependent gate');
 state.chests[0].itemIds.push('a');assert.equal(L.invariant(state),false,'duplicate instance detected');
});

test('instances transfer once, partial chests retain contents, and delivery consumes one copy with one reward',()=>{
 const g=game(),state=g.run('loot'),request=state.requests.find(r=>r.rewardId),required=Object.values(state.items).filter(i=>i.typeId===request.requiredTypeId);
 assert.equal(L.deliver(state,request.id),null);
 const chest=state.chests.find(c=>c.itemIds.includes(required[0].id)),before=chest.itemIds.length;
 assert(L.take(state,chest.id,required[0].id));assert.equal(chest.itemIds.length,before-1);
 assert.equal(L.take(state,chest.id,required[0].id),false);assert.equal(state.inventoryItemIds.length,1);
 // A separate extra instance proves the second conversation cannot consume another copy.
 state.items.extra={id:'extra',typeId:request.requiredTypeId};state.inventoryItemIds.push('extra');
 const reward=L.deliver(state,request.id);assert.equal(reward.itemId,required[0].id);assert.equal(state.inventoryItemIds.length,1);
 assert.equal(L.deliver(state,request.id),null);assert.equal(state.inventoryItemIds[0],'extra');assert.equal(state.keyIds.length,1);
 assert.equal(L.unlock(state,'forest-gate','forest-key'),true);assert.equal(L.unlock(state,'forest-gate','forest-key'),false);
 assert.equal(state.unlockedGateIds.length,1);assert(L.invariant(state));
});

test('chest UI limits pickup to two, supports partial reopening and return without stale transfers',()=>{
 const g=game(),{$,run}=g;run('closeEvent()');
 assert.equal(run('pos'),run('loot.chests[0].cell'));assert.equal(run('done.size'),0);
 $('#chest-interact').onclick();assert.equal($('#storage').open,true);
 const chest=run('currentChest()'),before=chest.itemIds.length,first=all($('#storage-grid')).find(b=>b.dataset.take);
 first.onclick();first.onclick();assert.equal(chest.itemIds.length,before-1);assert.equal(run('loot.inventoryItemIds.length'),1);
 const second=all($('#storage-grid')).find(b=>b.dataset.take);
 $('#storage-next').onclick();second.onclick();assert.equal(chest.itemIds.length,before-1);
 $('#interact').onclick();second.onclick();assert.equal(chest.itemIds.length,before-1,'stale previous opening ignored');
 $('#take-all').onclick();assert.equal(run('loot.inventoryItemIds.length'),1,'bulk pickup is all-or-none when remaining items do not fit');
 all($('#storage-grid')).find(b=>b.dataset.take).onclick();assert.equal(run('loot.inventoryItemIds.length'),2);
 const blocked=all($('#storage-grid')).find(b=>b.dataset.take);assert.equal(blocked.disabled,true);blocked.onclick();assert.equal(run('loot.inventoryItemIds.length'),2);
 assert.equal($('#backpack-count').textContent,'2 / 2');assert.match($('#storage-subtitle').textContent,/Pełny plecak/);
 const returned=all($('#storage-backpack-grid')).find(b=>b.dataset.putBack),itemId=returned.dataset.putBack;
 returned.onclick();returned.onclick();assert.equal(run('loot.inventoryItemIds.length'),1);assert.equal(chest.itemIds.filter(id=>id===itemId).length,1);
 assert.equal(all($('#storage-grid')).find(b=>b.dataset.take===itemId).disabled,false);
 $('#storage-next').onclick();$('#backpack-toggle').onclick();
 assert.equal($('#storage-title').textContent,'🎒 Plecak');assert.equal($('#take-all').hidden,true);
 const count=all($('#storage-grid')).filter(e=>e.className==='item-count').reduce((sum,e)=>sum+Number(e.textContent.slice(2)),0);assert.equal(count,1);
 all($('#storage-grid')).find(b=>b.dataset.putBack).onclick();assert.equal(run('loot.inventoryItemIds.length'),0);
 assert.equal(run('ForestLoot.invariant(loot)'),true);
});

for(const mode of ['map','fpv'])test(`${mode}: storage blocks outside clicks and movement, shares state across views and resets cleanly`,()=>{
 const g=game(),{$,run,events}=g;run(`closeEvent();setView('${mode}');openStorage(currentChest().id)`);
 const inside={};$('#storage').contains=t=>t===inside;let blocked=0;
 events.click({target:{},preventDefault(){blocked++},stopImmediatePropagation(){blocked++}});
 assert.equal(blocked,2);assert.equal($('#storage').open,true);
 const pos=run('pos'),facing=run('facing');g.buttons.forEach(b=>b.onclick());
 events.keydown({key:'ArrowUp',target:{tagName:'BUTTON'},preventDefault(){}});
 assert.equal(run('pos'),pos);assert.equal(run('facing'),facing);
 const stale=all($('#storage-grid')).find(b=>b.dataset.take);stale.onclick();$('#storage-next').onclick();
 const snapshot=run('JSON.stringify(loot)');$('#view-toggle').onclick();assert.equal(run('JSON.stringify(loot)'),snapshot);
 const chest=run('currentChest()');
 if(run('viewMode')==='fpv')run('openStorage(currentChest().id);closeStorage()');
 assert(g.$('#map').innerHTML.includes(`data-chest="${chest.id}" data-empty="false"`));
 run('start();closeEvent();openStorage(currentChest().id)');stale.onclick();
 assert.equal(run('loot.inventoryItemIds.length'),0);assert.equal(run('loot.consumedItemIds.length'),0);
 assert.equal(run('ForestLoot.invariant(loot)'),true);
});

test('without an item only the request is shown; collection enables delivery and thanks never consume again',()=>{
 const g=game(),{$,run}=g;run('closeEvent();pos=keeper;render();showEvent()');$('#dialogue-next').onclick();
 assert.match($('#description').textContent,/^Dam ci klucz, jeśli /);
 assert.equal($('#answers').children.length,0);
 const request=run('loot.requests.find(r=>r.cell===keeper)'),item=run('Object.values(loot.items).find(i=>i.typeId===encounters[keeper].answer)');
 run(`closeEvent();pos=loot.chests.find(c=>c.itemIds.includes('${item.id}')).cell;render();openStorage(currentChest().id)`);
 all($('#storage-grid')).find(b=>b.dataset.take===item.id).onclick();$('#storage-next').onclick();
 run('pos=keeper;render();showEvent()');$('#dialogue-next').onclick();const give=$('#answers').children.find(b=>b.dataset.item===request.requiredTypeId);
 give.onclick();give.onclick();assert.equal(run('hearts'),4);assert.equal(run('hasKey'),true);assert.equal(run('loot.consumedItemIds.length'),1);
 $('#talk').onclick();assert.match($('#description').textContent,/Dziękuję/);assert.equal($('#answers').children.length,0);
 assert.equal(run('hearts'),4);assert.equal(run('ForestLoot.invariant(loot)'),true);
});

test('real chest placement stays off paths and obstacles; FPV anchors stay fixed through a full turn',()=>{
 for(const size of [4,6,8])for(let seed=1;seed<=12;seed++){
  const g=game({size,seed});
  assert(g.run(`loot.chests.every(c=>!encounters[c.cell]&&!maze.gate.includes(c.cell)&&c.cell!==maze.exit&&
   terrain.every(t=>t.type==='meadow'||Math.hypot(c.position.x-t.x,c.position.z-t.y)>=43)&&
   maze.cells[c.cell].links.every(next=>Array.from({length:51},(_,i)=>{
    const p=roadPoint(roadCurve(c.cell,next),i/50);return Math.hypot(p[0]-c.position.x,p[1]-c.position.z)-roadHalfWidth(c.cell,next,i/50)>7.8;
   }).every(Boolean)))`));
  const chest=g.run('loot.chests[0]');g.run('closeEvent();pos=loot.chests[0].cell;viewMode="fpv";openStorage(currentChest().id);closeStorage()');
  const before=g.$('#map').innerHTML,world=g.run('JSON.stringify(loot)');
  assert(before.includes(`data-world-x="${(chest.position.x-30)/30}" data-world-y="${(chest.position.z-30)/30}"`));
  for(let turn=0;turn<4;turn++)g.buttons[1].onclick();
  assert.equal(g.run('JSON.stringify(loot)'),world);
  // Animal breathing phases vary with time, so compare chest geometry only.
  const parts=svg=>[...svg.matchAll(/<polygon[^>]+data-chest-part[^>]+\/>/g)].map(m=>m[0]);
  assert.deepEqual(parts(g.$('#map').innerHTML),parts(before));
 }
});
