import { test, expect } from '@playwright/test'
import { resolve } from 'node:path'
import { mkdirSync } from 'node:fs'

test('响应式视觉抽查：首页选图、榜单、详情、放大与返回', async ({ page, baseURL }, info) => {
  await page.route('**/*', route => new URL(route.request().url()).origin === new URL(baseURL!).origin ? route.continue() : route.abort())
  const capture = async (name: string) => {
    if (info.project.name === 'mobile') {
      await page.mouse.move(5, 5)
      await expect(page.locator('.sc-panel')).toBeHidden()
      await page.screenshot({ path: resolve('../output/performance-audit', `${name}-390.png`) })
    }
  }
  const fits = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.goto('../')
  await fits()
  const background = await page.locator('body').evaluate(el => getComputedStyle(el, '::before').backgroundImage)
  const viewportWidth = page.viewportSize()!.width
  const expectedBackground = viewportWidth <= 680 ? 'images/responsive/akane-background-960.webp'
    : viewportWidth <= 1280 ? 'images/responsive/akane-background-1280.webp'
      : 'images/akane-background.webp'
  expect(background).toContain(expectedBackground)
  const cover = page.locator('.home-entry img').first()
  await expect.poll(() => cover.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  expect(await cover.evaluate(img => (img as HTMLImageElement).currentSrc)).toContain('anime-320.webp')
  await capture('home')
  await page.goto('')
  await page.getByRole('group', { name: '榜单视图' }).getByRole('button', { name: '舒适', exact: true }).click()
  await fits()
  await page.locator('#place-card-shanghai-shop-001').scrollIntoViewIfNeeded()
  const firstDepartment = page.locator('#place-card-shanghai-shop-001')
  const topCards = firstDepartment.locator('xpath=ancestor::section[contains(@class,"tier-row")]').locator('.place-card')
  await expect(topCards.nth(2)).toHaveAttribute('id', 'place-card-shanghai-shop-006')
  await expect(topCards.nth(3)).toHaveAttribute('id', 'place-card-shanghai-shop-001')
  await capture('board')
  await page.locator('#place-card-shanghai-shop-001 .card-link').click()
  await expect(page.locator('.guide-detail h1')).toHaveText('第一百货')
  await expect(page.locator('.guide-detail .place-change-notice')).toBeVisible()
  const context = page.getByLabel('这份评价的背景', { exact: true })
  await expect(context).toContainText('2026-07-13')
  await expect(context).toContainText('暂时评价跌为顶级第四位，在五角场百联后；待装修完成后考虑是否正式调整次序。')
  await expect(page.locator('.detail-kicker')).toContainText('顶级')
  await expect(page.locator('.detail-kicker')).toContainText('档内第 4 名')
  const evidence = resolve('../test-results/acceptance/first-department-update')
  mkdirSync(evidence, { recursive: true })
  await page.locator('.detail-heading').screenshot({ path: resolve(evidence, `detail-${viewportWidth}.png`) })
  await context.getByRole('button', { name: '查看当前店单 ↓', exact: true }).click()
  await expect(page.locator('.shop-directory')).toBeInViewport()
  await page.locator('.detail-heading').scrollIntoViewIfNeeded()
  await fits()
  await capture('detail')
  await page.locator('.place-gallery').getByRole('button', { name: '查看：楼层导览', exact: true }).first().click()
  const viewer = page.locator('.place-gallery-lightbox')
  await expect.poll(() => viewer.locator('.full-image-original').evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  await viewer.getByRole('button', { name: '放大照片', exact: true }).click()
  await expect(viewer).toBeVisible()
  await capture('gallery')
  await viewer.getByRole('button', { name: '关闭大图', exact: true }).click()
  await expect(viewer).toHaveCount(0)
  await page.goBack()
  await expect(page.locator('#place-card-shanghai-shop-001')).toBeInViewport()
  await expect(page.getByRole('group', { name: '榜单视图' }).getByRole('button', { name: '舒适', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await fits()
})
