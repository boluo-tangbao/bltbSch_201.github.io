import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { flattenPlaces } from '../../src/utils/model'
import { shopDirectoryGroups } from '../../src/utils/shopDirectory'
import { visitNotices } from '../../src/utils/visitNotices'
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

test('舒适视图短评支持悬停与键盘，出发提醒展开并定位原始店铺记录', async ({ page }, info) => {
  await page.clock.setFixedTime(new Date('2026-11-02T04:00:00Z'))
  await page.goto('')
  await openMobileTools(page)
  await page.getByRole('button', { name: '舒适', exact: true }).click()
  const card = page.locator('.place-card').filter({ has: page.locator('.card-summary') }).first()
  const link = card.locator('.card-link')
  const summary = card.locator('.card-summary')
  const id = (await card.getAttribute('id'))!.replace('place-card-', '')
  await expect(summary).toHaveText(places.find(p => p.id === id)!.summary)
  if (await page.evaluate(() => matchMedia('(hover: hover)').matches)) {
    await page.getByRole('heading', { name: '图片总榜', exact: true }).hover()
    await expect(summary).toBeHidden()
    await link.hover()
    await expect(summary).toBeVisible()
    await page.getByRole('heading', { name: '图片总榜', exact: true }).hover()
    await link.focus()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Shift+Tab')
    await expect(link).toBeFocused()
    await expect(summary).toBeVisible()
  } else await expect(summary).toBeVisible()
  await noOverflow(page)
  if (info.project.name === 'desktop') await card.screenshot({ path: '../test-results/acceptance/comfortable-summary.png' })

  const sample = Object.keys(directories).find(id => visitNotices(directories[id], '2026-11-02').notices.length)!
  const notice = visitNotices(directories[sample], '2026-11-02').notices[0]
  await page.goto('guide/' + placeDetailHash(sample))
  await expect(page.locator('.shop-directory-inactive')).toHaveJSProperty('open', false)
  await expect(page.locator('.detail-date-grid')).toContainText(directories[sample].checkedAt)
  await expect(page.locator('.visit-notices')).toContainText(notice.label)
  await noOverflow(page)
  if (info.project.name !== 'narrow-mobile') await page.locator('.detail-heading').screenshot({ path: `../test-results/acceptance/visit-notices-${info.project.name}.png` })
  await page.locator('.visit-notices li button').filter({ hasText: notice.name }).click()
  const target = page.locator('.shop-row').filter({ has: page.getByRole('heading', { name: notice.name, exact: true }) })
  await expect(page.locator('.shop-directory-inactive')).toHaveJSProperty('open', true)
  await expect(target).toBeVisible()
  await expect(target).toBeFocused()
  await page.reload()
  await expect(page.locator('.shop-directory-inactive')).toHaveJSProperty('open', false)
})

test.describe('触屏短评', () => {
  test.use({ hasTouch: true })
  test('舒适视图直接显示短评，紧凑视图保留原布局', async ({ page }, info) => {
    await page.goto('')
    await openMobileTools(page)
    await page.getByRole('button', { name: '舒适', exact: true }).click()
    await expect(page.locator('.card-summary').first()).toBeVisible()
    expect(await page.evaluate(() => matchMedia('(hover: none)').matches)).toBe(true)
    await noOverflow(page)
    if (info.project.name === 'mobile') await page.locator('.tier-row').first().screenshot({ path: '../test-results/acceptance/comfortable-touch.png' })
    await page.getByRole('button', { name: '紧凑', exact: true }).click()
    await expect(page.locator('.card-summary')).toHaveCount(0)
  })
})

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
  const features: string[] = []
  page.on('request', request => { if (/\/(ExportPanel|TripJourney)-[^/]+\.js/.test(request.url())) features.push(request.url()) })
  const place = places.find(p => p.cover && p.gallery.length)!
  await page.goto('')
  await openMobileTools(page)
  await page.getByRole('searchbox').fill(place.name)
  const card = page.locator(`#place-card-${place.id}`)
  await expect(card).toBeVisible()
  expect(features, '普通浏览和搜索不应加载导出／行程模块').toEqual([])
  await page.getByRole('button', { name: '规划逛店', exact: true }).click()
  await card.getByRole('button', { name: /加入本次清单/ }).click()
  await expect(page.locator('.trip-plan-dock')).toContainText('1 站')
  expect(features, '选地点不应提前加载行程面板').toEqual([])
  await page.getByRole('button', { name: '选好了，规划路线', exact: true }).click()
  const planner = page.locator('.trip-plan-dialog')
  await expect(planner).toContainText(place.name)
  await expect(planner.locator('.stop-selector').first()).toBeVisible()
  expect(features.some(url => url.includes('/TripJourney-'))).toBe(true)
  await planner.getByRole('button', { name: '生成清单文件', exact: true }).click()
  const planFile = await planner.getByRole('link', { name: '下载清单（HTML）' }).getAttribute('href')
  expect(await page.evaluate(async url => (await fetch(url!)).text(), planFile)).toContain(place.name)
  await planner.getByRole('button', { name: '关闭本次清单', exact: true }).click()
  await page.getByRole('button', { name: '导出榜单', exact: true }).click()
  const exporter = page.locator('.export-dialog')
  await expect(exporter).toBeVisible()
  expect(features.some(url => url.includes('/ExportPanel-'))).toBe(true)
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

