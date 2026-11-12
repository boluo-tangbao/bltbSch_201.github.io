import { defineConfig } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { visitNotices } from './src/utils/visitNotices'
import { visitNoticeStorageKey } from './src/utils/visitNoticeSeen'
const siteBase = (process.env.SITE_BASE || '/bltbSch_201.github.io/').replace(/\/?$/, '/')
const baseURL = `http://127.0.0.1:4190${siteBase}rank/`
// Existing task flows represent returning visitors; dedicated notice tests start fresh.
const directories = JSON.parse(readFileSync(new URL('./src/data/shop-directories.json', import.meta.url), 'utf8'))
const reminderState = { cookies: [], origins: [{ origin: new URL(baseURL).origin, localStorage: Object.entries(directories).map(([id, directory]) => ({ name: visitNoticeStorageKey(id), value: JSON.stringify(visitNotices(directory as Parameters<typeof visitNotices>[0])) })) }] }
export default defineConfig({
  // Three viewport projects run serially; allow slower CI runners to finish the suite.
  // Keep each test bounded to 45 seconds so stalled interactions still fail promptly.
  testDir: './tests/acceptance', timeout: 45000, globalTimeout: 600000,
  workers: 1, retries: 0, forbidOnly: true,
  outputDir: '../test-results/acceptance/browser',
  reporter: [['list'], ['html', { outputFolder: '../test-results/acceptance/html', open: 'never' }], ['json', { outputFile: '../test-results/acceptance/browser.json' }]],
  use: {
    channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined),
    baseURL, headless: true, storageState: reminderState,
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
