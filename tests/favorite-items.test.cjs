const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = process.env.GAME_ROOT || path.resolve(__dirname, '..');

// Minimal DOM: verifies game state and answer content, not browser layout.
function game() {
  const nodes = new Map();
  function element() {
    return { value: '4', open: false, checked: false, hidden: false, textContent: '', children: [], dataset: {}, attrs: {},
      style: { setProperty() {} }, classList: { toggle() {} }, offsetWidth: 300, offsetHeight: 200,
      getBoundingClientRect() { return { x: 100, y: 200, left: 100, top: 200, bottom: 240, width: 360, height: 600 }; },
      setAttribute(k, v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; },
      replaceChildren() { this.children = []; }, append(b) { this.children.push(b); },
      show() { this.open = true; }, close() { this.open = false; } };
  }
  const $ = s => { if (!nodes.has(s)) nodes.set(s, element()); return nodes.get(s); };
  let seed = 123;
  const math = Object.create(Math);
  math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const context = vm.createContext({ Math: math, Set, window: { addEventListener() {} },
    document: { querySelector: $, querySelectorAll: () => [], createElement: element, addEventListener() {} } });
  vm.runInContext(fs.readFileSync(path.join(root, 'maze.js'), 'utf8'), context);
  Object.assign(context, context.window);
  const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  vm.runInContext(source, context);
  return { $, run: code => vm.runInContext(code, context) };
}

test('every animal draws only favorites, with exactly one matching icon among three choices', () => {
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
      assert.equal(e.options.length, 3);
      assert.equal(new Set(e.options).size, 3);
      assert.equal(e.options.filter(id => id === e.answer).length, 1);
      for (const id of e.options) assert(catalog[id]?.icon && catalog[id]?.label);
      assert.equal(e.text, `Chcę ${catalog[e.answer].word}. Daj mi ${catalog[e.answer].word}.`);
      seen.add(e.answer);
    }
    assert.equal(seen.size, 3, `${animals[i].id}: all favorites are reachable`);
  }
});

test('icon answers stay stable when reopened, and correct choice awards the key and one heart', () => {
  const { $, run } = game();
  for (let i = 0; i < 6; i++) {
    run(`start();closeEvent();pos=keeper;encounters[pos]=createEncounter(bank[${i}]);visited.add(pos);render();showEvent()`);
    assert.equal($('#answers').hidden, true);
    $('#dialogue-next').onclick();
    const encounter = run('encounters[pos]'), catalog = run('itemCatalog');
    assert.equal($('#description').textContent, encounter.text + ' Dam ci klucz.');
    const snapshot = () => $('#answers').children.map(b => [b.dataset.item, b.textContent, b.attrs['aria-label']]);
    const before = snapshot();
    for (const b of $('#answers').children) {
      assert.equal(b.textContent, catalog[b.dataset.item].icon);
      assert.equal(b.attrs['aria-label'], catalog[b.dataset.item].label);
      assert.equal(b.className, 'item-answer');
    }
    $('#answers').children.find(b => b.dataset.item !== encounter.answer).onclick();
    assert.equal(run('hearts'), 3);
    assert.equal(run('hasKey'), false);
    run('closeEvent();render();showEvent()'); $('#dialogue-next').onclick();
    assert.deepEqual(snapshot(), before);
    assert.equal($('#description').textContent, encounter.text + ' Dam ci klucz.');
    const correct = $('#answers').children.find(b => b.dataset.item === encounter.answer);
    correct.onclick();
    assert.equal(run('hearts'), 4); assert.equal(run('hasKey'), true); assert.equal($('#event').open, false);
    correct.onclick(); assert.equal(run('hearts'), 4);
    run('showEvent()'); assert.equal($('#event').open, false);
    assert($('#items').innerHTML.includes('Klucz'));
  }
});

function wolfGame(count = 3, direction = 3) {
  const g = game();
  g.run(`closeEvent();pos=Number(Object.keys(encounters).find(id=>encounters[id].danger));encounters[pos].count=${count};encounters[pos].direction=${direction};render();showEvent()`);
  const all = node => [node, ...node.children.flatMap(all)];
  g.control = key => all(g.$('#answers')).find(b => b.dataset.wolfAction === key || b.dataset.wolfDir === String(key));
  g.progress = () => all(g.$('#answers')).find(b => b.className === 'wolf-progress');
  return g;
}

test('wolf draws every count and direction and spells out the matching instruction', () => {
  const { run } = game(), seen = new Set();
  const words = ['', 'jeden krok', 'dwa kroki', 'trzy kroki', 'cztery kroki', 'pięć kroków'];
  const directions = ['w górę', 'w prawo', 'w dół', 'w lewo'];
  for (let i = 0; i < 250; i++) {
    run('start()');
    const e = run('Object.values(encounters).find(e=>e.danger)');
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
    assert.equal(run('hearts'), 4); assert.equal(run('dangerPending()'), false);
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
  assert.equal(run('hearts'), 4);
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
    for (let i = 0; i < 3; i++) control(3).onclick(); control('submit').onclick();
    assert.equal(run('hearts'), 3); assert.equal(run('dangerPending()'), false);
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
  const originalPos = run('pos'); run('closeEvent();move(0)'); assert.equal(run('pos'), originalPos);
  run('start()'); assert.equal(run('lost'), false); assert.equal(run('hearts'), 3);
  assert.equal(run('Object.values(encounters).find(e=>e.danger).steps.length'), 0);
});
