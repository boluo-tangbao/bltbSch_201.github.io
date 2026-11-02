import { test } from 'node:test'
import assert from 'node:assert/strict'
import { limitedCountdown, visitNotices } from '../src/utils/visitNotices.ts'

const host = { name: '常设店', status: 'listed', operatingConfirmation: 'official-listing', note: '', sources: [] }
const event = (name, dates) => ({ ...host, name, limited: { scope: 'theme', period: '原文档期', ...dates }, hostShop: host.name })

test('countdowns include the final day and span months and years without guessing prose dates', () => {
  assert.equal(limitedCountdown(event('末日', { endsOn: '2026-12-31' }), '2026-12-31').label, '今天最后一天')
  assert.equal(limitedCountdown(event('跨年', { endsOn: '2027-01-01' }), '2026-12-31').label, '还剩2天（含今天）')
  assert.equal(limitedCountdown(event('开始', { startsOn: '2027-01-07' }), '2026-12-31').label, '7天后开始')
  assert.equal(limitedCountdown(event('今天开始', { startsOn: '2026-12-31' }), '2026-12-31').label, '今天开始')
  assert.equal(limitedCountdown(event('单日', { startsOn: '2026-12-31', endsOn: '2026-12-31' }), '2026-12-31').label, '今天最后一天')
  assert.equal(limitedCountdown(event('远期', { startsOn: '2027-01-08' }), '2026-12-31'), undefined)
  assert.equal(limitedCountdown(event('过期', { endsOn: '2026-12-30' }), '2026-12-31'), undefined)
  assert.equal(limitedCountdown(event('未知', {}), '2026-12-31'), undefined)
})

test('reminders preserve confirmations, historical distinctions and original evidence dates', () => {
  const shops = [host, event('结束', { endsOn: '2026-11-02' }), event('开始', { startsOn: '2026-11-03' }), event('未知', {}),
    event('到期', { endsOn: '2026-11-01' }), { ...event('待核', { endsOn: '2026-11-02' }), operatingConfirmation: undefined },
    ...['closed', 'relocated', 'renovation', 'unconfirmed'].map(reason => ({ ...host, name: reason, status: 'closed', inactive: { reason, history: '原历史' } })),
  ]
  const directory = { area: '测试', checkedAt: '2025-01-01', shops }
  const before = JSON.stringify(directory)
  const info = visitNotices(directory, '2026-11-02')
  assert.deepEqual([info.regular, info.ongoing, info.upcoming, info.unknown], [1, 1, 1, 1])
  assert.deepEqual(info.notices.map(n => n.name), ['结束', '开始', 'relocated', 'renovation', 'unconfirmed'])
  assert.equal(limitedCountdown(shops.find(s => s.name === '待核'), '2026-11-02'), undefined)
  assert.equal(JSON.stringify(directory), before)
  const expired = visitNotices(directory, '2026-11-04')
  assert.equal(expired.regular, 1)
  assert.ok(!expired.notices.some(n => n.name === '结束'))
})
