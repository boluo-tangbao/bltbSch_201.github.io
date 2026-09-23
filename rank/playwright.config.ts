import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/browser', timeout: 60000, workers: 1,
  use: { channel: 'msedge', headless: true, viewport: { width: 1440, height: 1100 } },
  webServer: [
    { command: 'node tests/serve-fixture.mjs --empty', url: 'http://127.0.0.1:4175/bltbSch_201.github.io/rank/', reuseExistingServer: !process.env.CI },
    { command: 'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173 --strictPort', url: 'http://127.0.0.1:4173/bltbSch_201.github.io/rank/', reuseExistingServer: !process.env.CI },
    { command: 'node tests/serve-fixture.mjs', url: 'http://127.0.0.1:4174/bltbSch_201.github.io/rank/', reuseExistingServer: !process.env.CI },
  ],
})
