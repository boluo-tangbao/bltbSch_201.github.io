import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createArchive, encryptTrips, unlockArchive, parseArchive, readTripPreferences, reviewTripEntries } from '../src/utils/tripArchive.ts'
import { geocodeWithBaidu } from '../src/utils/baiduMaps.ts'

const password = '独立口令-private-2026'
const trip = { id: 'saved-test', name: '私人的周末安排', savedAt: '2026-11-02T04:00:00Z', entries: [{ placeId: 'personal-test', custom: { id: 'custom-test', name: '<img src=x onerror=alert(1)>', city: '上海', address: '自填地址安全测试', note: '不应公开的备注' } }], labels: ['私有站点'], preferences: { modes: {}, visits: { 'personal-test': { minutes: 55, close: '21:00' } } } }

test('encrypted archives hide all personal fields and use fresh salt / IV with non-extractable keys', async () => {
  const a = await createArchive(password), b = await createArchive(password)
  assert.notEqual(a.salt, b.salt)
  assert.equal(a.key.extractable, false)
  await assert.rejects(crypto.subtle.exportKey('raw', a.key))
  const first = await encryptTrips([trip], a.key, a.salt), second = await encryptTrips([trip], a.key, a.salt)
  assert.notEqual(first.iv, second.iv)
  assert.notEqual(first.data, second.data)
  const json = JSON.stringify(first)
  for (const secret of [password, trip.name, trip.entries[0].custom.address, trip.entries[0].custom.note, trip.entries[0].custom.name, 'personal-test', '21:00']) assert.ok(!json.includes(secret))
  assert.deepEqual((await unlockArchive(json, password)).trips, [trip])
  await assert.rejects(unlockArchive(json, 'wrong-password-2026'), /口令不正确/)
  const tampered = { ...first, data: (first.data[0] === 'A' ? 'B' : 'A') + first.data.slice(1) }
  await assert.rejects(unlockArchive(JSON.stringify(tampered), password), /口令不正确/)
})

test('imports reject oversized / invalid formats and bounded KDF parameters before deriving a key', async () => {
  assert.throws(() => parseArchive('x'.repeat(2 * 1024 * 1024 + 1)), /2MB/)
  for (const value of ['null', '[]', '{}', '<script>alert(1)</script>', JSON.stringify({ format: 'tangbao-private-trips', version: 1, iterations: 999999999 })]) assert.throws(() => parseArchive(value))
  await assert.rejects(createArchive('short'), /12至128/)
  const a = await createArchive(password)
  await assert.rejects(encryptTrips(Array(21).fill(trip), a.key, a.salt), /20个/)
  await assert.rejects(encryptTrips([{ ...trip, entries: [{ placeId: '__proto__' }] }], a.key, a.salt))
})

test('imported preferences cannot inject prototype keys, arbitrary URLs or obsolete progress and departure times', () => {
  const source = JSON.parse('{"prefix":["old"],"departure":"old","visits":{"__proto__":{"minutes":30},"constructor":{"minutes":30},"area":{"minutes":45,"close":"22:00","url":"javascript:alert(1)"}}}')
  source.modes = { 'arbitrary-url': 'car', '["a","b"]': 'walk' }
  const result = readTripPreferences(source)
  assert.deepEqual(result, { modes: { '["a","b"]': 'walk' }, visits: { area: { minutes: 45, close: '22:00' } } })
  assert.equal({}.minutes, undefined)
})

test('restoration reviews expired, renamed and inactive entries without deleting the saved plan', () => {
  const place = { id: 'area', name: '商场', city: '上海', published: true }
  const entries = [{ placeId: 'area' }, { placeId: 'area', shopName: '主题' }, { placeId: 'missing' }, { placeId: 'area', shopName: '装修店' }, trip.entries[0]]
  const directory = { area: { shops: [{ name: '主题', status: 'listed', operatingConfirmation: 'official-listing', limited: { scope: 'theme', endsOn: '2026-11-01' } }, { name: '装修店', status: 'closed', inactive: { reason: 'renovation' } }] } }
  const before = JSON.stringify(entries)
  assert.deepEqual(reviewTripEntries(entries, [place], directory, '2026-11-02').map(x => [x.index, x.reason]), [[1, '本期快闪已结束'], [2, '地点已移除或暂不公开'], [3, '装修停业']])
  assert.equal(JSON.stringify(entries), before)
})

test('personal geocoding never reads or writes persistent address caches', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  let reads = 0, writes = 0
  globalThis.window = { setTimeout, clearTimeout }
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => { reads++; return '{}' }, setItem: () => { writes++ } } })
  const api = { Point: class { constructor(lng, lat) { this.lng = lng; this.lat = lat } }, Geocoder: class { getPoint(address, done) { done({ lng: 121, lat: 31 }) } } }
  try {
    assert.deepEqual(await geocodeWithBaidu(api, '私有地址', '上海', false), { lng: 121, lat: 31 })
    assert.deepEqual([reads, writes], [0, 0])
    await geocodeWithBaidu(api, '公开商场', '上海')
    assert.deepEqual([reads, writes], [1, 1])
  } finally {
    delete globalThis.window
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor)
    else delete globalThis.localStorage
  }
})
