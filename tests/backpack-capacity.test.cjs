const {test}=require('node:test'),assert=require('node:assert/strict');
const L=require('../loot.js'),{game}=require('./helpers/game.cjs');
const all=node=>[node,...node.children.flatMap(all)];

function fixture(){return {items:{a:{id:'a',typeId:'apple'},b:{id:'b',typeId:'apple'},c:{id:'c',typeId:'ball'}},chests:[{id:'one',itemIds:['a','b','c']},{id:'two',itemIds:[]}],inventoryItemIds:[],consumedItemIds:[],completedRequestIds:[],requests:[{id:'friend',requiredTypeId:'apple'}],keyIds:[],unlockedGateIds:[]}}

test('two copies occupy both places; rejected pickup is unchanged and delivery frees one place',()=>{
 const s=fixture();assert(L.take(s,'one','a'));assert(L.take(s,'one','b'));
 const before=JSON.stringify(s);assert.equal(L.take(s,'one','c'),false);assert.equal(JSON.stringify(s),before);
 assert(L.invariant(s));assert.equal(L.deliver(s,'friend').itemId,'a');assert(L.take(s,'one','c'));
 assert.deepEqual(s.inventoryItemIds,['b','c']);assert(L.invariant(s));
});

test('return preserves identity in any chest, revives an empty chest and never duplicates or resurrects',()=>{
 const s=fixture();L.take(s,'one','a');L.take(s,'one','b');
 assert(L.putBack(s,'two','a'));assert.deepEqual(s.chests[1].itemIds,['a']);assert.equal(L.putBack(s,'two','a'),false);
 assert(L.take(s,'two','a'));assert.equal(s.chests[1].itemIds.length,0);
 const before=JSON.stringify(s);assert.equal(L.putBack(s,'missing','a'),false);assert.equal(L.putBack(s,'one','c'),false);assert.equal(JSON.stringify(s),before);
 assert.equal(L.deliver(s,'friend').itemId,'b');assert.equal(L.putBack(s,'one','b'),false);assert(L.invariant(s));
});

for(const mode of ['map','fpv'])test(`${mode}: return and retake update the chest, backpack and opposite view`,()=>{
 const g=game(),{$,run}=g;run(`closeEvent();setView('${mode}');openStorage(currentChest().id)`);
 all($('#storage-grid')).find(b=>b.dataset.take).onclick();
 const item=run('loot.inventoryItemIds[0]'),stale=all($('#storage-backpack-grid')).find(b=>b.dataset.putBack===item);
 $('#storage-next').onclick();stale.onclick();assert.equal(run('loot.inventoryItemIds.length'),1);
 run('openStorage(currentChest().id)');stale.onclick();assert.equal(run('loot.inventoryItemIds.length'),1);
 const returned=all($('#storage-backpack-grid')).find(b=>b.dataset.putBack===item);returned.onclick();returned.onclick();
 assert.equal(run('loot.inventoryItemIds.length'),0);assert.equal(run(`currentChest().itemIds.filter(id=>id==='${item}').length`),1);
 all($('#storage-grid')).find(b=>b.dataset.take===item).onclick();$('#storage-next').onclick();$('#view-toggle').onclick();
 assert.equal(run('loot.inventoryItemIds[0]'),item);assert.equal($('#backpack-count').textContent,'1 / 2');
 // Another clearing cannot use the old chest's return action, even if invoked programmatically.
 run('openStorage()');const remote=all($('#storage-grid')).find(b=>b.dataset.putBack===item);assert(remote);
 run('pos=keeper');remote.onclick();assert.equal(run('loot.inventoryItemIds.length'),1);
 $('#storage-next').onclick();run('openStorage()');assert.equal(all($('#storage-grid')).some(b=>b.dataset.putBack),false);
 assert.equal(run('ForestLoot.invariant(loot)'),true);
});

test('an empty chest can hold returned items; bulk pickup cannot silently choose a subset',()=>{
 const g=game(),{$,run}=g;run('closeEvent();openStorage(currentChest().id)');
 const chest=run('currentChest()'),allCount=chest.itemIds.length;
 assert.equal($('#take-all').disabled,true);$('#take-all').onclick();assert.equal(chest.itemIds.length,allCount);
 // Layout fixture: keep two items here and move extras to another existing chest.
 run('loot.chests[1].itemIds.push(...currentChest().itemIds.splice(2));renderStorage()');
 assert.equal($('#take-all').disabled,false);$('#take-all').onclick();assert.equal(chest.itemIds.length,0);assert.equal(run('loot.inventoryItemIds.length'),2);
 assert.equal($('#storage-grid').children[0].textContent,'Pusta');
 all($('#storage-backpack-grid')).find(b=>b.dataset.putBack).onclick();assert.equal(chest.itemIds.length,1);
 assert.equal(all($('#storage-grid')).filter(b=>b.dataset.take).length,1);assert.equal(run('loot.inventoryItemIds.length'),1);
 $('#take-all').onclick();assert.equal(chest.itemIds.length,0);assert.equal(run('loot.inventoryItemIds.length'),2);
 assert.equal(run('ForestLoot.invariant(loot)'),true);
});
