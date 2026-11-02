import { test } from 'node:test'
import assert from 'node:assert/strict'
import { publicRouteEntries, publicRouteUrl, readPublicRoute, placeShareText, placePublicUrl } from '../src/utils/publicSharing.ts'

const place = { id: 'sample', name: '公开商圈', city: '测试城', published: true, summary: '适合淘中古。', visitedAt: null, updatedAt: '2026-10-30', location: '公开地址' }
const places = [place, { ...place, id: 'hidden', published: false }]
const directories = { sample: { checkedAt: '2026-10-29', shops: [
  { name: '公开店铺', floor: '二层', status: 'recent', operatingConfirmation: 'official-listing', sources: [] },
  { name: '过期主题', status: 'recent', operatingConfirmation: 'official-listing', sources: [], limited: { scope: 'theme', period: '10月', endsOn: '2026-10-31' } },
] } }
const base = 'https://example.com/custom/rank/'
const today = '2026-11-02'

test('public route serialization rebuilds a whitelist and drops custom fields, hidden places and ended activities', () => {
  const entries = [{ placeId: 'sample', privateNote: 'secret-extra' }, { placeId: 'sample', shopName: '公开店铺', preferences: { address: 'secret-settings' } }, { placeId: 'sample', custom: { id: 'private', name: 'secret-name', city: 'secret-city', address: 'secret-address', note: 'secret-note' } }, { placeId: 'sample', shopName: '过期主题' }, { placeId: 'hidden' }, { placeId: 'sample' }]
  assert.deepEqual(publicRouteEntries(entries, places, directories, today), [{ placeId: 'sample' }, { placeId: 'sample', shopName: '公开店铺' }])
  const url = new URL(publicRouteUrl(base, entries, places, directories, today))
  assert.equal(url.pathname, '/custom/rank/route/')
  assert.equal(url.search, '')
  const raw = Buffer.from(url.hash.slice(1), 'base64url').toString('utf8')
  assert.ok(!raw.includes('secret'))
  assert.deepEqual(readPublicRoute(url.hash), { date: today, entries: [{ placeId: 'sample' }, { placeId: 'sample', shopName: '公开店铺' }] })
})

test('incoming routes reject malformed or excessive payloads and recheck against the current public catalog', () => {
  const encoded = data => '#' + Buffer.from(JSON.stringify(data)).toString('base64url')
  for (const hash of ['#<script>', '#' + 'a'.repeat(6001), encoded({ v: 2, date: today, stops: [['sample']] }), encoded({ v: 1, date: '2026-02-30', stops: [['sample']] }), encoded({ v: 1, date: today, stops: [['../secret']] }), encoded({ v: 1, date: today, stops: [['sample', '公开店铺', 'secret']] }), encoded({ v: 1, date: today, stops: Array(121).fill(['sample']) })]) assert.equal(readPublicRoute(hash), undefined)
  const entries = readPublicRoute(encoded({ v: 1, date: '2026-10-20', stops: [['sample', '过期主题'], ['sample', '不存在的私有店名'], ['hidden'], ['sample', '公开店铺']] })).entries
  assert.deepEqual(publicRouteEntries(entries, places, directories, today), [{ placeId: 'sample', shopName: '公开店铺' }])
  assert.throws(() => publicRouteUrl(base, [{ placeId: 'hidden' }], places, directories, today), /没有可分享/)
})

test('place sharing retains separate original dates, recommendation and a clean permanent page URL', () => {
  const url = placePublicUrl(base, place.id)
  assert.equal(url, 'https://example.com/custom/rank/places/sample/')
  const text = placeShareText(place, '作者', url, '2026-10-29')
  for (const value of ['测试城 · 公开商圈', '适合淘中古。', '体验到访：未记录', '内容更新：2026-10-30', '店单核对：2026-10-29', url]) assert.ok(text.includes(value))
})
