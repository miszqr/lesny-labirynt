const {
  test, expect, pageFits, inside, hitTarget, controlsFit, bubbleFits, tabTo, capture, encounterFixture,
} = require('./helpers.cjs');

test('powitanie: dymek, strzałki i brak przewijania strony', async ({ page }, testInfo) => {
  await bubbleFits(page);
  await expect(page.locator('#event button').filter({ hasText: /×|✕|Zamknij/ })).toHaveCount(0);
  await page.locator('#dialogue-next').tap();
  await expect(page.locator('#description')).toContainText('Zdobędę klucz');
  await bubbleFits(page);
  await capture(page, testInfo, 'powitanie');
});

test('dotyk poza dymkiem go nie zamyka; ruch jest możliwy po Dalej', async ({ page }) => {
  const { before, to, direction } = await page.evaluate(() => {
    const to = maze.cells[pos].links.find(id => !(maze.gate.includes(pos) && maze.gate.includes(id)));
    return { before: pos, to, direction: [pos - maze.n, pos + 1, pos + maze.n, pos - 1].indexOf(to) };
  });
  expect(to).toBeDefined();
  const arrow = page.locator(`.directions [data-dir="${direction}"]`);
  await arrow.tap();
  await expect(page.locator('#event')).toBeVisible();
  expect(await page.evaluate(() => pos)).toBe(before);
  await page.locator('#dialogue-next').tap();
  await page.locator('#dialogue-next').tap();
  await expect(page.locator('#event')).not.toBeVisible();
  await arrow.tap();
  await expect.poll(() => page.evaluate(() => pos)).toBe(to);
  await pageFits(page);
});

test('menu: dotyk poza dymkiem, Tab, Escape i powrót fokusu', async ({ page }, testInfo) => {
  const toggle = page.locator('#menu-toggle'), menu = page.locator('#menu');
  await toggle.tap();
  await expect(page.locator('#event')).toBeVisible();
  await expect(menu).not.toBeVisible();
  await page.locator('#dialogue-next').tap();
  await page.locator('#dialogue-next').tap();
  await toggle.click();
  await expect(menu).toBeVisible();
  await inside(menu, page.locator('body'));
  await pageFits(page);
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    expect(await menu.evaluate(el => el.contains(document.activeElement)), 'Fokus pozostaje w menu').toBe(true);
  }
  await capture(page, testInfo, 'menu');
  await page.keyboard.press('Escape');
  await expect(menu).not.toBeVisible();
  await expect(toggle).toBeFocused();
  await toggle.press('Enter');
  await page.locator('#menu-close').click();
  await expect(menu).not.toBeVisible();
  await expect(toggle).toBeFocused();
});

