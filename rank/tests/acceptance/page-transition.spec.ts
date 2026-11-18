import { test, expect } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

test('切页使用本地小睦GIF与两行文案，手机不溢出且正常跳转', async ({ page, context, baseURL }, info) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await context.route('**/*', route => new URL(route.request().url()).origin === new URL(baseURL!).origin ? route.continue() : route.abort())
  await page.goto('./')
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  // Hold only the destination response so the completed departure artwork can be captured.
  await page.route('**/activities.html?*', async route => { await gate; await route.continue() })
  try {
    await page.locator('.header-secondary a').first().click({ noWaitAfter: true })
    await expect(page.locator('html')).toHaveClass(/site-page-leaving/)
    const gif = page.locator('.site-page-loading-image')
    await expect(gif).toHaveAttribute('src', /\/assets\/images\/transitions\/mutsumi-loading\.gif$/)
    await expect(page.locator('.site-page-loading-copy span')).toHaveText(['已经在加载了，', '不要压力一个小睦QWQ'])
    await expect.poll(() => gif.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBe(270)
    await expect(page.locator('.site-page-veil')).toHaveCSS('opacity', '1')
    const bounds = await page.locator('.site-page-message').boundingBox()
    const viewport = page.viewportSize()!
    expect(bounds!.x).toBeGreaterThanOrEqual(0)
    expect(bounds!.y).toBeGreaterThanOrEqual(0)
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width)
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height)
    const evidence = resolve('../test-results/acceptance/page-transition')
    mkdirSync(evidence, { recursive: true })
    await page.screenshot({ path: resolve(evidence, `mutsumi-${info.project.name}.png`) })
  } finally { release() }
  await expect(page).toHaveURL(/activities\.html/)
})

test('减少动态效果时直接切页', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('./')
  await page.locator('.header-secondary a').first().click()
  await expect(page).toHaveURL(/activities\.html/)
  await expect(page.locator('html')).not.toHaveClass(/site-page-leaving/)
})
