import { test } from 'node:test'
import assert from 'node:assert/strict'
import { limitedPhase, shopCalendarDate, shopDirectoryGroups, shopDisplayStatus, shopStatusLabel } from '../src/utils/shopDirectory.ts'
import { createPlaceSearchIndex, matchPlaces } from '../src/utils/search.ts'

const host = { name: '常设店', status: 'listed', operatingConfirmation: 'official-listing', note: '', sources: [] }
const theme = { ...host, name: '本期主题', hostShop: host.name, limited: { scope: 'theme', period: '2026年10月29日至10月31日', startsOn: '2026-10-29', endsOn: '2026-10-31' } }

test('limited periods include their first and final dates and use the China calendar across midnight', () => {
  assert.equal(shopCalendarDate(new Date('2026-10-29T15:59:59Z')), '2026-10-29')
  assert.equal(shopCalendarDate(new Date('2026-10-29T16:00:00Z')), '2026-10-30')
  for (const [today, phase, label] of [
    ['2026-10-28', 'upcoming', '即将开始'], ['2026-10-29', 'ongoing', '进行中'],
    ['2026-10-31', 'ongoing', '进行中'], ['2026-11-01', 'ended', '已结束'],
  ]) {
    assert.equal(limitedPhase(theme, today), phase)
    assert.equal(shopStatusLabel(theme, today), label)
  }
})

test('date based expiry removes only that activity from all current groups without mutating its evidence or host', () => {
  const pending = { ...theme, name: '待核主题', operatingConfirmation: undefined }
  const before = JSON.stringify([host, theme, pending])
  const current = shopDirectoryGroups([host, theme, pending], '2026-10-31')
  assert.equal(current.limited.open.length, 1)
  assert.equal(current.limited.evidence.length, 1)
  const ended = shopDirectoryGroups([host, theme, pending], '2026-11-01')
  assert.deepEqual(ended.regular.open.map(shop => shop.name), [host.name])
  assert.equal(ended.limited.open.length + ended.limited.evidence.length + ended.inactive.length, 0)
  assert.equal(shopDisplayStatus(theme, '2026-11-01'), 'closed')
  assert.equal(JSON.stringify([host, theme, pending]), before)
})

test('unknown years are not inferred from period text and future dates cannot confirm an uncertain shop', () => {
  const unknown = { ...theme, limited: { scope: 'theme', period: '9月—10月（原文未注明年份）' } }
  assert.equal(limitedPhase(unknown, '2026-11-01'), 'unknown')
  assert.equal(shopStatusLabel(unknown, '2026-11-01'), '档期见原文')
  assert.equal(shopStatusLabel({ ...theme, operatingConfirmation: undefined }, '2026-10-28'), '待验证')
  assert.equal(shopStatusLabel({ ...host, status: 'closed' }, '2026-10-29'), '已公布闭店')
  assert.equal(limitedPhase({ ...theme, limited: { scope: 'theme', period: '至10月31日', endsOn: '2026-10-31' } }, '2026-11-01'), 'ended')
  assert.equal(limitedPhase({ ...theme, limited: { scope: 'theme', period: '10月29日起', startsOn: '2026-10-29' } }, '2026-10-28'), 'upcoming')
})

test('search stops indexing expired activity names while keeping permanent shop names available', () => {
  const place = { id: 'test', name: '测试商场', city: '上海', published: true, summary: '', details: '', tags: [] }
  const directories = { test: { shops: [host, theme] } }
  const before = createPlaceSearchIndex([place], directories, '2026-10-31')
  const after = createPlaceSearchIndex([place], directories, '2026-11-01')
  assert.equal(matchPlaces(before, theme.name).size, 1)
  assert.equal(matchPlaces(after, theme.name).size, 0)
  assert.equal(matchPlaces(after, host.name).size, 1)
})
