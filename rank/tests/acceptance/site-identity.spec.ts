import { test, expect } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

test('统一入口可往返，手机控制台随页头滚动且不覆盖榜单操作', async ({ page, baseURL }, info) => {
  const origin = new URL(baseURL!).origin
  await page.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort())
  const narrow = page.viewportSize()!.width <= 900
  const fits = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const evidence = resolve('../test-results/acceptance/evidence')
  mkdirSync(evidence, { recursive: true })
  for (const path of ['../', '../sports.html', '../art.html', '../anime.html', '../travel.html', '../activities.html']) {
    await page.goto(path)
    await expect(page.locator('.logo')).toContainText('汤包的生活手记')
    await expect(page.locator('.nav-links a[aria-current="page"]')).toHaveCount(1)
    await expect(page.locator('.nav-links').getByRole('link', { name: '逛店榜单', exact: true })).toHaveAttribute('href', 'rank/')
    await expect(page.locator('.nav-links').getByRole('link', { name: '个人主页', exact: true })).toHaveAttribute('href', 'index.html')
    await fits()
    if (narrow) {
      await expect(page.locator('.nav-links > .sc-launcher')).toBeVisible()
      await page.locator('.sc-launcher').click()
      await expect(page.locator('.sc-panel')).toBeVisible()
      await page.getByRole('button', { name: '关闭控制台', exact: true }).click()
      await expect(page.locator('.sc-launcher')).toBeFocused()
      await expect(page.locator('.sc-panel')).toBeHidden()
    }
    if (path === '../' && info.project.name === 'mobile') await page.screenshot({ path: resolve(evidence, 'identity-home-390.png') })
  }
  await page.goto('')
  await expect(page.locator('.brand-copy')).toContainText('菠萝汤包scho · 生活手记')
  await fits()
  if (narrow) {
    const launcher = page.locator('.theme-toolbar > .sc-launcher')
    await expect(launcher).toBeVisible()
    const viewButtons = page.getByRole('group', { name: '榜单视图' })
    await viewButtons.getByRole('button', { name: '舒适', exact: true }).click()
    const box = await viewButtons.boundingBox()
    const triggerBox = await launcher.boundingBox()
    expect(box!.y).toBeGreaterThanOrEqual(triggerBox!.y + triggerBox!.height)
    await page.mouse.wheel(0, 600)
    await expect.poll(async () => (await launcher.boundingBox())!.y + triggerBox!.height).toBeLessThanOrEqual(0)
    await page.getByRole('button', { name: /^商圈对比/ }).click()
    await expect(page.getByRole('dialog', { name: '商圈对比', exact: true })).toBeVisible()
    await page.keyboard.press('Escape')
    await page.keyboard.press('Control+Home')
    await launcher.click()
    await page.keyboard.press('Escape')
    await expect(launcher).toBeFocused()
    await fits()
    if (info.project.name === 'mobile') await page.screenshot({ path: resolve(evidence, 'identity-board-390.png') })
    await page.setViewportSize({ width: 1440, height: 1000 })
    await expect(page.locator('#site-console > .sc-launcher')).toBeVisible()
    await page.setViewportSize({ width: info.project.use.viewport!.width, height: 844 })
    await expect(launcher).toBeVisible()
  }
  await page.goto('cities/')
  await expect(page.locator('.discovery-brand')).toContainText('菠萝汤包scho · 生活手记')
  await page.locator('.site-nav').getByRole('link', { name: '个人主页', exact: true }).click()
  await expect(page.locator('.logo')).toContainText('汤包的生活手记')
  await fits()
})
