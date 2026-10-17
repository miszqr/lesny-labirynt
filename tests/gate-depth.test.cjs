const { test } = require('node:test');
const assert = require('node:assert/strict');
const { game } = require('./helpers/game.cjs');

function layers(g) {
  return [...g.$('#map').innerHTML.matchAll(/<g data-depth="([^"]+)">([\s\S]*?)(?=<g data-depth="|$)/g)].map(([, depth, svg]) => ({
    dataset: { depth },
    kind: svg.includes('data-character="adam"') ? 'adam'
      : svg.includes('data-wicket-part="leaf"') ? 'leaf'
      : svg.includes('data-scenery="wicket"') && !svg.includes('data-wicket-part=') ? 'leaf' : 'scenery',
  }));
}

function fixture(gate, from, animation = false) {
  const g = game({ seed: 42, animation });
  g.run(`closeEvent();maze.gate=${JSON.stringify(gate)};pos=${from};maze.exit=15;
    maze.cells[${gate[0]}].links=[${gate[1]}];maze.cells[${gate[1]}].links=[${gate[0]}];
    encounters={};done=new Set();gateOpen=true;terrain=[];terrainCache='';render()`);
  return g;
}

function leafBehindAdam(nodes) {
  const boy = nodes.findIndex(n => n.kind === 'adam'), leaf = nodes.findIndex(n => n.kind === 'leaf');
  assert(boy >= 0 && leaf >= 0, 'both Adam and the wicket leaf are rendered');
  return leaf < boy;
}

for (const [name, gate, pos, behind] of [
  ['left', [5, 6], 5, true], ['right', [5, 6], 6, true],
  ['above', [5, 9], 5, false], ['below', [5, 9], 9, true],
]) {
  test(`open wicket: correct layer order when Adam stands ${name}`, () => {
    const g = fixture(gate, pos);
    assert.equal(leafBehindAdam(layers(g)), behind);
  });
}

// Minimal sibling model exercises the actual animation's insertBefore calls.
// This verifies painter order, not browser layout; SVG renders cover appearance.
function trackAnimationLayers(g) {
  const scene = g.$('#revealed-scene'); scene.children = layers(g);
  for (const node of scene.children) Object.defineProperty(node, 'nextElementSibling', {
    get() { return scene.children[scene.children.indexOf(node) + 1] || null; },
  });
  g.$('#map [data-character="adam"]').parentElement = scene.children.find(n => n.kind === 'adam');
  scene.insertBefore = (node, next) => {
    scene.children.splice(scene.children.indexOf(node), 1);
    scene.children.splice(next ? scene.children.indexOf(next) : scene.children.length, 0, node);
  };
  const document = g.run('document'), original = document.querySelectorAll;
  document.querySelectorAll = selector => selector === '#revealed-scene > [data-depth]' ? scene.children : original(selector);
  return scene;
}

for (const [name, gate, from, to, direction, early, late] of [
  ['rightward', [5, 6], 5, 6, 1, true, true],
  ['leftward', [5, 6], 6, 5, 3, true, true],
  ['downward', [5, 9], 5, 9, 2, false, true],
  ['upward', [5, 9], 9, 5, 0, true, false],
]) {
  test(`walking ${name} through the wicket updates occlusion during the step`, () => {
    const g = fixture(gate, from, true), scene = trackAnimationLayers(g);
    g.run(`move(${direction})`);
    g.tick(0); g.tick(90);
    assert.equal(leafBehindAdam(scene.children), early, 'first quarter of the step');
    g.tick(270);
    assert.equal(leafBehindAdam(scene.children), late, 'last quarter of the step');
    g.tick(360);
    assert.equal(g.run('pos'), to);
    assert.equal(g.run('walking'), null);
    assert.equal(g.run('hearts'), 3);
  });
}
