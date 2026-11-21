import { test, expect } from '@playwright/test'
import type { Locator } from '@playwright/test'
import { mkdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { openTripEntry } from '../browser/browse-tools'

test('手机控制台覆盖页尾清单与选店底栏，榜单说明保留原文并突出重点', async ({ page, context, baseURL }, info) => {
  test.skip(page.viewportSize()!.width > 900, '手机层级回归')
  await context.route('**/*', route => new URL(route.request().url()).origin === new URL(baseURL!).origin ? route.continue() : route.abort())
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('./')
  const evidence = resolve('../test-results/acceptance/rank-reading')
  mkdirSync(evidence, { recursive: true })
  const expectConsoleAbove = async (selector: string) => {
    await page.locator('.sc-launcher').click()
    await expect(page.locator('.sc-panel')).toBeVisible()
    const overlap = await page.evaluate(target => {
      const panel = document.querySelector('.sc-panel')!.getBoundingClientRect()
      const card = document.querySelector(target)!.getBoundingClientRect()
      const left = Math.max(panel.left, card.left, 0), right = Math.min(panel.right, card.right, innerWidth)
      const top = Math.max(panel.top, card.top, 0), bottom = Math.min(panel.bottom, card.bottom, innerHeight)
      return { width: right - left, height: bottom - top, consoleOnTop: !!document.elementFromPoint((left + right) / 2, (top + bottom) / 2)?.closest('#site-console') }
    }, selector)
    expect(overlap.width).toBeGreaterThan(0)
    expect(overlap.height).toBeGreaterThan(0)
    expect(overlap.consoleOnTop, '控制台在与清单相交的位置应实际绘制在上层').toBe(true)
  }
  await page.locator('.trip-plan-entry').scrollIntoViewIfNeeded()
  await expectConsoleAbove('.trip-plan-entry')
  await page.screenshot({ path: resolve(evidence, `console-${info.project.name}.png`) })
  await page.getByRole('button', { name: '关闭控制台', exact: true }).click()
  await openTripEntry(page)
  await page.locator('.trip-plan-entry').getByRole('button', { name: '开始选店', exact: true }).click()
  await expectConsoleAbove('.trip-plan-dock')
  await page.getByRole('button', { name: '关闭控制台', exact: true }).click()
  await page.getByRole('button', { name: '退出选店', exact: true }).click()
  const criteria = page.locator('.criteria-copy')
  await criteria.scrollIntoViewIfNeeded()
  await expect(criteria.locator('mark')).toHaveCount(4)
  const site = JSON.parse(readFileSync('src/data/site.json', 'utf8'))
  expect((await criteria.textContent())!.replace(/\s/g, '')).toBe(site.criteria.replace(/\s/g, ''))
  await page.locator('.criteria-section details > summary').click()
  await expect(page.locator('#tier-meaning-hang')).toBeVisible()
  await page.locator('.criteria-section').screenshot({ path: resolve(evidence, `criteria-${info.project.name}.png`), style: '.sc-launcher { visibility: hidden !important; }' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('控制台主题切换记住选择，跨页同步并用于导出', async ({ page, context, baseURL }, info) => {
  await context.route('**/*', route => new URL(route.request().url()).origin === new URL(baseURL!).origin ? route.continue() : route.abort())
  const change = async (target: typeof page, theme: 'Day' | 'Night') => {
    await target.locator('.sc-launcher').click()
    await target.locator('#sc-theme-slot').getByRole('button', { name: `${theme} version`, exact: true }).click()
    await expect(target.locator('html')).toHaveAttribute('data-theme', theme.toLowerCase())
    await expect(target.locator('#sc-theme-slot').getByRole('button', { name: `${theme} version`, exact: true })).toHaveAttribute('aria-pressed', 'true')
  }
  await page.goto('./')
  await expect(page.locator('.site-header .theme-switch')).toHaveCount(0)
  await change(page, 'Night')
  await expect(page.locator('#sc-theme-heading')).toHaveText('页面风格')
  if (info.project.name === 'narrow-mobile') {
    await expect(page.locator('#sc-theme-heading')).toBeHidden()
    await expect(page.locator('#sc-theme-slot .theme-label').first()).toBeHidden()
    await expect(page.locator('#sc-theme-slot .theme-icon').first()).toBeVisible()
  } else {
    await expect(page.locator('#sc-theme-heading')).toBeVisible()
    await expect(page.locator('#sc-theme-slot .theme-label').first()).toBeVisible()
  }
  await expect(page.locator('#sc-theme-slot button[aria-pressed="true"]')).toHaveCSS('background-color', 'rgb(213, 243, 74)')
  mkdirSync(resolve('../test-results/acceptance/console-theme'), { recursive: true })
  await page.locator('.sc-panel').screenshot({ path: resolve(`../test-results/acceptance/console-theme/night-${info.project.name}.png`) })
  if (info.project.name !== 'desktop') await page.locator('#sc-theme-slot').screenshot({ path: resolve(`../test-results/acceptance/console-theme/controls-${info.project.name}.png`) })
  await page.mouse.move(0, 0)
  await page.keyboard.press('Escape')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night')
  for (const route of ['guide/', 'qa/', 'updates/', 'route/', '']) {
    await page.goto(route || './')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'night')
    await expect(page.locator('#sc-theme-slot .theme-switch')).toHaveCount(1)
  }
  await page.getByRole('button', { name: /^筛选与工具/ }).click()
  await page.getByRole('button', { name: '导出榜单', exact: true }).filter({ visible: true }).click()
  await expect(page.locator('.studio-theme')).toContainText('Night version')
  await expect(page.locator('.studio-theme button')).toHaveCount(0)
  const settings = await context.newPage()
  await settings.goto('qa/')
  await change(settings, 'Day')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'day')
  await expect(page.locator('.studio-theme')).toContainText('Day version')
  await settings.close()
  await page.getByRole('button', { name: '关闭导出', exact: true }).click()
})

test('控制台悬停展开，侧签与面板之间移动不收起，离开后收起', async ({ page }) => {
  test.skip(page.viewportSize()!.width <= 900, '窄屏使用页头按钮，悬停不再打开控制台')
  await page.goto('./')
  const tab = page.locator('.sc-launcher')
  const panel = page.locator('.sc-panel')
  await expect(tab).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('[data-close]')).toHaveCount(0)
  await tab.hover()
  await expect(tab).toHaveAttribute('aria-expanded', 'true')
  await panel.hover()
  await expect(panel).toBeVisible()
  await page.locator('[data-volume]').fill('24')
  await page.mouse.move(0, 0)
  await expect(tab).toHaveAttribute('aria-expanded', 'false')
  await expect(panel).toBeHidden()
  await expect(panel).toHaveAttribute('inert', '')
  await tab.hover()
  await panel.hover()
  await page.mouse.move(0, 0)
  await panel.hover()
  await expect(tab).toHaveAttribute('aria-expanded', 'true')
  // A click on a mouse-hovered tab must not toggle the drawer closed.
  await tab.click()
  await expect(tab).toHaveAttribute('aria-expanded', 'true')
  await page.mouse.move(0, 0)
  await expect(panel).toBeHidden()
})

test('控制台支持键盘展开、Esc收起和焦点返回', async ({ page }) => {
  await page.goto('./')
  const tab = page.locator('.sc-launcher')
  await tab.focus()
  await tab.press('Enter')
  await expect(page.locator('[data-home]')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(tab).toBeFocused()
  await expect(tab).toHaveAttribute('aria-expanded', 'false')
  await tab.press('Space')
  await expect(page.locator('.sc-panel')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.sc-panel')).toBeHidden()
})

test('控制台沿右侧上下拖动，详情导航保持固定，松手不触发点击', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('./#/place/guangzhou-shop-001')
  const navigation = page.locator('.detail-side-nav')
  const toggle = navigation.locator('.side-nav-toggle')
  const launcher = page.locator('.sc-launcher')
  await expect(toggle).toBeVisible()
  await expect(launcher).toBeVisible()
  const floatsOverlap = async () => {
    const nav = (await navigation.boundingBox())!
    const tab = (await launcher.boundingBox())!
    return nav.x < tab.x + tab.width && tab.x < nav.x + nav.width &&
      nav.y < tab.y + tab.height && tab.y < nav.y + nav.height
  }
  const navBox = (await navigation.boundingBox())!
  const consoleBox = (await launcher.boundingBox())!
  const rightEdge = await page.evaluate(() => document.documentElement.clientWidth)
  const expectAtRight = async () => {
    const box = (await launcher.boundingBox())!
    expect(Math.abs(box.x + box.width - rightEdge)).toBeLessThan(1)
  }
  expect(await floatsOverlap()).toBe(false)
  await expectAtRight()

  async function drag(handle: Locator, x: number, y: number) {
    const box = (await handle.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(x, y, { steps: 8 })
    await page.mouse.up()
  }

  const wasExpanded = await toggle.getAttribute('aria-expanded')
  await drag(toggle, 55, 230)
  await expect(toggle).toHaveAttribute('aria-expanded', wasExpanded!)
  expect(await navigation.boundingBox()).toEqual(navBox)
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', wasExpanded === 'true' ? 'false' : 'true')
  await toggle.click()
  expect(await navigation.boundingBox()).toEqual(navBox)

  await drag(launcher, 80, consoleBox.y + consoleBox.height / 2)
  expect((await launcher.boundingBox())!.y).toBeCloseTo(consoleBox.y)
  await expectAtRight()

  await drag(launcher, 170, 350)
  await expect(launcher).toHaveAttribute('data-floating-position', '')
  await expect(launcher).toHaveAttribute('aria-expanded', 'false')
  expect(Math.abs((await launcher.boundingBox())!.y - consoleBox.y)).toBeGreaterThan(50)
  await expectAtRight()
  await drag(launcher, navBox.x + navBox.width / 2, navBox.y + navBox.height / 2)
  expect(await floatsOverlap()).toBe(false)
  expect(await navigation.boundingBox()).toEqual(navBox)
  await expectAtRight()
  await drag(launcher, 80, 2)
  expect((await launcher.boundingBox())!.y).toBeGreaterThanOrEqual(0)
  await expectAtRight()
  await launcher.click()
  await expect(page.locator('.sc-panel')).toBeVisible()
  await expectAtRight()
  await page.keyboard.press('Escape')
  await expect(launcher).toBeFocused()
})

test('触屏点击侧签展开和收起', async ({ browser, baseURL }, testInfo) => {
  const context = await browser.newContext({ baseURL, hasTouch: true, viewport: testInfo.project.use.viewport })
  try {
    const page = await context.newPage()
    await page.goto('./')
    const tab = page.locator('.sc-launcher')
    await tab.tap()
    await expect(tab).toHaveAttribute('aria-expanded', 'true')
    await expect(page.locator('.sc-panel')).toBeVisible()
    if (page.viewportSize()!.width <= 900) await page.getByRole('button', { name: '关闭控制台', exact: true }).tap()
    else await tab.tap()
    await expect(tab).toHaveAttribute('aria-expanded', 'false')
    await expect(page.locator('.sc-panel')).toBeHidden()

    const before = (await tab.boundingBox())!
    const start = { x: before.x + before.width / 2, y: before.y + before.height / 2 }
    const cdp = await context.newCDPSession(page)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x - 85, y: start.y + (start.y > 300 ? -100 : 100) }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await expect(tab).toHaveAttribute('data-floating-position', '')
    const after = (await tab.boundingBox())!
    expect(after.x).toBeCloseTo(before.x)
    expect(Math.abs(after.y - before.y)).toBeGreaterThan(50)
    await expect(tab).toHaveAttribute('aria-expanded', 'false')
    await tab.tap()
    await expect(page.locator('.sc-panel')).toBeVisible()
    await cdp.detach()
  } finally {
    await context.close()
  }
})
