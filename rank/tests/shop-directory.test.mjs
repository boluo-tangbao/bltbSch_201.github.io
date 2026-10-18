import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { validateShopDirectories } from '../scripts/validate-data.mjs'
import { shopDisplayStatus, shopDirectoryGroups, sourcePredatesVisit } from '../src/utils/shopDirectory.ts'

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

test('explicit official listings confirm operation without social accounts; closure still wins', () => {
  const shop = fixture().test.shops[0]
  shop.operatingConfirmation = 'official-listing'
  assert.equal(shopDisplayStatus(shop), 'open')
  assert.deepEqual(validateShopDirectories({ test: { ...fixture().test, shops: [shop] } }, [{ id: 'test' }]), [])
  shop.status = 'closed'
  assert.equal(shopDisplayStatus(shop), 'closed')
  shop.operatingConfirmation = 'guessed'
  assert.ok(validateShopDirectories({ test: { ...fixture().test, shops: [shop] } }, [{ id: 'test' }]).some(error => error.includes('营业确认依据无效')))
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

test('limited stores and themes have their own groups without promoting unverified or closed records', () => {
  const shop = fixture().test.shops[0]
  const regular = { ...shop, name: '常规店', operatingConfirmation: 'official-listing' }
  const temporary = { ...regular, name: '慢闪店', limited: { scope: 'store', period: '9月—10月（原文未标年份）' } }
  const theme = { ...regular, name: '本期主题', limited: { scope: 'theme', period: '2026-10-01 至 2026-11-01' } }
  const uncertain = { ...shop, name: '限时线索', limited: { scope: 'store', period: '档期待核实' } }
  const closed = { ...theme, name: '已结束主题', status: 'closed' }
  const groups = shopDirectoryGroups([regular, temporary, theme, uncertain, closed, shop])
  assert.deepEqual(groups.regular.open.map(s => s.name), ['常规店'])
  assert.deepEqual(groups.regular.evidence.map(s => s.name), ['测试店'])
  assert.deepEqual(groups.limited.open.map(s => s.name), ['慢闪店', '本期主题'])
  assert.deepEqual(groups.limited.evidence.map(s => s.name), ['限时线索'])
  assert.equal(shopDirectoryGroups([{ ...regular, note: '每日10:00—22:00，往期促销已结束' }]).limited.open.length, 0)
})

test('limited periods preserve unknown years and reject impossible dates, reversed ranges and ended active themes', () => {
  const validate = limited => {
    const data = fixture()
    data.test.shops[0].limited = limited
    return validateShopDirectories(data, [{ id: 'test' }])
  }
  assert.deepEqual(validate({ scope: 'store', period: '9月30日—10月31日（年份未标）' }), [])
  assert.deepEqual(validate({ scope: 'theme', period: '截至2026-10-05', endsOn: '2026-10-05' }), [])
  for (const limited of [
    { scope: 'guessed', period: '未知' },
    { scope: 'store', period: '' },
    { scope: 'store', period: '未知', startsOn: '2026-02-30' },
    { scope: 'theme', period: '倒置', startsOn: '2026-11-01', endsOn: '2026-10-01' },
    { scope: 'theme', period: '已结束', endsOn: '2026-10-04' },
  ]) assert.ok(validate(limited).length)
  const data = fixture()
  data.test.shops[0].status = 'closed'
  data.test.shops[0].limited = { scope: 'theme', period: '截至2026-10-04', endsOn: '2026-10-04' }
  assert.deepEqual(validateShopDirectories(data, [{ id: 'test' }]), [])
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
