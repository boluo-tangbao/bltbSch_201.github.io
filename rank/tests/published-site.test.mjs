import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { validatePublishedSite } from '../../scripts/verify-published-site.mjs'

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'published-site-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const put = (path, text = '') => { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), text) }
  for (const path of ['index.html', 'activities.html', 'rank/index.html', 'rank/guide/index.html', 'rank/qa/index.html', 'rank/updates/index.html']) put(path)
  return { root, put }
}

test('final site checks resolve nested encoded resources and ignore offsite links and inline JS templates', t => {
  const { root, put } = fixture(t)
  put('rank/index.html', '<img src="images/%E5%BA%97.webp"><link href="css/site.css"><a href="https://example.com/login">来源</a><script>const html=`<img src="${unknown}">`;</script>')
  put('rank/images/店.webp', 'image')
  put('rank/css/site.css', 'body{background:url(../images/%E5%BA%97.webp)}')
  const result = validatePublishedSite({ siteRoot: root, siteBase: '/test/' })
  assert.deepEqual(result.errors, [])
  assert.deepEqual(result.externalHosts, ['example.com'])
})

test('missing optimized media, CSS dependencies, JS chunks and old source image paths block publishing', t => {
  const { root, put } = fixture(t)
  put('rank/site.css', 'body{background:url(missing.webp)}')
  put('rank/site.js', 'import("./missing-chunk.js")')
  const url = 'https://boluo-tangbao.github.io/bltbSch_201.github.io/rank/images/places/photo.jpg'
  const result = validatePublishedSite({ siteRoot: root, rankAssets: ['images/previews/photo.webp'], sourceUrls: [url] })
  for (const text of ['missing.webp', 'missing-chunk.js', 'images/previews/photo.webp', 'images/places/photo.jpg']) assert.ok(result.errors.some(e => e.includes(text)))
  const originalLinks = { 'images/places/photo.jpg': `https://github.com/boluo-tangbao/bltbSch_201.github.io/blob/${'a'.repeat(40)}/rank/public/images/places/photo.jpg` }
  const fixed = validatePublishedSite({ siteRoot: root, originalLinks, sourceUrls: [url] })
  assert.ok(!fixed.errors.some(e => e.includes('店铺依据出处')))
  assert.ok(validatePublishedSite({ siteRoot: root, budget: 1 }).errors.some(e => e.includes('超过验收预算')))
  assert.ok(validatePublishedSite({ siteRoot: join(root, 'absent') }).errors.length)
})
