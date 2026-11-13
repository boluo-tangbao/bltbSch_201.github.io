import { test, expect } from '@playwright/test'
import { resolve } from 'node:path'
import { mkdirSync } from 'node:fs'
import { openMobileTools } from '../browser/browse-tools'

test.beforeEach(async ({ page, context, baseURL }) => {
  await context.route('**/*', route => new URL(route.request().url()).origin === new URL(baseURL!).origin ? route.continue() : route.abort())
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addLocatorHandler(page.locator('#site-console.sc-open'), async () => {
    await page.mouse.move(0, 0)
    await page.keyboard.press('Escape')
  })
})

test('连续浏览地点：页面返回、系统返回及前进均保留筛选、视图和原卡片位置', async ({ page }, info) => {
  await page.goto('?filters=1&city=上海&q=上海&tag=中古')
  await page.getByRole('button', { name: '舒适', exact: true }).click()
  await openMobileTools(page)
  const count = await page.locator('.place-card').count()
  expect(count).toBeGreaterThan(2)
  for (const [index, useBrowserBack] of [[1, false], [2, true]] as const) {
    const card = page.locator('.place-card').nth(index)
    const id = await card.getAttribute('id')
    const link = card.locator('.card-link')
    await link.scrollIntoViewIfNeeded()
    const before = (await card.boundingBox())!.y
    await link.click()
    await expect(page.locator('.detail-heading h1')).toBeVisible()
    expect(new URL(page.url()).pathname).toMatch(/\/rank\/$/)
    await expect(page.locator('.board-browse-content')).toBeHidden()
    await expect(page.locator('.guide-browser')).toHaveCount(0)
    await page.locator('.detail-chapters').getByRole('button', { name: '店铺', exact: true }).click()
    await expect(page.locator('.shop-directory')).toBeInViewport()
    if (useBrowserBack) await page.goBack()
    else await page.getByRole('link', { name: '← 返回图片榜单', exact: true }).click()
    await expect(link).toBeFocused()
    await expect(card).toBeInViewport()
    await expect.poll(async () => Math.abs((await card.boundingBox())!.y - before)).toBeLessThan(3)
    await expect(page.getByLabel('城市筛选')).toHaveValue('上海')
    await expect(page.getByRole('searchbox', { name: '关键词搜索' })).toHaveValue('上海')
    await expect(page.getByRole('button', { name: '舒适', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.place-card')).toHaveCount(count)
    await expect(page.getByRole('button', { name: '移除标签：中古', exact: true })).toBeVisible()
    if (!useBrowserBack) {
      await page.goForward()
      await expect(page.locator('.detail-heading h1')).toBeVisible()
      await page.goBack()
      await expect(page.locator(`#${id} .card-link`)).toBeFocused()
      await expect.poll(async () => Math.abs((await card.boundingBox())!.y - before)).toBeLessThan(3)
    }
  }
  if (info.project.name === 'mobile') {
    const folder = resolve('../test-results/browsing-experience')
    mkdirSync(folder, { recursive: true })
    await page.screenshot({ path: resolve(folder, 'returned-board-390.png') })
  }
  await page.getByRole('button', { name: '紧凑', exact: true }).click()
  await page.reload()
  await expect(page.getByRole('button', { name: '紧凑', exact: true })).toHaveAttribute('aria-pressed', 'true')
})

test('地点链接可刷新、直接打开，并保留搜索直达与独立地图入口', async ({ page }) => {
  await page.goto('?filters=1&city=上海&q=铃夏学园')
  const first = page.locator('.place-card .card-link').first()
  await first.click()
  const route = page.url()
  await expect(page.locator('.shop-row').filter({ hasText: '铃夏学园' }).first()).toBeInViewport()
  await page.reload()
  await expect(page.locator('.shop-row').filter({ hasText: '铃夏学园' }).first()).toBeInViewport()
  await page.getByRole('link', { name: '← 返回图片榜单', exact: true }).click()
  await expect(page.getByRole('searchbox', { name: '关键词搜索' })).toHaveValue('铃夏学园')
  await expect(page.locator('.place-card .card-link').first()).toBeFocused()
  await page.goto(route)
  await page.getByRole('link', { name: '地图找店 ↗', exact: true }).click()
  expect(new URL(page.url()).pathname).toMatch(/\/rank\/guide\/$/)
  await expect(page.locator('.detail-heading h1')).toBeInViewport()
  await page.getByRole('link', { name: '← 返回图片榜单', exact: true }).click()
  await expect(page.getByRole('searchbox', { name: '关键词搜索' })).toHaveValue('铃夏学园')
  await expect(page.locator('.place-card .card-link').first()).toBeFocused()
})

test('禁用存储仍可往返；直接打开详情没有历史来源时返回对应卡片', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('Storage unavailable') }
    Storage.prototype.setItem = () => { throw new Error('Storage unavailable') }
  })
  await page.goto('?filters=1&city=上海&q=HIPPIHO')
  await page.getByRole('button', { name: '舒适', exact: true }).click()
  const link = page.locator('.place-card .card-link').first()
  const href = await link.getAttribute('href')
  const destination = new URL(href!, page.url()).href
  await link.click()
  await expect(page.locator('.detail-heading h1')).toBeVisible()
  await page.goBack()
  await expect(link).toBeFocused()
  await expect(page.getByRole('button', { name: '舒适', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.goto(destination)
  await expect(page.locator('.detail-heading h1')).toBeVisible()
  await page.getByRole('link', { name: '← 返回图片榜单', exact: true }).click()
  await expect(link).toBeFocused()
  await expect(link).toBeInViewport()
  const otherTab = await page.context().newPage()
  await otherTab.goto(destination)
  await expect(otherTab.locator('.detail-heading h1')).toBeVisible()
  await otherTab.getByRole('link', { name: '← 返回图片榜单', exact: true }).click()
  await expect(otherTab.getByLabel('城市筛选')).toHaveValue('上海')
  await expect(otherTab.getByRole('searchbox', { name: '关键词搜索' })).toHaveValue('HIPPIHO')
  await expect(otherTab.locator('.place-card .card-link').first()).toBeInViewport()
  await otherTab.close()
})

test('浏览阶段工具降级，进入选店和已有清单后主操作保持可用', async ({ page }, info) => {
  await page.goto('?filters=1&city=上海')
  await expect(page.locator('.board-heading .compare-launch')).toHaveCount(0)
  await expect(page.locator('.board-heading').getByRole('button', { name: '导出榜单' })).toHaveCount(0)
  await expect(page.getByLabel('城市筛选')).toBeInViewport()
  await expect(page.getByRole('searchbox', { name: '关键词搜索' })).toBeInViewport()
  await expect(page.locator('.trip-plan-entry')).toHaveCSS('position', 'static')
  if (info.project.name === 'mobile') {
    const folder = resolve('../test-results/browsing-experience')
    mkdirSync(folder, { recursive: true })
    await page.screenshot({ path: resolve(folder, 'board-390.png') })
  }
  await page.locator('.place-card .card-link').first().click()
  await expect(page.locator('.detail-heading h1')).toBeInViewport()
  if (info.project.name === 'mobile') await page.screenshot({ path: resolve('../test-results/browsing-experience/detail-390.png') })
  await page.getByRole('link', { name: '← 返回图片榜单', exact: true }).click()
  if (page.viewportSize()!.width <= 580) {
    await expect(page.getByRole('button', { name: /^商圈对比/ })).toBeHidden()
    await expect(page.getByRole('button', { name: '导出榜单', exact: true })).toBeHidden()
  }
  await openMobileTools(page)
  await page.getByRole('button', { name: /^商圈对比/ }).click()
  await expect(page.getByRole('dialog', { name: '商圈对比', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await page.locator('.board-tools-content').getByRole('button', { name: '开始选店', exact: true }).click()
  await expect(page.locator('.trip-plan-dock')).toBeInViewport()
  await page.locator('.place-card .trip-plan-add').first().click()
  await page.getByRole('button', { name: '查看清单', exact: true }).click()
  await expect(page.getByRole('dialog', { name: '想逛清单', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '关闭想逛清单', exact: true }).click()
  await expect(page.getByRole('button', { name: '查看清单', exact: true })).toBeInViewport()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  if (info.project.name === 'mobile') {
    const folder = resolve('../test-results/browsing-experience')
    mkdirSync(folder, { recursive: true })
    await page.screenshot({ path: resolve(folder, 'selected-board-390.png') })
  }
})
