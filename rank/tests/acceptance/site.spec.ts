import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { flattenPlaces } from '../../src/utils/model'
import { shopDirectoryGroups } from '../../src/utils/shopDirectory'
import { placeDetailHash } from '../../src/utils/search'
import { openMobileTools } from '../browser/browse-tools'

const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'))
const places = flattenPlaces(json('src/data/places.json')).filter(p => p.published)
const directories = json('src/data/shop-directories.json')
const originals = json('src/data/original-links.json')
const catalog = json('src/data/bilibili-videos.json')
const failures = new WeakMap<Page, string[]>()
const external = new WeakMap<Page, Set<string>>()
const statistics = new WeakMap<Page, string[]>()

test.beforeEach(async ({ page, context, baseURL }) => {
  expect(['127.0.0.1', 'localhost', '[::1]'], '验收只允许访问本地副本，禁止直接访问线上站点').toContain(new URL(baseURL!).hostname)
  failures.set(page, []); external.set(page, new Set()); statistics.set(page, [])
  page.on('pageerror', error => failures.get(page)!.push(error.message))
  page.on('response', response => {
    if (response.url().startsWith(new URL(baseURL!).origin) && response.status() >= 400) failures.get(page)!.push(`${response.status()} ${response.url()}`)
  })
  // Isolate external dependencies. Never send feedback, analytics or live route queries.
  await context.route('**/*', route => {
    const url = new URL(route.request().url())
    if (url.hostname.includes('busuanzi') || /\/busuanzi(?:\/|\?|$)/i.test(url.pathname)) {
      statistics.get(page)!.push(url.href)
      return route.abort()
    }
    if (url.origin === new URL(baseURL!).origin) return route.continue()
    external.get(page)!.add(url.hostname)
    return route.abort()
  })
})
test.afterEach(async ({ page }, info) => {
  await info.attach('第三方依赖（未验证可用性）', { body: JSON.stringify([...external.get(page)!]), contentType: 'application/json' })
  expect(failures.get(page), '本站资源错误或未捕获脚本异常').toEqual([])
  expect(statistics.get(page), '验收期间不得尝试请求真实访问统计服务（已拦截）').toEqual([])
  await expect(page.locator('script[src*="busuanzi"]'), '本地验收不应加载访问统计脚本').toHaveCount(0)
})
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), '页面不应横向溢出').toBe(true)
}

test('访问统计：进入页面、刷新与切换介绍都不加载计数服务', async ({ page }) => {
  for (const entry of ['', 'guide/', 'qa/', 'updates/']) {
    await page.goto(entry)
    await page.reload()
    await expect(page.locator('script[src*="busuanzi"]')).toHaveCount(0)
    if (await page.locator('.visit-counter').count()) await expect(page.locator('.visit-counter')).toContainText('本地预览不计入访问')
  }
  for (const place of places.slice(0, 2)) {
    await page.goto('guide/' + placeDetailHash(place.id))
    await expect(page.locator('.visit-counter')).toContainText('本地预览不计入访问')
  }
})

test('全部公开地点：介绍可访问，手机页面不溢出', async ({ page }) => {
  expect(places.length).toBeGreaterThan(0)
  for (const place of places) await test.step(`${place.city} · ${place.name}`, async () => {
    await page.goto('guide/' + placeDetailHash(place.id))
    await expect(page.locator('.detail-heading h1')).toHaveText(place.name)
    await noOverflow(page)
  })
})

test('店单：常规说明隐藏、默认折叠、每次增加五条', async ({ page }, info) => {
  const ids = Object.keys(directories).filter(id => places.some(p => p.id === id))
  const sample = ids.find(id => shopDirectoryGroups(directories[id].shops).regular.open.length > 5)
  expect(sample, '至少一个可检验分页的店单').toBeTruthy()
  await page.goto('guide/' + placeDetailHash(sample!))
  const regular = page.locator('.shop-directory-regular')
  await expect(regular.locator('.shop-evidence-note')).toHaveCount(0)
  const rows = regular.locator('.shop-directory-confirmed .shop-row:visible')
  await expect(rows).toHaveCount(5)
  if (info.project.name !== 'narrow-mobile') await rows.first().screenshot({ path: `../test-results/acceptance/shop-style-${info.project.name}.png`, animations: 'disabled' })
  await regular.locator('.shop-directory-confirmed .shop-expand').click()
  await expect(rows).toHaveCount(Math.min(10, shopDirectoryGroups(directories[sample!].shops).regular.open.length))
  for (const more of await page.locator('.shop-directory-more').all()) {
    await expect(more).toHaveJSProperty('open', false)
    await more.locator(':scope > summary').click()
    await expect(more).toHaveJSProperty('open', true)
  }
  const historyId = ids.find(id => shopDirectoryGroups(directories[id].shops).inactive.length)
  if (historyId) {
    await page.goto('guide/' + placeDetailHash(historyId))
    const history = page.locator('.shop-directory-inactive')
    await expect(history).toHaveJSProperty('open', false)
    await expect(history.locator('.shop-row:visible')).toHaveCount(0)
    await history.locator(':scope > summary').click()
    await expect(history.locator('.shop-row:visible')).toHaveCount(Math.min(5, shopDirectoryGroups(directories[historyId].shops).inactive.length))
  }
  await noOverflow(page)
})

