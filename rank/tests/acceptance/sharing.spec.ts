import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { flattenPlaces, filterPlaces } from '../../src/utils/model'
import type { PlacesByCity } from '../../src/types'
import { visitNotices } from '../../src/utils/visitNotices'
import { visitNoticeStorageKey } from '../../src/utils/visitNoticeSeen'

const places = filterPlaces(flattenPlaces(JSON.parse(readFileSync('src/data/places.json', 'utf8')) as PlacesByCity))
const planKey = 'tangbao-trip-plan-session-v1'
test.beforeEach(async ({ page, context, baseURL }) => {
  expect(new URL(baseURL!).hostname).toBe('127.0.0.1')
  await page.clock.install({ time: new Date('2026-11-02T04:00:00Z') })
  const directories = JSON.parse(readFileSync('src/data/shop-directories.json', 'utf8'))
  const seen = Object.entries(directories).map(([id, directory]) => [visitNoticeStorageKey(id), JSON.stringify(visitNotices(directory as Parameters<typeof visitNotices>[0], '2026-11-02'))])
  await context.addInitScript(entries => { for (const [key, value] of entries) localStorage.setItem(key, value) }, seen)
  await context.route('**/*', route => new URL(route.request().url()).origin === new URL(baseURL!).origin ? route.continue() : route.abort())
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { (window as any).__sharedText = text } } })
  })
})
test.afterEach(async ({ page }) => {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test.describe('无需脚本的城市与地点入口', () => {
  test.use({ javaScriptEnabled: false })
  test('城市目录、独立介绍、原日期与返回当前店单的链接可直接读取', async ({ page }, info) => {
    const place = places[0]
    await page.goto('cities/')
    await expect(page.getByRole('heading', { name: '城市逛店指南', exact: true })).toBeVisible()
    await page.getByRole('link').filter({ has: page.getByRole('heading', { name: place.city, exact: true }) }).click()
    await expect(page.getByRole('heading', { name: `${place.city}逛店指南`, exact: true })).toBeVisible()
    await page.getByRole('heading', { name: place.name, exact: true }).getByRole('link').click()
    await expect(page.getByRole('heading', { name: place.name, exact: true })).toBeVisible()
    await expect(page.locator('.summary')).toHaveText(place.summary)
    await expect(page.locator('.dates')).toContainText(place.updatedAt)
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', new RegExp(`/rank/places/${place.id}/$`))
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', new RegExp(place.name))
    await expect(page.getByRole('link', { name: '查看当前店单、地图与行程 ↗', exact: true })).toHaveAttribute('href', new RegExp(`/guide/#/place/${place.id}$`))
    if (info.project.name === 'mobile') await page.screenshot({ path: '../test-results/acceptance/city-place-mobile.png' })
  })
})

test('地点分享保留评价、原日期和独立链接，可生成完整PNG并关闭返回', async ({ page }, info) => {
  const place = places[0]
  await page.goto(`guide/#/place/${place.id}`)
  const trigger = page.getByRole('button', { name: '分享地点', exact: true })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: '分享这处地点', exact: true })
  await expect(dialog).toContainText(place.summary)
  await dialog.getByRole('button', { name: '复制图文分享', exact: true }).click()
  const text = await page.evaluate(() => (window as any).__sharedText)
  expect(text).toContain(place.city); expect(text).toContain(place.updatedAt)
  expect(text).toContain(`/places/${place.id}/`)
  await dialog.getByRole('button', { name: '生成分享图片', exact: true }).click()
  const image = dialog.locator('.share-result')
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1200)
  const download = page.waitForEvent('download')
  await dialog.getByRole('link', { name: '下载分享图片', exact: true }).click()
  const file = await download
  if (info.project.name === 'mobile') {
    await file.saveAs('../test-results/acceptance/place-share-card.png')
    await dialog.screenshot({ path: '../test-results/acceptance/place-sharing-mobile.png' })
  }
  await dialog.getByRole('button', { name: '关闭地点分享', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test('公开路线排除自填信息，接收只预览、确认后合并，失效项不进入清单', async ({ page, context }, info) => {
  const place = places[0], existing = places[1]
  const privateName = 'PRIVATE_SHOP_自填店名', privateAddress = 'PRIVATE_ADDRESS_地址', privateNote = 'PRIVATE_NOTE_备注'
  const requests: string[] = []
  context.on('request', request => requests.push(request.url() + (request.postData() || '')))
  await page.goto(`guide/#/place/${place.id}`)
  if (info.project.name === 'desktop') await page.locator('.detail-title-row .trip-plan-add').click()
  else await page.locator('.trip-current-add').click()
  await page.getByRole('button', { name: '查看清单', exact: true }).click()
  const planner = page.locator('.trip-plan-dialog')
  await planner.getByRole('button', { name: '＋ 自己补一站', exact: true }).click()
  const custom = page.getByRole('dialog', { name: '自己补一间店', exact: true })
  await custom.getByLabel('店名', { exact: true }).fill(privateName)
  await custom.getByLabel('放在哪里').selectOption('other')
  await custom.getByLabel('具体地址').fill(privateAddress)
  await custom.getByLabel('备注', { exact: true }).fill(privateNote)
  await custom.getByRole('button', { name: '加入我的路线', exact: true }).click()
  await planner.getByRole('button', { name: '分享公开路线', exact: true }).click()
  const share = page.getByRole('dialog', { name: '分享公开路线', exact: true })
  await expect(share).toContainText('1 项自填、失效或重复选择未包含')
  await share.getByRole('button', { name: '复制公开路线链接', exact: true }).click()
  const url: string = await page.evaluate(() => (window as any).__sharedText)
  const raw = JSON.parse(Buffer.from(new URL(url).hash.slice(1), 'base64url').toString('utf8'))
  for (const secret of [privateName, privateAddress, privateNote]) {
    expect(JSON.stringify(raw)).not.toContain(secret)
    expect(await share.textContent()).not.toContain(secret)
    expect(requests.join('\n')).not.toContain(secret)
  }
  raw.stops.push([place.id, 'UNKNOWN_PRIVATE_NAME'])
  const incoming = new URL(url); incoming.hash = Buffer.from(JSON.stringify(raw)).toString('base64url')
  const receiver = await context.newPage()
  await receiver.addInitScript(({ key, id }) => sessionStorage.setItem(key, JSON.stringify([{ placeId: id }])), { key: planKey, id: existing.id })
  await receiver.goto(incoming.href)
  await expect(receiver.locator('.public-route-stops h2')).toHaveText(place.name)
  await expect(receiver.locator('.public-route-page')).not.toContainText('UNKNOWN_PRIVATE_NAME')
  await expect(receiver.locator('.public-route-page')).toContainText('1 项已结束、停业、重复或无法对应')
  expect(JSON.parse((await receiver.evaluate(key => sessionStorage.getItem(key), planKey))!)).toEqual([{ placeId: existing.id }])
  await receiver.getByRole('button', { name: '加入我的清单', exact: true }).click()
  expect(JSON.parse((await receiver.evaluate(key => sessionStorage.getItem(key), planKey))!)).toEqual([{ placeId: existing.id }, { placeId: place.id }])
  await expect(receiver.getByRole('button', { name: '已在我的清单中', exact: true })).toBeDisabled()
  if (info.project.name === 'mobile') await receiver.screenshot({ path: '../test-results/acceptance/public-route-mobile.png' })
  expect(await receiver.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await receiver.close()
  await share.getByRole('button', { name: '关闭路线分享', exact: true }).click()
  await expect(planner).toBeVisible()
  await expect(planner).toContainText(privateName)
})
