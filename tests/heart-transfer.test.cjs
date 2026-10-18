const {test}=require('node:test');
const assert=require('node:assert/strict');
const {game,supplyFixture}=require('./helpers/game.cjs');

function delivery(options={},mode='map'){
 const g=game({animation:true,...options});
 g.run(`closeEvent();pos=keeper;visited.add(pos);viewMode='${mode}';facing=1`);
 supplyFixture(g);g.run('render();showEvent()');g.$('#dialogue-next').onclick();
 g.give=g.$('#answers').children.find(b=>b.className==='give-item');assert(g.give);
 return g;
}

test('friendly delivery flies from animal to Adam, consumes one item and rewards once',()=>{
 const g=delivery(),{run,$,tick,buttons}=g,cell=run('pos'),items=run('loot.inventoryItemIds.length');
 g.give.onclick();g.give.onclick();
 assert.equal(run('hearts'),4);assert.equal(run('hasKey'),true);assert.equal(run('done.has(pos)'),true);
 assert.equal(run('loot.inventoryItemIds.length'),items-1);assert.equal(run('loot.consumedItemIds.length'),1);
 assert.equal($('#event').open,false);assert.equal(Object.hasOwn($('#heart-flight').attrs,'hidden'),false);
 assert.equal($('#heart-flight').attrs.viewBox,$('#map').attrs.viewBox);
 assert.equal(run('heartFlight.cell'),cell);assert(buttons.every(b=>b.disabled));assert.equal($('#talk').hidden,true);
 const first=$('#flying-heart').attrs.transform;
 tick(0);tick(360);assert.notEqual($('#flying-heart').attrs.transform,first);
 const mid=run(`heartFlightPose(${cell},.4)`),from=run(`heartFlightPose(${cell},0)`),to=run(`heartFlightPose(${cell},.8)`);
 assert(mid.x<from.x&&mid.x>to.x);assert(mid.y<from.y&&mid.y<to.y,'arc rises above both characters');
 tick(810);assert(Number($('#heart-arrival').attrs.opacity)>0,'soft arrival glow');
 assert(Number($('#flying-heart').attrs.opacity)<1);
 tick(901);assert.equal(run('heartFlight'),null);assert.equal(g.pendingFrames(),0);
 assert.equal(Object.hasOwn($('#heart-flight').attrs,'hidden'),true);assert.equal($('#heart-flight').innerHTML,'');
 assert(buttons.some(b=>!b.disabled));assert.equal($('#talk').hidden,false);assert.equal(run('hearts'),4);
 run('render();showEvent()');$('#dialogue-next').onclick();g.give.onclick();
 assert.equal(run('hearts'),4);assert.equal(run('heartFlight'),null);assert.equal(run('loot.consumedItemIds.length'),1);
});

test('movement, conversation and backpack wait until the heart reaches Adam',()=>{
 const g=delivery(),{run,$,events}=g;g.give.onclick();const cell=run('pos');
 const d=run('[0,1,2,3].find(d=>maze.cells[pos].links.includes(target(d)))');
 run(`handleDirection(${d});move(${d});openStorage()`);$('#talk').onclick();$('#interact').onclick();
 events.keydown({key:['ArrowUp','ArrowRight','ArrowDown','ArrowLeft'][d],target:{tagName:'BODY'},preventDefault(){}});
 assert.equal(run('pos'),cell);assert.equal(run('walking'),null);assert.equal($('#event').open,false);
 assert.equal($('#storage').open,false);assert.equal(run('canOpenChest()'),false);
 g.tick(0);g.tick(901);run('openStorage()');assert.equal($('#storage').open,true);
});

for(const size of [4,6,8])test(`${size}x${size}: heart anchors use the same map coordinates and viewBox as both sprites`,()=>{
 const g=delivery({size}),{run,$}=g;g.give.onclick();const cell=run('pos'),cx=cell%size*60+30,cy=Math.floor(cell/size)*60+30;
 const from=run('heartFlightPose(pos,0)'),to=run('heartFlightPose(pos,.8)');
 assert.equal(from.x,cx+13);assert.equal(from.y,cy+11-20*.72);
 assert.equal(to.x,cx-14);assert.equal(to.y,cy+12-25*.72);
 assert.equal($('#heart-flight').attrs.viewBox,`-12 -32 ${size*60+24} ${size*60+44}`);
});

test('restart cancels the flight and old frames cannot reward the new adventure',()=>{
 const g=delivery(),{run,$,tick}=g;g.give.onclick();tick(0);tick(300);run('start()');g.give.onclick();tick(2000);
 assert.equal(run('hearts'),3);assert.equal(run('done.size'),0);assert.equal(run('heartFlight'),null);
 assert.equal(Object.hasOwn($('#heart-flight').attrs,'hidden'),true);assert.equal(g.pendingFrames(),0);assert.equal(run('loot.consumedItemIds.length'),0);
});

for(const action of ['setView("fpv")','$("#menu-toggle").onclick()','$("#reveal").onchange()'])test(`${action} cleans up the effect without changing its reward`,()=>{
 const g=delivery();g.give.onclick();g.tick(0);g.run(action);g.tick(2000);
 assert.equal(g.run('hearts'),4);assert.equal(g.run('hasKey'),true);assert.equal(g.run('heartFlight'),null);
 assert.equal(Object.hasOwn(g.$('#heart-flight').attrs,'hidden'),true);assert.equal(g.pendingFrames(),0);
});

for(const [label,options,mode] of [['FPV',{},'fpv'],['reduced motion',{reducedMotion:true},'map'],['no RAF',{animation:false},'map']])
 test(`${label}: delivery rewards immediately without a flight`,()=>{
  const g=delivery(options,mode);g.give.onclick();
  assert.equal(g.run('hearts'),4);assert.equal(g.run('heartFlight'),null);assert.equal(g.pendingFrames(),0);
  assert.equal(Object.hasOwn(g.$('#heart-flight').attrs,'hidden'),true);assert.equal(g.run('loot.consumedItemIds.length'),1);
 });

test('bypassing a wolf starts only its walk, never a heart transfer',()=>{
 const g=game({animation:true}),{run,$}=g;
 run('closeEvent();pos=Number(Object.keys(encounters).find(id=>isEnemy(encounters[id])));render();showEvent()');$('#dialogue-next').onclick();
 const all=node=>[node,...node.children.flatMap(all)],controls=[...all($('#answers')),...all($('#dialogue-actions'))],e=run('encounters[pos]');
 for(let i=0;i<e.count;i++)controls.find(b=>b.dataset.wolfDir===String(e.direction)).onclick();
 controls.find(b=>b.dataset.wolfAction==='submit').onclick();
 assert.equal(run('hearts'),3);assert(run('fleeing'));assert.equal(run('heartFlight'),null);assert.equal(Object.hasOwn($('#heart-flight').attrs,'hidden'),true);
 run('startHeartFlight(pos)');assert.equal(run('heartFlight'),null);
});