test('延迟加载：关闭等待框后不会自行弹回，再次打开正常', async ({ page }) => {
  await page.goto('')
  await openMobileTools(page)
  let release!: () => void
  const hold = new Promise<void>(resolve => { release = resolve })
  await page.route(/\/ExportPanel-[^/]+\.js/, async route => { await hold; await route.continue() })
  await page.getByRole('button', { name: '导出榜单', exact: true }).click()
  await expect(page.getByRole('dialog', { name: '导出榜单加载', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '关闭加载', exact: true }).click()
  const response = page.waitForResponse(/\/ExportPanel-[^/]+\.js/)
  release()
  await (await response).finished()
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await expect(page.locator('.export-dialog')).toHaveCount(0)
  await page.unroute(/\/ExportPanel-[^/]+\.js/)
  await page.getByRole('button', { name: '导出榜单', exact: true }).click()
  await expect(page.locator('.export-dialog')).toBeVisible()
  await page.getByRole('button', { name: '关闭导出', exact: true }).click()
})

test('延迟加载：导出模块请求失败后可以重试', async ({ page }) => {
  await page.goto('')
  await openMobileTools(page)
  await page.route(/\/ExportPanel-[^/]+\.js/, route => route.abort(), { times: 1 })
  await page.getByRole('button', { name: '导出榜单', exact: true }).click()
  const pending = page.getByRole('dialog', { name: '导出榜单加载', exact: true })
  await expect(pending).toContainText('加载失败')
  await pending.getByRole('button', { name: '刷新页面', exact: true }).click()
  await expect(page.locator('.deferred-dialog')).toHaveCount(0)
  await openMobileTools(page)
  await page.getByRole('button', { name: '导出榜单', exact: true }).click()
  await expect(page.locator('.export-dialog')).toBeVisible()
  await page.getByRole('button', { name: '关闭导出', exact: true }).click()
})

test('详情按点击加载，地图仅在需要时初始化，店铺直达定位有效', async ({ page }) => {
  const requested: string[] = []
  page.on('request', request => { if (/\/(PlaceDetail|AddressMap)-[^/]+\.js/.test(request.url())) requested.push(request.url()) })
  const place = places.find(p => p.location && p.details.length > 200 && p.gallery.length > 3)!
  await page.goto('')
  await openMobileTools(page)
  await page.getByRole('searchbox').fill(place.name)
  await expect(page.locator(`#place-card-${place.id}`)).toBeVisible()
  expect(requested).toEqual([])
  await page.locator(`#place-card-${place.id} .card-link`).click()
  await expect(page.locator('.detail-heading h1')).toHaveText(place.name)
  expect(requested.some(url => url.includes('/PlaceDetail-'))).toBe(true)
  expect(requested.some(url => url.includes('/AddressMap-'))).toBe(false)
  await page.locator('.detail-chapters').getByRole('button', { name: '怎么去', exact: true }).click()
  await expect.poll(() => requested.some(url => url.includes('/AddressMap-'))).toBe(true)
  await expect(page.locator('.place-address-map')).toBeVisible()
  // A hash-only navigation reuses imported modules; start a fresh document for the scroll path.
  await page.goto('about:blank')
  requested.length = 0
  await page.goto('guide/' + placeDetailHash(place.id))
  await expect(page.locator('.detail-heading h1')).toHaveText(place.name)
  expect(requested.some(url => url.includes('/AddressMap-'))).toBe(false)
  await page.locator('.deferred-map').scrollIntoViewIfNeeded()
  await expect.poll(() => requested.some(url => url.includes('/AddressMap-'))).toBe(true)
  await expect(page.locator('.place-address-map')).toBeVisible()
  const id = Object.keys(directories).find(id => places.some(p => p.id === id) && shopDirectoryGroups(directories[id].shops).regular.open.length)!
  const shop = shopDirectoryGroups(directories[id].shops).regular.open[0]
  await page.goto('guide/' + placeDetailHash(id, shop.name))
  const target = page.locator('.shop-row').filter({ has: page.getByRole('heading', { name: shop.name, exact: true }) })
  await expect(target).toBeVisible()
  await expect(target).toBeFocused()
  await noOverflow(page)
})
