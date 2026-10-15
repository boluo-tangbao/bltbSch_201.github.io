import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { publishedRankAssets, shouldPublishRankAsset } from '../scripts/published-assets.mjs'

const places = { 上海: [
  { published: true, cover: 'images/places/cover.jpg', mapSnapshot: { src: 'images/places/map.png' }, gallery: [
    { src: 'images/places/photo.jpg' }, { src: 'images/places/movie.mp4', type: 'video', poster: 'images/places/poster.jpg' },
  ] },
  { published: false, cover: 'images/places/draft.jpg', gallery: [] },
] }
const metadata = {
  places,
  mediaPreviews: {
    'images/places/cover.jpg': { small: 'images/previews/cover-320.webp', display: 'images/previews/cover-1280.webp' },
    'images/places/movie.mp4': { small: 'images/previews/movie-320.webp', playback: 'images/previews/movie-playback.mp4' },
    'images/places/draft.jpg': { small: 'images/previews/draft-320.webp' },
  },
  portraitPreviews: { 'pixel-current.webp': 'images/previews/current-pixel.webp', 'pixel-side.webp': 'images/previews/side-pixel.webp' },
  characters: [{ portrait: 'images/official/character.webp', thumbnail: 'images/previews/character.webp' }],
}

test('publication retains every live original, video, poster, map and generated preview', () => {
  const used = publishedRankAssets(metadata)
  for (const path of ['images/places/cover.jpg', 'images/places/photo.jpg', 'images/places/movie.mp4', 'images/places/poster.jpg', 'images/places/map.png', 'images/previews/cover-320.webp', 'images/previews/cover-1280.webp', 'images/previews/movie-playback.mp4']) {
    assert.equal(shouldPublishRankAsset(path, used), true, path)
  }
  for (const path of ['images/places/draft.jpg', 'images/places/unused.jpg', 'images/previews/draft-320.webp', 'images/previews/old.webp', 'images/pixel-old.webp']) {
    assert.equal(shouldPublishRankAsset(path, used), false, path)
  }
})

test('current portraits, variants, homepage artwork and unrelated public URLs stay available', () => {
  const used = publishedRankAssets(metadata)
  for (const path of ['images/pixel-current.webp', 'images/pixel-side.webp', 'images/previews/current-pixel.webp', 'images/previews/side-pixel.webp', 'images/official/character.webp', 'images/previews/character.webp', 'brand/logo.png', 'favicon.svg', 'characters.json', 'assets/app.js', 'documents/guide.pdf']) {
    assert.equal(shouldPublishRankAsset(path, used), true, path)
  }
  for (const path of ['images/places/desktop.ini', 'images/Thumbs.db', 'videos/places/.gitkeep', '.DS_Store']) assert.equal(shouldPublishRankAsset(path, used), false, path)
  assert.equal(used.has('images/previews/draft-320.webp'), false)
})

test('all currently published originals remain deployable without needing generated caches', () => {
  const groups = JSON.parse(readFileSync(new URL('../src/data/places.json', import.meta.url), 'utf8'))
  const used = publishedRankAssets({ places: groups, mediaPreviews: {}, portraitPreviews: {}, characters: [] })
  for (const path of used) {
    assert.equal(shouldPublishRankAsset(path, used), true, path)
    assert.equal(existsSync(new URL('../public/' + path, import.meta.url)), true, path)
  }
})
