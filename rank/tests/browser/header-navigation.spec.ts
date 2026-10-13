import { test, expect } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const base = process.env.BROWSE_TEST_BASE || 'http://127.0.0.1:4173/bltbSch_201.github.io/rank/'
const names = ['图片总榜', '地图与介绍', 'QA 与建议', '活动记录', '个人主页']
mkdirSync('test-results/evidence', { recursive: true })

test('pixel brand loads on every ranking page and matches the favicon', async ({ page }) => {
  for (const route of ['', 'guide/', 'qa/', 'updates/']) {
    await page.goto(base + route)
    const image = page.locator('.site-header .brand-mark img')
    await expect(image).toBeVisible()
    await expect(image).toHaveAttribute('src', '/bltbSch_201.github.io/rank/brand/pineapple-tangbao-pixel.png')
    await expect.poll(() => image.evaluate(el => (el as HTMLImageElement).naturalWidth)).toBe(128)
    await expect(image).toHaveCSS('image-rendering', 'pixelated')
    await expect(page.locator('.brand-signature b')).toHaveText(['bltb', 'scho'])
    await expect(page.locator('.brand-signature').first()).toHaveCSS('font-family', /Guide Cartoon/)
    await expect(page.locator('.brand-signature-bottom')).toHaveCSS('font-style', 'italic')
    await expect(page.locator('.brand-fragment')).toHaveText(['sc', 'ho'])
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', await image.getAttribute('src') as string)
    await expect(page.locator('.site-header .brand-mark')).toHaveCSS('transform', 'none')
  }
})

test('compact navigation keeps the adaptive brand and two-line links in a single row', async ({ page }) => {
  await page.goto(base)
  const nav = page.getByRole('navigation', { name: '主导航', exact: true })
  for (const width of [320, 360, 390, 480, 481, 580, 768, 900]) {
    await page.setViewportSize({ width, height: 900 })
    const brand = page.locator('.site-header .brand')
    await expect(brand).toBeVisible()
    await expect(brand.locator('.brand-signature b')).toHaveText(['bltb', 'scho'])
    const top = await brand.locator('.brand-signature').first().boundingBox()
    const image = await brand.locator('.brand-mark img').boundingBox()
    const bottom = await brand.locator('.brand-signature').last().boundingBox()
    const sc = await brand.locator('.brand-fragment').first().boundingBox()
    const ho = await brand.locator('.brand-fragment').last().boundingBox()
    expect(ho!.x - sc!.x - sc!.width).toBeGreaterThanOrEqual(8)
    expect(ho!.x).toBeGreaterThan(image!.x + image!.width * 0.8)
    expect(top!.y + top!.height).toBeGreaterThan(image!.y + 8)
    expect(bottom!.y).toBeLessThan(image!.y + image!.height - 8)
    expect(top!.y + top!.height).toBeLessThan(bottom!.y)
    expect(Math.abs(top!.x + top!.width / 2 - image!.x - image!.width / 2)).toBeLessThan(1)
    expect(Math.abs(bottom!.x + bottom!.width / 2 - image!.x - image!.width / 2)).toBeLessThan(1)
    expect(await brand.locator('.brand-mark').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
    if (width <= 480) await expect(brand.locator('.brand-copy')).not.toBeVisible()
    else await expect(brand.locator('.brand-copy')).toBeVisible()
    const brandBox = await brand.boundingBox()
    const navBox = await nav.boundingBox()
    expect(brandBox!.x + brandBox!.width).toBeLessThanOrEqual(navBox!.x)
    expect(Math.abs(brandBox!.y - navBox!.y)).toBeLessThan(2)
    await expect(nav.getByRole('link')).toHaveCount(5)
    for (const name of names) {
      const link = nav.getByRole('link', { name: new RegExp(name) })
      await expect(link).toBeInViewport()
      const box = await link.boundingBox()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(width)
      expect(await link.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
    }
    const labels = [['图片', '总榜'], ['地图', '介绍'], ['QA与', '建议']]
    for (const [i, lines] of labels.entries()) {
      const link = nav.getByRole('link', { name: names[i], exact: true })
      const upper = link.locator('.header-label').nth(0)
      const lower = link.locator('.header-label').nth(1)
      expect((await upper.innerText()).trim()).toBe(lines[0])
      expect((await lower.innerText()).trim()).toBe(lines[1])
      const upperBox = await upper.boundingBox()
      const lowerBox = await lower.boundingBox()
      expect(upperBox!.y + upperBox!.height).toBeLessThanOrEqual(lowerBox!.y)
    }
    const activity = await nav.getByRole('link', { name: /活动记录/ }).boundingBox()
    const home = await nav.getByRole('link', { name: /个人主页/ }).boundingBox()
    expect(activity!.x).toBe(home!.x)
    expect(activity!.y + activity!.height).toBeLessThanOrEqual(home!.y)
    expect(home!.height).toBeGreaterThanOrEqual(28)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: `test-results/evidence/header-compact-${width}.png` })
  }
})

test('desktop retains the brand and one-row links without overlap', async ({ page }) => {
  await page.goto(base)
  for (const width of [901, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    const brand = page.locator('.site-header .brand')
    const nav = page.getByRole('navigation', { name: '主导航', exact: true })
    await expect(brand).toBeVisible()
    const brandBox = await brand.boundingBox()
    const navBox = await nav.boundingBox()
    expect(brandBox!.x + brandBox!.width).toBeLessThanOrEqual(navBox!.x)
    const activity = await nav.getByRole('link', { name: /活动记录/ }).boundingBox()
    const home = await nav.getByRole('link', { name: /个人主页/ }).boundingBox()
    expect(activity!.y).toBe(home!.y)
    await expect(nav.getByRole('link')).toHaveCount(5)
    for (const name of names) {
      const link = nav.getByRole('link', { name: new RegExp(name) })
      await expect(link).toBeInViewport()
      const box = await link.boundingBox()
      expect(Math.abs(box!.y - activity!.y)).toBeLessThan(1)
    }
    await expect(nav.getByRole('link', { name: /个人主页/ })).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.screenshot({ path: 'test-results/evidence/header-desktop.png' })
})

test('compact links and active navigation are consistent on guide, QA and updates pages', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  for (const route of ['guide/', 'qa/', 'updates/']) {
    await page.goto(base + route)
    const nav = page.getByRole('navigation', { name: '主导航', exact: true })
    await expect(page.locator('.site-header .brand')).toBeVisible()
    await expect(nav.getByRole('link')).toHaveCount(5)
    await expect(nav.getByRole('link', { name: /个人主页/ })).toBeInViewport()
    await expect(nav.getByRole('link', { name: /活动记录/ })).toHaveAttribute('href', '/bltbSch_201.github.io/rank/../activities.html?topic=acg#event-records')
    await expect(nav.getByRole('link', { name: /个人主页/ })).toHaveAttribute('href', '/bltbSch_201.github.io/rank/../')
    if (route === 'guide/') await expect(nav.getByRole('link', { name: /地图与介绍/ })).toHaveAttribute('aria-current', 'page')
    if (route === 'qa/') await expect(nav.getByRole('link', { name: /QA 与建议/ })).toHaveAttribute('aria-current', 'page')
  }
})
