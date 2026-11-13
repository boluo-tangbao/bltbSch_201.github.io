import { test, expect } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

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
  if (info.project.name !== 'desktop') await page.getByRole('button', { name: /^筛选与工具/ }).click()
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
  } finally {
    await context.close()
  }
})
