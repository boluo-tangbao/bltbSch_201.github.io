import { test, expect } from '@playwright/test'

const base = 'http://127.0.0.1:4173/bltbSch_201.github.io/rank/guide/#/place/'

test('authored sizes, red emphasis and visit notes render on desktop and mobile', async ({ page }) => {
  await page.route('https://api.github.com/**', route => route.fulfill({ json: [] }))
  await page.goto(base + 'shanghai-shop-002')
  const huge = page.locator('.detail-prose .text-huge')
  await expect(huge).toHaveText('请输入文本')
  expect(await huge.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThan(35)
  await page.setViewportSize({ width: 375, height: 900 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.goto(base + 'shanghai-shop-004')
  await expect(page.locator('.text-large')).toHaveText('寄售')
  await page.goto(base + 'shanghai-shop-013')
  await expect(page.locator('.detail-visit-list strong')).toHaveText('流萤')
  await expect(page.locator('.detail-visit-list .text-red')).toHaveCSS('color', 'rgb(198, 40, 40)')
  await page.goto(base + 'shanghai-shop-017')
  await expect(page.locator('.detail-visit-list strong')).toHaveText('住在长宁时可以顺路补卡')
  await expect(page.locator('.detail-visit-list')).not.toContainText('**')
  await page.goto(base + 'suzhou-shop-002')
  await expect(page.locator('.text-red').first()).toHaveCSS('color', 'rgb(198, 40, 40)')
  await expect(page.locator('.detail-prose')).not.toContainText('[red]')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
