import test from 'node:test'
import assert from 'node:assert/strict'
import { pageMetadata } from '../../scripts/page-metadata.mjs'
test('sharing metadata preserves descriptions, escapes values and is idempotent', () => {
  const html = '<head><title>我的网站</title><meta name="description" content="原介绍"></head>'
  const options = { url: 'https://example.com/sub/rank/', image: 'https://example.com/sub/images/anime.webp', description: '照片与"体验" <记录>' }
  const result = pageMetadata(html, options)
  assert.equal((result.match(/name="description"/g) || []).length, 1)
  assert.ok(result.includes('content="原介绍"'))
  assert.ok(result.includes('&quot;体验&quot; &lt;记录&gt;'))
  assert.ok(result.includes('href="https://example.com/sub/rank/"'))
  assert.equal(pageMetadata(result, options), result)
})
