import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
const groups = JSON.parse(readFileSync('src/data/places.json', 'utf8'))
const published = Object.entries(groups).flatMap(([city, entries]) => (entries as any[]).filter(p => p.published).map(p => ({ ...p, city })))
const base = 'http://127.0.0.1:4173/jimmyGu.github.io/rank/'

test('production city archive renders written details, tags, and text-address maps', async ({ page }) => {
  await page.route('https://api.github.com/**', route => route.fulfill({ json: route.request().url().endsWith('/issues/1') ? { comments: 0 } : [] }))
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message))
  await page.goto(base)
  await expect(page.locator('.photo-card')).toHaveCount(published.length)
  if (!published.length) return
  const place = published[0]
  await page.getByLabel('城市筛选').selectOption(place.city)
  await expect(page.locator('.photo-card')).toHaveCount(published.filter(p => p.city === place.city).length)
  await page.goto(`${base}guide/#/place/${place.id}`)
  await expect(page.locator('.guide-detail h1')).toHaveText(place.name)
  await expect(page.locator('.detail-summary')).toHaveText(place.summary)
  await expect(page.locator('.detail-photo, figure, video, .video-pending, .pros-cons, .demo-badge')).toHaveCount(0)
  await expect(page.locator('.detail-tags span')).toHaveCount(place.tags.length)
  if (typeof place.location === 'string') {
    await expect(page.locator('.destination-section')).toContainText(place.location)
    await expect(page.locator('.place-address-map iframe')).toHaveAttribute('src', /uri\.amap\.com\/search\?keyword=/)
    await expect(page.getByRole('link', { name: '在高德地图中打开' })).toHaveAttribute('href', /uri\.amap\.com\/search\?keyword=/)
    await expect(page.getByRole('link', { name: '去这里 · 高德地图' })).toHaveCount(0)
  }
  await page.setViewportSize({ width: 375, height: 900 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(errors).toEqual([])
})
