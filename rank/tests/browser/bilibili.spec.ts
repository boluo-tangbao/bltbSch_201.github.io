import { test, expect } from '@playwright/test'
import { readFileSync, mkdirSync } from 'node:fs'
import { formatVideoTime, bilibiliUrl } from '../../src/utils/bilibili'

const base = 'http://127.0.0.1:4173/bltbSch_201.github.io/rank/'
const fixtureBase = 'http://127.0.0.1:4174/bltbSch_201.github.io/rank/'
const catalog = JSON.parse(readFileSync('src/data/bilibili-videos.json', 'utf8'))
const directories = JSON.parse(readFileSync('src/data/shop-directories.json', 'utf8'))
const thirdParty = (url: string) => /(^|\.)(bilibili\.com|bilivideo\.com|hdslb\.com|biliimg\.com)$/.test(new URL(url).hostname)
mkdirSync('test-results/evidence', { recursive: true })

test('all 17 real entries sit after the place introduction and never load Bilibili by opening or navigating', async ({ page }) => {
  const requests: string[] = []
  page.on('request', r => { if (thirdParty(r.url())) requests.push(r.url()) })
  await page.goto(base)
  await expect(page.locator('.bilibili-clips, iframe[src*="bilibili"]')).toHaveCount(0)
  for (const clip of catalog.clips) {
    await page.goto(`${base}guide/#/place/${clip.placeId}`)
    const widget = page.locator('.bilibili-clips')
    await expect(widget).toHaveCount(1)
    await expect(widget).not.toContainText(catalog.videos[0].title)
    await expect(widget).not.toContainText(formatVideoTime(clip.startSeconds))
    await expect(widget.locator('h3, .clip-video-title, .clip-selection')).toHaveCount(0)
    expect(await widget.evaluate(el => el.previousElementSibling?.classList.contains('detail-review'))).toBe(true)
    await expect(page.locator('.shop-directory .bilibili-clips')).toHaveCount(0)
    await expect(widget.locator('iframe, video')).toHaveCount(0)
    await expect(widget.locator('.clip-tv-mark')).toHaveJSProperty('src', base + 'brand/bilibili-tv.svg')
    await expect(widget.locator('.clip-tv-mark')).toHaveJSProperty('naturalWidth', 96)
    await expect(widget.getByRole('link', { name: '去 B 站观看 ↗' })).toHaveAttribute('href', clip.reviewUrl)
    await widget.getByRole('button', { name: '加载此片段播放器' }).focus()
    await expect(widget.locator('iframe')).toHaveCount(0)
    if (directories[clip.placeId]) {
      await expect(page.locator('.shop-directory .shop-row')).toHaveCount(directories[clip.placeId].shops.filter((shop: { status: string }) => shop.status !== 'closed').length)
      await expect(page.locator('.shop-directory .is-closed')).toHaveCount(0)
      await expect(page.locator('.shop-directory-confirmed .is-closed, .shop-directory-confirmed .shop-row:has(.shop-accounts) .shop-sources, .shop-directory-confirmed .shop-row:has(.shop-accounts) .shop-kind-evidence')).toHaveCount(0)
      const more = page.locator('.shop-directory-more')
      if (await more.count()) {
        await expect(more).toHaveJSProperty('open', false)
        await more.locator('summary').click()
        await expect(more).toHaveJSProperty('open', true)
        await expect(more.locator('.shop-sources a').first()).toBeVisible()
        await more.locator('summary').click()
      }
    }
  }
  await page.goto(`${base}guide/?video=shanghai-ranking-bv1uuwizfevv&p=1&t=131#/place/shanghai-shop-003`)
  await expect(page.locator('.bilibili-clips')).toHaveCount(1)
  await expect(page.locator('iframe[src*="bilibili"]')).toHaveCount(0)
  expect(requests).toEqual([])
  expect(await page.locator('link[rel="preconnect"], link[rel="prefetch"], link[rel="preload"]').evaluateAll(links => links.some(l => /bilibili|bilivideo|hdslb|biliimg/.test(l.getAttribute('href') || '')))).toBe(false)
})

