import { test, expect, type Page, type CDPSession } from '@playwright/test'
import { readFileSync, mkdirSync } from 'node:fs'

const base = process.env.BROWSE_TEST_BASE || 'http://127.0.0.1:4173/bltbSch_201.github.io/rank/'
const places = Object.values(JSON.parse(readFileSync('src/data/places.json', 'utf8'))).flat() as any[]
const photos = places.find(p => p.published && p.gallery.length >= 4 && p.gallery.every((g: any) => g.type !== 'video'))
const single = places.find(p => p.published && p.gallery.length === 1)
const videoPlace = places.find(p => p.published && p.gallery.some((g: any) => g.type === 'video'))
const previews = JSON.parse(readFileSync('src/data/media-previews.json', 'utf8'))
const mediaUrl = (src: string) => new URL(src.split('/').map(encodeURIComponent).join('/'), base).href
mkdirSync('test-results/evidence', { recursive: true })

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

async function openPhoto(page: Page, place = photos) {
  await page.goto(`${base}guide/#/place/${place.id}`)
  const preview = page.locator('.place-gallery-image-preview').first()
  await preview.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.locator('.full-image-original')).toHaveClass(/is-ready/)
  return preview
}

async function touch(session: CDPSession, type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel', points: { x: number; y: number; id?: number }[]) {
  await session.send('Input.dispatchTouchEvent', { type, touchPoints: points.map((point, id) => ({ radiusX: 2, radiusY: 2, id, ...point })) })
}

async function swipe(page: Page, session: CDPSession, dx: number, dy = 0) {
  const box = (await page.locator('.gallery-photo-surface').boundingBox())!
  const start = { x: box.x + box.width / 2 - dx / 2, y: box.y + box.height / 2 - dy / 2 }
  await touch(session, 'touchStart', [start])
  await touch(session, 'touchMove', [{ x: start.x + dx / 2, y: start.y + dy / 2 }])
  await touch(session, 'touchMove', [{ x: start.x + dx, y: start.y + dy }])
  await touch(session, 'touchEnd', [])
}

test('real touch swipes wrap through photos while vertical and cancelled gestures do not flip', async ({ page }) => {
  const preview = await openPhoto(page)
  const session = await page.context().newCDPSession(page)
  const counter = page.locator('.gallery-position')
  await expect(counter).toHaveText(`1 / ${photos.gallery.length}`)
  await swipe(page, session, -140)
  await expect(counter).toHaveText(`2 / ${photos.gallery.length}`)
  await swipe(page, session, 140)
  await expect(counter).toHaveText(`1 / ${photos.gallery.length}`)
  await swipe(page, session, 140)
  await expect(counter).toHaveText(`${photos.gallery.length} / ${photos.gallery.length}`)
  await swipe(page, session, 0, 100)
  await expect(counter).toHaveText(`${photos.gallery.length} / ${photos.gallery.length}`)
  const box = (await page.locator('.gallery-photo-surface').boundingBox())!
  await touch(session, 'touchStart', [{ x: box.x + 250, y: box.y + box.height / 2 }])
  await touch(session, 'touchMove', [{ x: box.x + 100, y: box.y + box.height / 2 }])
  await touch(session, 'touchCancel', [])
  await expect(counter).toHaveText(`${photos.gallery.length} / ${photos.gallery.length}`)
  await page.getByRole('button', { name: '关闭大图' }).click()
  await expect(preview).toBeFocused()
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
})

test('pinch zoom pans without navigation, stays within limits and resets for the next photo', async ({ page }) => {
  await openPhoto(page)
  const session = await page.context().newCDPSession(page)
  const photo = page.locator('.gallery-photo-surface')
  const box = (await photo.boundingBox())!
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await touch(session, 'touchStart', [{ x: x - 30, y }, { x: x + 30, y }])
  await touch(session, 'touchMove', [{ x: x - 90, y }, { x: x + 90, y }])
  await touch(session, 'touchEnd', [{ x: x + 90, y, id: 1 }])
  await touch(session, 'touchMove', [{ x: x + 60, y }])
  await touch(session, 'touchEnd', [])
  await expect.poll(async () => Number(await photo.getAttribute('data-zoom'))).toBeGreaterThan(2)
  await swipe(page, session, -100)
  await expect(page.locator('.gallery-position')).toHaveText(`1 / ${photos.gallery.length}`)
  expect(await page.locator('.gallery-photo-transform').evaluate(el => getComputedStyle(el).transform)).not.toMatch(/^matrix\([^,]+, 0, 0, [^,]+, 0, 0\)$/)
  await page.getByRole('button', { name: '放大照片', exact: true }).click()
  while (await page.getByRole('button', { name: '放大照片', exact: true }).isEnabled()) await page.getByRole('button', { name: '放大照片', exact: true }).click()
  await expect(photo).toHaveAttribute('data-zoom', '4.00')
  await page.getByRole('button', { name: '下一个素材' }).click()
  await expect(photo).toHaveAttribute('data-zoom', '1.00')
  await page.getByRole('button', { name: '放大照片', exact: true }).click()
  await page.getByRole('button', { name: '恢复原始大小' }).click()
  await expect(photo).toHaveAttribute('data-zoom', '1.00')
  await expect(page.getByRole('button', { name: '缩小照片', exact: true })).toBeDisabled()
  await page.screenshot({ path: 'test-results/evidence/gallery-mobile-photo.png' })
})

