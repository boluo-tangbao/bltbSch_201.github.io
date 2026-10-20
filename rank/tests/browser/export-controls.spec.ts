import { test, expect, type Page } from '@playwright/test'
import { mkdirSync, readFileSync } from 'node:fs'
import { openMobileTools } from './browse-tools'

const base = process.env.BROWSE_TEST_BASE || 'http://127.0.0.1:4173/bltbSch_201.github.io/rank/'
const groups = JSON.parse(readFileSync('src/data/places.json', 'utf8'))
const place = groups['上海'].find((p: any) => p.id === 'shanghai-shop-021')
const paths: string[] = [...new Set<string>([place.cover, ...place.gallery.flatMap((g: any) => g.type === 'video' ? (g.poster ? [g.poster] : []) : [g.src])])]
const asset = (path: string) => new URL(path.split('/').map(encodeURIComponent).join('/'), base).href
const urls = new Set(paths.map(asset))
const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', 'base64')
mkdirSync('test-results/evidence', { recursive: true })

async function openExport(page: Page) {
  await page.goto(base + '?filters=1&q=HIPPIHO')
  await openMobileTools(page)
  await page.getByRole('button', { name: '导出榜单', exact: true }).click()
  return page.getByRole('dialog')
}

test('HTML covers-only and gallery exports embed exactly the selected images and revoke stale downloads', async ({ page }) => {
  const requests: string[] = []
  await page.addInitScript(() => {
    const revoke = URL.revokeObjectURL.bind(URL)
    ;(window as any).revoked = []
    URL.revokeObjectURL = url => { (window as any).revoked.push(url); revoke(url) }
  })
  await page.route(url => urls.has(url.href), route => { requests.push(route.request().url()); return route.fulfill({ contentType: 'image/png', body: pixel }) })
  const dialog = await openExport(page)
  await dialog.getByRole('radio', { name: '完整内容 · HTML 图文存档', exact: true }).check()
  await expect(dialog.getByRole('radio', { name: '仅封面', exact: true })).toBeChecked()
  await dialog.getByRole('button', { name: '生成完整内容', exact: true }).click()
  const download = dialog.getByRole('link', { name: '↓ 下载完整内容（HTML）', exact: true })
  await expect(download).toBeVisible()
  const url = await download.getAttribute('href')
  const html = await page.evaluate(async url => (await fetch(url!)).text(), url)
  expect((html.match(/<img /g) || []).length).toBe(1)
  expect(html).not.toContain('<figure>')
  expect(requests).toEqual([asset(place.cover)])
  await dialog.getByRole('radio', { name: '包含图集', exact: true }).check()
  await expect(download).toHaveCount(0)
  expect(await page.evaluate(() => (window as any).revoked)).toContain(url)
  await dialog.getByRole('button', { name: '生成完整内容', exact: true }).click()
  await expect(download).toBeVisible()
  const full = await download.evaluate(async el => (await fetch((el as HTMLAnchorElement).href)).text())
  expect((full.match(/<figure>/g) || []).length).toBe(place.gallery.length)
  expect(full).toContain('data:image/png;base64,')
  expect(new Set(requests)).toEqual(urls)
})

test('cancelling an in-flight HTML image aborts work and permits an immediate retry', async ({ page }) => {
  const aborted: string[] = []
  page.on('requestfailed', request => { if (urls.has(request.url())) aborted.push(request.url()) })
  let started!: () => void, release!: () => void
  const pending = new Promise<void>(resolve => { started = resolve })
  const blocked = new Promise<void>(resolve => { release = resolve })
  let hold = true
  await page.route(url => urls.has(url.href), async route => {
    if (hold && route.request().url() === asset(paths.at(-1)!)) { started(); await blocked }
    await route.fulfill({ contentType: 'image/png', body: pixel }).catch(() => {})
  })
  const dialog = await openExport(page)
  await dialog.getByRole('radio', { name: '完整内容 · HTML 图文存档', exact: true }).check()
  await dialog.getByRole('radio', { name: '包含图集', exact: true }).check()
  await dialog.getByRole('button', { name: '生成完整内容', exact: true }).click()
  await pending
  await expect(dialog.getByRole('progressbar')).toHaveAttribute('max', String(paths.length))
  await expect(dialog.getByRole('progressbar')).toHaveAttribute('value', String(paths.length - 1))
  await page.screenshot({ path: 'test-results/evidence/export-progress.png' })
  await dialog.getByRole('button', { name: '取消生成', exact: true }).click()
  await expect(dialog.getByRole('status')).toHaveText('已取消生成。')
  await expect.poll(() => aborted.length).toBeGreaterThan(0)
  await expect(dialog.locator('.download-list a, .full-download')).toHaveCount(0)
  hold = false; release()
  await dialog.getByRole('button', { name: '生成完整内容', exact: true }).click()
  await expect(dialog.locator('.full-download')).toBeVisible()
  await expect(dialog.getByRole('progressbar')).toHaveCount(0)
})

