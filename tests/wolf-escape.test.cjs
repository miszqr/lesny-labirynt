const { test } = require('node:test');
const assert = require('node:assert/strict');
const { game } = require('./helpers/game.cjs');

function encounter(mode='map',options={}){
  const g=game({animation:true,...options});
  g.run(`closeEvent();pos=Number(Object.keys(encounters).find(id=>encounters[id].danger));viewMode='${mode}';render();showEvent()`);
  g.$('#dialogue-next').onclick();
  const all=node=>[node,...node.children.flatMap(all)];
  g.control=key=>all(g.$('#answers')).find(b=>b.dataset.wolfAction===key||b.dataset.wolfDir===String(key));
  g.answer=()=>{const e=g.run('encounters[pos]');for(let i=0;i<e.count;i++)g.control(e.direction).onclick();return g.control('submit')};
  return g;
}

for(const mode of ['map','fpv'])test(`${mode}: wolf runs away after a correct answer, rewards once and never returns`,()=>{
  const {$,run,tick,buttons,answer,pendingFrames}=encounter(mode);
  const submit=answer();submit.onclick();submit.onclick();
  assert.equal(run('hearts'),4);assert.equal(run('dangerPending()'),false);assert.equal($('#event').open,false);
  assert.match($('#map').innerHTML,/data-wolf="true"/);assert(buttons.every(b=>b.disabled));
  const position=run('pos');run('handleDirection(0)');assert.equal(run('pos'),position);
  tick(0);const start=$('#map [data-wolf="true"]').attrs.transform;
  tick(400);assert.notEqual($('#map [data-wolf="true"]').attrs.transform,start);
  tick(750);assert.equal(run('fleeing'),null);assert.equal(pendingFrames(),0);
  assert.doesNotMatch($('#map').innerHTML,/data-wolf="true"/);
  run('setView("map");render()');assert.doesNotMatch($('#map').innerHTML,/data-wolf="true"/);
  run('setView("fpv");render()');assert.doesNotMatch($('#map').innerHTML,/data-wolf="true"/);
  assert.equal(run('hearts'),4);
});

test('a wrong answer leaves the wolf in place; reduced motion removes it immediately on success',()=>{
  const wrong=encounter();wrong.control((wrong.run('encounters[pos].direction')+1)%4).onclick();wrong.control('submit').onclick();
  assert.equal(wrong.run('hearts'),2);assert.equal(wrong.run('fleeing'),null);assert.equal(wrong.pendingFrames(),0);
  assert.match(wrong.$('#map').innerHTML,/data-wolf="true"/);
  const reduced=encounter('map',{reducedMotion:true});reduced.answer().onclick();
  assert.equal(reduced.run('hearts'),4);assert.equal(reduced.pendingFrames(),0);
  assert.doesNotMatch(reduced.$('#map').innerHTML,/data-wolf="true"/);
});

test('restart cancels the escape without affecting the new game',()=>{
  const {run,tick,answer,pendingFrames}=encounter();answer().onclick();tick(0);tick(100);run('start()');
  const pos=run('pos');tick(800);assert.equal(run('pos'),pos);assert.equal(run('fleeing'),null);assert.equal(pendingFrames(),0);
  assert.equal(run('done.size'),0);assert.equal(run('hearts'),3);
});

test('switching view or opening the menu safely completes an escape',()=>{
  for(const action of ['setView("fpv")','$("#menu-toggle").onclick()']){
    const {$,run,tick,answer,pendingFrames}=encounter();answer().onclick();tick(0);run(action);tick(900);
    assert.equal(run('fleeing'),null);assert.equal(pendingFrames(),0);assert.equal(run('hearts'),4);
    assert.doesNotMatch($('#map').innerHTML,/data-wolf="true"/);
  }
});

test('half-cell extra sight follows walking without marking the destination as visited early',()=>{
  const {$,run,tick}=game({animation:true});
  run('closeEvent();pos=5;maze.exit=15;maze.gate=[14,15];maze.cells[5].links=[6];encounters={};visited=new Set([5]);render()');
  assert.equal(run('JSON.stringify(sightArea())'),JSON.stringify({x:30,y:30,width:120,height:120}));
  assert.equal(run('visited.size'),1);assert.match($('#map').innerHTML,/mask="url\(#map-fog\)"/);
  run('move(1)');assert.equal(run('visited.has(6)'),false);
  tick(0);assert.equal($('#sight-window').attrs.x,30);assert.equal($('#sight-window-clip').attrs.x,30);
  tick(180);assert.equal($('#sight-window').attrs.x,60);assert.equal($('#sight-window-clip').attrs.x,60);assert.equal($('#sight-window-clip').attrs.y,$('#sight-window').attrs.y);assert.equal(run('visited.has(6)'),false);
  tick(360);assert.equal(run('pos'),6);assert.equal(run('visited.has(6)'),true);
  assert.match($('#map').innerHTML,/id="sight-window" x="90"/);
  $('#reveal').checked=true;$('#reveal').onchange();
  assert.match($('#map').innerHTML,/<g id="seen-area"><rect x="-60" y="-60" width="360" height="360"/);
});
