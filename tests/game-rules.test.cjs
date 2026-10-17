const { test } = require('node:test');
const assert = require('node:assert/strict');
const { game } = require('./helpers/game.cjs');
const { testSeeds, withSeed } = require('./helpers/random.cjs');
const { explore, route, direction } = require('./helpers/routes.cjs');

const descendants = node => [node, ...node.children.flatMap(descendants)];

function player(size, seed) {
  const g = game({ size, seed }), { $, run, buttons } = g;
  let rewards = 0, mistakes = 0;
  const maze = run('maze');
  const wolfEntries = Object.entries(run('encounters')).filter(([, e]) => e.danger);
  assert.equal(wolfEntries.length, 1);
  const wolf = Number(wolfEntries[0][0]);
  assert(Number.isInteger(wolf) && wolf >= 0 && wolf < size * size);
  assert(route(maze, maze.start, maze.exit).includes(wolf), 'wolf lies on the route home');
  assert.notEqual(wolf, maze.keeper); assert.notEqual(wolf, maze.exit); assert(!maze.gate.includes(wolf));
  run('closeEvent()');
  if (seed % 2 === 0) $('#view-toggle').onclick();

  function readyTask() {
    run('closeEvent()'); $('#interact').onclick();
    assert.equal($('#event').open, true);
    assert.equal($('#event').dataset.speaker, 'adam');
    assert.equal($('#answers').hidden, true);
    $('#dialogue-next').onclick();
    assert.equal($('#event').dataset.speaker, 'animal');
    assert.equal($('#answers').hidden, false);
  }

  function wolfControl(key) {
    const control = descendants($('#answers')).find(b => b.dataset.wolfAction === key || b.dataset.wolfDir === String(key));
    assert(control, `missing wolf control ${key}`); return control;
  }

  function wrongWolfAnswer() {
    const hearts = run('hearts'), cell = run('pos'), e = run('encounters[pos]');
    wolfControl((e.direction + 1) % 4).onclick();
    assert.equal(run('hearts'), hearts, 'selecting arrows does not cost hearts');
    const submit = wolfControl('submit'); submit.onclick(); submit.onclick();
    mistakes++;
    assert.equal(run('hearts'), hearts - 1, 'one loss per confirmation, including stale double activation');
    assert.equal(run('pos'), cell); assert.equal(run('done.has(pos)'), false);
    assert.equal(run('encounters[pos].steps.length'), 0);
  }

  function solveWolf() {
    assert.equal(run('encounters[pos]?.danger'), true); readyTask();
    const cell = run('pos'), hearts = run('hearts'), visited = run('visited.size');
    run('closeEvent()'); buttons[0].onclick();
    assert.equal(run('pos'), cell, 'closing the wolf dialogue cannot bypass it');
    assert.equal(run('visited.size'), visited); assert.equal(run('hearts'), hearts);
    assert(buttons.filter(b=>run('viewMode')!=='fpv'||[0,2].includes(Number(b.dataset.dir))).every(b => b.disabled), 'wolf blocks walking; FPV can still turn'); assert.equal($('#event').open, true);
    $('#dialogue-next').onclick();
    wrongWolfAnswer();
    assert.equal(run('lost'), false); assert.match($('#notice').textContent, /Spróbuj jeszcze raz/);
    const e = run('encounters[pos]'), before = run('hearts');
    for (let i = 0; i < e.count; i++) wolfControl(e.direction).onclick();
    assert.equal(run('hearts'), before);
    const submit = wolfControl('submit'); submit.onclick(); submit.onclick(); rewards++;
    assert.equal(run('hearts'), before + 1); assert.equal(run('done.has(pos)'), false);
    assert.equal(run('dangerPending()'), false); assert.equal($('#event').open, false);
    assert.equal(run(`animalPresent(${cell})`), false, 'wolf leaves the solved field');
    assert.equal(run('Object.values(encounters).filter(e=>e.danger).length'), 1, 'one wolf remains for the next encounter');
  }

  function step(worldDirection) {
    if (run('viewMode') === 'map') buttons[worldDirection].onclick();
    else {
      for (let turns = 0; run('facing') !== worldDirection && turns < 4; turns++) buttons[1].onclick();
      assert.equal(run('facing'), worldDirection); buttons[0].onclick();
    }
  }

  function travel(to) {
    const path = route(maze, run('pos'), to, run('gateOpen'));
    for (const next of path) {
      if (run('dangerPending()')) solveWolf();
      run('closeEvent()'); const at = run('pos'); step(direction(maze, at, next));
      assert.equal(run('pos'), next, `legal step from ${at} to ${next}`);
      assert.equal(run('visited.has(pos)'), true);
    }
  }

  function helpFriend() {
    const cell = run('pos'), e = run('encounters[pos]');
    assert(e && !e.danger); collectFor(cell); const before = run('hearts'); readyTask();
    const request = run('loot.requests.find(r=>r.cell===pos)'), count = run(`ForestLoot.count(loot,'${e.answer}')`);
    assert(count > 0, 'items were collected through legal travel and chest controls');
    const originalText = $('#description').textContent;
    readyTask(); assert.equal($('#description').textContent, originalText, 'request stays stable after reopening');
    const correct = $('#answers').children.find(b => b.dataset.item === e.answer);
    assert(correct); correct.onclick(); correct.onclick(); rewards++;
    assert.equal(run('hearts'), before + 1); assert.equal(run('done.has(pos)'), true);
    assert.equal($('#event').open, false);
    if (cell === maze.keeper) {
      assert.equal(run('hasKey'), true); assert.match($('#items').innerHTML, /Klucz/);
    }
    assert.equal(run(`ForestLoot.count(loot,'${e.answer}')`), count-1);
    assert.equal(run(`loot.completedRequestIds.includes('${request.id}')`), true);
    run('showEvent()'); assert.equal($('#event').open, true);
    assert.match($('#description').textContent, /Dziękuję/);
    assert.equal($('#answers').children.length, 0, 'completed friend thanks without another delivery');
    assert.equal(run('ForestLoot.invariant(loot)'), true);
    run('closeEvent()');
  }

  function tryClosedGate() {
    const at = maze.gate[0], visited = run('visited.size');
    assert.equal(run('pos'), at); run('closeEvent()'); step(direction(maze, ...maze.gate));
    assert.equal(run('pos'), at); assert.equal(run('visited.size'), visited);
    assert.equal(run('gateOpen'), false); assert.equal($('#event').open, true);
  }

  function openGate() {
    travel(maze.gate[0]); tryClosedGate();
    const button = $('#answers').children.find(b => b.textContent === '🔑 Otwórz furtkę');
    assert(button, 'key enables the open-gate action');
    const before = run('hearts'); button.onclick(); button.onclick();
    assert.equal(run('gateOpen'), true); assert.equal(run('hearts'), before);
  }

  function collectFor(cell) {
    const type=run(`encounters[${cell}].answer`);
    if(!run(`ForestLoot.count(loot,'${type}')`)){
      const state=run('loot'),area=explore(maze,maze.start,run('gateOpen')).parent;
      const chest=state.chests.find(c=>area.has(c.cell)&&c.itemIds.some(id=>state.items[id].typeId===type));
      assert(chest,'reachable matching item remains in a chest');
      travel(chest.cell);run('closeEvent()');$('#interact').onclick();
      if(state.inventoryItemIds.length===2){
        const before=state.inventoryItemIds.length,returned=state.inventoryItemIds[0];
        descendants($('#storage-backpack-grid')).find(b=>b.dataset.putBack===returned).onclick();
        assert.equal(state.inventoryItemIds.length,before-1);assert(chest.itemIds.includes(returned));
      }
      const itemId=chest.itemIds.find(id=>state.items[id].typeId===type);
      descendants($('#storage-grid')).find(b=>b.dataset.take===itemId).onclick();$('#storage-next').onclick();
      assert(state.inventoryItemIds.length<=2);assert(run('ForestLoot.invariant(loot)'));
      travel(cell);
    }
  }

  function gatherEarly() {
    const chest=run('loot.chests[0]');travel(chest.cell);run('closeEvent()');$('#interact').onclick();
    for(let i=0;i<2;i++)descendants($('#storage-grid')).find(b=>b.dataset.take).onclick();
    assert.equal(run('loot.inventoryItemIds.length'),2);assert(chest.itemIds.length>0);
    assert(descendants($('#storage-grid')).filter(b=>b.dataset.take).every(b=>b.disabled));
    $('#storage-next').onclick();
  }

  function reachWolf() {
    const currentWolf=()=>run('Number(Object.keys(encounters).find(id=>encounters[id].danger))');
    if (!explore(maze, maze.start, false).parent.has(currentWolf())) {
      gatherEarly(); travel(maze.keeper); helpFriend(); openGate();
    }
    travel(currentWolf()); readyTask();
  }

  return { ...g, maze, wolf, travel, helpFriend, solveWolf, wrongWolfAnswer, wolfControl,
    tryClosedGate, openGate, reachWolf, gatherEarly, expectedHearts: () => 3 + rewards - mistakes };
}

