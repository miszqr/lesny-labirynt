const { defineConfig } = require('playwright/test');

module.exports = defineConfig({
  testDir: './tests/browser',
  testMatch: '**/*.spec.cjs',
  fullyParallel: true,
  workers: 2,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  outputDir: 'test-results',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:8080',
    browserName: 'chromium',
    locale: 'pl-PL',
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'telefon-320x568', use: { viewport: { width: 320, height: 568 } } },
    { name: 'telefon-390x844', use: { viewport: { width: 390, height: 844 } } },
    { name: 'poziomo-844x390', use: { viewport: { width: 844, height: 390 } } },
  ],
  // Serve the repository separately. Test discovery never starts a server/browser.
});
