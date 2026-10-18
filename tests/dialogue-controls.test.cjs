const { test } = require('node:test');
const assert = require('node:assert/strict');
const { game } = require('./helpers/game.cjs');

test('Dalej advances the introduction and closes its final line', () => {
  const { $, run } = game();
  assert.equal($('#event').open, true);
  assert.equal($('#dialogue-next').hidden, false);
  $('#dialogue-next').onclick();
  assert.match($('#description').textContent, /Zdobędę klucz/);
  assert.equal($('#dialogue-next').hidden, false);
  $('#dialogue-next').onclick();
  assert.equal($('#event').open, false);
  const stage = run('dialogueIndex');
  $('#dialogue-next').onclick();
  assert.equal(run('dialogueIndex'), stage);
});

test('outside clicks neither close nor advance a conversation and are consumed', () => {
  const { $, run, events } = game();
  const inside = {};
  $('#event').contains = node => node === inside;
  const before = run('pos');
  let prevented = 0, stopped = 0;
  const click = target => events.click({ target,
    preventDefault() { prevented++; }, stopImmediatePropagation() { stopped++; } });
  click({});
  assert.equal($('#event').open, true);
  assert.equal(run('dialogueIndex'), 0);
  assert.equal(run('pos'), before);
  assert.equal(prevented, 1); assert.equal(stopped, 1);
  click(inside);
  assert.equal(prevented, 1); assert.equal(stopped, 1);
  $('#dialogue-next').onclick(); $('#dialogue-next').onclick(); click({});
  assert.equal(prevented, 1); assert.equal(stopped, 1);
});

test('Dalej closes an unanswered task without solving it; it can be reopened', () => {
  const { $, run } = game();
  run('closeEvent();pos=keeper;render();showEvent()');
  $('#dialogue-next').onclick();
  assert.match($('#description').textContent, /^Dam ci klucz, jeśli /);
  assert.equal($('#answers').hidden, false);
  assert.equal($('#dialogue-next').hidden, false);
  const text = $('#description').textContent;
  $('#dialogue-next').onclick();
  assert.equal($('#event').open, false);
  assert.equal(run('hasKey'), false);
  assert.equal(run('done.has(pos)'), false);
  $('#interact').onclick(); $('#dialogue-next').onclick();
  assert.equal($('#description').textContent, text);
});

test('wolf task stays open until completed; Dalej, Escape and native cancel cannot dismiss it', () => {
  const { $, run, events } = game();
  run('closeEvent();pos=Number(Object.keys(encounters).find(id=>(encounters[id].category==="enemy")));render();showEvent()');
  assert.equal($('#dialogue-next').hidden, false, 'introduction still advances');
  $('#dialogue-next').onclick();
  const all = node => [node, ...node.children.flatMap(all)];
  const controls = [...all($('#answers')),...all($('#dialogue-actions'))];
  assert.equal($('#dialogue-next').hidden, true);
  assert.equal(controls.some(b => b.className === 'wolf-hint'), false);
  assert.equal(controls.find(b => b.dataset.wolfAction === 'submit').textContent, 'Skaczę');
  controls.find(b => b.dataset.wolfDir === '1').onclick();
  $('#dialogue-next').onclick();
  let prevented=0;
  events.keydown({key:'Escape',target:{tagName:'BUTTON'},preventDefault(){prevented++}});
  $('#event').oncancel({preventDefault(){prevented++}});
  assert.equal(prevented, 2);
  assert.equal($('#event').open, true);
  assert.equal(run('encounters[pos].steps.length'), 1);
  assert.equal(run('hearts'), 3);
  controls.find(b => b.dataset.wolfAction === 'undo').onclick();
  const e=run('encounters[pos]');
  for(let i=0;i<e.count;i++)controls.find(b=>b.dataset.wolfDir===String(e.direction)).onclick();
  controls.find(b=>b.dataset.wolfAction==='submit').onclick();
  assert.equal($('#event').open, false);
  assert.equal(run('hearts'), 3);
});

for (const [direction, key] of ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].entries()) {
  test(`map keyboard ${key} moves Adam and keeps the on-screen controls`, () => {
    const { $, run, events, buttons } = game();
    $('#dialogue-next').onclick(); $('#dialogue-next').onclick();
    run('pos=5;maze.exit=15;encounters={};done=new Set();gateOpen=true;maze.cells[5].links=[1,6,9,4];render()');
    let prevented = false;
    events.keydown({ key, target: { tagName: 'BUTTON' }, preventDefault() { prevented = true; } });
    assert.equal(run('pos'), [1, 6, 9, 4][direction]);
    assert.equal(prevented, true);
    assert.equal(buttons.length, 4);
    assert(buttons.every(button => typeof button.onclick === 'function'));
  });
}

test('keyboard respects an open conversation, menu and form controls', () => {
  const { $, run, events } = game();
  const before = run('pos');
  const key = tagName => events.keydown({ key: 'ArrowUp', target: { tagName }, preventDefault() {} });
  key('BODY'); assert.equal(run('pos'), before);
  $('#dialogue-next').onclick(); $('#dialogue-next').onclick();
  run('pos=5;maze.exit=15;encounters={};gateOpen=true;maze.cells[5].links=[1];render()');
  for (const tag of ['SELECT', 'INPUT', 'TEXTAREA']) { key(tag); assert.equal(run('pos'), 5); }
  $('#menu').showModal(); key('BODY'); assert.equal(run('pos'), 5);
  $('#menu').close(); key('BODY'); assert.equal(run('pos'), 1);
});

for(const mode of ['map','fpv'])test(`${mode}: footer actions follow the dialogue stage and are cleared for other encounters`,()=>{
  const {$,run}=game();
  const descendants=node=>[node,...node.children.flatMap(descendants)];
  run(`closeEvent();pos=Number(Object.keys(encounters).find(id=>isEnemy(encounters[id])));viewMode='${mode}';render();showEvent()`);
  assert.equal($('#dialogue-actions').hidden,true);
  assert.equal(descendants($('#answers')).some(b=>b.dataset.wolfAction),false,'submit and undo are outside the scrollable task');
  assert.equal(descendants($('#dialogue-actions')).filter(b=>b.dataset.wolfAction).length,2);
  $('.bubble-scroll').scrollTop=200;
  $('#dialogue-next').onclick();
  assert.equal($('#dialogue-actions').hidden,false);assert.equal($('.bubble-scroll').scrollTop,0);
  const arrow=descendants($('#answers')).find(b=>b.dataset.wolfDir==='0');arrow.onclick();
  const undo=descendants($('#dialogue-actions')).find(b=>b.dataset.wolfAction==='undo');undo.onclick();
  assert.equal(run('encounters[pos].steps.length'),0);
  assert.equal($('#dialogue-next').hidden,true);
  $('#dialogue-next').onclick();assert.equal($('#event').open,true);assert.equal($('#dialogue-actions').hidden,false);
  run('closeEvent();pos=keeper;render();showEvent()');$('#dialogue-next').onclick();
  assert.equal($('#dialogue-actions').children.length,0,'wolf footer does not leak into a friendly conversation');
  run('start()');assert.equal($('#dialogue-actions').children.length,0);assert.equal($('#dialogue-actions').hidden,true);
});
