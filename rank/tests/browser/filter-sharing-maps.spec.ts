import { test, expect, type Page } from '@playwright/test'
import { readFileSync, mkdirSync } from 'node:fs'
const base = process.env.BROWSE_TEST_BASE || 'http://127.0.0.1:4173/bltbSch_201.github.io/rank/'
const groups = JSON.parse(readFileSync('src/data/places.json', 'utf8'))
const places = Object.entries(groups).flatMap(([city, entries]) => (entries as any[]).filter(p => p.published).map(p => ({ ...p, city })))
const hipp = places.find(p => p.id === 'shanghai-shop-021')
const addressed = places.find(p => p.location && typeof p.location === 'object')
const storedKey = 'tangbao-rank-filters-v1'
mkdirSync('test-results/evidence', { recursive: true })

async function mockClipboard(page: Page, fail = false) {
  await page.addInitScript(fail => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => {
    if (fail) throw new Error('Clipboard unavailable')
    ;(window as any).copiedText = text
  } } }), fail)
}

test('filtered board hides empty tiers without renumbering or changing ranks and restores all five', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 950 })
  await page.goto(base)
  await expect(page.locator('.tier-row')).toHaveCount(5)
  const rank = await page.locator('#place-card-' + hipp.id + ' a').getAttribute('aria-label')
  await page.getByRole('searchbox').fill('HIPPIHO')
  await expect(page.locator('.tier-row')).toHaveCount(1)
  await expect(page.locator('.tier-label h3')).toHaveText('NPC')
  await expect(page.locator('.tier-index')).toHaveText('04')
  await expect(page.locator('#place-card-' + hipp.id + ' a')).toHaveAttribute('aria-label', rank!)
  await expect(page.locator('.tier-empty')).toHaveCount(0)
  await page.getByRole('button', { name: '舒适', exact: true }).click()
  await expect(page.locator('.tier-row')).toHaveCount(1)
  await page.locator('#place-card-' + hipp.id).scrollIntoViewIfNeeded()
  await page.screenshot({ path: 'test-results/evidence/filtered-board-one-tier.png' })
  await page.getByRole('searchbox').fill('unmatched-keyword-927')
  await expect(page.locator('.tier-row')).toHaveCount(0)
  await expect(page.locator('.no-results')).toBeVisible()
  await page.getByRole('button', { name: '重置', exact: true }).click()
  await expect(page.locator('.tier-row')).toHaveCount(5)
  await expect(page.locator('.place-card')).toHaveCount(places.length)
  await page.getByLabel('城市筛选').selectOption('上海')
  const expected = new Set(places.filter(p => p.city === '上海').map(p => p.tier)).size
  await expect(page.locator('.tier-row')).toHaveCount(expected)
  await expect(page.locator('.tier-empty')).toHaveCount(0)
})

test('shared filters override another browser history and survive details, return, edits and reload', async ({ page, browser }) => {
  await mockClipboard(page)
  await page.goto(base)
  await page.getByLabel('城市筛选').selectOption('上海')
  await page.getByRole('searchbox').fill('HIPPIHO')
  const tag = hipp.tags[0]
  const tagButton = page.getByRole('button', { name: '# ' + tag, exact: true })
  if (!await tagButton.isVisible()) await page.locator('.more-tags-toggle').click()
  await tagButton.click()
  await page.getByRole('button', { name: '分享筛选', exact: true }).click()
  await expect(page.getByRole('button', { name: '分享筛选', exact: true })).toHaveText('链接已复制')
  const link = await page.evaluate(() => (window as any).copiedText as string)
  const url = new URL(link)
  expect(url.searchParams.get('city')).toBe('上海')
  expect(url.searchParams.get('q')).toBe('HIPPIHO')
  expect(url.searchParams.get('tag')).toBe(tag)
  const context = await browser.newContext()
  try {
    await context.addInitScript(({ key }) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(key, JSON.stringify({ city: '广州', query: 'old-search', tag: 'invalid' })); sessionStorage.setItem('seeded', '1') } }, { key: storedKey })
    const recipient = await context.newPage()
    await recipient.goto(link)
    await expect(recipient.getByLabel('城市筛选')).toHaveValue('上海')
    await expect(recipient.getByRole('searchbox')).toHaveValue('HIPPIHO')
    await expect(recipient.locator('.place-card')).toHaveCount(1)
    await recipient.locator('#place-card-' + hipp.id + ' a').click()
    expect(new URL(recipient.url()).searchParams.get('q')).toBe('HIPPIHO')
    await recipient.getByRole('link', { name: '← 返回图片总榜', exact: true }).click()
    await expect(recipient.locator('#place-card-' + hipp.id + ' a')).toBeFocused()
    await recipient.getByRole('button', { name: '重置', exact: true }).click()
    await expect(recipient.locator('.place-card')).toHaveCount(places.length)
    await recipient.reload()
    await expect(recipient.locator('.place-card')).toHaveCount(places.length)
    await expect(recipient.getByRole('searchbox')).toHaveValue('')
    expect(new URL(recipient.url()).searchParams.get('q')).toBe(null)
  } finally { await context.close() }
})

