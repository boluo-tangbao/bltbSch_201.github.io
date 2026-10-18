import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const { chromium } = createRequire(path.resolve('rank/package.json'))('playwright')
const root = 'docs/research/limited-shops-20261018'
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'))
const before = read(root + '/before.json')
const directories = read('rank/src/data/shop-directories.json')
const places = read('rank/src/data/places.json')
const cases = [
  { id: 'shanghai-shop-001', regular: 12, limited: 2, pending: 16, gallery: 21, accounts: 9 },
  { id: 'shanghai-shop-003', regular: 9, limited: 3, pending: 7, gallery: 12, accounts: 6 },
]
for (const { id } of cases) {
  assert.deepEqual(Object.values(places).flat().find(p => p.id === id), Object.values(before.places).flat().find(p => p.id === id))
  const restored = structuredClone(directories[id])
  for (const shop of restored.shops) delete shop.limited
  assert.deepEqual(restored, before.directories[id], id + ': only limited metadata may change')
}
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage(), errors = [], results = []
page.on('pageerror', e => errors.push(e.message))
const base = 'http://127.0.0.1:4182/bltbSch_201.github.io/rank/guide/'
try {
  for (const width of [1440, 390]) for (const item of cases) {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto(base + '#/place/' + item.id)
    await page.reload()
    await page.locator('.shop-directory-limited').waitFor()
    assert.equal(await page.locator('.shop-directory-regular .shop-directory-confirmed .shop-row').count(), item.regular)
    assert.equal(await page.locator('.shop-directory-limited .shop-directory-confirmed .shop-row').count(), item.limited)
    assert.equal(await page.locator('.shop-directory-limited .shop-period').count(), item.limited)
    assert.equal(await page.locator('.shop-directory-more .shop-row').count(), item.pending)
    for (const fold of await page.locator('.shop-directory-more').all()) assert.equal(await fold.getAttribute('open'), null)
    assert.equal(await page.locator('.shop-directory-confirmed .shop-sources,.shop-directory-confirmed .shop-kind-evidence').count(), 0)
    assert.equal(await page.locator('.shop-accounts a').count(), item.accounts)
    const names = await page.locator('.shop-row h4').allTextContents()
    assert.equal(names.some(n => /谷回|谷里谷气|鸣潮主题店/.test(n)), false)
    if (item.id.endsWith('001')) {
      assert.ok((await page.locator('.shop-directory-limited').innerText()).includes('9月30日—10月31日（原文未标年份）'))
      assert.equal(await page.locator('.shop-directory-regular h4').filter({ hasText: 'CREAM CAFE' }).count(), 1)
    } else {
      assert.equal(await page.locator('.shop-directory-regular h4').filter({ hasText: '無限萌界' }).count(), 1)
      assert.equal(await page.locator('.shop-directory-limited h4').filter({ hasText: 'IPSTAR' }).count(), 3)
    }
    await page.locator('.shop-directory-limited').screenshot({ path: root + `/${item.id}-limited-${width}.png` })
    await page.locator('.shop-directory-more > summary').click()
    assert.equal(await page.locator('.shop-directory-more .shop-row').first().isVisible(), true)
    assert.ok(await page.locator('.shop-directory-more .shop-sources a').count() >= item.pending)
    assert.equal(await page.locator('.place-gallery-item').count(), item.gallery)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    results.push({ ...item, width, closedShown: 0, initialCollapsed: true, expanded: true, sourcesHiddenForOpen: true, overflow: false, refresh: 'passed' })
  }
  await page.goto(base + '#/place/shanghai-shop-001?find=FenzGoods')
  await page.waitForFunction(() => document.activeElement?.textContent?.includes('FenzGoods'))
  assert.ok((await page.locator('.shop-directory-limited .shop-row:focus').innerText()).includes('FenzGoods'))
  assert.equal(await page.locator('.shop-directory-more').getAttribute('open'), null)
  assert.deepEqual(errors, [])
  const result = { runtime: process.version, targetPlaceFields: 'all unchanged', shopChanges: 'limited metadata only; original sources, accounts and checkedAt unchanged', results, limitedSearchTarget: 'passed', pageErrors: errors }
  fs.writeFileSync(root + '/verification.json', JSON.stringify(result, null, 2) + '\n')
  console.log(JSON.stringify(result))
} finally { await browser.close() }
