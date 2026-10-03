import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

const base = 'http://127.0.0.1:4173/bltbSch_201.github.io/rank/'
const places = Object.values(JSON.parse(readFileSync('src/data/places.json', 'utf8'))).flat() as any[]
const published = places.filter(p => p.published)
const photoPlace = published.find(p => p.gallery.some((g: any) => g.type !== 'video'))
const videoPlace = published.find(p => p.gallery.filter((g: any) => g.type === 'video').length > 1)
const mediaUrl = (src: string) => base + src.split('/').map(encodeURIComponent).join('/')
const previews = JSON.parse(readFileSync('src/data/media-previews.json', 'utf8'))

test('board requests responsive previews without downloading original covers', async ({ page }) => {
  const requests: string[] = []
  page.on('request', request => requests.push(request.url()))
  await page.goto(base)
  const photos = page.locator('.card-photo img')
  await expect(photos).toHaveCount(published.filter(p => p.cover).length)
  await photos.last().scrollIntoViewIfNeeded()
  await expect(photos.last()).toHaveJSProperty('complete', true)
  expect(requests.some(url => published.some(p => p.cover && url === mediaUrl(p.cover)))).toBe(false)
  expect(requests.some(url => url.includes('/images/previews/'))).toBe(true)
  await expect(photos.first()).toHaveAttribute('srcset', /320w, .*640w/)
})

test('gallery loads a screen-sized image, preserves originals and recovers from failure', async ({ page }) => {
  test.skip(!photoPlace, 'No published gallery photos')
  const photo = photoPlace.gallery.find((g: any) => g.type !== 'video')
  let originals = 0
  let release!: () => void
  const pending = new Promise<void>(resolve => { release = resolve })
  await page.route(mediaUrl(previews[photo.src].display), async route => {
    originals++
    if (originals === 1) { await pending; await route.abort() }
    else await route.continue()
  })
  const requests: string[] = []
  page.on('request', request => requests.push(request.url()))
  await page.goto(`${base}guide/#/place/${photoPlace.id}`)
  const preview = page.getByRole('button', { name: `查看：${photo.alt}`, exact: true }).first()
  await preview.scrollIntoViewIfNeeded()
  await expect(preview.locator('img')).toHaveJSProperty('complete', true)
  expect(originals).toBe(0)
  expect(requests.some(url => photoPlace.gallery.some((g: any) => url === mediaUrl(g.src)))).toBe(false)
  await expect(page.locator('video')).toHaveCount(0)
  await preview.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: '正在加载高清图片' })).toBeVisible()
  await expect(page.locator('.full-image-preview')).toBeVisible()
  await expect.poll(() => originals).toBe(1)
  await page.screenshot({ path: 'test-results/evidence/media-loading.png' })
  release()
  const retry = page.getByRole('dialog').getByRole('button', { name: '重试', exact: true })
  await expect(retry).toBeVisible()
  await retry.click()
  await expect(page.locator('.full-image-original')).toHaveClass(/is-ready/)
  expect(requests).not.toContain(mediaUrl(photo.src))
  expect(originals).toBe(2)
  await expect(page.getByRole('link', { name: '打开原图' })).toHaveAttribute('href', mediaUrl(photo.src).slice(new URL(base).origin.length))
  for (const width of [1440, 768, 375]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `test-results/evidence/media-original-${width}.png` })
  }
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(preview).toBeFocused()
})

test('video previews make no MP4 requests until clicked and switching replaces the player', async ({ page }) => {
  test.skip(!videoPlace, 'No published gallery with two videos')
  const videos = videoPlace.gallery.filter((g: any) => g.type === 'video')
  const requests: string[] = []
  page.on('request', request => { if (request.url().includes('.mp4')) requests.push(request.url()) })
  await page.setViewportSize({ width: 375, height: 900 })
  await page.goto(`${base}guide/#/place/${videoPlace.id}`)
  const preview = page.getByRole('button', { name: `播放：${videos[0].alt}`, exact: true })
  await preview.scrollIntoViewIfNeeded()
  await expect(preview.locator('img')).toHaveJSProperty('complete', true)
  await expect(page.locator('video')).toHaveCount(0)
  expect(requests).toEqual([])
  await preview.click()
  const player = page.locator('video')
  await expect(player.locator('source')).toHaveAttribute('src', mediaUrl(previews[videos[0].src].playback).slice(new URL(base).origin.length))
  await expect.poll(() => requests.length).toBeGreaterThan(0)
  await expect.poll(() => player.evaluate(video => video.readyState)).toBeGreaterThanOrEqual(2)
  // Walk across intervening photos to the next video; only one player can exist.
  const distance = videoPlace.gallery.indexOf(videos[1]) - videoPlace.gallery.indexOf(videos[0])
  for (let i = 0; i < distance; i++) await page.getByRole('button', { name: '下一个素材' }).click()
  await expect(player).toHaveCount(1)
  await expect(player.locator('source')).toHaveAttribute('src', mediaUrl(previews[videos[1].src].playback).slice(new URL(base).origin.length))
  await expect.poll(() => player.evaluate(video => video.readyState)).toBeGreaterThanOrEqual(2)
  expect(requests.every(url => url.includes('/images/previews/'))).toBe(true)
  await expect(page.getByRole('link', { name: '打开原视频' })).toHaveAttribute('href', mediaUrl(videos[1].src).slice(new URL(base).origin.length))
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: '关闭大图' }).click()
  await expect(player).toHaveCount(0)
})
