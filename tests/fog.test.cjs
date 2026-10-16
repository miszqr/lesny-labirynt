const { test } = require('node:test');
const assert = require('node:assert/strict');
const { game } = require('./helpers/game.cjs');

function scene(options={}){
  const g=game(options);
  g.run(`closeEvent();pos=5;maze.exit=15;maze.gate=[14,15];
    maze.cells[5].links=[6];maze.cells[6].links=[5,10];maze.cells[10].links=[6];
    encounters={};visited=new Set([5]);seenSamples=new Set;seenPath='';render()`);
  return g;
}

test('fog has a feathered curved boundary shared by scenery and animals',()=>{
  const {run,$}=scene();
  assert.match(run('seenPath'),/^M[\d. -]+Q/);
  assert.match($('#map').innerHTML,/<feGaussianBlur stdDeviation="3.5"/);
  assert.match($('#map').innerHTML,/<g id="revealed-scene" mask="url\(#visible-area\)"/);
  assert.doesNotMatch($('#map').innerHTML,/<clipPath id="visible-area"/);
  const before=run('seenPath');run('render();render()');assert.equal(run('seenPath'),before);
});

test('walking expands remembered sight before arrival without incrementing visited',()=>{
  const {run,$,tick}=scene({animation:true});
  const initial=run('seenPath');run('move(1)');tick(0);tick(180);
  const halfway=run('seenPath');assert(halfway.startsWith(initial));assert(halfway.length>initial.length);
  assert.equal($('#seen-shape').attrs.d,halfway);assert.equal(run('visited.has(6)'),false);
  tick(360);assert.equal(run('pos'),6);assert.equal(run('visited.has(6)'),true);
  assert(run('seenPath').startsWith(halfway));
  assert($('#map').innerHTML.includes(`d="${run('seenPath')}"`));
});

test('leaving a clearing preserves the whole footprint including its unvisited fringe',()=>{
  const {run,$}=scene();
  const initial=run('seenPath');run('move(1);closeEvent();move(2)');
  assert.equal(run('pos'),10);assert.equal(run('visited.size'),3);
  assert(run('seenPath').startsWith(initial));assert(run('seenSamples.has("90,90")'));
  assert($('#map').innerHTML.includes(initial));
  const explored=run('seenPath');run('closeEvent();move(0);closeEvent();move(3)');
  assert.equal(run('pos'),5);assert.equal(run('seenPath'),explored,'retracing does not grow or reshape the mask');
  run('setView("fpv");setView("map")');assert.equal(run('seenPath'),explored);
});

test('skipped animation frames, reduced motion and FPV remember the same complete route',()=>{
  const animated=scene({animation:true});animated.run('move(1)');animated.tick(0);animated.tick(360);
  const expected=animated.run('seenPath');
  for(const options of [{},{animation:true,reducedMotion:true}]){
    const g=scene(options);g.run('move(1)');assert.equal(g.run('seenPath'),expected);
  }
  const fpv=scene();fpv.run('setView("fpv");facing=1;handleDirection(0);setView("map")');
  assert.equal(fpv.run('pos'),6);assert.equal(fpv.run('seenPath'),expected);
});

test('blocked movement does not uncover terrain',()=>{
  const {run}=scene();const before=run('seenPath');
  run('move(0)');assert.equal(run('seenPath'),before);
  run('maze.gate=[5,6];gateOpen=false;move(1)');assert.equal(run('seenPath'),before);
});

test('the full-map preview preserves exploration and a new game starts fresh',()=>{
  const {run,$,tick}=scene({animation:true});run('move(1)');tick(0);tick(180);
  $('#menu-toggle').onclick();const explored=run('seenPath');assert.equal(run('pos'),6);
  $('#reveal').checked=true;$('#reveal').onchange();
  assert.match(run('sightDefinitions()'),/<rect x="-80" y="-80" width="400" height="400" fill="white"/);
  $('#reveal').checked=false;$('#reveal').onchange();assert.equal(run('seenPath'),explored);
  run('start()');tick(400);assert.equal(run('seenSamples.size'),1);assert.equal(run('visited.size'),1);
  assert.notEqual(run('seenPath'),explored);assert.equal($('#reveal').checked,false);
});
