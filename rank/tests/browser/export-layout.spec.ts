import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { openMobileTools } from './browse-tools'

const base = process.env.BROWSE_TEST_BASE || 'http://127.0.0.1:4173/bltbSch_201.github.io/rank/'
const places = Object.entries(JSON.parse(readFileSync('src/data/places.json', 'utf8')))
  .flatMap(([city, entries]: [string, any]) => entries.filter((place: any) => place.published).map((place: any) => ({ ...place, city })))
const covers = new Set(places.filter(place => place.cover).map(place => new URL(place.cover.split('/').map(encodeURIComponent).join('/'), base).href))
const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', 'base64')

test('export studio keeps options, preview and keyboard controls usable across screen sizes', async ({ page }) => {
  await page.goto(base + '?filters=1&q=HIPPIHO')
  await openMobileTools(page)
  await page.getByRole('button', { name: '导出榜单', exact: true }).click()
  const dialog = page.getByRole('dialog')
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
    const box = await dialog.boundingBox()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(width)
    await dialog.getByRole('radio', { name: '短评长图 · 加上一句话评价', exact: true }).check()
    await expect(dialog.locator('.studio-poster')).toHaveClass(/is-review/)
    await dialog.getByRole('radio', { name: '完整内容 · HTML 图文存档', exact: true }).check()
    await expect(dialog.getByRole('radio', { name: '包含图集', exact: true })).toBeVisible()
    await expect(dialog.locator('.studio-archive')).toBeVisible()
    await dialog.getByRole('radio', { name: '简洁排序图 · 图片与名称', exact: true }).check()
  }
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('button', { name: '导出榜单', exact: true })).toBeFocused()
})

test('poster pages preserve every selected name and review without clipping text or exceeding PNG limits', async ({ page }) => {
  await page.addInitScript(() => {
    ;(window as any).exportFrames = []
    const fillRect = CanvasRenderingContext2D.prototype.fillRect
    CanvasRenderingContext2D.prototype.fillRect = function (x, y, width, height) {
      if (x === 0 && y === 0 && width === 1200 && height === this.canvas.height) {
        ;(window as any).exportFrames.push({ height, texts: [] })
      }
      fillRect.call(this, x, y, width, height)
    }
    const fillText = CanvasRenderingContext2D.prototype.fillText
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      const frame = (window as any).exportFrames.at(-1)
      if (frame && this.canvas.width === 1200) {
        const metrics = this.measureText(text)
        const left = this.textAlign === 'right' ? x - metrics.width : x
        frame.texts.push({ text, left, right: left + metrics.width, bottom: y + metrics.actualBoundingBoxDescent, font: this.font })
      }
      if (maxWidth === undefined) fillText.call(this, text, x, y)
      else fillText.call(this, text, x, y, maxWidth)
    }
  })
  await page.route(url => covers.has(url.href), route => route.fulfill({ contentType: 'image/png', body: pixel }))
  await page.goto(base + '?filters=1')
  await openMobileTools(page)
  await page.getByRole('button', { name: '导出榜单', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('radio', { name: /完整榜单/ }).check()
  for (const label of ['简洁排序图 · 图片与名称', '短评长图 · 加上一句话评价']) {
    await dialog.getByRole('radio', { name: label, exact: true }).check()
    await page.evaluate(() => { (window as any).exportFrames = [] })
    await dialog.getByRole('button', { name: '生成图片', exact: true }).click()
    await expect(dialog.getByRole('button', { name: '重新生成', exact: true })).toBeEnabled()
    const frames = await page.evaluate(() => (window as any).exportFrames)
    expect(frames.length).toBeGreaterThan(1)
    await expect(dialog.locator('.download-list img')).toHaveCount(frames.length)
    const text = frames.flatMap((frame: any) => frame.texts.map((item: any) => item.text)).join('')
    for (const place of places) {
      expect(text).toContain(place.name.replace(/[\r\n]/g, ''))
      if (label.startsWith('短评')) expect(text).toContain(place.summary.replace(/[\r\n]/g, ''))
    }
    expect(await page.evaluate(() => document.fonts.check('800 120px "Export Condensed"'))).toBe(true)
    for (const frame of frames) {
      expect(frame.height).toBeLessThanOrEqual(3000)
      for (const item of frame.texts) {
        expect(item.left, item.text).toBeGreaterThanOrEqual(0)
        expect(item.right, item.text).toBeLessThanOrEqual(1200)
        expect(item.bottom, item.text).toBeLessThanOrEqual(frame.height)
      }
    }
  }
})
