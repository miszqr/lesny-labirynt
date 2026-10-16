const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = process.env.GAME_ROOT || path.resolve(__dirname, '../..');

// Minimal DOM: verifies game state and answer content, not browser layout.
function game({ animation = false, reducedMotion = false } = {}) {
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
  let seed = 123;
  const math = Object.create(Math);
  math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const context = vm.createContext({ Math: math, Set, window: { addEventListener() {}, matchMedia() { return { matches: reducedMotion }; } },
    document: { querySelector: $, querySelectorAll: s => s==='[data-dir]'?buttons:[], createElement: element, addEventListener(name,fn) { events[name]=fn; } } });
  if (animation) Object.assign(context, {
    requestAnimationFrame(fn) { const id = ++nextFrame; frames.set(id,fn); return id; },
    cancelAnimationFrame(id) { frames.delete(id); }
  });
  for(const file of ['maze.js','fpv.js']) vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
  Object.assign(context, context.window);
  const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  vm.runInContext(source, context);
  return { $, buttons, events, tick(time) { const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(time)); },
    pendingFrames: () => frames.size, run: code => vm.runInContext(code, context) };
}

module.exports = { game };
