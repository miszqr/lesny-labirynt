const { test } = require('node:test');
const assert = require('node:assert/strict');
const { game } = require('./helpers/game.cjs');
const { corridor, neighbor } = require('../fpv.js');

test('turning in FPV rotates in place; keyboard and buttons agree, and map controls are restored', () => {
  const { $, run, buttons, events } = game();
  run('closeEvent();setView("fpv")');
  const pos = run('pos'), facing = run('facing'), explored = run('visited.size');
  assert.equal(buttons[1].textContent, '↷'); assert.equal(buttons[3].attrs['aria-label'], 'Obróć się w lewo');
  for (let i = 0; i < 4; i++) buttons[1].onclick();
  assert.equal(run('pos'), pos); assert.equal(run('facing'), facing); assert.equal(run('visited.size'), explored);
  const key = (key, repeat=false) => events.keydown({ key, repeat, target: { tagName: 'BODY' }, preventDefault() {} });
  key('ArrowLeft'); assert.equal(run('facing'), (facing+3)%4);
  key('ArrowLeft', true); assert.equal(run('facing'), (facing+3)%4);
  key('ArrowRight'); assert.equal(run('facing'), facing);
  $('#menu').showModal(); key('ArrowRight'); assert.equal(run('facing'), facing); $('#menu').close();
  $('#view-toggle').onclick(); assert.equal(run('viewMode'), 'map');
  assert.equal(buttons[1].textContent, '→'); assert.equal(buttons[3].attrs['aria-label'], 'Idź w lewo');
  assert.equal($('#fpv-hint').hidden, true);
});

for (let facing = 0; facing < 4; facing++) test(`FPV forward and backward respect facing ${facing}, links and row boundaries`, () => {
  const { $, run, buttons } = game();
  run(`closeEvent();encounters={};gateOpen=true;viewMode='fpv';facing=${facing};pos=5;maze.exit=15;maze.cells[5].links=[1,6,9,4];for(const id of [1,6,9,4])maze.cells[id].links=[5];render()`);
  const next = [1,6,9,4][facing];
  buttons[0].onclick(); assert.equal(run('pos'), next); assert.equal(run('facing'), facing);
  run('closeEvent()'); buttons[2].onclick(); assert.equal(run('pos'), 5); assert.equal(run('facing'), facing);
  run('maze.cells[pos].links=[];render()'); assert.equal(buttons[0].disabled, true);
  buttons[0].onclick(); assert.equal(run('pos'), 5);
  assert.equal(neighbor({n:4},3,1),-1); assert.equal(neighbor({n:4},4,3),-1);
});

test('view switching preserves maze, hearts, key, completed tasks, and wolf draft plus dialogue stage', () => {
  const { $, run } = game();
  run('closeEvent();pos=Number(Object.keys(encounters).find(id=>encounters[id].danger));hearts=7;hasKey=true;encounters[pos].steps=[3,3];render();showEvent()');
  $('#dialogue-next').onclick();
  const before = run('JSON.stringify({maze,pos,hearts,hasKey,gateOpen,steps:encounters[pos].steps,visited:[...visited],done:[...done]})');
  const line=$('#description').textContent;
  run('setView("fpv")'); assert.equal($('#answers').hidden,false); assert.equal($('#description').textContent,line);
  assert.match($('#map').innerHTML,/data-character="animal"/);
  run('setView("map");setView("fpv")');
  assert.equal(run('JSON.stringify({maze,pos,hearts,hasKey,gateOpen,steps:encounters[pos].steps,visited:[...visited],done:[...done]})'),before);
  const pos=run('pos'),facing=run('facing');
  run('closeEvent();handleDirection(0)'); assert.equal(run('pos'),pos);
  run('closeEvent();handleDirection(1)'); assert.equal(run('facing'),(facing+1)%4);
  assert.equal(run('pos'),pos, 'looking around a wolf does not bypass its task');
});

for(const side of [0,1]) test(`FPV gate blocks crossing from endpoint ${side} until opened, then renders an open wicket`, () => {
  const { $, run } = game();
  run(`closeEvent();viewMode='fpv';encounters={};pos=maze.gate[${side}];facing=[0,1,2,3].find(d=>target(d)===maze.gate[${1-side}]);render()`);
  const start=run('pos'), destination=run(`maze.gate[${1-side}]`);
  assert.match($('#map').innerHTML,/data-fpv-gate="closed"/);
  run('handleDirection(0)'); assert.equal(run('pos'),start); assert.equal($('#event').open,true);
  run('hasKey=true;render();showEvent()');
  $('#answers').children.find(b=>b.textContent==='🔑 Otwórz furtkę').onclick();
  assert.equal(run('gateOpen'),true); assert.match($('#map').innerHTML,/data-fpv-gate="open"/);
  run('closeEvent();handleDirection(0)'); assert.equal(run('pos'),destination);
});

test('FPV visibility stops at walls and closed gates, including side gate placement', () => {
  const maze={n:4,gate:[9,5],cells:Array.from({length:16},(_,id)=>({id,links:[]}))};
  for(const [a,b] of [[13,9],[9,5],[5,1],[9,10]]){maze.cells[a].links.push(b);maze.cells[b].links.push(a)}
  assert.deepEqual(corridor(maze,13,0,false).map(r=>r.cell),[13,9]);
  assert.deepEqual(corridor(maze,13,0,true).map(r=>r.cell),[13,9,5,1]);
  assert.equal(corridor(maze,9,1,false)[0].leftGate,true);
  assert.equal(corridor(maze,9,3,false)[0].rightGate,true);
  assert.equal(corridor(maze,13,3,false).length,1);
});

test('FPV reaches the same home scene, keeps the greeting, and new game preserves selected view', () => {
  const { $, run }=game();
  run('closeEvent();setView("fpv");pos=maze.exit;render();showEvent()');
  assert.match($('#map').attrs['aria-label'],/siostrą/);
  $('#dialogue-next').onclick(); assert.equal($('#description').textContent,'Dobrze cię widzieć!');
  run('start()'); assert.equal(run('viewMode'),'fpv'); assert.equal(run('hearts'),3);
  assert.match($('#map').attrs['aria-label'],/Widok z oczu Adama/);
  assert.equal(run('maze.cells[pos].links.includes(target(facing))'),true);
});

test('FPV scenes render finite SVG for every cell and orientation on every map size', () => {
  const { $,run }=game();
  for(const size of [4,6,8]){
    $('#size').value=String(size);run('start();closeEvent();viewMode="fpv"');
    for(let pos=0;pos<size*size;pos++)for(let dir=0;dir<4;dir++){
      run(`pos=${pos};facing=${dir};won=false;renderScene()`);
      assert(!/NaN|Infinity|undefined/.test($('#map').innerHTML));
      assert.match($('#map').innerHTML,new RegExp(`data-fpv-cell="${pos}"`));
    }
  }
});