test('klawiatura: strzałka porusza Adamem po zakończeniu rozmowy przez Dalej', async ({ page }) => {
  await page.locator('#dialogue-next').click();
  await page.locator('#dialogue-next').click();
  const { to, key } = await page.evaluate(() => {
    const to = maze.cells[pos].links.find(id => !(maze.gate.includes(pos) && maze.gate.includes(id)));
    const direction = [pos - maze.n, pos + 1, pos + maze.n, pos - 1].indexOf(to);
    return { to, key: ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'][direction] };
  });
  expect(key).toBeDefined();
  await page.keyboard.press(key);
  await expect.poll(() => page.evaluate(() => pos)).toBe(to);
  await pageFits(page);
});

test('menu: rozmiar mapy, FPV i orientacja ekranu', async ({ page }) => {
  await page.keyboard.press('Escape');
  await page.locator('#menu-toggle').tap();
  await page.locator('#size').selectOption('8');
  await expect(page.locator('#menu')).not.toBeVisible();
  expect(await page.evaluate(() => maze.n)).toBe(8);
  await page.keyboard.press('Escape');
  await page.locator('#menu-toggle').tap();
  await page.locator('#view-mode').selectOption('fpv');
  await expect(page.locator('.map-card')).toHaveAttribute('data-view', 'fpv');
  await controlsFit(page);
  await pageFits(page);
  await page.setViewportSize({ width: 844, height: 390 });
  await controlsFit(page);
  await pageFits(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await controlsFit(page);
  await pageFits(page);
});

for (const mode of ['map', 'fpv']) {
  test(`${mode}: skrzynka, częściowy odbiór, plecak i zamykanie przyciskiem Dalej`, async ({ page }) => {
    await page.locator('#dialogue-next').tap();await page.locator('#dialogue-next').tap();
    if(mode==='fpv')await page.locator('#view-toggle').tap();
    await page.locator('#interact').tap();
    await expect(page.locator('#storage')).toBeVisible();
    await inside(page.locator('#storage'),page.locator('body'));
    const original=await page.locator('[data-take]').count();expect(original).toBeGreaterThanOrEqual(3);
    await page.locator('[data-take]').first().tap();
    await expect(page.locator('[data-take]')).toHaveCount(original-1);
    await expect(page.locator('#backpack-count')).toHaveText('1 / 2');
    await page.touchscreen.tap(2,2);await expect(page.locator('#storage')).toBeVisible();
    await page.locator('#storage-next').tap();await controlsFit(page);
    await page.locator('#interact').tap();await expect(page.locator('[data-take]')).toHaveCount(original-1);
    await page.locator('[data-take]').first().tap();
    await expect(page.locator('#backpack-count')).toHaveText('2 / 2');
    await expect(page.locator('[data-take]').first()).toBeDisabled();
    await page.locator('[data-put-back]').first().tap();
    await expect(page.locator('#backpack-count')).toHaveText('1 / 2');
    await expect(page.locator('[data-take]').first()).toBeEnabled();
    await page.locator('#storage-next').tap();await page.locator('#backpack-toggle').tap();
    await expect(page.locator('#storage-title')).toHaveText('🎒 Plecak');
    await expect(page.locator('#take-all')).not.toBeVisible();
    expect(await page.locator('.storage-item:visible').count()).toBe(1);
    await page.locator('#storage-next').tap();await controlsFit(page);await pageFits(page);
  });

  test(`${mode}: chmurka rozmowy jest przy zwierzaku, działa dotykiem i klawiaturą`, async ({ page }) => {
    await encounterFixture(page, { mode });
    await page.locator('#dialogue-next').tap();
    await page.locator('#dialogue-next').tap();
    const icon = page.getByRole('button', { name: 'Porozmawiaj ze zwierzakiem: Kot', exact: true });
    await expect(icon).toBeVisible();
    await inside(icon, page.locator('.mapwrap'));
    await hitTarget(icon);
    await icon.tap();
    await expect(page.locator('#event')).toBeVisible();
    await expect(icon).not.toBeVisible();
    await page.locator('#dialogue-next').tap();
    await page.locator('#dialogue-next').tap();
    await tabTo(page, '#talk');
    await page.keyboard.press('Enter');
    await expect(page.locator('#event')).toBeVisible();
    await page.locator('#dialogue-next').tap();
    await page.locator('[data-item="milk"]').tap();
    await expect(page.locator('#event')).not.toBeVisible();
    await expect(icon).toBeVisible();
    await icon.tap();
    await expect(page.locator('#description')).toHaveText('Dziękuję za pomoc!');
    await page.locator('#dialogue-next').tap();
    await controlsFit(page);
  });

  for (const [corner, name] of ['góra-lewo', 'góra-prawo', 'dół-lewo', 'dół-prawo'].entries()) {
    test(`${mode}: długi dymek wilka przy krawędzi ${name}`, async ({ page }, testInfo) => {
      await encounterFixture(page, { mode, corner, wolf: true });
      await bubbleFits(page);
      await page.locator('#dialogue-next').tap();
      await expect(page.locator('#description')).toHaveText('Skocz cztery kroki w prawo.');
      await bubbleFits(page);
      const arrow = page.locator('[data-wolf-dir="1"]');
      await arrow.tap();
      await page.locator('[data-wolf-action="submit"]').tap();
      await expect(page.locator('#notice')).toHaveText('Wilk zabrał serce. Spróbuj jeszcze raz.');
      await bubbleFits(page);
      await capture(page, testInfo, `${mode}-${name}-blad-wilka`);
    });
  }

  test(`${mode}: wilk — dotyk, postęp, cofanie, ponowne otwarcie i zatwierdzenie`, async ({ page }) => {
    await encounterFixture(page, { mode, wolf: true });
    await page.locator('#dialogue-next').tap();
    const arrow = page.locator('[data-wolf-dir="1"]');
    await expect(page.locator('[data-wolf-action="submit"]')).toBeDisabled();
    for (let i = 0; i < 3; i++) await arrow.tap();
    await expect(page.locator('.wolf-step')).toHaveCount(3);
    await page.locator('[data-wolf-action="undo"]').tap();
    await expect(page.locator('.wolf-step')).toHaveCount(2);
    const before = await page.evaluate(() => pos);
    await page.locator('#menu-toggle').tap(); // Outside clicks have no effect.
    await expect(page.locator('#event')).toBeVisible();
    await expect(page.locator('#menu')).not.toBeVisible();
    await page.locator('#dialogue-next').tap();
    await expect(page.locator('#event')).not.toBeVisible();
    await expect(page.locator('#menu')).not.toBeVisible();
    expect(await page.evaluate(() => pos)).toBe(before);
    await page.locator('#interact').tap();
    await page.locator('#dialogue-next').tap();
    await expect(page.locator('.wolf-step')).toHaveCount(2);
    await arrow.tap(); await arrow.tap();
    await expect(page.locator('.wolf-progress')).toHaveAttribute('aria-label', /^Wybrane kroki: 4\./);
    await expect(page.locator('[data-wolf-action="submit"]')).toHaveText('Skaczę');
    await page.locator('[data-wolf-action="submit"]').tap();
    await expect(page.locator('#event')).not.toBeVisible();
    await expect(page.locator('.heart-item')).toHaveAttribute('aria-label', 'Serduszka: 3');
    await expect.poll(() => page.evaluate(() => fleeing === null)).toBe(true);
    const relocated = await page.evaluate(() => Number(Object.keys(encounters).find(id => (encounters[id].category==="enemy"))));
    expect(relocated).not.toBe(before);
    if (mode === 'map') await expect(page.locator('#map [data-wolf="true"]')).toHaveCount(1);
    expect(await page.evaluate(() => Object.values(encounters).filter(e => (e.category==="enemy")).length)).toBe(1);
    await controlsFit(page);
  });

  test(`${mode}: dotknięcie nieaktywnej strzałki przy wilku zachowuje dymek i pozycję`, async ({ page }) => {
    await encounterFixture(page, { mode, wolf: true });
    await page.locator('#dialogue-next').tap();
    const arrow = page.locator('.directions [data-dir="0"]');
    await expect(arrow).toBeDisabled();
    await hitTarget(arrow);
    const before = await page.evaluate(() => ({ pos, hearts }));
    const box = await arrow.boundingBox();
    // locator.tap waits for enabled; a real finger can touch a disabled control.
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.locator('#event')).toBeVisible();
    expect(await page.evaluate(() => ({ pos, hearts }))).toEqual(before);
  });

  test(`${mode}: Escape oddaje fokus, Tab i Enter wybierają obrazek`, async ({ page }) => {
    await encounterFixture(page, { mode });
    const before = await page.evaluate(() => pos);
    await page.keyboard.press('ArrowUp');
    expect(await page.evaluate(() => pos)).toBe(before);
    await page.keyboard.press('Escape');
    await expect(page.locator('#event')).not.toBeVisible();
    await expect(page.locator('#interact')).toBeFocused();
    await page.keyboard.press('Enter');
    await tabTo(page, '#dialogue-next');
    await page.keyboard.press('Enter');
    await tabTo(page, '[data-item="milk"]');
    await page.keyboard.press('Enter');
    await expect(page.locator('#event')).not.toBeVisible();
    await expect(page.locator('.heart-item')).toHaveAttribute('aria-label', 'Serduszka: 4');
    await tabTo(page, '#menu-toggle');
    await page.keyboard.press('Enter');
    await expect(page.locator('#menu')).toBeVisible();
  });
}

for (const key of [false, true]) {
  test(`furtka: cały komunikat mieści się w dymku, klucz=${key}`, async ({ page }) => {
    const { direction, before } = await page.evaluate(key => {
      closeEvent(); pos = maze.gate[0]; visited.add(pos);
      encounters = {}; done = new Set(); hasKey = key; loot.keyIds = key ? ['forest-key'] : []; gateOpen = false;
      render();
      const to = maze.gate[1];
      return { direction: [pos - maze.n, pos + 1, pos + maze.n, pos - 1].indexOf(to), before: pos };
    }, key);
    await page.locator(`.directions [data-dir="${direction}"]`).tap();
    await expect(page.locator('#notice')).toHaveText(key ? 'Otwórz furtkę kluczem.' : 'Furtka jest zamknięta. Znajdź klucz.');
    await bubbleFits(page);
    expect(await page.evaluate(() => pos)).toBe(before);
    if (key) {
      await page.getByRole('button', { name: '🔑 Otwórz furtkę', exact: true }).tap();
      expect(await page.evaluate(() => gateOpen)).toBe(true);
      await bubbleFits(page);
    } else {
      await expect(page.locator('#answers button')).toHaveCount(0);
    }
  });
}
