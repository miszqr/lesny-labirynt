const {test}=require('node:test');
const assert=require('node:assert/strict');
const {game}=require('./helpers/game.cjs');

function scene(options={}){
  const g=game({seed:42,...options});
  g.run(`closeEvent();pos=5;maze.exit=15;maze.gate=[14,15];gateOpen=true;keeper=6;
    encounters={5:createEncounter(bank[0])};done=new Set();
    maze.cells.forEach(c=>c.links=[]);
    for(const b of [1,4,6,9]){maze.cells[5].links.push(b);maze.cells[b].links.push(5)}
    viewMode='fpv';facing=1;render()`);
  return g;
}
function actor(g){return g.$('#map').innerHTML.match(/<g data-encounter="5"[^>]*>/)?.[0]||null}

test('a full turn changes the projection, never the animal world position or visible side',()=>{
  const g=scene(),original=actor(g),state=g.run('JSON.stringify({pos,encounters,hearts,visited:[...visited]})');
  assert(original);const poses=[];
  for(let turn=0;turn<4;turn++){
    const p=g.run('ForestFPV.animalPose({maze,pos,facing},5)');poses.push(p);
    assert.equal(!!actor(g),p.visible);
    if(p.visible){assert.match(actor(g),/data-animal-view="front"/);assert.match(actor(g),new RegExp(`data-world-x="${p.world.x}"`))}
    g.buttons[1].onclick();
  }
  assert.equal(actor(g),original);
  assert.equal(g.run('JSON.stringify({pos,encounters,hearts,visited:[...visited]})'),state);
  assert.equal(poses.filter(p=>p.visible).length,2);
  assert(poses[0].x>320&&poses[1].x<320,'the animal moves across the viewport as the camera turns');
  for(const p of poses){assert.equal(p.world.x,poses[0].world.x);assert.equal(p.world.y,poses[0].world.y);assert.equal(p.world.heading,3);assert.equal(p.view,'front')}
});

test('walking around a fixed animal reveals its front, back and two profiles',()=>{
  const g=scene();
  for(const [pos,facing,view] of [[4,1,'front'],[6,3,'back'],[1,2,'right'],[9,0,'left']]){
    g.run(`pos=${pos};facing=${facing};render()`);
    assert.match(actor(g),new RegExp(`data-animal-view="${view}"`));
    assert.match(actor(g),/data-world-heading="3"/);
  }
});

test('walls, closed gates and looking away do not reveal an animal',()=>{
  const g=scene();
  g.run('pos=4;facing=1;maze.gate=[4,5];gateOpen=false;render()');assert.equal(actor(g),null);
  g.run('gateOpen=true;render()');assert(actor(g));
  g.run('maze.cells[4].links=[];render()');assert.equal(actor(g),null);
  g.run('pos=5;facing=3;render()');assert.equal(actor(g),null);assert.equal(g.$('#talk').hidden,true);
});

test('talking turns the camera toward the stationary friend; free turning hides its icon',()=>{
  const g=scene(),original=actor(g);
  g.buttons[3].onclick();assert.equal(g.run('facing'),0);assert.equal(actor(g),null);assert.equal(g.$('#talk').hidden,true);
  g.$('#interact').onclick();assert.equal(g.run('facing'),1);assert.equal(actor(g),original);assert.equal(g.$('#event').open,true);
});

test('wolf escape begins at its rendered anchor, and looking around cannot skip the encounter',()=>{
  const g=scene({animation:true});
  g.run(`encounters[5]={danger:true,icon:'🐺',title:'Wilk',text:'Skocz jeden krok w prawo.',count:1,direction:1,steps:[]};render()`);
  const p=g.run('ForestFPV.animalPose({maze,pos,facing},5)'),start=g.run('fleePose(5,0,"fpv")');
  for(const key of ['x','y','scale'])assert(Math.abs(p[key]-start[key])<1e-10);
  assert.equal(g.buttons[1].disabled,false);assert.equal(g.buttons[0].disabled,true);
  g.buttons[1].onclick();assert.equal(g.run('facing'),2);
  g.run('handleDirection(0)');assert.equal(g.run('pos'),5);assert.equal(g.run('dangerPending()'),true);
});