test('explicit keyboard load creates one non-autoplay iframe; close and detail navigation destroy it on desktop and mobile', async ({ page }) => {
  const playerRequests: string[] = []
  // Test only the host-controlled lifecycle here. This stub is not a Bilibili playback test.
  await page.route('https://player.bilibili.com/**', route => { playerRequests.push(route.request().url()); return route.fulfill({ contentType: 'text/html', body: '<title>Player lifecycle test stub</title>' }) })
  const clip = catalog.clips.find((c: any) => c.placeId === 'shanghai-shop-007')
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 950 })
    await page.goto(`${base}guide/#/place/${clip.placeId}`)
    const widget = page.locator('.bilibili-clips'), load = widget.getByRole('button', { name: '加载此片段播放器' })
    await expect(widget.locator('iframe')).toHaveCount(0)
    const before = playerRequests.length
    await load.focus(); await load.press('Enter')
    await expect(widget.locator('iframe')).toHaveCount(1)
    await expect.poll(() => playerRequests.length).toBe(before + 1)
    await expect(widget.locator('iframe')).toHaveAttribute('src', bilibiliUrl('BV1uUWizfEvv', 1, clip.startSeconds, true)!)
    await expect(widget.locator('iframe')).toHaveAttribute('allow', 'fullscreen')
    await expect(widget.locator('iframe')).toHaveAttribute('title', '迪美的视频片段播放器')
    await expect(widget.locator('.clip-video-title, .clip-selection, .clip-hint')).toHaveCount(0)
    await expect(widget).not.toContainText(catalog.videos[0].title)
    await expect(widget).not.toContainText(formatVideoTime(clip.startSeconds))
    expect(await widget.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await widget.screenshot({ path: `test-results/evidence/bilibili-loaded-${width}.png` })
    await widget.getByRole('button', { name: '关闭播放器' }).click()
    await expect(widget.locator('iframe')).toHaveCount(0)
    await expect(widget).not.toContainText(formatVideoTime(clip.startSeconds))
    await expect(widget).not.toContainText(catalog.videos[0].title)
    await widget.screenshot({ path: `test-results/evidence/bilibili-closed-${width}.png` })
    await load.click()
    await page.getByRole('link', { name: '关闭介绍 ×' }).click()
    await expect(page.locator('iframe[src*="bilibili"]')).toHaveCount(0)
    await page.goto(`${base}guide/#/place/${clip.placeId}`)
    await expect(page.locator('iframe[src*="bilibili"]')).toHaveCount(0)
    await load.click()
    await page.goto(`${base}guide/#/place/shanghai-shop-003`)
    await expect(page.locator('iframe[src*="bilibili"]')).toHaveCount(0)
  }
})

test('fixture-only multi-clip and P2 selection stages changes until explicit reload, with safe invalid and pending states', async ({ page }) => {
  const data = structuredClone(catalog), video = data.videos[0]
  const first = { ...data.clips[0], id: 'test-first', placeId: 'demo-0' }
  const second = { ...data.clips[1], id: 'test-second', placeId: 'demo-0', page: 2, chapterId: 'test-p2-chapter' }
  const chapter = video.chapters.find((c: any) => c.id === data.clips[1].chapterId)
  video.pages.push({ ...video.pages[0], page: 2 })
  video.chapters.push({ ...chapter, id: second.chapterId, page: 2 })
  second.reviewUrl = bilibiliUrl(video.bvid, 2, second.startSeconds)
  const invalid = { ...first, id: 'test-invalid', placeId: 'demo-1', startSeconds: -1 }
  const pending = { ...first, id: 'test-pending', placeId: 'demo-2', status: 'pending', startSeconds: undefined, reviewUrl: undefined }
  data.clips = [first, second, invalid, pending]
  await page.route('**/src/data/bilibili-videos.json*', route => route.fulfill({ contentType: 'application/javascript', body: `export default ${JSON.stringify(data)}` }))
  const requests: string[] = []
  page.on('request', r => { if (thirdParty(r.url())) requests.push(r.url()) })
  await page.route('https://player.bilibili.com/**', route => route.fulfill({ contentType: 'text/html', body: '<title>Player lifecycle test stub</title>' }))
  await page.goto(`${fixtureBase}guide/#/place/demo-0`)
  const widget = page.locator('.bilibili-clips'), select = widget.locator('select'), iframe = widget.locator('iframe')
  await expect(select).toBeVisible()
  await expect(select.locator('option').first()).toHaveText('片段 1')
  await expect(select.locator('option').nth(1)).toHaveText('片段 2')
  await select.selectOption(second.id)
  await expect(iframe).toHaveCount(0)
  expect(requests).toEqual([])
  const load = widget.getByRole('button', { name: '加载此片段播放器' })
  await load.click()
  await expect(iframe).toHaveAttribute('src', bilibiliUrl(video.bvid, 2, second.startSeconds, true)!)
  await expect(select.locator('option').first()).toHaveText('片段 1')
  await expect(select.locator('option').nth(1)).toHaveText('片段 2')
  const count = requests.length
  await select.selectOption(first.id)
  await expect(widget).toContainText('点击加载按钮切换到所选片段')
  await expect(iframe).toHaveAttribute('src', bilibiliUrl(video.bvid, 2, second.startSeconds, true)!)
  expect(requests.length).toBe(count)
  await iframe.evaluate(el => el.setAttribute('data-old-frame', 'true'))
  await load.click()
  await expect(iframe).toHaveCount(1)
  await expect(iframe).toHaveAttribute('src', bilibiliUrl(video.bvid, 1, first.startSeconds, true)!)
  await expect(page.locator('iframe[data-old-frame]')).toHaveCount(0)
  await widget.getByRole('button', { name: '关闭播放器' }).click()
  await expect(select).toHaveValue(first.id)
  await expect(iframe).toHaveCount(0)
  for (const [id, message] of [['demo-1', '片段配置暂不可用'], ['demo-2', '片段起点待确认']]) {
    await page.goto(`${fixtureBase}guide/#/place/${id}`)
    await expect(widget).toContainText(message)
    await expect(widget.locator('iframe, button')).toHaveCount(0)
  }
})

