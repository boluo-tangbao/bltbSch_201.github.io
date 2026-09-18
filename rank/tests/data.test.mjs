import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { validateData, validDate } from '../scripts/validate-data.mjs'
import { filterPlaces, publicUpdates, recentBadge } from '../src/utils/model.ts'

const site = JSON.parse(readFileSync(new URL('../src/data/site.json', import.meta.url), 'utf8'))
const place = { id: 'test-place', name: '虚构测试店', city: '测试城市', tier: 'top', order: 10, summary: 'TEST 中文短评', details: '', tags: ['咖啡'], cover: null, coverAlt: '', gallery: [], visitedAt: null, updatedAt: '2026-09-18', published: true, isDemo: true }
test('empty board is valid, and real dates are checked', () => {
  assert.deepEqual(validateData(site, [], []), [])
  assert.equal(validDate('2026-02-30'), false)
  assert.equal(validDate('2024-02-29'), true)
  assert.equal(validDate('2026-09', true), true)
  assert.equal(validDate('2026-13', true), false)
})
test('bad data blocks publication with file and ID', () => {
  const errors = validateData(site, [place, { ...place, tier: 'wrong', cover: 'images/places/missing.webp' }], [], () => false)
  for (const expected of ['重复 ID', '非法档位', '图片文件不存在']) assert.ok(errors.some(e => e.includes('places.json [test-place]') && e.includes(expected)))
  assert.ok(validateData(site, [{ ...place, cover: 'images/places/../../secret.png' }], []).some(e => e.includes('相对图片路径')))
})
test('update references and tier transitions must be valid', () => {
  const update = { id: 'change-1', placeId: place.id, date: '2026-09-18', type: 'tier-change', fromTier: 'top', toTier: 'top', note: '测试' }
  assert.ok(validateData(site, [place], [update]).some(e => e.includes('前后档位')))
  assert.ok(validateData(site, [], [{ ...update, placeId: 'missing' }]).some(e => e.includes('不存在')))
  assert.ok(validateData(site, [place], [{ ...update, toTier: 'hang', date: '2026-09-19' }]).some(e => e.includes('updatedAt')))
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
