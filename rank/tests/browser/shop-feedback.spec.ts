import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import type { ShopDirectory } from '../../src/types'
import { placeDetailHash } from '../../src/utils/search'

const base = 'http://127.0.0.1:4173/bltbSch_201.github.io/rank/'
const placeId = 'guangzhou-shop-003'
const directories: Record<string, ShopDirectory> = JSON.parse(readFileSync('src/data/shop-directories.json', 'utf8'))
const shop = directories[placeId]!.shops.find(shop => shop.status !== 'closed' && (shop.accounts?.length || shop.operatingConfirmation))!

for (const width of [390, 1440]) {
  test(`shop correction carries its context from the directory to GitHub at ${width}px`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 950 })
    if (width === 390) await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('Clipboard unavailable in test')) } })
    })
    await page.route('https://api.github.com/**', route => route.fulfill({ json: [] }))
    await context.route('https://github.com/**', route => route.fulfill({ contentType: 'text/html', body: '<h1>Test destination</h1>' }))
    await page.goto(base + (width === 390 ? 'guide/' : '') + placeDetailHash(placeId, shop.name))
    const row = page.locator('.shop-row').filter({ has: page.getByRole('heading', { name: shop.name, exact: true }) })
    await row.getByRole('link', { name: `${shop.name}：信息有变化`, exact: true }).click()
    await expect(page.getByRole('heading', { name: '店铺信息纠错', exact: true })).toBeVisible()
    await expect(page.locator('.feedback-context')).toContainText(shop.name)
    await expect(page.locator('.feedback-context')).toContainText('广州')
    await expect(page.getByRole('button', { name: '前往 GitHub 提交' })).toBeDisabled()
    await page.reload()
    await expect(page.locator('.feedback-context')).toContainText(shop.name)
    await page.getByLabel('变化类型').selectOption('楼层变化')
    await page.getByLabel('详细描述').focus()
    await page.screenshot({ path: `test-results/evidence/shop-feedback-${width}.png`, fullPage: true })
    await expect(page.getByLabel('一句话说明')).toHaveValue(`楼层变化：${shop.name}`.slice(0, 70))
    await page.getByLabel('一句话说明').fill('我补充的店铺变化')
    await page.getByLabel('变化类型').selectOption('搬迁')
    await expect(page.getByLabel('一句话说明')).toHaveValue('我补充的店铺变化')
    const details = '2026-10-29 现场看到已搬到三层，来源：https://example.com/notice?a=1&b=2'
    await page.getByLabel('详细描述').fill(details)
    if (width === 390) {
      await page.getByRole('button', { name: '复制纠错内容', exact: true }).click()
      await expect(page.locator('.copy-fallback textarea')).toHaveValue(/我补充的店铺变化\n\n店铺：/)
      await expect(page.locator('.copy-fallback textarea')).toHaveValue(new RegExp('变化类型：搬迁'))
    }
    const popupPromise = context.waitForEvent('page')
    await page.getByRole('button', { name: '前往 GitHub 提交' }).click()
    const popup = await popupPromise
    await popup.waitForLoadState()
    const url = new URL(popup.url())
    expect(url.searchParams.get('title')).toBe('[内容纠错] 我补充的店铺变化')
    const body = url.searchParams.get('body')!
    expect(body).toContain(`店铺：${shop.name}`)
    expect(body).toContain(`当前记录位置：${shop.floor || '未注明'}`)
    expect(body).toContain('变化类型：搬迁')
    expect(body).toContain('页面链接：' + base + 'guide/' + placeDetailHash(placeId, shop.name))
    expect(body).toContain(details)
    expect(url.searchParams.get('template')).toBe('rank-feedback.md')
    expect(url.searchParams.has('labels')).toBe(false)
    await popup.close()
    await expect(page.getByRole('link', { name: '通过 B 站私信反馈' })).toHaveAttribute('href', 'https://space.bilibili.com/251080996')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

test('an invalid shop link falls back to the ordinary suggestion form', async ({ page }) => {
  await page.route('https://api.github.com/**', route => route.fulfill({ json: [] }))
  await page.goto(base + 'qa/?place=missing&shop=%3Cscript%3E')
  await expect(page.locator('.feedback-context')).toHaveCount(0)
  await expect(page.getByLabel('建议类型')).toHaveValue('功能建议')
  await expect(page.getByLabel('一句话说明')).toHaveValue('')
})
