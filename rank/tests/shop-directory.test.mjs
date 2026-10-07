import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { validateShopDirectories } from '../scripts/validate-data.mjs'
import { shopDisplayStatus, sourcePredatesVisit } from '../src/utils/shopDirectory.ts'

const directories = JSON.parse(readFileSync(new URL('../src/data/shop-directories.json', import.meta.url), 'utf8'))
const groups = JSON.parse(readFileSync(new URL('../src/data/places.json', import.meta.url), 'utf8'))
const places = Object.values(groups).flat()
const fixture = () => ({ test: { area: '东区', checkedAt: '2026-10-05', shops: [{ name: '测试店', floor: '负二层', status: 'unverified', note: '保留旧线索', sources: [{ label: '来源', url: 'https://example.com/source' }] }] } })

test('only verified account entries are shown as open; closed notices override accounts', () => {
  const shop = fixture().test.shops[0]
  shop.status = 'recent'
  assert.equal(shopDisplayStatus(shop), 'evidence')
  shop.accounts = [{ platform: 'xiaohongshu', name: '测试店', url: 'https://www.xiaohongshu.com/user/profile/123abc', scope: 'store' }]
  assert.equal(shopDisplayStatus(shop), 'open')
  shop.status = 'closed'
  assert.equal(shopDisplayStatus(shop), 'closed')
})

test('author visit annotation uses latest evidence and excludes equal, newer or unknown dates', () => {
  const source = date => ({ label: '探店', url: 'https://example.com/post', date })
  assert.equal(sourcePredatesVisit([source('2025-09-29')], '2026-01-20'), true)
  assert.equal(sourcePredatesVisit([source('2026-01-20')], '2026-01-20'), false)
  assert.equal(sourcePredatesVisit([source('2025-09-29'), source('2026-04-10')], '2026-01-20'), false)
  assert.equal(sourcePredatesVisit([source('2025-09-29')], null), false)
  assert.equal(sourcePredatesVisit([source(undefined)], '2026-01-20'), false)
  assert.equal(sourcePredatesVisit([source('2025-09-29'), { label: '国庆帖', url: 'https://example.com/new', dateLabel: '2026 年国庆前' }], '2026-01-20'), false)
  assert.equal(sourcePredatesVisit([source('2025-09-29'), { label: '官方账号', url: 'https://www.xiaohongshu.com/user/profile/123abc' }], '2026-01-20'), true)
})

test('published shop directories reference actual places and carry source evidence', () => {
  assert.deepEqual(validateShopDirectories(directories, places), [])
})

test('business evidence is allowed without a social account and does not replace operating evidence', () => {
  const data = fixture()
  const shop = data.test.shops[0]
  shop.sources[0].date = '2025-09-29'
  shop.kind = '日谷与寄售周边'
  shop.kindSources = [{ label: '品牌品类', url: 'https://example.com/products' }]
  assert.deepEqual(validateShopDirectories(data, [{ id: 'test' }]), [])
  assert.equal(sourcePredatesVisit(shop.sources, '2026-01-20'), true)
  shop.kindSources[0].url = 'javascript:alert(1)'
  assert.ok(validateShopDirectories(data, [{ id: 'test' }]).some(error => error.includes('主营依据')))
})
test('unknown operating status does not prevent attaching a verified store account', () => {
  const data = fixture()
  data.test.shops[0].accounts = [{ platform: 'xiaohongshu', name: '测试店', url: 'https://www.xiaohongshu.com/user/profile/123abc', scope: 'store' }]
  assert.deepEqual(validateShopDirectories(data, [{ id: 'test' }]), [])
})

test('allow omitted floors and source time ranges without inventing exact dates', () => {
  const data = fixture()
  const shop = data.test.shops[0]
  delete shop.floor
  shop.sources[0].dateLabel = '2026 年国庆前'
  assert.deepEqual(validateShopDirectories(data, [{ id: 'test' }]), [])
  shop.floor = ''
  assert.ok(validateShopDirectories(data, [{ id: 'test' }]).some(error => error.includes('未知楼层')))
  delete shop.floor
  shop.sources[0].date = '2026-10-01'
  assert.ok(validateShopDirectories(data, [{ id: 'test' }]).some(error => error.includes('不能与 date 同时填写')))
})
test('reject unsupported accounts, spoofed platform URLs, missing sources and duplicate shops', () => {
  for (const url of ['javascript:alert(1)', 'https://www.xiaohongshu.com.evil.test/user/profile/123abc', 'https://www.xiaohongshu.com/search_result?keyword=店名']) {
    const data = fixture()
    data.test.shops[0].accounts = [{ platform: 'xiaohongshu', name: '测试店', url, scope: 'store' }]
    assert.ok(validateShopDirectories(data, [{ id: 'test' }]).some(error => error.includes('账号只能')))
  }
  const data = fixture()
  data.test.shops[0].sources = []
  data.test.shops.push({ ...data.test.shops[0] })
  const errors = validateShopDirectories(data, [{ id: 'test' }])
  assert.ok(errors.some(error => error.includes('店名重复')))
  assert.ok(errors.some(error => error.includes('缺少核对依据')))
  assert.ok(validateShopDirectories(fixture(), []).some(error => error.includes('不存在的地点')))
})
