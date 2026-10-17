const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { seededRandom } = require('./random.cjs');
const root = process.env.GAME_ROOT || path.resolve(__dirname, '../..');

// Minimal DOM: verifies game state and answer content, not browser layout.
function game({ animation = false, reducedMotion = false, size = 4, seed = 123 } = {}) {
  const nodes = new Map(), events = {};
  const frames = new Map(); let nextFrame = 0;
  function element() {
    return { value: '4', open: false, checked: false, hidden: false, textContent: '', children: [], dataset: {}, attrs: {},
      style: { setProperty() {} }, classList: { toggle() {} }, offsetWidth: 300, offsetHeight: 200,
      getBoundingClientRect() { return { x: 100, y: 200, left: 100, top: 200, bottom: 240, width: 360, height: 600 }; },
      setAttribute(k, v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; },
      replaceChildren() { this.children = []; }, append(b) { this.children.push(b); },
      show() { this.open = true; }, showModal() { this.open = true; }, close() { this.open = false; } };
  }
  const $ = s => { if (!nodes.has(s)) nodes.set(s, element()); return nodes.get(s); };
  const buttons=[0,1,2,3].map(d=>{const b=element();b.dataset.dir=String(d);return b});
  $('#size').value = String(size);
  const math = Object.create(Math);
  math.random = seededRandom(seed);
  const context = vm.createContext({ Math: math, Set, window: { addEventListener() {}, matchMedia() { return { matches: reducedMotion }; } },
    document: { querySelector: $, querySelectorAll: s => s==='[data-dir]'?buttons:[], createElement: element, addEventListener(name,fn) { events[name]=fn; } } });
  if (animation) Object.assign(context, {
    requestAnimationFrame(fn) { const id = ++nextFrame; frames.set(id,fn); return id; },
    cancelAnimationFrame(id) { frames.delete(id); }
  });
  for(const file of ['loot.js','maze.js','fpv.js']) vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
  Object.assign(context, context.window);
  const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  vm.runInContext(source, context);
  return { $, buttons, events, tick(time) { const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(time)); },
    pendingFrames: () => frames.size, run: code => vm.runInContext(code, context) };
}

function supplyFixture(g) {
  g.run(`loot={items:{},chests:[],inventoryItemIds:[],consumedItemIds:[],completedRequestIds:[],unlockedGateIds:[],keyIds:[],requests:[]};
    for(const [cell,e] of Object.entries(encounters))if(!e.danger){
      const id='fixture-'+cell;loot.items[id]={id,typeId:e.answer};loot.inventoryItemIds.push(id);
      loot.requests.push({id:'request-'+cell,cell:Number(cell),requiredTypeId:e.answer,rewardId:Number(cell)===keeper?'forest-key':null});
    }`);
}
module.exports = { game, supplyFixture };
