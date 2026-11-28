import { test, expect } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

test('切页使用本地小睦GIF与两行文案，手机不溢出且正常跳转', async ({ page, context, baseURL }, info) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await context.route('**/*', route => new URL(route.request().url()).origin === new URL(baseURL!).origin ? route.continue() : route.abort())
  const animations: string[] = [], posters: string[] = []
  page.on('request', request => {
    if (request.url().endsWith('/mutsumi-loading.gif')) animations.push(request.url())
    if (request.url().endsWith('/mutsumi-loading-poster.webp')) posters.push(request.url())
  })
  await page.goto('./')
  const image = page.locator('.site-page-loading-image')
  await expect(image).not.toHaveAttribute('src')
  expect(posters).toHaveLength(0)
  expect(animations).toHaveLength(0)
  let release!: () => void
  let releaseGif!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  const gifGate = new Promise<void>(resolve => { releaseGif = resolve })
  // Hold the destination so both the still artwork and the animation can be inspected.
  await page.route('**/activities.html?*', async route => { await gate; await route.continue() })
  await page.route('**/mutsumi-loading.gif', async route => { await gifGate; await route.continue() })
  try {
    await page.locator('.header-secondary a').first().click({ noWaitAfter: true })
    await expect(page.locator('html')).toHaveClass(/site-page-leaving/)
    await expect.poll(() => animations.length).toBe(1)
    await expect(image).toHaveAttribute('src', /\/mutsumi-loading-poster\.webp$/)
    await expect.poll(() => posters.length).toBe(1)
    releaseGif()
    await expect(image).toHaveAttribute('src', /\/assets\/images\/transitions\/mutsumi-loading\.gif$/)
    await expect(page.locator('.site-page-loading-copy span')).toHaveText(['已经在加载了，', '不要压力一个小睦QWQ'])
    await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBe(270)
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
  } finally { releaseGif(); release() }
  await expect(page).toHaveURL(/activities\.html/)
})

test('减少动态效果时直接切页', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const animations: string[] = []
  page.on('request', request => { if (request.url().endsWith('/mutsumi-loading.gif')) animations.push(request.url()) })
  await page.goto('./')
  await page.locator('.header-secondary a').first().click()
  await expect(page).toHaveURL(/activities\.html/)
  await expect(page.locator('html')).not.toHaveClass(/site-page-leaving/)
  expect(animations).toHaveLength(0)
})
