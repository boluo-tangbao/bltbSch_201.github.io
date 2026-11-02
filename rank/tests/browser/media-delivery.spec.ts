import { test, expect } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { previewServer } from '../../../scripts/preview-site.mjs'

const groups = JSON.parse(readFileSync('src/data/places.json', 'utf8'))
const links = JSON.parse(readFileSync('src/data/original-links.json', 'utf8'))
const previews = JSON.parse(readFileSync('src/data/media-previews.json', 'utf8'))
const places = Object.values(groups).flat() as any[]
const base = 'http://127.0.0.1:4180/bltbSch_201.github.io/rank/'
let server: any
test.skip(!existsSync('../_site/rank/index.html'), '先构建并执行 node scripts/assemble-site.mjs')
test.beforeAll(async () => { server = await previewServer(4180) })
test.afterAll(async () => { if (server) await new Promise<void>(done => server.close(done)) })

test('the assembled site displays photos and plays videos locally; only explicit original links point to GitHub', async ({ page }) => {
  const originalsRequested: string[] = []
  page.on('request', request => {
    const url = new URL(request.url())
    const path = decodeURIComponent(url.pathname).replace('/bltbSch_201.github.io/rank/', '')
    if (links[path] && url.origin === new URL(base).origin) originalsRequested.push(path)
  })
  for (const video of [false, true]) {
    const place = places.find(p => p.published && p.gallery.some((g: any) => links[g.src] && (g.type === 'video') === video))
    const media = place.gallery.find((g: any) => links[g.src] && (g.type === 'video') === video)
    expect(existsSync('../_site/rank/' + media.src)).toBe(false)
    await page.goto(base + 'guide/#/place/' + place.id)
    await page.locator('.place-gallery').getByRole('button', { name: `${video ? '播放' : '查看'}：${media.alt}`, exact: true }).click()
    const dialog = page.locator('.place-gallery-lightbox')
    await expect(dialog.getByRole('link', { name: video ? '打开原视频' : '打开原图' })).toHaveAttribute('href', links[media.src])
    if (video) {
      await expect(dialog.locator('video source')).toHaveAttribute('src', /images\/previews\/.+\.mp4$/)
      expect(existsSync('../_site/rank/' + previews[media.src].playback)).toBe(true)
    } else {
      const image = dialog.locator('.full-image-original')
      await expect(image).toHaveAttribute('src', /images\/previews\/.+\.webp$/)
      await expect(image).toHaveJSProperty('complete', true)
      expect(await image.evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
    }
    await dialog.getByRole('button', { name: '关闭大图' }).click()
  }
  expect(originalsRequested).toEqual([])
})
