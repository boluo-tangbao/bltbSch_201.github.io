import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { generateDiscoveryPages } from '../../scripts/generate-discovery-pages.mjs'

test('static city and place pages expose original content without JS, clean canonical URLs, metadata and only public records', t => {
  const root = mkdtempSync(join(tmpdir(), 'discovery-pages-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const place = { id: 'sample', name: 'A & B <script>', published: true, tier: 'top', order: 1, summary: '中古与同人', details: '**推荐理由**\n<script>alert(1)</script>', tags: ['中古'], gallery: [], cover: 'images/raw.jpg', updatedAt: '2026-10-30', visitedAt: '2026-09-20', location: '二层' }
  const options = { siteRoot: root, rankBase: '/custom/rank/', origin: 'https://example.com', groups: { '上海': [place, { ...place, id: 'hidden', published: false }] }, site: { author: '作者' }, previews: { 'images/raw.jpg': { large: 'images/previews/sample.webp' } } }
  assert.deepEqual(generateDiscoveryPages(options), { cities: 1, places: 1 })
  const html = readFileSync(join(root, 'rank/places/sample/index.html'), 'utf8')
  for (const value of ['https://example.com/custom/rank/places/sample/', 'og:title', 'og:description', 'og:image', 'A &amp; B &lt;script&gt;', '2026-09-20', '2026-10-30', '推荐理由', '&lt;script&gt;alert(1)&lt;/script&gt;', '/custom/rank/guide/#/place/sample', '/custom/rank/images/previews/sample.webp']) assert.ok(html.includes(value), value)
  assert.ok(!html.includes('src="/custom/rank/images/raw.jpg"'))
  const sitemap = readFileSync(join(root, 'sitemap.xml'), 'utf8')
  assert.ok(sitemap.includes('https://example.com/custom/rank/cities/%E4%B8%8A%E6%B5%B7/'))
  assert.ok(sitemap.includes('<lastmod>2026-10-30</lastmod>'))
  assert.ok(!sitemap.includes('hidden'))
  assert.ok(!sitemap.includes('route/'))
  assert.ok(readFileSync(join(root, 'rank/cities/上海/index.html'), 'utf8').includes('places/sample/'))
})
