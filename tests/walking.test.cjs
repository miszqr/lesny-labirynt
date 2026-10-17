const { test } = require('node:test');
const assert = require('node:assert/strict');
const { game } = require('./helpers/game.cjs');

function walkGame(options) {
  const g=game({ animation:true, ...options });
  g.run('closeEvent();pos=5;maze.exit=15;maze.gate=[14,15];maze.cells[5].links=[6];maze.cells[6].links=[5,7];encounters={};visited=new Set([5]);render()');
  return g;
}

test('a map step moves between the endpoints before committing; extra input cannot skip a cell', () => {
  const { $,run,tick,buttons,pendingFrames }=walkGame();
  run('move(1)'); assert.equal(run('pos'),5); assert.equal(pendingFrames(),1);
  assert(buttons.every(b=>b.disabled)); assert.equal($('#interact').disabled,true);
  run('move(1);handleDirection(1)'); assert.equal(run('walking.to'),6);
  tick(0); const start=$('#map [data-character="adam"]').attrs.transform;
  tick(45); const middle=$('#map [data-character="adam"]').attrs.transform;
  assert.notEqual(middle,start); assert.match(middle,/translate\(/);
  assert.notEqual($('#map [data-character="adam"] [data-walk-part="left-leg"]').attrs.transform,
    $('#map [data-character="adam"] [data-walk-part="right-leg"]').attrs.transform);
  tick(360); assert.equal(run('pos'),6); assert.equal(run('walking'),null); assert.equal(pendingFrames(),0);
  assert.equal(run('visited.has(6)'),true); assert.equal($('#interact').disabled,false);
});

test('conversation icon appears after arrival; clicking it opens the friendly dialogue', () => {
  const { $,run,tick }=walkGame();
  run('encounters[6]=createEncounter(bank[0]);move(1)');
  assert.equal($('#event').open,false); tick(0);tick(180); assert.equal($('#event').open,false);
  assert.equal($('#talk').hidden,true);
  tick(360); assert.equal($('#event').open,false); assert.equal($('#talk').hidden,false);
  $('#talk').onclick(); assert.equal($('#event').open,true); assert.equal($('#description').textContent,'Cześć! Jak ci pomóc?');
  assert.equal(run('hearts'),3); assert.equal(run('done.size'),0);
});

test('blocked paths, closed gates, and unresolved wolves cannot start a walk', () => {
  const { run,pendingFrames }=walkGame();
  run('move(0)'); assert.equal(pendingFrames(),0); assert.equal(run('pos'),5);
  run('maze.gate=[5,6];move(1)'); assert.equal(pendingFrames(),0); assert.equal(run('pos'),5);
  run('closeEvent();gateOpen=true;encounters[5]={category:"enemy",icon:"🐺",text:"Skocz jeden krok w prawo.",count:1,direction:1,steps:[]};move(1)');
  assert.equal(pendingFrames(),0); assert.equal(run('pos'),5);
});

test('restarting cancels a pending frame without moving the new game', () => {
  const { run,tick,pendingFrames }=walkGame();
  run('move(1)');tick(0);tick(100);run('start()');
  const pos=run('pos');tick(900);assert.equal(run('pos'),pos);assert.equal(run('walking'),null);assert.equal(pendingFrames(),0);
});

test('switching to FPV or opening the menu finishes the current step exactly once', () => {
  for(const action of ['setView("fpv")', '$("#menu-toggle").onclick()']){
    const { $,run,tick,pendingFrames }=walkGame();
    run('move(1)');tick(0);run(action);assert.equal(run('pos'),6);assert.equal(pendingFrames(),0);
    tick(600);assert.equal(run('pos'),6);
    if(action.startsWith('setView'))assert.match($('#map').attrs['aria-label'],/Widok z oczu/);
    else assert.equal($('#menu').open,true);
  }
});

test('reduced motion and FPV keep immediate movement; home opens only after arrival', () => {
  const reduced=walkGame({ reducedMotion:true });reduced.run('move(1)');assert.equal(reduced.run('pos'),6);assert.equal(reduced.pendingFrames(),0);
  const fpv=walkGame();fpv.run('setView("fpv");facing=1;handleDirection(0)');assert.equal(fpv.run('pos'),6);assert.equal(fpv.pendingFrames(),0);
  const home=walkGame();home.run('maze.exit=6;move(1)');assert.equal(home.run('won'),false);
  home.tick(0);home.tick(360);assert.equal(home.run('won'),true);assert.match(home.$('#map').attrs['aria-label'],/siostrą/);
});
