const {test}=require('node:test');
const assert=require('node:assert/strict');
const {game,supplyFixture}=require('./helpers/game.cjs');
const all=node=>[node,...node.children.flatMap(all)];

test('generated characters and relocated wolves have explicit categories; only friends request items',()=>{
 const g=game(),{run}=g;
 for(const animal of run('bank')){
  const e=run(`createEncounter(bank.find(a=>a.id==='${animal.id}'))`);
  assert.equal(e.category,'friendly');assert.equal('danger' in e,false);
 }
 for(let i=0;i<20;i++){
  const wolf=run('createWolf()');assert.equal(wolf.category,'enemy');assert.equal('danger' in wolf,false);
  assert.equal(run('createWolf(createWolf()).category'),'enemy');
 }
 const requests=run('loot.requests'),encounters=run('encounters');
 for(const r of requests)assert.equal(encounters[r.cell].category,'friendly');
 assert.equal(requests.length,Object.values(encounters).filter(e=>e.category==='friendly').length);
 run(`{const e=createEncounter(bank[0]);e.icon='🐺';encounters={5:e};pos=5;maze.exit=15;closeEvent();render()}`);
 assert.equal(run('dangerPending()'),false);assert.equal(run('canTalk()'),true,'category, not artwork, defines behavior');
 assert.match(g.$('#map').innerHTML,/data-category="friendly"/);
});

test('an old delivery action cannot consume an item or reward a character that is now an enemy',()=>{
 const g=game(),{run,$}=g;
 run('closeEvent();pos=keeper');supplyFixture(g);run('render();showEvent()');$('#dialogue-next').onclick();
 const give=$('#answers').children.find(b=>b.className==='give-item'),before=run('JSON.stringify(loot)');assert(give);
 run('encounters[pos].category=CATEGORY.ENEMY');give.onclick();give.onclick();
 assert.equal(run('hearts'),3);assert.equal(run('JSON.stringify(loot)'),before);assert.equal(run('hasKey'),false);
});

for(const mode of ['map','fpv'])test(`${mode}: repeated successful enemy encounters cannot restore or farm hearts`,()=>{
 const {$,run}=game();run(`closeEvent();viewMode='${mode}';hearts=1`);
 for(let i=0;i<12;i++){
  run('closeEvent();pos=Number(Object.keys(encounters).find(id=>isEnemy(encounters[id])));facing=1;render();showEvent()');$('#dialogue-next').onclick();
  const e=run('encounters[pos]'),controls=all($('#answers'));
  for(let step=0;step<e.count;step++)controls.find(b=>b.dataset.wolfDir===String(e.direction)).onclick();
  const submit=controls.find(b=>b.dataset.wolfAction==='submit');submit.onclick();submit.onclick();
  assert.equal(run('hearts'),1);assert.equal(run('lost'),false);assert.equal(run('fleeing'),null);
  assert.equal(run('Object.values(encounters).filter(isEnemy).length'),1);
  assert.equal(run('Object.values(encounters).find(isEnemy).category'),'enemy');
  assert.match($('#items').innerHTML,/Serduszka: 1/);
 }
});
