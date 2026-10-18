import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const { chromium } = createRequire(path.resolve('rank/package.json'))('playwright')
const root = 'docs/research/first-department-c-rerun-20261018'
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'))
const before = read(root + '/before.json').place
const after = read('rank/src/data/places.json')['上海'].find(p => p.id === before.id)
for (const key of Object.keys(before)) assert.deepEqual(after[key], before[key], key)
assert.equal(after.gallery.length, 21)
const directory = read('rank/src/data/shop-directories.json')[before.id]
assert.equal(directory.shops.length, 31)
assert.equal(directory.shops.find(s => s.name === '面包谷谷').accounts[0].handle, 'KamiChaika')
assert.equal(directory.shops.find(s => s.name.includes('谷回')).status, 'closed')
for (const source of directory.shops.flatMap(s => s.sources)) if (source.date) assert.ok(source.date >= '2025-01-01')
for (const name of ['奶惜 nicegoods','谷的Time','雪鱼町','六柴谷屋（第一百货店）','铃夏学园（上海店）','蔷薇石英']) assert.ok(directory.shops.find(s => s.name === name)?.accounts?.length, name)
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage(), errors = [], results = []
page.on('pageerror', error => errors.push(error.message))
try {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('http://127.0.0.1:4182/bltbSch_201.github.io/rank/guide/#/place/' + before.id)
    await page.reload()
    await page.locator('.shop-directory').waitFor()
    assert.equal(await page.locator('.shop-directory-confirmed .shop-row').count(), 14)
    assert.equal(await page.locator('.shop-directory-confirmed .shop-sources, .shop-directory-confirmed .shop-kind-evidence').count(), 0)
    assert.equal(await page.locator('.shop-directory-more .shop-row').count(), 16)
    assert.equal(await page.locator('.shop-directory-more').getAttribute('open'), null)
    assert.equal(await page.locator('.shop-accounts a').count(), 9)
    assert.equal(await page.locator('.shop-row h3').filter({ hasText: '谷回' }).count(), 0)
    assert.equal(await page.locator('.shop-directory .is-closed').count(), 0)
    await page.locator('.shop-directory').screenshot({ path: root + `/shops-${width}.png` })
    await page.locator('.shop-directory-more > summary').click()
    assert.equal(await page.locator('.shop-directory-more .shop-row').first().isVisible(), true)
    assert.equal(await page.locator('.shop-directory-more .shop-sources a').count(), 18)
    assert.equal(await page.locator('.place-gallery-item').count(), 21)
    const media = after.gallery.find(g => g.sourceUrl)
    const item = page.locator('.place-gallery-item').filter({ has: page.getByAltText(media.alt, { exact: true }) })
    await item.scrollIntoViewIfNeeded()
    await item.locator('img').evaluate(img => img.decode())
    assert.equal(await item.locator('a.place-gallery-source').getAttribute('href'), media.sourceUrl)
    await item.locator('button').click()
    await page.getByRole('dialog').waitFor()
    assert.ok((await page.getByRole('dialog').innerText()).includes(media.sourceName))
    await page.getByRole('button', { name: '关闭大图', exact: true }).click()
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    results.push({ width, open: 14, more: 16, accountLinks: 9, closedShown: 0, gallery: 21, initialCollapsed: true, overflow: false, lightbox: 'passed', directRefresh: 'passed' })
  }
  await page.goto('http://127.0.0.1:4182/bltbSch_201.github.io/rank/guide/#/?q=第一百货C馆')
  await page.getByRole('searchbox', { name: '关键词搜索', exact: true }).fill('铃夏学园')
  await page.waitForFunction(() => document.querySelector('.directory-groups')?.textContent?.includes('第一百货'))
  assert.deepEqual(errors, [])
  const result = { runtime: process.version, originalAuthorFields: 'unchanged', gallery: 'all 21 unchanged', results, searchAlias: 'passed', pageErrors: errors }
  fs.writeFileSync(root + '/verification.json', JSON.stringify(result, null, 2) + '\n')
  console.log(JSON.stringify(result))
} finally { await browser.close() }
