import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { bilibiliUrl, validateBilibiliCatalog, placeClips } from '../src/utils/bilibili.ts'

const catalog = JSON.parse(readFileSync(new URL('../src/data/bilibili-videos.json', import.meta.url), 'utf8'))
const clone = () => structuredClone(catalog)
const groups = JSON.parse(readFileSync(new URL('../src/data/places.json', import.meta.url), 'utf8'))
const placeIds = Object.values(groups).flat().map(p => p.id)

test('real video metadata is shared, all clips reference existing places and independently checked times', () => {
  assert.deepEqual(validateBilibiliCatalog(catalog, placeIds), [])
  assert.equal(catalog.videos.length, 3)
  assert.equal(catalog.videos[0].bvid, 'BV1uUWizfEvv')
  assert.equal(catalog.clips.length, 25)
  assert.equal(new Set(catalog.clips.map(c => c.placeId)).size, 25)
  const before = JSON.stringify(catalog)
  assert.notEqual(placeClips(catalog, 'shanghai-shop-007')[0].clip.startSeconds, placeClips(catalog, 'shanghai-shop-003')[0].clip.startSeconds)
  assert.equal(JSON.stringify(catalog), before)
})

test('Guangzhou maps east, west and the Beijing Road side trip independently and preserves complete lead-ins', () => {
  const video = catalog.videos.find(v => v.bvid === 'BV1EFfJBwEjh')
  assert.ok(video)
  assert.equal(video.pages[0].durationSeconds, 678)
  assert.deepEqual(video.chapters.map(c => c.startSeconds), [0, 26, 176, 287, 345, 501])
  const expected = [
    ['guangzhou-shop-003', 'p1-26', 22],
    ['guangzhou-shop-002', 'p1-176', 175],
    ['guangzhou-shop-005', 'p1-287', 286],
    ['guangzhou-shop-001', 'p1-345', 342],
    ['guangzhou-shop-004', 'p1-501', 499],
  ]
  assert.deepEqual(catalog.clips.filter(c => c.videoId === video.id).map(c => [c.placeId, c.chapterId, c.startSeconds]), expected)
  for (const [placeId] of expected) {
    const [{ clip }] = placeClips(catalog, placeId)
    assert.equal(clip.status, 'verified')
    assert.ok(clip.chapterOverlapNote)
    assert.equal(clip.reviewUrl, bilibiliUrl(video.bvid, 1, clip.startSeconds))
  }
})

test('Suzhou keeps absent source chapters distinct from three independently reviewed introductions', () => {
  const video = catalog.videos.find(v => v.bvid === 'BV1Ykho6fEKd')
  assert.ok(video)
  assert.equal(video.chapterStatus, 'none')
  assert.deepEqual(video.chapters, [])
  assert.equal(video.pages[0].durationSeconds, 123)
  assert.deepEqual(catalog.clips.filter(c => c.videoId === video.id).map(c => [c.placeId, c.startSeconds]), [
    ['suzhou-shop-001', 12], ['suzhou-shop-002', 31], ['suzhou-shop-003', 82],
  ])
  for (const entry of catalog.clips.filter(c => c.videoId === video.id)) {
    assert.equal(entry.startSource, 'independent-review')
    assert.equal(entry.chapterId, undefined)
    assert.ok(entry.evidenceFrames.length >= 2)
  }
})

test('only validated IDs, page numbers and integer seconds can construct fixed-host URLs', () => {
  const url = new URL(bilibiliUrl('BV1uUWizfEvv', 2, 135, true))
  assert.equal(url.origin, 'https://player.bilibili.com')
  assert.equal(url.searchParams.get('p'), '2')
  assert.equal(url.searchParams.get('t'), '135')
  assert.equal(url.searchParams.get('autoplay'), '0')
  for (const args of [['bad', 1, 0], ['BV1uUWizfEvv', 0, 0], ['BV1uUWizfEvv', 1, -1], ['BV1uUWizfEvv', 1, 1.5], ['BV1uUWizfEvv', 1, Infinity]]) assert.equal(bilibiliUrl(...args, true), undefined)
})

test('malformed, duplicated, missing and ungrounded configuration fails closed', () => {
  for (const mutate of [
    d => d.videos.push(d.videos[0]),
    d => d.clips.push(d.clips[0]),
    d => d.videos[0].chapters.push(d.videos[0].chapters[0]),
    d => d.videos[0].chapters.reverse(),
    d => d.clips[0].placeId = 'missing',
    d => d.clips[0].chapterId = 'missing',
    d => d.clips[0].page = 2,
    d => d.clips[0].startSeconds = -1,
    d => d.clips[0].startSeconds = 12.5,
    d => d.clips[0].startSeconds = 99999,
    d => d.clips[0].evidence = '',
    d => d.clips[0].method = 'guessed',
    d => d.clips[0].reviewUrl = 'https://example.com/',
    d => d.videos[0].cover = 'forbidden.jpg',
    d => d.videos[0].bvid = '<iframe>',
  ]) {
    const d = clone(); mutate(d)
    assert.ok(validateBilibiliCatalog(d, placeIds).length)
  }
  const d = clone(); d.clips[0].startSeconds = -1
  assert.ok(placeClips(d, d.clips[0].placeId)[0].error)
})

test('verified lead-in before chapter marker must have an explicit explanation', () => {
  const d = clone(), c = d.clips.find(c => c.chapterOverlapNote)
  assert.ok(c)
  delete c.chapterOverlapNote
  assert.ok(validateBilibiliCatalog(d).length)
})

test('confirmed no-chapters, unreadable chapters and pending clips are distinct; P2 time is relative', () => {
  const d = clone(), v = d.videos[0], c = d.clips[0]
  d.clips = [c]; v.chapters = []; v.chapterStatus = 'none'; delete c.chapterId
  c.startSeconds = 0; c.reviewUrl = bilibiliUrl(v.bvid, c.page, 0)
  assert.deepEqual(validateBilibiliCatalog(d), [])
  c.startSeconds = 15; c.reviewUrl = bilibiliUrl(v.bvid, c.page, 15)
  assert.ok(validateBilibiliCatalog(d).length)
  c.startSource = 'independent-review'
  assert.deepEqual(validateBilibiliCatalog(d), [])
  c.startSource = 'guessed'
  assert.ok(validateBilibiliCatalog(d).length)
  c.startSource = 'independent-review'
  v.chapterStatus = 'unavailable'
  assert.ok(validateBilibiliCatalog(d).length)
  c.status = 'pending'; delete c.startSeconds; delete c.reviewUrl
  assert.deepEqual(validateBilibiliCatalog(d), [])
  c.startSeconds = 0
  assert.ok(validateBilibiliCatalog(d).length)
  const multi = clone(), video = multi.videos[0], clip = multi.clips[0]
  multi.clips = [clip]; video.pages.push({ ...video.pages[0], page: 2 })
  const chapter = video.chapters.find(ch => ch.id === clip.chapterId)
  video.chapters.push({ ...chapter, id: 'p2-check', page: 2 })
  clip.page = 2; clip.chapterId = 'p2-check'; clip.reviewUrl = bilibiliUrl(video.bvid, 2, clip.startSeconds)
  assert.deepEqual(validateBilibiliCatalog(multi), [])
})
