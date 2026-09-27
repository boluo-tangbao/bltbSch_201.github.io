import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, statSync, rmSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import sharp from 'sharp'
import { prepareMedia } from '../scripts/prepare-media.mjs'

test('previews preserve originals, ignore drafts, reuse outputs and invalidate changed media', async () => {
  const outputRoot = resolve('test-results')
  mkdirSync(outputRoot, { recursive: true })
  const root = mkdtempSync(join(outputRoot, 'media-'))
  try {
    mkdirSync(join(root, 'src/data'), { recursive: true })
    mkdirSync(join(root, 'public/images/places'), { recursive: true })
    const source = 'images/places/photo.png'
    const originalPath = join(root, 'public', source)
    await sharp({ create: { width: 1800, height: 1200, channels: 3, background: '#3a6f52' } }).png().toFile(originalPath)
    const original = readFileSync(originalPath)
    writeFileSync(join(root, 'src/data/places.json'), JSON.stringify({ city: [
      { published: true, cover: source, gallery: [{ src: source }] },
      { published: false, cover: 'images/places/missing-draft.jpg', gallery: [] },
    ] }))
    const first = await prepareMedia(root)
    assert.deepEqual(Object.keys(first), [source])
    assert.deepEqual(readFileSync(originalPath), original)
    for (const [key, width] of [['small', 320], ['large', 640]]) {
      const meta = await sharp(readFileSync(join(root, 'public', first[source][key]))).metadata()
      assert.equal(meta.format, 'webp')
      assert.equal(meta.width, width)
      assert.equal(meta.height, Math.round(width * 2 / 3))
    }
    const previewPath = join(root, 'public', first[source].small)
    const mtime = statSync(previewPath).mtimeMs
    assert.deepEqual(await prepareMedia(root), first)
    assert.equal(statSync(previewPath).mtimeMs, mtime)
    await sharp({ create: { width: 1800, height: 1200, channels: 3, background: '#cc7f41' } }).png().toFile(originalPath)
    const changed = readFileSync(originalPath)
    const second = await prepareMedia(root)
    assert.notEqual(second[source].small, first[source].small)
    assert.deepEqual(readFileSync(originalPath), changed)
    assert.deepEqual(JSON.parse(readFileSync(join(root, 'src/data/media-previews.json'), 'utf8')), second)
  } finally {
    assert.equal(dirname(resolve(root)), outputRoot)
    rmSync(root, { recursive: true, force: true })
  }
})
