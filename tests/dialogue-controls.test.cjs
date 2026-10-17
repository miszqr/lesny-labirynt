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

test('wolf uses Skaczę and keeps the draft when closed with Dalej', () => {
  const { $, run } = game();
  run('closeEvent();pos=Number(Object.keys(encounters).find(id=>encounters[id].danger));render();showEvent()');
  $('#dialogue-next').onclick();
  const all = node => [node, ...node.children.flatMap(all)];
  const controls = all($('#answers'));
  assert.equal(controls.find(b => b.dataset.wolfAction === 'submit').textContent, 'Skaczę');
  controls.find(b => b.dataset.wolfDir === '1').onclick();
  $('#dialogue-next').onclick();
  assert.equal($('#event').open, false);
  assert.equal(run('encounters[pos].steps.length'), 1);
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
