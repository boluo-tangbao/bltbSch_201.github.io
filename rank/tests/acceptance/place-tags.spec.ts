import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { tiers, flattenPlaces } from '../../src/utils/model'
import type { PlacesByCity } from '../../src/types'
const places = flattenPlaces(JSON.parse(readFileSync('src/data/places.json', 'utf8')) as PlacesByCity).filter(p => p.published)

test.beforeEach(async ({ context, baseURL }) => {
  expect(new URL(baseURL!).hostname).toBe('127.0.0.1')
  await context.route('**/*', route => new URL(route.request().url()).origin === new URL(baseURL!).origin ? route.continue() : route.abort())
})
const exposed = async (stage: import('@playwright/test').Locator) => stage.locator('a').evaluateAll(elements => {
  for (let i = 0; i < elements.length; i++) {
    const rect = elements[i].getBoundingClientRect(), x = rect.x + rect.width / 2, y = rect.y + rect.height / 2
    if (elements[i].contains(document.elementFromPoint(x, y))) return { i, x, y }
  }
  return null
})

test('首屏直接看榜单，标签只在两侧；窄屏不占位、不加载物理模块', async ({ page }, info) => {
  const modules: string[] = []
  page.on('request', request => { if (/tagPhysics-[^/]+\.js/.test(request.url())) modules.push(request.url()) })
  await page.goto('')
  const toys = page.getByRole('complementary', { name: '商圈标签玩具', exact: true })
  await expect(page.locator('.tier-board .card-link').first()).toBeInViewport()
  const before = await page.locator('.board-section').boundingBox()
  if (info.project.name !== 'desktop') {
    await expect(toys).toBeHidden()
    expect(modules).toEqual([])
    await expect(page.locator('.place-toy-stage')).toHaveCount(0)
  } else {
    const stages = page.locator('.place-toy-stage')
    await expect(stages).toHaveCount(2)
    for (const stage of await stages.all()) await expect(stage).toHaveAttribute('data-state', 'resting', { timeout: 20000 })
    const content = await page.locator('main.page-shell').evaluate(el => {
      const rect = el.getBoundingClientRect(), css = getComputedStyle(el)
      return { left: rect.left + parseFloat(css.paddingLeft), right: rect.right - parseFloat(css.paddingRight) }
    })
    const left = (await stages.nth(0).boundingBox())!, right = (await stages.nth(1).boundingBox())!
    expect(left.x + left.width).toBeLessThanOrEqual(content.left - 10)
    expect(right.x).toBeGreaterThanOrEqual(content.right + 10)
    for (const tag of await toys.locator('a').all()) {
      const id = await tag.getAttribute('data-place-id'), place = places.find(p => p.id === id)!
      expect(place).toBeTruthy()
      expect(await tag.getAttribute('data-tier')).toBe(place.tier)
      expect(await tag.evaluate(el => (el as HTMLElement).style.getPropertyValue('--tag-color'))).toBe(tiers.find(t => t.id === place.tier)!.color)
    }
    await toys.getByRole('button', { name: '收起', exact: true }).click()
    expect((await page.locator('.board-section').boundingBox())!.y).toBe(before!.y)
    await toys.getByRole('button', { name: '展开标签', exact: true }).click()
    for (const stage of await page.locator('.place-toy-stage').all()) await expect(stage).toHaveAttribute('data-state', 'resting', { timeout: 20000 })
  }
  await page.screenshot({ path: `../test-results/acceptance/place-toys-${info.project.name}.png` })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('两侧标签可拖拽但不误跳转，点击进入详情；缩窄和放大窗口正确清理恢复', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', '窄屏不启用背景标签')
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('')
  const stage = page.locator('.place-toy-stage').first()
  await expect(stage).toHaveAttribute('data-state', 'resting', { timeout: 20000 })
  const p = await exposed(stage); expect(p).toBeTruthy()
  const link = stage.locator('a').nth(p!.i), bounds = (await stage.boundingBox())!, original = page.url()
  await page.mouse.move(p!.x, p!.y); await page.mouse.down()
  await expect(link).toHaveClass(/is-held/)
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + 100, { steps: 24 })
  await expect.poll(async () => (await link.boundingBox())!.y).toBeLessThan(bounds.y + 210)
  await page.mouse.up()
  expect(page.url()).toBe(original)
  await expect(stage).toHaveAttribute('data-state', 'resting', { timeout: 20000 })
  await page.setViewportSize({ width: 1000, height: 1000 })
  await expect(page.locator('.place-toy-stage')).toHaveCount(0)
  await expect(page.locator('.falling-place-toys')).toBeHidden()
  await page.setViewportSize({ width: 1920, height: 1000 })
  await expect(page.locator('.place-toy-stage')).toHaveCount(2)
  for (const surface of await page.locator('.place-toy-stage').all()) await expect(surface).toHaveAttribute('data-state', 'resting', { timeout: 20000 })
  const p2 = await exposed(stage); expect(p2).toBeTruthy()
  const href = await stage.locator('a').nth(p2!.i).getAttribute('href')
  await page.mouse.click(p2!.x, p2!.y)
  await expect(page).toHaveURL(new URL(href!, original).href)
  await expect(page.locator('.detail-heading h1')).toBeVisible()
  expect(errors).toEqual([])
})

test('减少动态时保留侧边静态链接与换批次，收起可跨刷新保留', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', '窄屏不启用背景标签')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const modules: string[] = []
  page.on('request', request => { if (/tagPhysics-[^/]+\.js/.test(request.url())) modules.push(request.url()) })
  await page.goto('')
  const toys = page.locator('.falling-place-toys'), stage = page.locator('.place-toy-stage').first()
  await expect(stage).toHaveClass(/is-static/)
  const id = await stage.locator('a').first().getAttribute('data-place-id')
  await toys.getByRole('button', { name: '换一批', exact: true }).click()
  await expect(stage.locator('a').first()).not.toHaveAttribute('data-place-id', id!)
  await toys.getByRole('button', { name: '收起', exact: true }).click()
  await page.reload()
  await expect(toys.getByRole('button', { name: '展开标签', exact: true })).toBeVisible()
  await expect(page.locator('.place-toy-stage')).toHaveCount(0)
  await toys.getByRole('button', { name: '展开标签', exact: true }).click()
  expect(modules).toEqual([])
  const href = await stage.locator('a').first().getAttribute('href')
  await stage.locator('a').first().focus(); await page.keyboard.press('Enter')
  await expect(page).toHaveURL(new URL(href!, page.url()).href)
})