test('only neighbouring display photos preload and originals remain opt-in', async ({ page }) => {
  const requests: string[] = []
  page.on('request', request => requests.push(request.url()))
  await page.goto(`${base}guide/#/place/${photos.id}`)
  const displays = photos.gallery.map((g: any) => mediaUrl(previews[g.src].display))
  expect(requests.filter(url => displays.includes(url))).toEqual([])
  await page.locator('.place-gallery-image-preview').first().click()
  const expected = [displays[0], displays[1], displays.at(-1)]
  await expect.poll(() => [...new Set(requests.filter(url => displays.includes(url)))].sort()).toEqual(expected.sort())
  expect(requests.some(url => photos.gallery.some((g: any) => url === mediaUrl(g.src)))).toBe(false)
  await expect(page.getByRole('link', { name: '打开原图' })).toHaveAttribute('href', new URL(mediaUrl(photos.gallery[0].src)).pathname)
})

test('mobile controls fit at small widths and in landscape with at least 44px targets', async ({ page }) => {
  await openPhoto(page)
  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport)
    const stage = (await page.locator('.gallery-photo-surface').boundingBox())!
    expect(stage.height).toBeGreaterThan(100)
    for (const button of await page.getByRole('dialog').getByRole('button').all()) {
      const box = (await button.boundingBox())!
      expect(box.width).toBeGreaterThanOrEqual(44)
      expect(box.height).toBeGreaterThanOrEqual(44)
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.screenshot({ path: 'test-results/evidence/gallery-mobile-landscape.png' })
})

test('data saving mode loads only the requested photo', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true }))
  const requests: string[] = []
  page.on('request', request => requests.push(request.url()))
  await openPhoto(page)
  const displays = photos.gallery.map((g: any) => mediaUrl(previews[g.src].display))
  expect([...new Set(requests.filter(url => displays.includes(url)))]).toEqual([displays[0]])
})

test('single-photo albums keep zoom but disable paging', async ({ page }) => {
  await openPhoto(page, single)
  await expect(page.getByRole('button', { name: '上一个素材' })).toBeDisabled()
  await expect(page.getByRole('button', { name: '下一个素材' })).toBeDisabled()
  await page.getByRole('button', { name: '放大照片', exact: true }).click()
  await expect(page.locator('.gallery-photo-surface')).toHaveAttribute('data-zoom', '1.50')
})

test('video controls do not swipe and dialog focus stays inside before restoring the thumbnail', async ({ page }) => {
  await page.goto(`${base}guide/#/place/${videoPlace.id}`)
  const video = videoPlace.gallery.find((g: any) => g.type === 'video')
  const preview = page.getByRole('button', { name: `播放：${video.alt}`, exact: true })
  await preview.click()
  await expect(page.getByRole('dialog').locator('video')).toBeVisible()
  await expect(page.locator('.gallery-photo-surface')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '放大照片', exact: true })).toHaveCount(0)
  const playerBox = (await page.locator('.gallery-stage').boundingBox())!
  const position = await page.locator('.gallery-position').textContent()
  const session = await page.context().newCDPSession(page)
  await touch(session, 'touchStart', [{ x: playerBox.x + playerBox.width / 2 + 50, y: playerBox.y + playerBox.height / 2 }])
  await touch(session, 'touchMove', [{ x: playerBox.x + playerBox.width / 2 - 50, y: playerBox.y + playerBox.height / 2 }])
  await touch(session, 'touchEnd', [])
  await expect(page.locator('.gallery-position')).toHaveText(position!)
  await page.getByRole('button', { name: '下一个素材' }).focus()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: '关闭大图' })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(page.getByRole('button', { name: '下一个素材' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(preview).toBeFocused()
  await expect(page.locator('video')).toHaveCount(0)
})
