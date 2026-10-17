const {test}=require('node:test');
const assert=require('node:assert/strict');
const {game}=require('./helpers/game.cjs');

function landscapeScene(){
  const g=game({seed:42});
  g.run(`closeEvent();pos=5;maze.exit=15;encounters={};
    terrain=[{type:'forest',x:60,y:60,variant:.3},{type:'water',x:120,y:60,variant:.7},
      {type:'hill',x:120,y:120,variant:.6},{type:'meadow',x:60,y:120,variant:.2}];
    terrainCache=terrainArt();$('#reveal').checked=true;render()`);
  return g;
}

test('FPV uses the same lake, hill and individual trees as the map, at their exact coordinates',()=>{
  const g=landscapeScene(),map=g.$('#map').innerHTML;
  const objects=g.run('landscapeObjects().filter(t=>["tree","water","hill"].includes(t.type))');
  const seen=new Set();
  for(const t of objects)assert(map.includes(`data-landmark="${t.id}"`),t.id);
  for(let facing=0;facing<4;facing++){
    g.run(`viewMode='fpv';facing=${facing};render()`);
    const svg=g.$('#map').innerHTML;
    for(const t of objects)if(svg.includes(`data-landmark="${t.id}"`)){
      seen.add(t.id);
      const attributes=`data-landmark="${t.id}" data-world-x="${(t.x-30)/30}" data-world-y="${(t.y-30)/30}" data-variant="${t.variant}"`;
      assert(svg.includes(attributes),t.id+' has drifted');
    }
  }
  assert.equal(seen.size,objects.length);
});

test('a full turn restores the landscape exactly and moving never regenerates it',()=>{
  const g=landscapeScene();g.run('viewMode="fpv";facing=1;render()');
  const svg=g.$('#map').innerHTML,world=g.run('JSON.stringify(landscapeObjects())');
  for(let i=0;i<4;i++)g.buttons[1].onclick();
  assert.equal(g.$('#map').innerHTML,svg);
  g.run('pos=6;facing=3;render()');assert.equal(g.run('JSON.stringify(landscapeObjects())'),world);
  g.run('pos=5;facing=1;render()');assert.equal(g.$('#map').innerHTML,svg);
});

test('the wider camera includes side scenery and its near plane stays below the frame',()=>{
  const g=landscapeScene();
  const fov=g.run('2*Math.atan(320/ForestFPV.CAMERA.focal)*180/Math.PI');
  assert(fov>110&&fov<115);
  const p=g.run('ForestFPV.project(4.8,3)');
  assert(p[0]>580&&p[0]<640,'side landmark is inside the wider view');
  assert(g.run('ForestFPV.project(0,ForestFPV.CAMERA.near)[1]')>460,'roads must not end on a horizontal clipping line inside the frame');
});

test('landscape and actors use far-to-near layers, and empty terrain creates no substitute forest',()=>{
  const g=landscapeScene();
  g.run('viewMode="fpv";facing=1;encounters[5]=createEncounter(bank[0]);render()');
  const svg=g.$('#map').innerHTML;
  const depths=[...svg.matchAll(/data-fpv-depth="([\d.-]+)"/g)].map(m=>Number(m[1]));
  assert(depths.length>5);assert.match(svg,/data-encounter="5"/);
  for(let i=1;i<depths.length;i++)assert(depths[i]<=depths[i-1]);
  g.run('terrain=[];render()');
  assert.doesNotMatch(g.$('#map').innerHTML,/data-scenery="(?:tree|hill|water|distant-hills)"/);
});
