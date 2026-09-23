import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { validateData, validDate } from '../scripts/validate-data.mjs'
import { flattenPlaces, filterPlaces, publicUpdates, recentBadge } from '../src/utils/model.ts'
import { cityColor, navigationUrl, hasCoordinates, placeAddress } from '../src/utils/cities.ts'
import { wgs84ToBd09 } from '../src/utils/coordinates.ts'
import { pointForPlace } from '../src/utils/baiduMaps.ts'

test('city groups inherit their names without mutating source entries', () => {
  const entry = { id: 'a', name: '测试店', tier: 'top', order: 20, published: true, summary: '测试', tags: [] }
  const groups = { 上海: [entry], 广州: [{ ...entry, id: 'b', order: 10 }], 苏州: [] }
  const result = flattenPlaces(groups)
  assert.deepEqual(result.map(p => p.city), ['上海', '广州'])
  assert.equal(Object.hasOwn(entry, 'city'), false)
  assert.deepEqual(filterPlaces(result).map(p => p.id), ['b', 'a'])
  assert.deepEqual(filterPlaces(result, '上海').map(p => p.id), ['a'])
})

const site = JSON.parse(readFileSync(new URL('../src/data/site.json', import.meta.url), 'utf8'))
site.cityColors = { '测试城市': '#b95b43' }
const place = { id: 'test-place', name: '虚构测试店', city: '测试城市', tier: 'top', order: 10, summary: 'TEST 中文短评', details: '', tags: ['咖啡'], cover: null, gallery: [], visitedAt: null, updatedAt: '2026-09-18', published: true }

test('authoring format rejects legacy fields and duplicate IDs or ranks across cities', () => {
  const { city, ...entry } = place
  const config = { ...site, cityColors: { 上海: '#b95b43', 广州: '#507ba2' } }
  assert.deepEqual(validateData(config, { 上海: [entry], 广州: [] }, []), [])
  for (const key of ['city', 'pros', 'cons', 'coverAlt', 'isDemo', 'video']) {
    assert.ok(validateData(config, { 上海: [{ ...entry, [key]: null }] }, []).some(e => e.includes(key)))
  }
  for (const invalid of [[], null, { 上海: {} }, { ' 上海': [entry] }, { 上海: [null] }]) assert.ok(validateData(config, invalid, []).length)
  const errors = validateData(config, { 上海: [entry], 广州: [entry] }, [])
  assert.ok(errors.some(e => e.includes('重复 ID')))
  assert.ok(errors.some(e => e.includes('order 不得重复')))
})

test('text addresses are retained and can open address-based navigation without coordinates', () => {
  const p = { ...place, location: '上海市黄浦区南京东路800号第一百货C馆' }
  assert.deepEqual(validateEntries(site, [p], []), [])
  assert.equal(placeAddress(p), p.location)
  assert.equal(hasCoordinates(p), false)
  const url = new URL(navigationUrl(p, true))
  assert.equal(url.origin, 'https://uri.amap.com')
  assert.equal(url.pathname, '/search')
  assert.equal(url.searchParams.get('keyword'), p.location)
  assert.equal(url.searchParams.get('callnative'), '1')
})
function validateEntries(site, places, updates, imageExists) {
  const groups = Object.fromEntries([...new Set(places.map(p => p.city))].map(city => [city, places.filter(p => p.city === city).map(({city, ...p}) => p)]))
  return validateData(site, groups, updates, imageExists)
}

