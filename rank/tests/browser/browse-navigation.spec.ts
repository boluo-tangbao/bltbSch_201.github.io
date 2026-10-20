import { test, expect } from '@playwright/test'
import { readFileSync, mkdirSync } from 'node:fs'
import { openMobileTools } from './browse-tools'

const base = process.env.BROWSE_TEST_BASE || 'http://127.0.0.1:4173/bltbSch_201.github.io/rank/'
const groups = JSON.parse(readFileSync('src/data/places.json', 'utf8'))
const places = Object.entries(groups).flatMap(([city, entries]) => (entries as any[]).filter(p => p.published).map(p => ({ ...p, city })))
const directories = JSON.parse(readFileSync('src/data/shop-directories.json', 'utf8'))
mkdirSync('test-results/evidence', { recursive: true })

const preferredTags = ['扭蛋', '同人', '中古', '寄售', '手办模型', 'lolita']

test('mobile tools start collapsed; tags compose and restore after opening', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 950 })
  await page.goto(base)
  await expect(page.locator('.mobile-tools-toggle')).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('.board-tools-content')).not.toBeVisible()
  expect((await page.locator('.card-photo').first().boundingBox())!.y).toBeLessThan(600)
  await openMobileTools(page)
  const drawer = page.locator('.browse-tags')
  const toggle = page.locator('.more-tags-toggle')
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByLabel('城市筛选')).toBeVisible()
  await expect(page.getByRole('searchbox')).toBeVisible()
  await expect(page.locator('.common-tags .tag-filter')).toBeVisible()
  await expect(drawer.locator('.tag-filter')).not.toBeVisible()
  await expect(page.locator('.common-tags .tag-filter > button:not(.more-tags-toggle)')).toHaveText(['全部标签', ...preferredTags.map(tag => '# ' + tag)])
  for (const tag of preferredTags) {
    await page.getByRole('button', { name: '# ' + tag, exact: true }).click()
    await expect(page.locator('.place-card')).toHaveCount(places.filter(p => p.tags.includes(tag)).length)
    await page.getByRole('button', { name: '全部标签', exact: true }).click()
  }
  await page.screenshot({ path: 'test-results/evidence/browse-mobile-common-tags.png' })

  const place = places.find(p => p.city === '上海' && p.tags.some((t: string) => !preferredTags.includes(t)))
  const tag = place.tags.find((t: string) => !preferredTags.includes(t))
  await page.getByLabel('城市筛选').selectOption(place.city)
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await page.getByRole('button', { name: '# ' + tag, exact: true }).click()
  await toggle.click()
  await expect(toggle).toContainText('# ' + tag)
  await expect(page.getByRole('button', { name: '移除标签：' + tag, exact: true })).toBeVisible()
  await expect(page.locator('.place-card')).toHaveCount(places.filter(p => p.city === place.city && p.tags.includes(tag)).length)
  await page.reload()
  await expect(page.locator('.mobile-tools-toggle')).toContainText('# ' + tag)
  await expect(page.locator('.board-tools-content')).not.toBeVisible()
  await openMobileTools(page)
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByRole('button', { name: '移除标签：' + tag, exact: true })).toBeVisible()
  await page.getByRole('button', { name: '移除标签：' + tag, exact: true }).click()
  await expect(page.getByLabel('城市筛选')).toHaveValue(place.city)
  await expect(page.locator('.place-card')).toHaveCount(places.filter(p => p.city === place.city).length)
  await page.getByRole('searchbox').fill(place.name)
  await expect(page.getByRole('button', { name: '移除关键词：' + place.name, exact: true })).toHaveCount(0)
  await page.getByRole('searchbox').fill('')
  await expect(page.getByRole('searchbox')).toHaveValue('')
  await page.getByRole('button', { name: '移除城市：' + place.city, exact: true }).click()
  await expect(page.locator('.active-filters')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('all tags remain accessible once through mobile tools and on the guide', async ({ page }) => {
  const tags = [...new Set(places.flatMap(p => p.tags))]
  for (const route of ['', 'guide/']) {
    await page.goto(base + route)
    for (const width of [1440, 390, 768]) {
      await page.setViewportSize({ width, height: 950 })
      await openMobileTools(page)
      await expect(page.locator('.common-tags .tag-filter')).toBeVisible()
      await expect(page.locator('.more-tags-toggle')).toBeVisible()
      await expect(page.locator('.common-tags .tag-filter > button:not(.more-tags-toggle)')).toHaveText(['全部标签', ...preferredTags.map(tag => '# ' + tag)])
      for (const tag of tags) await expect(page.getByRole('button', { name: '# ' + tag, exact: true, includeHidden: true })).toHaveCount(1)
    }
    await page.locator('.more-tags-toggle').click()
    await expect(page.locator('.browse-tags .tag-filter')).toBeVisible()
  }
})

test('comfortable view preserves every rank and city color, improves mobile reading and persists', async ({ page }) => {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 950 })
    await page.goto(base)
    await openMobileTools(page)
    await page.getByRole('button', { name: '紧凑', exact: true }).click()
    const compactPhotoWidth = (await page.locator('.card-photo').first().boundingBox())!.width
    const links = await page.locator('.place-card .card-link').evaluateAll(elements => elements.map(e => [e.getAttribute('href'), e.getAttribute('aria-label'), getComputedStyle(e).borderTopColor]))
    await page.getByRole('button', { name: '舒适', exact: true }).click()
    await expect(page.getByRole('button', { name: '舒适', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.place-card')).toHaveCount(places.length)
    expect(await page.locator('.place-card .card-link').evaluateAll(elements => elements.map(e => [e.getAttribute('href'), e.getAttribute('aria-label'), getComputedStyle(e).borderTopColor]))).toEqual(links)
    const firstCard = page.locator('.place-card').first()
    const photo = await firstCard.locator('.card-photo').boundingBox()
    const caption = await firstCard.locator('.photo-caption').boundingBox()
    expect(caption!.y).toBeGreaterThanOrEqual(photo!.y + photo!.height - 1)
    await expect(firstCard.locator('.photo-caption')).toHaveCSS('opacity', '1')
    await firstCard.hover()
    await expect(firstCard.locator('.photo-caption')).toHaveCSS('opacity', '1')
    if (width <= 580) {
      const grid = page.locator('.card-grid').first()
      expect((await grid.evaluate(e => getComputedStyle(e).gridTemplateColumns)).split(' ')).toHaveLength(2)
      expect(photo!.width).toBeGreaterThan(compactPhotoWidth * 1.25)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await firstCard.scrollIntoViewIfNeeded()
    await page.screenshot({ path: 'test-results/evidence/board-comfortable-' + width + '.png' })
    await page.reload()
    await openMobileTools(page)
    await expect(page.getByRole('button', { name: '舒适', exact: true })).toHaveAttribute('aria-pressed', 'true')
  }
  const place = places.find(p => p.id === 'shanghai-shop-015')
  await page.getByLabel('城市筛选').selectOption(place.city)
  await page.locator('#place-card-' + place.id).getByRole('link').click()
  await expect(page.locator('.guide-detail h1')).toHaveText(place.name)
  await page.getByRole('link', { name: '← 返回图片总榜', exact: true }).click()
  await expect(page.getByRole('button', { name: '舒适', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('城市筛选')).toHaveValue(place.city)
  await expect(page.locator('#place-card-' + place.id)).toBeInViewport()
})

test('comfortable captions remain visible even when compact labels are disabled', async ({ page }) => {
  await page.goto(base)
  await page.getByLabel('显示名称与城市').uncheck()
  await expect(page.locator('.photo-caption').first()).toHaveCSS('opacity', '0')
  await page.getByRole('button', { name: '舒适', exact: true }).click()
  await expect(page.locator('.photo-caption').first()).toHaveCSS('opacity', '1')
  await page.getByRole('button', { name: '紧凑', exact: true }).click()
  await expect(page.getByLabel('显示名称与城市')).not.toBeChecked()
})

test('detail headings omit duplicate map actions while directions stay available', async ({ page }) => {
  const place = places.find(p => p.location?.address && p.gallery.length)
  for (const route of ['guide/#/place/', '#/place/']) {
    await page.goto(base + route + place.id)
    await expect(page.locator('.guide-detail h1')).toHaveText(place.name)
    await expect(page.locator('.detail-heading .detail-tags')).toBeVisible()
    await expect(page.locator('.detail-heading a')).toHaveCount(0)
    await expect(page.locator('.detail-destination .destination-actions a')).toHaveCount(3)
    for (const name of ['百度地图 ↗', '高德地图 ↗', 'Google 地图 ↗']) await expect(page.locator('.detail-destination').getByRole('link', { name, exact: true })).toHaveAttribute('href', new RegExp('^https://'))
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('.detail-heading').scrollIntoViewIfNeeded()
  await page.screenshot({ path: 'test-results/evidence/detail-without-quick-maps-390.png' })
})

test('chapters jump without replacing the place route and remain available while scrolling', async ({ page }) => {
  const place = places.find(p => p.gallery.length > 10 && p.location?.address && !directories[p.id])
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 950 })
    await page.goto(base + 'guide/#/place/' + place.id)
    const nav = page.getByRole('navigation', { name: '地点章节导航', exact: true })
    await expect(nav.getByRole('button', { name: '店铺', exact: true })).toHaveCount(0)
    await nav.getByRole('button', { name: '图集', exact: true }).click()
    await expect(page).toHaveURL(base + 'guide/#/place/' + place.id)
    await expect(nav.getByRole('button', { name: '图集', exact: true })).toHaveAttribute('aria-current', 'location')
    const target = page.locator('#place-' + place.id + '-gallery')
    expect(await target.evaluate(el => el.getBoundingClientRect().top)).toBeGreaterThanOrEqual(60)
    expect(await nav.evaluate(el => Math.abs(el.getBoundingClientRect().top))).toBeLessThan(2)
    await page.screenshot({ path: `test-results/evidence/detail-chapters-${width}.png` })
    await expect(nav.getByRole('button', { name: '图集', exact: true })).toHaveAttribute('aria-current', 'location')
    await nav.getByRole('button', { name: '周边', exact: true }).click()
    await expect(page.getByRole('heading', { name: '店铺周边', exact: true })).toBeInViewport()
    await nav.getByRole('button', { name: '怎么去', exact: true }).click()
    await expect(page.getByRole('heading', { name: '怎么去', exact: true })).toBeInViewport()
    await nav.getByRole('button', { name: '介绍', exact: true }).click()
    await expect(page.getByRole('heading', { name: '商圈介绍', exact: true })).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
})

test('shop chapter keeps unconfirmed stores collapsed and only links to existing sections', async ({ page }) => {
  const place = places.find(p => directories[p.id])
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(base + 'guide/#/place/' + place.id)
  const nav = page.getByRole('navigation', { name: '地点章节导航', exact: true })
  await nav.getByRole('button', { name: '店铺', exact: true }).click()
  await expect(page.locator('#place-' + place.id + '-shops')).toBeInViewport()
  const more = page.locator('.shop-directory-more')
  if (await more.count()) await expect(more).not.toHaveAttribute('open')
  const targets = await nav.getByRole('button').evaluateAll(buttons => buttons.map(button => button.getAttribute('aria-controls')))
  for (const id of targets) await expect(page.locator('#' + id)).toHaveCount(1)
  await page.goto(base + 'guide/#/place/shanghai-shop-021')
  await expect(nav.getByRole('button', { name: '周边', exact: true })).toHaveCount(0)
  await expect(nav.getByRole('button', { name: '店铺', exact: true })).toHaveCount(0)
})

test('returning from a detail restores the card, focus and saved city filter', async ({ page }) => {
  const place = places.find(p => p.id === 'shanghai-shop-015')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(base)
  await page.getByLabel('城市筛选').selectOption(place.city)
  const card = page.locator('#place-card-' + place.id)
  await card.getByRole('link').click()
  await expect(page.locator('.guide-detail h1')).toHaveText(place.name)
  await page.getByRole('link', { name: '← 返回图片总榜', exact: true }).click()
  await expect(page).toHaveURL(base + '#place-card-' + place.id)
  await expect(card).toBeInViewport()
  await expect(card.getByRole('link')).toBeFocused()
  await expect(page.getByLabel('城市筛选')).toHaveValue(place.city)
  await page.reload()
  await expect(card).toBeInViewport()
  await page.goto(base + '#place-card-not-published')
  await expect(page.locator('.tier-board')).toBeVisible()
  await expect(page.getByRole('heading', { name: '没有找到这个条目' })).toHaveCount(0)
})

test('legacy inline detail also has chapters and a card return link', async ({ page }) => {
  const place = places.find(p => p.gallery.length)
  await page.goto(base + '#/place/' + place.id)
  await expect(page.getByRole('navigation', { name: '地点章节导航', exact: true })).toBeVisible()
  await page.getByRole('link', { name: '← 返回榜单', exact: true }).click()
  await expect(page.locator('#place-card-' + place.id)).toBeInViewport()
})
