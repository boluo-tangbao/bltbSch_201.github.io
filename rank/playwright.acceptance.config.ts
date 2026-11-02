import { defineConfig } from '@playwright/test'
const siteBase = (process.env.SITE_BASE || '/bltbSch_201.github.io/').replace(/\/?$/, '/')
export default defineConfig({
  testDir: './tests/acceptance', timeout: 45000, globalTimeout: 240000,
  workers: 1, retries: 0, forbidOnly: true,
  outputDir: '../test-results/acceptance/browser',
  reporter: [['list'], ['html', { outputFolder: '../test-results/acceptance/html', open: 'never' }], ['json', { outputFile: '../test-results/acceptance/browser.json' }]],
  use: {
    channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined),
    baseURL: `http://127.0.0.1:4190${siteBase}rank/`, headless: true,
    screenshot: 'only-on-failure', trace: 'retain-on-failure', actionTimeout: 10000,
    serviceWorkers: 'block',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 } } },
    { name: 'narrow-mobile', use: { viewport: { width: 320, height: 844 } } },
  ],
  webServer: {
    command: 'node ../scripts/preview-site.mjs',
    env: { PREVIEW_PORT: '4190', SITE_BASE: siteBase },
    url: `http://127.0.0.1:4190${siteBase}rank/`, reuseExistingServer: false, timeout: 15000,
  },
})