test('empty shared filters and query-only URLs ignore stale local filters', async ({ page }) => {
  await page.goto(base)
  await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ city: '广州', tag: 'invalid', query: 'old' })), storedKey)
  await page.goto(base + '?filters=1')
  await expect(page.locator('.place-card')).toHaveCount(places.length)
  await page.goto(base + '?q=HIPPIHO')
  await expect(page.getByLabel('城市筛选')).toHaveValue('')
  await expect(page.locator('.place-card')).toHaveCount(1)
  await page.getByRole('searchbox').fill('animate')
  await page.reload()
  await expect(page.getByRole('searchbox')).toHaveValue('animate')
  await expect(page.locator('#place-card-guangzhou-shop-003')).toBeVisible()
})

test('shared links work with local storage blocked and header navigation keeps the filters', async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.getItem = () => { throw new Error('Blocked') }; Storage.prototype.setItem = () => { throw new Error('Blocked') } })
  await page.goto(base + '?filters=1&q=HIPPIHO')
  await expect(page.locator('.place-card')).toHaveCount(1)
  await page.getByRole('navigation', { name: '主导航', exact: true }).getByRole('link', { name: '地图与介绍', exact: true }).click()
  await expect(page.getByRole('searchbox')).toHaveValue('HIPPIHO')
  await expect(page.locator('.directory-place')).toHaveCount(1)
  await page.getByRole('navigation', { name: '主导航', exact: true }).getByRole('link', { name: '图片总榜', exact: true }).click()
  await expect(page.locator('.place-card')).toHaveCount(1)
})

test('copy failure offers a selected, read-only link instead of claiming success', async ({ page }) => {
  await mockClipboard(page, true)
  await page.goto(base + 'guide/?filters=1&q=HIPPIHO#/place/' + hipp.id)
  await page.getByRole('button', { name: '分享筛选', exact: true }).click()
  const field = page.getByRole('textbox', { name: '分享筛选内容', exact: true })
  await expect(field).toBeFocused()
  const value = await field.inputValue()
  expect(new URL(value).hash).toBe('')
  expect(new URL(value).searchParams.get('q')).toBe('HIPPIHO')
  await expect(field).toHaveAttribute('readonly', '')
  expect(await field.evaluate((input: HTMLInputElement) => input.selectionEnd! - input.selectionStart!)).toBe(value.length)
  await expect(page.getByText('暂时无法自动复制', { exact: true })).toBeVisible()
})

test('map distinguishes no results from results without addresses and keeps their details available', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 950 })
  await page.goto(base + 'guide/?q=HIPPIHO')
  await page.getByRole('button', { name: '地图', exact: true }).click()
  await expect(page.getByRole('heading', { name: '匹配地点暂无地址' })).toBeVisible()
  await expect(page.getByText('已找到 1 处地点，暂未填写可导航的地址。', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: '没有匹配的地点' })).toHaveCount(0)
  await expect(page.locator('.atlas-map-canvas')).toHaveCount(0)
  await page.locator('.map-missing-address').getByRole('button').click()
  await expect(page.locator('.selected-detail h1')).toHaveText(hipp.name)
  await page.getByRole('searchbox').fill('unmatched-keyword-927')
  await page.getByRole('button', { name: '地图', exact: true }).click()
  await expect(page.getByRole('heading', { name: '没有匹配的地点' })).toBeVisible()
  await expect(page.locator('.map-missing-address')).toHaveCount(0)
})

test('failed maps collapse and retain address copying and external navigation in map and detail', async ({ page }) => {
  await mockClipboard(page)
  await page.route('**/api.map.baidu.com/**', route => route.abort())
  await page.route('**/_BMapService/**', route => route.abort())
  await page.setViewportSize({ width: 390, height: 950 })
  await page.goto(base + 'guide/?q=' + encodeURIComponent(addressed.name))
  await page.getByRole('button', { name: '地图', exact: true }).click()
  await page.getByRole('button', { name: '加载百度分层地图' }).click()
  const fallback = page.locator('.map-address-fallback')
  await expect(fallback).toBeVisible()
  await expect(page.locator('.atlas-map-canvas')).toHaveCount(0)
  await expect(fallback).toContainText(addressed.location.address)
  const entry = fallback.getByRole('listitem').filter({ has: page.getByRole('heading', { name: addressed.name, exact: true }) })
  await entry.getByRole('button', { name: '复制地址', exact: true }).click()
  expect(await page.evaluate(() => (window as any).copiedText)).toBe(addressed.location.address)
  for (const name of ['高德导航 ↗', '百度地图 ↗']) await expect(entry.getByRole('link', { name, exact: true })).toHaveAttribute('href', /^https:\/\//)
  await expect(page.locator('.atlas-map')).not.toContainText('AK')
  await page.locator('.map-address-fallback').scrollIntoViewIfNeeded()
  await page.screenshot({ path: 'test-results/evidence/map-address-fallback.png' })
  await page.goto(base + 'guide/#/place/' + addressed.id)
  const detailFallback = page.locator('.address-map-fallback')
  await expect(detailFallback).toBeVisible()
  await expect(page.locator('.address-map-canvas')).not.toBeVisible()
  await expect(detailFallback).toContainText(addressed.location.address)
  const height = (await page.locator('.place-address-map').boundingBox())!.height
  expect(height).toBeLessThan(300)
  await detailFallback.getByRole('button', { name: '复制地址', exact: true }).click()
  expect(await page.evaluate(() => (window as any).copiedText)).toBe(addressed.location.address)
})

test('sharing and result controls fit small and wide viewports', async ({ page }) => {
  for (const route of ['', 'guide/']) {
    await page.goto(base + route + '?filters=1&city=上海&q=HIPPIHO')
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 950 })
      const share = page.getByRole('button', { name: '分享筛选', exact: true })
      const box = (await share.boundingBox())!
      expect(box.height).toBeGreaterThanOrEqual(44)
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(width)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    }
  }
})

