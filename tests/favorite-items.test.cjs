const { test } = require('node:test');
const assert = require('node:assert/strict');
const { game, supplyFixture } = require('./helpers/game.cjs');

test('every animal draws one stable request from its favorite item definitions', () => {
  const { run } = game();
  const animals = run('bank'), catalog = run('itemCatalog');
  assert.equal(new Set(animals.map(a => a.id)).size, 6);
  assert.equal(new Set(Object.values(catalog).map(item => item.icon)).size, Object.keys(catalog).length);
  for (let i = 0; i < animals.length; i++) {
    const seen = new Set();
    assert.equal(animals[i].favorites.length, 3);
    for (let attempt = 0; attempt < 200; attempt++) {
      const e = run(`createEncounter(bank[${i}])`);
      assert(animals[i].favorites.includes(e.answer));
      assert(catalog[e.answer]?.icon && catalog[e.answer]?.label);
      assert.equal(e.text, `Chcę ${catalog[e.answer].word}. Daj mi ${catalog[e.answer].word}.`);
      seen.add(e.answer);
    }
    assert.equal(seen.size, 3, `${animals[i].id}: all favorites are reachable`);
  }
});

test('favorite request stays stable; a held item awards the key and one heart only once', () => {
  const g=game(), { $, run } = g;
  for (let i=0;i<6;i++) {
    run(`start();closeEvent();pos=keeper;encounters[pos]=createEncounter(bank[${i}]);visited.add(pos)`);
    supplyFixture(g); run('render();showEvent()');
    $('#dialogue-next').onclick();
    const e=run('encounters[pos]'), item=run(`itemCatalog['${e.answer}']`);
    assert.equal($('#description').textContent, `Dam ci klucz, jeśli dasz mi ${item.word}.`);
    const correct=$('#answers').children.find(b=>b.dataset.item===e.answer);
    assert.equal(correct.attrs['aria-label'],`Daj ${item.word}`);
    assert.equal(correct.children[0].textContent,`Daj ${item.word}`);
    run('closeEvent()');correct.onclick();assert.equal(run('hearts'),3,'closed dialogue rejects stale delivery');
    run('render();showEvent()');$('#dialogue-next').onclick();
    $('#answers').children.find(b=>b.dataset.item===e.answer).onclick();correct.onclick();
    assert.equal(run('hearts'),4);assert.equal(run('hasKey'),true);assert.equal($('#event').open,false);
    assert.equal(run(`ForestLoot.count(loot,'${e.answer}')`),0);
    run('showEvent()');assert.match($('#description').textContent,/Dziękuję/);assert.equal($('#answers').children.length,0);
    assert.equal(run('ForestLoot.invariant(loot)'),true);
  }
});

function wolfGame(count = 3, direction = 3) {
  const g = game();
  g.run(`closeEvent();pos=Number(Object.keys(encounters).find(id=>(encounters[id].category==="enemy")));encounters[pos].count=${count};encounters[pos].direction=${direction};render();showEvent()`);
  const all = node => [node, ...node.children.flatMap(all)];
  g.control = key => [...all(g.$('#answers')),...all(g.$('#dialogue-actions'))].find(b => b.dataset.wolfAction === key || b.dataset.wolfDir === String(key));
  g.progress = () => all(g.$('#answers')).find(b => b.className === 'wolf-progress');
  return g;
}

test('wolf draws every count and direction and spells out the matching instruction', () => {
  const { run } = game(), seen = new Set();
  const words = ['', 'jeden krok', 'dwa kroki', 'trzy kroki', 'cztery kroki', 'pięć kroków'];
  const directions = ['w górę', 'w prawo', 'w dół', 'w lewo'];
  for (let i = 0; i < 250; i++) {
    run('start()');
    const e = run('Object.values(encounters).find(e=>(e.category==="enemy"))');
    assert(e.count >= 1 && e.count <= 5);
    assert(e.direction >= 0 && e.direction < 4);
    assert.equal(e.text, `To groźny wilk. Skocz ${words[e.count]} ${directions[e.direction]}.`);
    assert.equal(e.steps.length, 0);
    seen.add(`${e.count}:${e.direction}`);
  }
  assert.equal(seen.size, 20);
});

