// Run: node --test tests/gate-bubble.test.cjs
// This is a DOM geometry model, not a browser/layout test.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = process.env.GAME_ROOT || path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function game(width, height, right, bottom) {
  const nodes = new Map(), measurements = [];
  const rect = (x, y, w, h) => ({ x, y, left: x, top: y, width: w, height: h, right: x + w, bottom: y + h });
  function element() {
    return {
      value: '4', checked: false, open: false, hidden: false, textContent: '', children: [], dataset: {},
      style: { setProperty(k, v) { this[k] = v; } }, classList: { toggle() {} },
      setAttribute() {}, removeAttribute() {}, replaceChildren() { this.children = []; },
      append(b) { this.children.push(b); }, show() { this.open = true; }, close() { this.open = false; },
      getBoundingClientRect() { return rect(0, 0, width, height); }
    };
  }
  const $ = s => { if (!nodes.has(s)) nodes.set(s, element()); return nodes.get(s); };
  const box = $('#event');
  Object.defineProperty(box, 'offsetWidth', { get: () => Math.min(320, width - 20) });
  Object.defineProperty(box, 'offsetHeight', { get() {
    const notice = $('#notice').textContent;
    measurements.push(notice);
    // Simulate line wrapping: the notice makes the content taller.
    const contentHeight = 130 + (notice ? 180 : 0) + ($('#answers').children.length ? 44 : 0);
    return Math.min(contentHeight, parseFloat(box.style['--bubble-max']) || 330) + 4;
  } });
  $('#map [data-character="adam"]').getBoundingClientRect = () =>
    rect(right ? width - 45 : 15, bottom ? height - 65 : 10, 30, 40);
  let seed = 123;
  const math = Object.create(Math);
  math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const context = vm.createContext({ Math: math, Set, window: { addEventListener() {} },
    document: { querySelector: $, querySelectorAll: () => [], createElement: element, addEventListener() {} } });
  vm.runInContext(fs.readFileSync(path.join(root, 'maze.js'), 'utf8'), context);
  Object.assign(context, context.window);
  vm.runInContext(source, context);
  const run = code => vm.runInContext(code, context);
  return { $, run, box, measurements };
}

for (const [width, height] of [[304, 480], [374, 756], [724, 320]]) {
  for (const right of [false, true]) for (const bottom of [false, true]) for (const key of [false, true]) {
    test(`gate bubble ${width}x${height}, ${right ? 'right' : 'left'}/${bottom ? 'bottom' : 'top'}, key=${key}`, () => {
      const { $, run, box, measurements } = game(width, height, right, bottom);
      run(`closeEvent();pos=maze.gate[0];visited.add(pos);hasKey=${key};render()`);
      const from = run('pos'), to = run('maze.gate[1]'), n = run('maze.n');
      const direction = to === from - n ? 0 : to === from + 1 ? 1 : to === from + n ? 2 : 3;
      const message = key ? 'Otwórz furtkę kluczem.' : 'Furtka jest zamknięta. Znajdź klucz.';
      measurements.length = 0;
      run(`move(${direction})`);
      assert.equal(run('pos'), from, 'closed gate still blocks movement');
      assert.equal(run('gateOpen'), false);
      assert.equal(box.open, true);
      assert.equal($('#notice').textContent, message);
      assert(measurements.length > 0, 'bubble was measured');
      assert(measurements.every(text => text === message), 'measure only the complete message');
      const left = parseFloat(box.style.left), top = parseFloat(box.style.top);
      assert(left >= 10 && left + box.offsetWidth <= width - 10, 'horizontal bounds');
      assert(top >= 10 && top + box.offsetHeight <= height - 10, 'vertical bounds after notice wraps');
      if (key) {
        $('#answers').children.find(b => b.textContent.includes('Otwórz furtkę')).onclick();
        assert.equal(run('gateOpen'), true);
        run(`closeEvent();move(${direction})`);
        assert.equal(run('pos'), to, 'opened gate allows movement');
      } else {
        assert.equal($('#answers').children.length, 0, 'no unlock action without a key');
      }
    });
  }
}
