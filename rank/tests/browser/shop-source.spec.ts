import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { placeDetailHash } from '../../src/utils/search'
const links = JSON.parse(readFileSync('src/data/original-links.json', 'utf8'))
const path = 'images/places/Guangzhou/dmxc/西/QQ图片20260124193853.jpg'

for (const width of [390, 1440]) test(`regular shop explanations are hidden and author photo evidence has a valid original route at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 950 })
  await page.goto('http://127.0.0.1:4173/bltbSch_201.github.io/rank/guide/' + placeDetailHash('guangzhou-shop-002', '晶臣玩物'))
  const row = page.locator('.shop-row').filter({ has: page.getByRole('heading', { name: '晶臣玩物', exact: true }) })
  await expect(row).toBeVisible()
  await expect(row.locator('.shop-evidence-note')).toHaveCount(0)
  await expect(page.locator('.shop-directory-regular .shop-evidence-note')).toHaveCount(0)
  await expect(row.getByRole('link', { name: '作者本店门头与商品实拍 ↗' })).toHaveAttribute('href', links[path])
  await expect(row.locator('.shop-sources')).toContainText('2026-01-21')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
