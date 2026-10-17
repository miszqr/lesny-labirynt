const { test: base, expect } = require('playwright/test');

const test = base.extend({
  page: async ({ page }, use) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      let seed = 42;
      Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
    });
    await page.goto('/');
    await expect(page.locator('#event')).toBeVisible();
    await use(page);
    expect(errors, 'Nieobsłużone wyjątki JavaScript').toEqual([]);
  },
});

async function pageFits(page) {
  const dimensions = await page.evaluate(() => ({
    width: innerWidth, height: innerHeight,
    scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    scrollHeight: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
    x: scrollX, y: scrollY,
  }));
  expect(dimensions.scrollWidth, 'Strona nie wychodzi poza szerokość okna').toBeLessThanOrEqual(dimensions.width + 1);
  expect(dimensions.scrollHeight, 'Strona nie wychodzi poza wysokość okna').toBeLessThanOrEqual(dimensions.height + 1);
  expect(dimensions.x).toBe(0);
  expect(dimensions.y).toBe(0);
  await inside(page.locator('.map-card'), page.locator('body'));
}

async function inside(inner, outer) {
  const a = await inner.boundingBox(), b = await outer.boundingBox();
  expect(a, 'Widoczny element wewnętrzny').not.toBeNull();
  expect(b, 'Widoczny kontener').not.toBeNull();
  expect(a.x).toBeGreaterThanOrEqual(b.x - 1);
  expect(a.y).toBeGreaterThanOrEqual(b.y - 1);
  expect(a.x + a.width).toBeLessThanOrEqual(b.x + b.width + 1);
  expect(a.y + a.height).toBeLessThanOrEqual(b.y + b.height + 1);
}

async function hitTarget(locator) {
  // Also detects a bubble covering a visible button; boundingBox alone would miss it.
  expect(await locator.evaluate(element => {
    const r = element.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return element === hit || element.contains(hit);
  }), 'Środek przycisku przyjmuje dotyk').toBe(true);
}

async function controlsFit(page) {
  for (const button of await page.locator('.directions button').all()) {
    await expect(button).toBeVisible();
    await inside(button, page.locator('body'));
    const box = await button.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    await hitTarget(button);
  }
}

async function bubbleFits(page) {
  await expect(page.locator('#event')).toBeVisible();
  await inside(page.locator('#event'), page.locator('.map-card'));
  expect(await page.locator('.bubble-scroll').evaluate(el => el.scrollWidth <= el.clientWidth + 1),
    'Dymek nie przewija się poziomo').toBe(true);
  await pageFits(page);
  await controlsFit(page);
}

async function tabTo(page, selector, limit = 25) {
  // Deliberately use Tab, not locator.focus(), to verify keyboard reachability.
  for (let i = 0; i < limit; i++) {
    if (await page.locator(selector).evaluate(el => el === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  await expect(page.locator(selector)).toBeFocused();
}

async function capture(page, testInfo, name) {
  await testInfo.attach(name, { body: await page.screenshot(), contentType: 'image/png' });
}

async function encounterFixture(page, { mode = 'map', corner = 0, wolf = false, size = 8 } = {}) {
  // Layout fixture, NOT a legal journey: place an encounter in the chosen corner.
  // All subsequent input uses real DOM events and production renderers.
  await page.evaluate(({ mode, corner, wolf, size }) => {
    document.querySelector('#size').value = String(size);
    start(); closeEvent();
    const corners = [0, size - 1, size * (size - 1), size * size - 1];
    pos = corners[corner];
    maze.exit = size + 1; // Keep all four corners available for this layout fixture.
    keeper = -1; gateOpen = true;
    visited = new Set([pos]); done = new Set();
    encounters = { [pos]: wolf ? {
      danger: true, icon: '🐺', title: 'Uwaga! Wilk!',
      text: 'To groźny wilk. Skocz cztery kroki w prawo.',
      count: 4, direction: 1, steps: [],
    } : {
      id: 'cat', icon: '🐈', title: 'Kot', text: 'Chcę mleko. Daj mi mleko.',
      answer: 'milk', options: ['fish', 'milk', 'ball'],
    } };
    setView(mode);
  }, { mode, corner, wolf, size });
  await page.locator('#interact').click();
  await expect(page.locator('#event')).toBeVisible();
}

module.exports = { test, expect, pageFits, inside, hitTarget, controlsFit, bubbleFits, tabTo, capture, encounterFixture };
