const { test } = require('node:test');
const assert = require('node:assert/strict');
const { game } = require('./helpers/game.cjs');

for (const mode of ['map', 'fpv']) {
  test(`${mode}: icon belongs to the friend at Adam's position and opens that conversation`, () => {
    const { $, run } = game();
    run(`closeEvent();pos=5;maze.exit=15;maze.gate=[14,15];gateOpen=true;keeper=6;
      encounters={6:createEncounter(bank[0]),7:createEncounter(bank[1])};done=new Set();
      maze.cells[5].links=[6];maze.cells[6].links=[5,7];viewMode='${mode}';facing=1;render()`);
    assert.equal($('#talk').hidden, true, 'a friend on another clearing cannot be addressed yet');
    run(mode === 'map' ? 'handleDirection(1)' : 'handleDirection(0)');
    assert.equal(run('pos'), 6);
    assert.equal($('#event').open, false, 'a friend waits for the player to start talking');
    assert.equal($('#talk').hidden, false);
    assert.equal($('#talk').attrs['aria-label'], 'Porozmawiaj ze zwierzakiem: Kot');
    assert.match($('#map').innerHTML, /data-encounter="6"/);
    $('#talk').onclick();
    assert.equal($('#event').open, true);
    $('#dialogue-next').onclick();
    assert.match($('#description').textContent, /^Dam ci klucz, jeśli /);
    $('#dialogue-next').onclick();
    assert.equal(run('canTalk()'), true, 'Dalej does not complete the task');
    $('#talk').onclick(); $('#dialogue-next').onclick();
    const answer = run('encounters[pos].answer');
    $('#answers').children.find(b => b.dataset.item === answer).onclick();
    assert.equal($('#talk').hidden, true);
    assert.equal(run('hasKey'), true);
    assert.equal(run('hearts'), 4);
    $('#talk').onclick();
    assert.equal($('#event').open, false, 'completed friends do not reopen their task');
  });
}

test('icon is clamped to the map and hidden for wolves, movement and game end', () => {
  const { $, run } = game();
  run('closeEvent();pos=5;maze.exit=15;encounters={5:createEncounter(bank[0])};render()');
  $('.mapwrap').getBoundingClientRect = () => ({ left: 10, top: 20, width: 300, height: 160 });
  $('#map [data-encounter="5"]').getBoundingClientRect = () => ({ left: 295, top: 22, width: 28, height: 45 });
  run('positionTalk()');
  assert.equal($('#talk').style.left, '256px');
  assert.equal($('#talk').style.top, '0px');
  for (const state of ['walking={}', 'fleeing={}', 'lost=true', 'won=true', 'encounters[5].danger=true']) {
    run(`walking=null;fleeing=null;lost=false;won=false;encounters[5].danger=false;${state};positionTalk()`);
    assert.equal($('#talk').hidden, true, state);
    $('#talk').onclick();
    assert.equal($('#event').open, false, 'stale icon cannot open a conversation');
  }
  run('start()');
  assert.equal($('#talk').hidden, true);
});

test('arrival at a wolf still opens its mandatory encounter', () => {
  const { $, run } = game();
  run(`closeEvent();pos=5;maze.exit=15;maze.cells[5].links=[6];gateOpen=true;
    encounters={6:{danger:true,icon:'🐺',title:'Wilk',text:'Skocz jeden krok w prawo.',count:1,direction:1,steps:[]}};
    done=new Set();render();move(1)`);
  assert.equal($('#event').open, true);
  assert.equal($('#talk').hidden, true);
  assert.equal(run('dangerPending()'), true);
});