test('empty board is valid, and real dates are checked', () => {
  assert.deepEqual(validateEntries(site, [], []), [])
  assert.equal(validDate('2026-02-30'), false)
  assert.equal(validDate('2024-02-29'), true)
  assert.equal(validDate('2026-09', true), true)
  assert.equal(validDate('2026-13', true), false)
})
test('bad data blocks publication with file and ID', () => {
  const errors = validateEntries(site, [place, { ...place, tier: 'wrong', cover: 'images/places/missing.webp' }], [], () => false)
  for (const expected of ['重复 ID', '非法档位', '图片文件不存在']) assert.ok(errors.some(e => e.includes('places.json [test-place]') && e.includes(expected)))
  assert.ok(validateEntries(site, [{ ...place, cover: 'images/places/../../secret.png' }], []).some(e => e.includes('相对图片路径')))
})
test('update references and tier transitions must be valid', () => {
  const update = { id: 'change-1', placeId: place.id, date: '2026-09-18', type: 'tier-change', fromTier: 'top', toTier: 'top', note: '测试' }
  assert.ok(validateEntries(site, [place], [update]).some(e => e.includes('前后档位')))
  assert.ok(validateEntries(site, [], [{ ...update, placeId: 'missing' }]).some(e => e.includes('不存在')))
  assert.ok(validateEntries(site, [place], [{ ...update, toTier: 'hang', date: '2026-09-19' }]).some(e => e.includes('updatedAt')))
})
test('search composes with city and preserves published tier/order', () => {
  const others = [{ ...place, id: 'hidden', published: false }, { ...place, id: 'second', order: 20 }, { ...place, id: 'first', tier: 'hang' }, { ...place, id: 'elsewhere', city: '别处' }]
  assert.deepEqual(filterPlaces([place, ...others], '测试城市', '  test  ').map(p => p.id), ['first', 'test-place', 'second'])
  assert.equal(filterPlaces([place], '', '咖啡').length, 1)
  assert.equal(filterPlaces([place], '别处', 'TEST').length, 0)
})
test('hidden updates stay hidden and future records are not marked recent', () => {
  const updates = [{ id: 'a', placeId: 'test-place', date: '2026-09-18', type: 'added', note: '测试' }, { id: 'b', placeId: 'hidden', date: '2026-09-18', type: 'added', note: '不公开' }]
  assert.equal(publicUpdates(updates, [place]).length, 1)
  assert.equal(recentBadge(place.id, updates, 30, new Date('2026-09-19').getTime()), '新增')
  assert.equal(recentBadge(place.id, updates, 30, new Date('2026-09-01').getTime()), '')
})
test('city colors are fixed, unique and required for published cities', () => {
  assert.deepEqual(validateEntries(site, [place], []), [])
  assert.equal(cityColor('测试城市', site.cityColors), '#b95b43')
  assert.ok(validateEntries({ ...site, cityColors: {} }, [place], []).some(e => e.includes('cityColors')))
  assert.ok(validateEntries({ ...site, cityColors: { a: '#aabbcc', b: '#AABBCC' } }, [], []).some(e => e.includes('相同颜色')))
})
test('location uses explicit WGS84 and navigation preserves lon/lat order', () => {
  const p = { ...place, location: { lat: 30, lng: 120, coordinateSystem: 'wgs84', address: '测试' } }
  assert.deepEqual(validateEntries(site, [p], []), [])
  const url = new URL(navigationUrl(p, true))
  assert.equal(url.searchParams.get('position'), '120,30')
  assert.equal(url.searchParams.get('coordinate'), 'wgs84')
  assert.equal(navigationUrl(place), null)
  assert.ok(validateEntries(site, [{ ...p, location: { ...p.location, lat: 91 } }], []).some(e => e.includes('WGS84')))
  assert.ok(validateEntries(site, [{ ...p, location: { ...p.location, coordinateSystem: 'gcj02' } }], []).some(e => e.includes('WGS84')))
})

test('WGS84 coordinates are converted locally to Baidu BD-09', () => {
  const point = wgs84ToBd09(121.470895, 31.237372)
  assert.ok(Math.abs(point.lng - 121.48197256) < 0.000002)
  assert.ok(Math.abs(point.lat - 31.24134309) < 0.000002)
})

test('coordinate-backed places never call Baidu online conversion', async () => {
  let constructed = 0
  const api = {
    Point: class {
      constructor(lng, lat) { this.lng = lng; this.lat = lat; constructed++ }
    },
    Convertor: class { constructor() { throw new Error('online conversion must not be used') } },
    Geocoder: class { constructor() { throw new Error('online geocoding must not be used') } },
  }
  const result = await pointForPlace(api, { ...place, location: { lat: 31.237372, lng: 121.470895, coordinateSystem: 'wgs84', address: '测试' } })
  assert.equal(constructed, 1)
  assert.ok(Math.abs(result.lng - 121.48197256) < 0.000002)
  assert.ok(Math.abs(result.lat - 31.24134309) < 0.000002)
})