test('closing an export aborts its task without leaking results into the next dialog', async ({ page }) => {
  let release!: () => void
  const blocked = new Promise<void>(resolve => { release = resolve })
  await page.route(url => urls.has(url.href), async route => { await blocked; await route.fulfill({ contentType: 'image/png', body: pixel }).catch(() => {}) })
  const dialog = await openExport(page)
  await dialog.getByRole('radio', { name: '完整内容 · HTML 图文存档', exact: true }).check()
  await dialog.getByRole('button', { name: '生成完整内容', exact: true }).click()
  await expect(dialog.getByRole('progressbar')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  release()
  await expect(page.getByRole('button', { name: '导出榜单', exact: true })).toBeFocused()
  await page.getByRole('button', { name: '导出榜单', exact: true }).click()
  await expect(dialog.locator('.download-list a, .full-download')).toHaveCount(0)
  await expect(dialog.getByRole('progressbar')).toHaveCount(0)
})

test('PNG export can cancel an image load, retry, and report load errors without a false download', async ({ page }) => {
  let release!: () => void
  const blocked = new Promise<void>(resolve => { release = resolve })
  let phase = 'hold'
  await page.route(url => urls.has(url.href), async route => {
    if (phase === 'hold') await blocked
    if (phase === 'fail') await route.fulfill({ status: 404, body: 'missing' })
    else await route.fulfill({ contentType: 'image/png', body: pixel }).catch(() => {})
  })
  const dialog = await openExport(page)
  await dialog.getByRole('button', { name: '生成图片', exact: true }).click()
  await expect(dialog.getByRole('progressbar', { name: '加载封面', exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: '取消生成', exact: true }).click()
  await expect(dialog.getByRole('status')).toHaveText('已取消生成。')
  phase = 'fail'; release()
  await dialog.getByRole('button', { name: '生成图片', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('图片加载失败')
  await expect(dialog.locator('.download-list a')).toHaveCount(0)
  phase = 'success'
  await dialog.getByRole('button', { name: '生成图片', exact: true }).click()
  await expect(dialog.locator('.download-list a')).toHaveCount(1)
  await expect(dialog.getByRole('alert')).toHaveCount(0)
})

test('export options fit a small screen and empty filters disable generation', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 780 })
  const dialog = await openExport(page)
  await dialog.getByRole('radio', { name: '完整内容 · HTML 图文存档', exact: true }).check()
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/evidence/export-options-mobile.png' })
  await page.keyboard.press('Escape')
  await page.getByRole('searchbox').fill('不存在的地点123')
  await page.getByRole('button', { name: '导出榜单', exact: true }).click()
  await expect(dialog.getByRole('button', { name: '生成图片', exact: true })).toBeDisabled()
  await dialog.getByRole('radio', { name: /完整榜单/ }).check()
  await expect(dialog.getByRole('button', { name: '生成图片', exact: true })).toBeEnabled()
})

test('cancelling a multi-page PNG export revokes already generated pages', async ({ page }) => {
  await page.addInitScript(() => {
    const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL)
    ;(window as any).created = []; (window as any).revoked = []
    URL.createObjectURL = blob => { const url = create(blob); (window as any).created.push(url); return url }
    URL.revokeObjectURL = url => { (window as any).revoked.push(url); revoke(url) }
    const toBlob = HTMLCanvasElement.prototype.toBlob
    let calls = 0
    HTMLCanvasElement.prototype.toBlob = function (...args) {
      if (++calls === 2) { (window as any).secondPagePending = true; return }
      return toBlob.apply(this, args)
    }
  })
  const covers = new Set<string>(Object.values(groups).flatMap((entries: any) => entries.filter((p: any) => p.published && p.cover).map((p: any) => asset(p.cover))))
  await page.route(url => covers.has(url.href), route => route.fulfill({ contentType: 'image/png', body: pixel }))
  const dialog = await openExport(page)
  await dialog.getByRole('radio', { name: /完整榜单/ }).check()
  await dialog.getByRole('button', { name: '生成图片', exact: true }).click()
  await expect.poll(() => page.evaluate(() => (window as any).secondPagePending)).toBe(true)
  await expect(dialog.getByRole('progressbar', { name: '生成图片', exact: true })).toHaveAttribute('value', '1')
  await dialog.getByRole('button', { name: '取消生成', exact: true }).click()
  await expect(dialog.getByRole('status')).toHaveText('已取消生成。')
  const generated = await page.evaluate(() => ({ created: (window as any).created, revoked: (window as any).revoked }))
  expect(generated.created).toHaveLength(1)
  expect(generated.revoked).toEqual(generated.created)
  await expect(dialog.locator('.download-list a')).toHaveCount(0)
})