test('图集与视频：高清图、原件链接、站内播放和弹窗关闭', async ({ page }) => {
  for (const isVideo of [false, true]) {
    const place = places.find(p => p.gallery.some(g => originals[g.src] && (g.type === 'video') === isVideo))
    expect(place, '缺少图集验收样例').toBeTruthy()
    const media = place!.gallery.find(g => originals[g.src] && (g.type === 'video') === isVideo)!
    await page.goto('guide/' + placeDetailHash(place!.id))
    await page.locator('.place-gallery').getByRole('button', { name: `${isVideo ? '播放' : '查看'}：${media.alt}`, exact: true }).first().click()
    const viewer = page.locator('.place-gallery-lightbox')
    await expect(viewer.getByRole('link', { name: isVideo ? '打开原视频' : '打开原图' })).toHaveAttribute('href', originals[media.src])
    if (isVideo) {
      await expect.poll(() => viewer.locator('video').evaluate(v => (v as HTMLVideoElement).readyState)).toBeGreaterThanOrEqual(1)
    } else {
      await expect.poll(() => viewer.locator('.full-image-original').evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
    }
    await viewer.getByRole('button', { name: '关闭大图' }).click()
    await expect(viewer).toHaveCount(0)
  }
  const clip = catalog.clips.find((c: any) => c.status === 'verified' && places.some(p => p.id === c.placeId))
  expect(clip, '缺少已核实视频入口').toBeTruthy()
  // Check our popup lifecycle, not Bilibili's third-party playback service.
  await page.route('https://player.bilibili.com/**', route => route.fulfill({ contentType: 'text/html', body: '<title>播放器容器验收</title>' }))
  await page.goto('guide/' + placeDetailHash(clip.placeId))
  const trigger = page.getByRole('button', { name: '加载此片段播放器', exact: true })
  await expect(page.locator('.clip-cinema iframe')).toHaveCount(0)
  await trigger.click()
  await expect(page.locator('.clip-cinema')).toHaveJSProperty('open', true)
  await expect(page.locator('.clip-cinema iframe')).toHaveAttribute('src', /autoplay=0/)
  await page.keyboard.press('Escape')
  await expect(page.locator('.clip-cinema iframe')).toHaveCount(0)
  await expect(trigger).toBeFocused()
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
  await noOverflow(page)
})

test('搜索、行程与导出：只选择一个地点并生成可读取文件', async ({ page }) => {
  const place = places.find(p => p.cover && p.gallery.length)!
  await page.goto('')
  await openMobileTools(page)
  await page.getByRole('searchbox').fill(place.name)
  const card = page.locator(`#place-card-${place.id}`)
  await expect(card).toBeVisible()
  await page.getByRole('button', { name: '规划逛店', exact: true }).click()
  await card.getByRole('button', { name: /加入本次清单/ }).click()
  await expect(page.locator('.trip-plan-dock')).toContainText('1 站')
  await page.getByRole('button', { name: '选好了，规划路线', exact: true }).click()
  const planner = page.locator('.trip-plan-dialog')
  await expect(planner).toContainText(place.name)
  await planner.getByRole('button', { name: '生成清单文件', exact: true }).click()
  const planFile = await planner.getByRole('link', { name: '下载清单（HTML）' }).getAttribute('href')
  expect(await page.evaluate(async url => (await fetch(url!)).text(), planFile)).toContain(place.name)
  await planner.getByRole('button', { name: '关闭本次清单', exact: true }).click()
  await page.getByRole('button', { name: '导出榜单', exact: true }).click()
  const exporter = page.locator('.export-dialog')
  await exporter.getByRole('radio', { name: '完整内容 · HTML 图文存档', exact: true }).check()
  await exporter.getByRole('button', { name: '生成完整内容', exact: true }).click()
  const download = exporter.getByRole('link', { name: '↓ 下载完整内容（HTML）', exact: true })
  await expect(download).toBeVisible()
  const file = await download.getAttribute('href')
  const html = await page.evaluate(async url => (await fetch(url!)).text(), file)
  expect(html).toContain('data:image/')
  expect(html).toContain(place.name)
  await page.getByRole('button', { name: '关闭导出', exact: true }).click()
  await noOverflow(page)
})