function checkFreshGame(g, previous) {
  const { $, run, pendingFrames } = g;
  assert.notEqual(run('maze'), previous.maze); assert.notEqual(run('encounters'), previous.encounters);
  assert.notEqual(run('visited'), previous.visited); assert.notEqual(run('done'), previous.done);
  assert.notEqual(run('seenSamples'), previous.seenSamples); assert.notEqual(run('terrain'), previous.terrain);
  assert.equal(run('maze.n'), previous.maze.n); assert.equal(run('viewMode'), previous.mode, 'selected view is a preference');
  assert.equal(run('pos'), run('maze.start')); assert.equal(run('hearts'), 3);
  for (const flag of ['hasKey', 'gateOpen', 'won', 'lost']) assert.equal(run(flag), false, `reset ${flag}`);
  assert.equal(run('loot.inventoryItemIds.length'), 0); assert.equal(run('loot.consumedItemIds.length'), 0); assert.equal(run('loot.completedRequestIds.length'), 0); assert.equal(run('loot.unlockedGateIds.length'), 0); assert.equal($('#storage').open, false);
  assert.equal(run('done.size'), 0); assert.deepEqual(Array.from(run('visited')), [run('pos')]);
  assert.equal(run('seenSamples.size'), 1); assert.equal((run('seenPath').match(/M/g) || []).length, 1);
  assert.equal(run('walking'), null); assert.equal(run('fleeing'), null); assert.equal(pendingFrames(), 0);
  assert.equal(run('Object.values(encounters).find(e=>e.danger).steps.length'), 0);
  assert.equal($('#reveal').checked, false); assert.equal($('#menu').open, false);
  assert.equal($('#notice').textContent, ''); assert.equal($('#next').hidden, true);
  assert.equal($('#answers').children.length, 0); assert.equal($('#answers').hidden, true);
  assert.equal($('#event').open, true); assert.equal(run('dialogueIndex'), 0);
  assert.equal($('#speaker-name').textContent, 'Adam'); assert.match($('#description').textContent, /Mam na imię Adam/);
  assert.doesNotMatch($('#items').innerHTML, /Klucz/); assert.match($('#items').innerHTML, /× 3/);
  assert(g.buttons.some(b => !b.disabled), 'new game allows movement');
}