test('search stays free of repeated labels and share uses an accessible irregular sticker', async ({ page }) => {
  await mockClipboard(page)
  for (const route of ['', 'guide/']) {
    await page.goto(base + route + '?filters=1&q=HIPPIHO')
    await expect(page.locator('.active-filters')).toHaveCount(0)
    await expect(page.locator('.search-match, .place-card mark, .directory-place mark')).toHaveCount(0)
    await expect(page.getByRole('searchbox')).toHaveValue('HIPPIHO')
    const share = page.getByRole('button', { name: '分享筛选', exact: true })
    await expect(share).toHaveClass(/is-share/)
    expect(await share.evaluate(el => getComputedStyle(el, '::after').clipPath)).toContain('polygon(')
    await page.setViewportSize({ width: 390, height: 1100 })
    if (!route) await page.getByRole('button', { name: '舒适', exact: true }).click()
    await page.evaluate(() => document.fonts.ready)
    await share.scrollIntoViewIfNeeded()
    await page.screenshot({ path: `test-results/evidence/search-sticker-${route ? 'guide' : 'board'}.png` })
    await share.focus()
    await page.keyboard.press('Enter')
    await expect(share).toHaveText('链接已复制')
    await expect(share).toBeFocused()
    expect(new URL(await page.evaluate(() => (window as any).copiedText)).searchParams.get('q')).toBe('HIPPIHO')
    expect(await share.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
    await page.getByRole('searchbox').fill('')
    await expect(page.locator('.search-match')).toHaveCount(0)
  }
})

if (process.env.BROWSE_MAP_CONFIGURED === '1') {
  async function mockMapRetry(page: Page) {
    await page.addInitScript(() => {
      let attempts = 0
      class Point { constructor(public lng: number, public lat: number) {} }
      class Map {
        constructor(container: HTMLElement) {
          if (++attempts === 1) throw new Error('Simulated map failure')
          container.dataset.mockMap = 'ready'
        }
        enableScrollWheelZoom() {} addControl() {} clearOverlays() {} addOverlay() {}
        centerAndZoom() {} setViewport() {} panTo() {} destroy() {}
      }
      class Label { setStyle() {} addEventListener() {} setContent() {} setTitle() {} }
      ;(window as any).BMapGL = { Map, Point, Label, Size: class {}, ScaleControl: class {}, ZoomControl: class {}, Marker: class {}, Geocoder: class { getPoint(_address: string, callback: (point: Point) => void) { callback(new Point(120, 31)) } } }
    })
  }

  test('configured atlas recovers after retry and after switching through missing addresses', async ({ page }) => {
    await mockMapRetry(page)
    await page.goto(base + 'guide/?q=' + encodeURIComponent(addressed.name))
    await page.getByRole('button', { name: '加载百度分层地图' }).click()
    await expect(page.locator('.map-address-fallback')).toBeVisible()
    await page.locator('.map-address-fallback').getByRole('button', { name: '重试', exact: true }).click()
    await expect(page.locator('.atlas-map-canvas')).toHaveAttribute('data-mock-map', 'ready')
    await expect(page.locator('.map-address-fallback')).toHaveCount(0)
    await page.getByRole('searchbox').fill('HIPPIHO')
    await expect(page.getByRole('heading', { name: '匹配地点暂无地址' })).toBeVisible()
    await page.getByRole('searchbox').fill(addressed.name)
    await page.getByRole('button', { name: '加载百度分层地图' }).click()
    await expect(page.locator('.atlas-map-canvas')).toHaveAttribute('data-mock-map', 'ready')
  })

  test('configured detail map can retry after its canvas was hidden by an error', async ({ page }) => {
    await mockMapRetry(page)
    await page.goto(base + 'guide/#/place/' + addressed.id)
    await expect(page.locator('.address-map-fallback')).toBeVisible()
    await page.locator('.address-map-fallback').getByRole('button', { name: '重试', exact: true }).click()
    await expect(page.locator('.address-map-canvas')).toHaveAttribute('data-mock-map', 'ready')
    await expect(page.locator('.address-map-canvas')).toBeVisible()
    await expect(page.locator('.address-map-fallback')).toHaveCount(0)
  })
}
