import { test, expect, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const base = process.env.BROWSE_TEST_BASE || 'http://127.0.0.1:4173/bltbSch_201.github.io/rank/'
async function switchTheme(page: Page, name: 'Day' | 'Night') {
  await page.locator('.sc-launcher').click()
  await page.locator('#sc-theme-slot').getByRole('button', { name: `${name} version`, exact: true }).click()
  await page.mouse.move(0, 0)
  await page.keyboard.press('Escape')
  await expect(page.locator('.sc-panel')).toBeHidden()
}

test('visitor theme persists across pages, reloads and mobile layouts', async ({ page }) => {
  await page.goto(base)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'day')
  mkdirSync('test-results/evidence', { recursive: true })
  await page.screenshot({ path: 'test-results/evidence/themes-day.png' })
  await switchTheme(page, 'Night')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night')
  await expect(page.locator('.site-header nav a[aria-current]')).toHaveCSS('background-color', 'rgb(213, 243, 74)')
  // Selection must stay readable, including while the pointer remains over it.
  const selectedView = page.getByRole('button', { name: '舒适', exact: true })
  await selectedView.click()
  await selectedView.hover()
  await expect(selectedView).toHaveCSS('background-color', 'rgb(213, 243, 74)')
  await expect(selectedView).toHaveCSS('color', 'rgb(23, 27, 28)')
  await expect(page.getByRole('button', { name: '紧凑', exact: true })).not.toHaveCSS('background-color', 'rgb(213, 243, 74)')
  await page.goto(base + '?filters=1')
  for (const selector of ['.city-legend', '.tag-filter']) {
    const name = await page.locator(selector).getByRole('button', { pressed: false }).first().innerText()
    const option = page.locator(selector).getByRole('button', { name, exact: true })
    await option.click()
    await option.hover()
    await expect(option).toHaveAttribute('aria-pressed', 'true')
    await expect(option).toHaveCSS('background-color', 'rgb(213, 243, 74)')
    await expect(option).toHaveCSS('color', 'rgb(23, 27, 28)')
  }
  await page.screenshot({ path: 'test-results/evidence/themes-night.png' })
  await page.getByRole('button', { name: '规划逛店', exact: true }).click()
  const heart = page.locator('.trip-plan-add.is-icon-only').first()
  await heart.click()
  await heart.hover()
  await expect(heart).toHaveAttribute('aria-pressed', 'true')
  await expect(heart).toHaveCSS('color', 'rgb(23, 27, 28)')
  await expect.poll(() => heart.evaluate(el => getComputedStyle(el, '::before').backgroundColor)).toBe('rgb(213, 243, 74)')
  for (const route of ['', 'guide/', 'qa/', 'updates/', 'route/']) {
    await page.goto(base + route)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'night')
    await expect(page.locator('#sc-theme-slot button[aria-pressed="true"]')).toHaveText(/Night/)
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    }
  }
  await switchTheme(page, 'Day')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'day')
})

test('studio preview and actual PNG follow the theme and discard obsolete downloads', async ({ page }) => {
  await page.goto(base + '?filters=1&q=HIPPIHO')
  await page.getByRole('button', { name: '导出榜单', exact: true }).click()
  const dialog = page.getByRole('dialog')
  for (const [theme, rgb] of [['Day', [255, 226, 232]], ['Night', [32, 41, 37]]] as const) {
    const settings = await page.context().newPage()
    await settings.goto(base)
    await switchTheme(settings, theme)
    await settings.close()
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme.toLowerCase())
    await expect(dialog.locator('.download-list img')).toHaveCount(0)
    mkdirSync('test-results/evidence', { recursive: true })
    await page.screenshot({ path: `test-results/evidence/export-theme-${theme.toLowerCase()}.png` })
    await dialog.getByRole('button', { name: '生成图片', exact: true }).click()
    const image = dialog.locator('.download-list img').first()
    await expect(image).toBeVisible()
    await expect.poll(() => image.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBe(1200)
    const pixel = await image.evaluate((el: HTMLImageElement) => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1
      const ctx = canvas.getContext('2d')!; ctx.drawImage(el, 0, 0)
      return Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3)
    })
    expect(pixel).toEqual(rgb)
    await expect(dialog.locator('.download-list a').first()).toHaveAttribute('download', new RegExp(`-${theme.toLowerCase()}-`))
  }
  await dialog.getByRole('radio', { name: '完整内容 · HTML 图文存档', exact: true }).check()
  await dialog.getByRole('button', { name: '生成完整内容', exact: true }).click()
  const html = await dialog.locator('.full-download').evaluate(async (el: HTMLAnchorElement) => (await fetch(el.href)).text())
  expect(html).toContain('background:#252e2b')
})

test('disabled browser storage still permits switching themes', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('Storage blocked') }
    Storage.prototype.setItem = () => { throw new Error('Storage blocked') }
  })
  await page.goto(base)
  await switchTheme(page, 'Night')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night')
})
