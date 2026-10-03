import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, statSync, rmSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import sharp from 'sharp'
import { prepareCharacters, prepareMedia } from '../scripts/prepare-media.mjs'
import { execFileSync } from 'node:child_process'
import ffmpeg from '@ffmpeg-installer/ffmpeg'

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
    for (const [key, width] of [['small', 320], ['large', 640], ['display', 1280]]) {
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

test('character thumbnails preserve source artwork, framing and pixel dimensions', async () => {
  const outputRoot = resolve('test-results')
  mkdirSync(outputRoot, { recursive: true })
  const root = mkdtempSync(join(outputRoot, 'characters-'))
  try {
    mkdirSync(join(root, 'src/data'), { recursive: true })
    mkdirSync(join(root, 'public/images'), { recursive: true })
    const pixels = join(root, 'public/images/pixel.png')
    const original = join(root, 'public/images/original.png')
    await sharp({ create: { width: 256, height: 256, channels: 4, background: { r: 30, g: 110, b: 180, alpha: .5 } } }).png().toFile(pixels)
    await sharp({ create: { width: 1200, height: 1800, channels: 4, background: '#234567' } }).png().toFile(original)
    const before = readFileSync(original), pixelBefore = readFileSync(pixels)
    const characters = [{ id: 'test', file: 'original.png', frame: { width: 150, left: -25, top: -10 } }]
    const manifest = await prepareCharacters(root, characters, ['pixel.png'])
    const pixelMeta = await sharp(readFileSync(join(root, 'public', manifest['pixel.png']))).metadata()
    assert.equal(pixelMeta.width, 256); assert.equal(pixelMeta.height, 256)
    const decoded = await sharp(readFileSync(join(root, 'public', manifest['pixel.png']))).ensureAlpha().raw().toBuffer()
    assert.equal(decoded[3], (await sharp(pixelBefore).ensureAlpha().raw().toBuffer())[3])
    const [character] = JSON.parse(readFileSync(join(root, 'public/characters.json'), 'utf8'))
    assert.deepEqual(character.frame, characters[0].frame)
    assert.equal(character.portrait, 'images/original.png')
    assert.equal((await sharp(readFileSync(join(root, 'public', character.thumbnail))).metadata()).width, 640)
    assert.deepEqual(readFileSync(original), before); assert.deepEqual(readFileSync(pixels), pixelBefore)
    const mtime = statSync(join(root, 'public', manifest['pixel.png'])).mtimeMs
    assert.deepEqual(await prepareCharacters(root, characters, ['pixel.png']), manifest)
    assert.equal(statSync(join(root, 'public', manifest['pixel.png'])).mtimeMs, mtime)
  } finally {
    assert.equal(dirname(resolve(root)), outputRoot)
    rmSync(root, { recursive: true, force: true })
  }
})

test('video playback copies have a front index and preserve original files', async () => {
  const outputRoot = resolve('test-results')
  mkdirSync(outputRoot, { recursive: true })
  const root = mkdtempSync(join(outputRoot, 'video-'))
  try {
    mkdirSync(join(root, 'src/data'), { recursive: true })
    mkdirSync(join(root, 'public/images'), { recursive: true })
    const source = 'images/video.mp4', originalPath = join(root, 'public', source)
    execFileSync(ffmpeg.path, ['-v', 'error', '-f', 'lavfi', '-i', 'testsrc=duration=1:size=320x180:rate=10', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', originalPath], { windowsHide: true, timeout: 30000 })
    const original = readFileSync(originalPath)
    writeFileSync(join(root, 'src/data/places.json'), JSON.stringify({ city: [{ published: true, gallery: [{ src: source, type: 'video' }] }] }))
    const manifest = await prepareMedia(root)
    const playbackPath = join(root, 'public', manifest[source].playback)
    const playback = readFileSync(playbackPath), atoms = []
    for (let offset = 0; offset + 8 <= playback.length;) {
      const length = playback.readUInt32BE(offset)
      atoms.push(playback.toString('ascii', offset + 4, offset + 8))
      assert.ok(length >= 8); offset += length
    }
    assert.ok(atoms.indexOf('moov') >= 0 && atoms.indexOf('moov') < atoms.indexOf('mdat'))
    assert.deepEqual(readFileSync(originalPath), original)
    const mtime = statSync(playbackPath).mtimeMs
    assert.deepEqual(await prepareMedia(root), manifest)
    assert.equal(statSync(playbackPath).mtimeMs, mtime)
  } finally {
    assert.equal(dirname(resolve(root)), outputRoot)
    rmSync(root, { recursive: true, force: true })
  }
})