test.describe('mobile loading confirmation', () => {
  test.use({ viewport: { width: 390, height: 950 }, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1' })

  test('cancel makes no request; confirm loads without autoplay; later cancellation keeps the existing player', async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, 'connection', { configurable: true, value: { type: 'cellular', effectiveType: '4g' } }))
    const requests: string[] = []
    page.on('request', r => { if (thirdParty(r.url())) requests.push(r.url()) })
    await page.route('https://player.bilibili.com/**', route => route.fulfill({ contentType: 'text/html', body: '<title>Player lifecycle test stub</title>' }))
    await page.goto(`${base}guide/#/place/shanghai-shop-007`)
    const widget = page.locator('.bilibili-clips'), load = widget.getByRole('button', { name: '加载此片段播放器' })
    await expect(widget).not.toContainText('加载后可能产生流量')
    page.once('dialog', async dialog => {
      expect(dialog.type()).toBe('confirm')
      expect(dialog.message()).toBe('加载后可能产生流量，点击播放器内的播放按钮开始观看。')
      await dialog.dismiss()
    })
    await load.click()
    await expect(widget.locator('iframe')).toHaveCount(0)
    expect(requests).toEqual([])
    await expect(widget.locator('.clip-video-title, .clip-selection')).toHaveCount(0)
    page.once('dialog', dialog => dialog.accept())
    await load.click()
    const iframe = widget.locator('iframe')
    await expect(iframe).toHaveCount(1)
    await expect(iframe).toHaveAttribute('src', /autoplay=0/)
    await expect(widget.locator('.clip-video-title, .clip-selection, .clip-hint')).toHaveCount(0)
    await iframe.evaluate(el => el.setAttribute('data-existing-player', 'true'))
    const count = requests.length
    page.once('dialog', dialog => dialog.dismiss())
    await load.click()
    await expect(iframe).toHaveAttribute('data-existing-player', 'true')
    expect(requests.length).toBe(count)
    await widget.screenshot({ path: 'test-results/evidence/bilibili-mobile-loaded.png' })
    await widget.getByRole('button', { name: '关闭播放器' }).click()
    await expect(iframe).toHaveCount(0)
    await expect(widget.locator('.clip-video-title, .clip-selection')).toHaveCount(0)
    await expect(widget.locator('.clip-hint')).toHaveCount(0)
  })

  test('Wi-Fi, ethernet and unknown mobile connections load without a prompt even when speed is labelled 3g', async ({ page }) => {
    let dialogs = 0
    page.on('dialog', async dialog => { dialogs++; await dialog.dismiss() })
    await page.route('https://player.bilibili.com/**', route => route.fulfill({ contentType: 'text/html', body: '<title>Player lifecycle test stub</title>' }))
    await page.addInitScript(() => {
      const type = new URL(location.href).searchParams.get('test-network')
      Object.defineProperty(navigator, 'connection', { configurable: true,
        value: type === 'unsupported' ? undefined : { type, effectiveType: '3g' } })
    })
    for (const type of ['wifi', 'ethernet', 'unknown', 'unsupported']) {
      await page.goto(`${base}guide/?test-network=${type}#/place/shanghai-shop-007`)
      const widget = page.locator('.bilibili-clips')
      await expect(widget.locator('iframe')).toHaveCount(0)
      await expect(widget).not.toContainText(catalog.videos[0].title)
      await expect(widget).not.toContainText('已选择')
      await widget.getByRole('button', { name: '加载此片段播放器' }).click()
      await expect(widget.locator('iframe')).toHaveCount(1)
      expect(dialogs).toBe(0)
      await widget.getByRole('button', { name: '关闭播放器' }).click()
      await expect(widget.locator('iframe')).toHaveCount(0)
      await expect(widget.locator('.clip-video-title, .clip-selection')).toHaveCount(0)
    }
  })
})
