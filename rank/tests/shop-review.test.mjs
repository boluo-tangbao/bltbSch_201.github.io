import { test } from 'node:test'
import assert from 'node:assert/strict'
import { shopReviewItems } from '../../scripts/generate-shop-review.mjs'

test('review queue distinguishes uncertain operation, historic closure, expired themes and approaching dates without mutating source data', () => {
  const input = { today: '2026-11-02', places: [{ id: 'a', city: '广州', name: '测试地点', published: true }], directories: { a: { checkedAt: '2026-08-04', shops: [
    { name: '待核店', status: 'unverified', sources: [{ dateLabel: '用户确认时间待补' }] },
    { name: '闭店历史', status: 'closed', inactive: { reason: 'closed' }, sources: [] },
    { name: '装修中', status: 'closed', inactive: { reason: 'renovation' }, sources: [] },
    { name: '已结束主题', status: 'open', limited: { endsOn: '2026-11-01' }, sources: [] },
    { name: '即将结束', status: 'open', operatingConfirmation: 'official-listing', floor: '一层', limited: { endsOn: '2026-11-16' }, sources: [{ date: '2026-10-30' }] },
  ] } } }
  const snapshot = JSON.stringify(input)
  const items = shopReviewItems(input)
  assert.equal(JSON.stringify(input), snapshot)
  assert.ok(items.find(i => i.shop === '目录待核部分').reasons[0].includes('90 天'))
  assert.equal(items.find(i => i.shop === '待核店').priority, 1)
  assert.ok(items.some(i => i.shop === '装修中'))
  assert.ok(!items.some(i => ['闭店历史', '已结束主题'].includes(i.shop)))
  assert.ok(items.find(i => i.shop === '即将结束').reasons[0].includes('14 天'))
})

test('front-end confirmed operation is trusted despite old or undated evidence and old directory notices', () => {
  const input = { today: '2026-11-02', places: [{ id: 'a', city: '广州', name: '地点', published: true }], directories: { a: {
    checkedAt: '2025-01-01', notice: '阶段性结果：旧维护说明', shops: [
      { name: '官方名单确认', status: 'unverified', operatingConfirmation: 'official-listing', floor: '一层', sources: [{ label: '历史来源' }] },
      { name: '账号已确认', status: 'unverified', floor: '二层', accounts: [{ platform: 'xiaohongshu' }], sources: [{ date: '2025-01-01' }] },
      { name: '现场已确认', status: 'unverified', operatingConfirmation: 'user-confirmed', floor: '三层', sources: [] },
      { name: '已确认但档期未知', status: 'open', operatingConfirmation: 'official-listing', floor: '中庭', limited: { period: '原文档期待核' }, note: '来源时间未知', sources: [{ label: '旧来源' }] },
    ],
  } } }
  const before = JSON.stringify(input)
  assert.deepEqual(shopReviewItems(input), [])
  assert.equal(JSON.stringify(input), before)
  input.directories.a.shops.push({ name: '确需核实', status: 'unverified', sources: [{ label: '无日期线索' }] })
  const queue = shopReviewItems(input)
  assert.ok(queue.some(i => i.shop === '目录待核部分'))
  assert.ok(queue.some(i => i.shop === '确需核实' && i.reasons.some(r => r.includes('缺少日期'))))
  assert.ok(!queue.some(i => ['官方名单确认', '账号已确认', '现场已确认', '已确认但档期未知'].includes(i.shop)))
})

test('current complete shops and unpublished places do not produce invented review tasks', () => {
  const input = { today: '2026-11-02', places: [{ id: 'a', published: true }, { id: 'draft', published: false }], directories: {
    a: { checkedAt: '2026-11-02', shops: [{ name: '正常店', status: 'open', operatingConfirmation: 'official-listing', floor: '一层', sources: [{ providedBy: 'user', dateLabel: '用户确认于2026-11-01' }] }] },
    draft: { checkedAt: '2025-01-01', shops: [] },
  } }
  assert.deepEqual(shopReviewItems(input), [])
  assert.throws(() => shopReviewItems({ ...input, today: '2026-02-30' }))
})
