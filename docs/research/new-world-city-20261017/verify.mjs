// superseded-20261018: historical procedure; do not restore outdated evidence.
throw new Error("此脚本已归档；改用 docs/research/new-world-city-20261018/ 下的本轮脚本，避免恢复过期资料。")
// Run from repository root while Vite preview is serving port 4182.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(path.resolve('rank/package.json'))
const { chromium } = require('playwright')
const root = 'docs/research/new-world-city-20261017'
const before = JSON.parse(fs.readFileSync(root + '/before.json', 'utf8')).place
const after = JSON.parse(fs.readFileSync('rank/src/data/places.json', 'utf8'))['上海'].find(p => p.id === before.id)
for (const field of Object.keys(before).filter(k => !['gallery', 'updatedAt'].includes(k))) assert.deepEqual(after[field], before[field], field + ' changed')
assert.deepEqual(after.gallery.slice(0, before.gallery.length), before.gallery)
const directory = JSON.parse(fs.readFileSync('rank/src/data/shop-directories.json', 'utf8'))[before.id]
const expectedSources = directory.shops.filter(s => !s.operatingConfirmation).reduce((n, s) => n + s.sources.length + (s.kindSources?.length ?? 0), 0)
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage()
const errors = []
page.on('pageerror', error => errors.push(error.message))
const results = []
try {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('http://127.0.0.1:4182/bltbSch_201.github.io/rank/guide/#/place/shanghai-shop-003')
    await page.locator('.shop-directory').waitFor()
    await page.reload()
    await page.locator('.shop-directory').waitFor()
    assert.equal(await page.locator('.shop-directory-confirmed .shop-row').count(), 3)
    assert.equal(await page.locator('.shop-directory-confirmed .shop-sources').count(), 0)
    assert.equal(await page.locator('.shop-directory-more .shop-row').count(), 13)
    assert.equal(await page.locator('.shop-directory-more').getAttribute('open'), null)
    await page.locator('.shop-directory').screenshot({ path: root + `/shops-${width}.png` })
    await page.locator('.shop-directory-more > summary').click()
    assert.equal(await page.locator('.shop-directory-more .shop-row').first().isVisible(), true)
    assert.equal(await page.locator('.shop-directory-more .is-closed').count(), 1)
    assert.equal(await page.locator('.shop-directory-more .shop-sources a').count(), expectedSources)
    assert.equal(await page.locator('.place-gallery-item').count(), 15)
    assert.equal(await page.locator('.place-gallery-group').count(), 4)
    for (const index of [12, 13, 14]) {
      // Gallery groups are sorted by first appearance; select by alt instead of flat DOM order.
      const media = after.gallery[index]
      const item = page.locator('.place-gallery-item').filter({ has: page.locator('img', { hasText: '' }) }).filter({ has: page.getByAltText(media.alt, { exact: true }) })
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
    assert.equal(await page.locator('.bilibili-clips iframe').count(), 0)
    results.push({ width, confirmed: 3, more: 13, gallery: 15, groups: 4, sourceLinks: expectedSources, overflow: false, refresh: 'passed', lightbox: 'passed' })
  }
  await page.goto('http://127.0.0.1:4182/bltbSch_201.github.io/rank/guide/#/?q=CAPCOM')
  await page.getByRole('searchbox', { name: '关键词搜索', exact: true }).fill('CAPCOM')
  await page.waitForFunction(() => document.querySelector('.directory-groups')?.textContent?.includes('新世界城'))
  assert.deepEqual(errors, [])
  fs.writeFileSync(root + '/verification.json', JSON.stringify({ protectedFields: 'unchanged', originalGallery: 'all 12 entries retained', results, search: 'CAPCOM finds 新世界城', pageErrors: errors }, null, 2) + '\n')
  console.log(JSON.stringify({ results, protectedFields: 'unchanged', search: 'passed' }))
} finally {
  await browser.close()
}
