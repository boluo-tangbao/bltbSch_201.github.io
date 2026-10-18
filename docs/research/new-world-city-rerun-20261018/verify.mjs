// Run from repository root with the freshly built preview on port 4182.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const { chromium } = createRequire(path.resolve('rank/package.json'))('playwright')
const root = 'docs/research/new-world-city-rerun-20261018'
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'))
const before = read(root + '/before.json').place
const after = read('rank/src/data/places.json')['上海'].find(p => p.id === before.id)
const directories = read('rank/src/data/shop-directories.json'), directory = directories[before.id]
for (const field of Object.keys(before)) assert.deepEqual(after[field], before[field], field)
assert.deepEqual(after.gallery.slice(0, 10), before.gallery.slice(0, 10))
assert.equal(after.gallery.length, 12)
assert.equal(after.gallery.some(g => /2024/.test(g.sourceName ?? '')), false)
for (const shop of directory.shops.filter(s => s.status !== 'closed')) {
  for (const source of [...shop.sources, ...(shop.kindSources ?? [])]) {
    if (source.date) assert.ok(source.date >= '2025-01-01' && source.date <= '2026-10-18', shop.name)
    else assert.ok(source.dateLabel || ['https://www.capcom.co.jp/amusement/brands/capcomstore/', 'https://www.sanrio.com.cn/store.html'].includes(source.url), shop.name)
  }
}
assert.equal(directory.shops.length, 21)
assert.equal(directory.shops.find(s => s.name === '谷里谷气').status, 'closed')
assert.equal(directory.shops.find(s => s.name.includes('谷力全开')).accounts[0].handle, '82429591376')
assert.equal(directory.shops.find(s => s.name.includes('無限萌界')).floor, '八层')
assert.equal(directory.shops.find(s => s.name.includes('中村君')).operatingConfirmation, 'official-listing')
assert.equal(directory.shops.some(s => s.name === '光荣特库摩中心'), false)
assert.deepEqual(directory.shops.find(s => s.name === '新漫界').aliases, ['新铛集', '新鐺集'])
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage(), errors = [], results = []
page.on('pageerror', error => errors.push(error.message))
const url = 'http://127.0.0.1:4182/bltbSch_201.github.io/rank/guide/#/place/'
try {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto(url + before.id)
    await page.reload()
    await page.locator('.shop-directory').waitFor()
    assert.equal(await page.locator('.shop-directory-confirmed .shop-row').count(), 12)
    assert.equal(await page.locator('.shop-directory-confirmed .shop-sources, .shop-directory-confirmed .shop-kind-evidence').count(), 0)
    assert.equal(await page.locator('.shop-accounts a').count(), 6)
    assert.equal(await page.locator('.shop-accounts em').count(), 2)
    assert.equal(await page.locator('.shop-directory-more .shop-row').count(), 7)
    assert.equal(await page.locator('.shop-directory-more').getAttribute('open'), null)
    assert.equal(await page.locator('.shop-directory .is-closed').count(), 0)
    await page.locator('.shop-directory').screenshot({ path: root + `/shops-${width}.png` })
    await page.locator('.shop-directory-more > summary').click()
    assert.equal(await page.locator('.shop-directory-more .shop-row').first().isVisible(), true)
    assert.equal(await page.locator('.shop-directory-more .shop-sources a').count(), 7)
    await page.locator('.shop-directory').screenshot({ path: root + `/expanded-${width}.png` })
    const shopNames = await page.locator('.shop-row h3').allTextContents()
    assert.equal(shopNames.some(name => /谷里谷气|光荣特库摩|鸣潮主题店/.test(name)), false)
    assert.equal(await page.locator('.place-gallery-item').count(), 12)
    for (const media of after.gallery.filter(g => g.sourceUrl)) {
      const item = page.locator('.place-gallery-item').filter({ has: page.getByAltText(media.alt, { exact: true }) })
      await item.scrollIntoViewIfNeeded()
      await item.locator('img').evaluate(img => img.decode())
      assert.equal(await item.locator('a.place-gallery-source').getAttribute('href'), media.sourceUrl)
      await item.locator('button').click()
      await page.getByRole('dialog').waitFor()
      assert.ok((await page.getByRole('dialog').innerText()).includes(media.sourceName))
      await page.getByRole('button', { name: '关闭大图', exact: true }).click()
    }
    await page.locator('.place-gallery').screenshot({ path: root + `/gallery-${width}.png` })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    results.push({ width, confirmed: 12, more: 7, accounts: 6, gallery: 12, closedShown: 0, overflow: false, refresh: 'passed', lightbox: 'passed' })
  }
  await page.goto('http://127.0.0.1:4182/bltbSch_201.github.io/rank/guide/#/?q=新铛集')
  await page.getByRole('searchbox', { name: '关键词搜索', exact: true }).fill('谷力全开')
  await page.waitForFunction(() => document.querySelector('.directory-groups')?.textContent?.includes('新世界城'))
  assert.deepEqual(errors, [])
  const result = { runtime: process.version, protectedFields: 'unchanged', gallery: 'all 12 unchanged', results, aliasSearch: '谷力全开找到新世界城', pageErrors: errors }
  fs.writeFileSync(root + '/verification.json', JSON.stringify(result, null, 2) + '\n')
  console.log(JSON.stringify(result))
} finally { await browser.close() }
