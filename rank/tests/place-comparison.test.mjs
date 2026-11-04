import { test } from 'node:test'
import assert from 'node:assert/strict'
import { comparisonFacts, comparisonRows } from '../src/utils/placeComparison.ts'

const place = { tier: 'hang', summary: '短评', tags: ['谷子'], location: { address: '测试路1号' }, visitedAt: null }
const shop = { name: '店铺', status: 'listed', operatingConfirmation: 'official-listing' }
const event = (startsOn, endsOn) => ({ ...shop, limited: { period: '原文档期', startsOn, endsOn } })

test('comparison counts confirmed shops and dated events without pending clues or archived records', () => {
  const directory = { checkedAt: '2026-11-01', shops: [
    shop, { ...shop, status: 'closed', inactive: { reason: 'closed' } },
    { ...shop, operatingConfirmation: undefined },
    event('2026-11-01', '2026-11-04'), event('2026-11-05', '2026-11-08'),
    event('2026-10-01', '2026-11-03'), event(undefined, undefined),
    { ...event('2026-11-01', '2026-11-09'), operatingConfirmation: undefined },
  ] }
  const before = JSON.stringify(directory)
  const facts = comparisonFacts(place, directory, '2026-11-04')
  assert.equal(facts.regular, '1 家')
  assert.equal(facts.ongoing, '1 项')
  assert.equal(facts.upcoming, '1 项')
  assert.equal('unknown' in facts, false)
  assert.equal('pending' in facts, false)
  assert.equal(comparisonRows.some(row => ['unknown', 'pending', 'address'].includes(row.key)), false)
  assert.equal(facts.checked, directory.checkedAt)
  assert.equal(facts.address, '测试路1号')
  assert.equal(JSON.stringify(directory), before)
  assert.equal(comparisonFacts(place, directory, '2026-11-05').ongoing, '1 项')
})

test('missing directories stay unknown rather than appearing as zero shops', () => {
  assert.equal(comparisonFacts(place).regular, '店单未整理')
  assert.equal(comparisonFacts(place, { shops: [] }).regular, '0 家')
  assert.equal(comparisonFacts(place).checked, '尚未核对')
})