function snapshot(g) {
  return { maze: g.run('maze'), encounters: g.run('encounters'), visited: g.run('visited'),
    done: g.run('done'), seenSamples: g.run('seenSamples'), terrain: g.run('terrain'), mode: g.run('viewMode') };
}

for (const size of [4, 6, 8]) {
  test(`rules ${size}x${size}: complete seeded journeys, key, gate, single rewards, victory and reset`, () => {
    for (const seed of testSeeds(100)) withSeed(size, seed, 'complete journey', () => {
      const g = player(size, seed), { $, run, maze, travel, helpFriend } = g;
      assert.equal(run('hearts'), 3); assert.equal(run('visited.size'), 1);
      travel(maze.gate[0]); g.tryClosedGate(); assert.equal(run('hasKey'), false);
      assert.equal($('#answers').children.length, 0, 'no unlock action without key');
      g.gatherEarly(); travel(maze.keeper); helpFriend(); g.openGate();
      for (const [cell, e] of Object.entries(run('encounters'))) {
        if (!e.danger && Number(cell) !== maze.keeper) { travel(Number(cell)); helpFriend(); }
      }
      travel(g.wolf); if (run('dangerPending()')) g.solveWolf();
      travel(maze.exit);
      assert.equal(run('won'), true); assert.equal(run('lost'), false);
      assert.equal(run('done.size'), Object.values(run('encounters')).filter(e=>!e.danger).length);
      assert.equal(run('hearts'), g.expectedHearts()); assert(g.buttons.every(b => b.disabled));
      assert.match($('#map').innerHTML, /assets\/home-reunion.png/);
      assert.equal($('#event').dataset.speaker, 'adam'); $('#dialogue-next').onclick();
      assert.equal($('#description').textContent, 'Dobrze cię widzieć!'); assert.equal($('#next').hidden, false);
      run('closeEvent()'); g.buttons[0].onclick(); assert.equal(run('pos'), maze.exit, 'cannot move after victory');
      run('showEvent()'); $('#dialogue-next').onclick();
      $('#reveal').checked = true;
      const previous = snapshot(g); $('#next').onclick(); checkFreshGame(g, previous);
    });
  });

  test(`rules ${size}x${size}: seeded defeats, zero hearts, blocked movement and full menu restart`, () => {
    for (const seed of testSeeds(10)) withSeed(size, seed, 'defeat and restart', () => {
      const g = player(size, seed), { $, run } = g; g.reachWolf();
      const cell = run('pos');
      while (run('hearts') > 0) g.wrongWolfAnswer();
      assert.equal(run('lost'), true); assert.equal(run('won'), false); assert.equal(run('hearts'), 0);
      assert.equal($('#answers').children.length, 0); assert.equal($('#next').hidden, false);
      assert(g.buttons.every(b => b.disabled)); run('closeEvent()');
      for (const button of g.buttons) button.onclick();
      assert.equal(run('pos'), cell); assert.equal(run('hearts'), 0);
      $('#reveal').checked = true; $('#menu-toggle').onclick(); assert.equal($('#menu').open, true);
      const previous = snapshot(g); $('#new').onclick(); checkFreshGame(g, previous);
    });
  });

  test(`rules ${size}x${size}: restarting discards an unfinished wolf answer`, () => {
    const seed = testSeeds(1)[0];
    withSeed(size, seed, 'unfinished answer reset', () => {
      const g = player(size, seed), { $, run } = g; g.reachWolf();
      g.wolfControl(run('encounters[pos].direction')).onclick(); assert.equal(run('encounters[pos].steps.length'), 1);
      $('#reveal').checked = true; $('#menu-toggle').onclick();
      const previous = snapshot(g); $('#new').onclick(); checkFreshGame(g, previous);
    });
  });
}
