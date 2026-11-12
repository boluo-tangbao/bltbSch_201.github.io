import { test, expect } from '@playwright/test'
import { resolve } from 'node:path'

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
  expect(background).toContain('akane-background-960.webp')
  const cover = page.locator('.home-entry img').first()
  await expect.poll(() => cover.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  expect(await cover.evaluate(img => (img as HTMLImageElement).currentSrc)).toContain('anime-320.webp')
  await capture('home')
  await page.goto('')
  await page.getByRole('group', { name: '榜单视图' }).getByRole('button', { name: '舒适', exact: true }).click()
  await fits()
  await page.locator('#place-card-shanghai-shop-001').scrollIntoViewIfNeeded()
  await capture('board')
  await page.locator('#place-card-shanghai-shop-001 .card-link').click()
  await expect(page.locator('.guide-detail h1')).toHaveText('第一百货')
  await expect(page.locator('.guide-detail .place-change-notice')).toBeVisible()
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
