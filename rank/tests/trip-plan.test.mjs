import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readTripEntries, resolveTripStops, tripEntryKey, tripPlanHtml, tripPlanText } from '../src/utils/tripPlan.ts'

const place = { id: 'area', name: '测试商场', city: '上海', published: true, location: '测试路1号' }
const shop = { name: 'A&B 店 <script>', floor: '负一层', status: 'listed', operatingConfirmation: 'official-listing' }
const theme = { ...shop, name: '限时主题', limited: { scope: 'theme', period: '10月29日—10月31日', startsOn: '2026-10-29', endsOn: '2026-10-31' } }
const directories = { area: { checkedAt: '2026-10-29', shops: [shop, theme, { ...shop, name: '待核店', operatingConfirmation: undefined }] } }
const selected = [{ placeId: place.id, shopName: shop.name }, { placeId: place.id }]

test('temporary selections discard corrupt data and deduplicate without mixing a place with one of its shops', () => {
  for (const input of [null, 'bad json', '{}', '[null,3,{}, {"placeId":4}]']) assert.deepEqual(readTripEntries(input), [])
  assert.deepEqual(readTripEntries(JSON.stringify([...selected, selected[0]])), selected)
  assert.notEqual(tripEntryKey(selected[0]), tripEntryKey(selected[1]))
  assert.deepEqual(readTripEntries('[{"placeId":"area","shopName":""}]'), [])
})

test('selected stops preserve manual order, original floors and missing addresses and exclude unavailable entries', () => {
  const entries = [...selected, { placeId: 'hidden' }, { placeId: 'missing' }, { placeId: 'area', shopName: '待核店' }]
  const stops = resolveTripStops(entries, [place, { ...place, id: 'hidden', published: false }], directories, '2026-10-29')
  assert.deepEqual(stops.map(stop => stop.name), [shop.name, place.name])
  assert.equal(stops[0].floor, '负一层')
  assert.equal(stops[0].checkedAt, '2026-10-29')
  assert.equal(stops[0].address, '测试路1号')
  const unknownAddress = resolveTripStops([{ placeId: 'area' }], [{ ...place, location: null }], directories)
  assert.equal(unknownAddress[0].navigation, null)
  assert.match(tripPlanText(unknownAddress, 'https://example.com/guide/'), /地址待补充/)
})

test('an activity leaves the trip on the day after its end while its permanent shop remains selectable', () => {
  const entries = [...selected, { placeId: 'area', shopName: theme.name }]
  assert.equal(resolveTripStops(entries, [place], directories, '2026-10-31').length, 3)
  assert.equal(resolveTripStops(entries, [place], directories, '2026-11-01').length, 2)
})

test('only chosen stops enter offline HTML and copy text, with escaped content and working encoded deep links', () => {
  const stops = resolveTripStops(selected, [place], directories, '2026-10-29')
  const guide = 'https://example.com/project/rank/guide/'
  const html = tripPlanHtml(stops, guide, '2026-10-29')
  const text = tripPlanText(stops, guide)
  assert.ok(html.indexOf('A&amp;B 店 &lt;script&gt;') < html.indexOf('<h2>测试商场</h2>'))
  assert.ok(!html.includes('<script>'))
  assert.ok(!html.includes('待核店'))
  assert.match(html, /负一层/)
  assert.match(html, /导出日期 2026-10-29/)
  assert.match(text, /1\. A&B 店 <script>/)
  assert.match(text, /2\. 测试商场/)
  assert.ok(text.includes('find=A%26B+'))
})