for (let direction = 0; direction < 4; direction++) for (let count = 1; count <= 5; count++) {
  test(`wolf accepts ${count} repeated arrow clicks in direction ${direction} only after confirmation`, () => {
    const { $, run, control, progress } = wolfGame(count, direction);
    const originalPos = run('pos');
    assert.equal($('#answers').hidden, true);
    control(direction).onclick(); assert.equal(run('encounters[pos].steps.length'), 0);
    $('#dialogue-next').onclick();
    assert.equal(control('submit').disabled, true);
    control('submit').onclick(); assert.equal(run('hearts'), 3);
    for (let i = 0; i < count; i++) control(direction).onclick();
    assert.equal(progress().children.length, count);
    assert(progress().children.every(b => b.textContent === ['↑', '→', '↓', '←'][direction]));
    assert.equal(run('hearts'), 3); assert.equal(run('dangerPending()'), true);
    assert.equal(run('pos'), originalPos);
    const submit = control('submit'); submit.onclick(); submit.onclick();
    assert.equal(run('hearts'), 3); assert.equal(run('dangerPending()'), false);
    assert.equal($('#event').open, false); assert.equal(run('pos'), originalPos);
  });
}

test('wolf draft survives reopening, undo is free, and a closed dialogue still blocks movement', () => {
  const { $, run, control, progress } = wolfGame(); $('#dialogue-next').onclick();
  control(3).onclick(); control(1).onclick(); control('undo').onclick();
  assert.equal(run('encounters[pos].steps.join()'), '3'); assert.equal(run('hearts'), 3);
  const previous = control(3), originalPos = run('pos');
  run('closeEvent()'); previous.onclick();
  assert.equal(run('encounters[pos].steps.length'), 1);
  run('move(0)'); assert.equal(run('pos'), originalPos); $('#dialogue-next').onclick();
  assert.equal(progress().children[0].textContent, '←');
  previous.onclick(); assert.equal(run('encounters[pos].steps.length'), 1);
  control(3).onclick(); control(3).onclick(); control('submit').onclick();
  assert.equal(run('hearts'), 3);
});

for (const sequence of [[3, 3], [3, 3, 3, 3], [1, 1, 1], [3, 1, 3]]) {
  test(`wrong wolf sequence ${sequence} costs one heart on submit and clears the draft`, () => {
    const { $, run, control } = wolfGame(); $('#dialogue-next').onclick();
    sequence.forEach(direction => control(direction).onclick());
    assert.equal(run('hearts'), 3);
    const oldSubmit = control('submit'); oldSubmit.onclick(); oldSubmit.onclick();
    assert.equal(run('hearts'), 2); assert.equal(run('encounters[pos].steps.length'), 0);
    assert.equal(run('dangerPending()'), true); assert.equal(control('submit').disabled, true);
    assert.equal($('#answers').hidden, false); assert.match($('#notice').textContent, /Spróbuj jeszcze raz/);
    assert.equal($('#dialogue-next').hidden, true); assert.equal(run('requiredTaskOpen()'), true);
    for (let i = 0; i < 3; i++) control(3).onclick(); control('submit').onclick();
    assert.equal(run('hearts'), 2); assert.equal(run('dangerPending()'), false);
  });
}

test('wolf loss, bounded input, undo to empty, and restarting reset the task', () => {
  const { $, run, control } = wolfGame(); $('#dialogue-next').onclick();
  for (let i = 0; i < 15; i++) control(0).onclick();
  assert.equal(run('encounters[pos].steps.length'), 10); assert.equal(control(0).disabled, true);
  for (let i = 0; i < 10; i++) control('undo').onclick();
  assert.equal(control('submit').disabled, true); assert.equal(control(0).disabled, false);
  for (let i = 0; i < 3; i++) { control(0).onclick(); control('submit').onclick(); }
  assert.equal(run('hearts'), 0); assert.equal(run('lost'), true);
  assert.equal($('#answers').children.length, 0); assert.equal($('#next').hidden, false);
  assert.equal(run('requiredTaskOpen()'), false); assert.equal($('#dialogue-next').hidden, false);
  const originalPos = run('pos'); run('closeEvent();move(0)'); assert.equal(run('pos'), originalPos);
  run('start()'); assert.equal(run('lost'), false); assert.equal(run('hearts'), 3);
  assert.equal(run('Object.values(encounters).find(e=>(e.category==="enemy")).steps.length'), 0);
});
