import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { validateShopDirectories } from '../scripts/validate-data.mjs'
import { mergeShopSources, shopDisplayStatus, shopStatusLabel, shopDirectoryGroups, sourcePredatesVisit, pendingShopGroups, shopHistorySource } from '../src/utils/shopDirectory.ts'

const directories = JSON.parse(readFileSync(new URL('../src/data/shop-directories.json', import.meta.url), 'utf8'))
const groups = JSON.parse(readFileSync(new URL('../src/data/places.json', import.meta.url), 'utf8'))
const places = Object.values(groups).flat()
const fixture = () => ({ test: { area: '东区', checkedAt: '2026-10-05', shops: [{ name: '测试店', floor: '负二层', status: 'unverified', note: '保留旧线索', sources: [{ label: '来源', url: 'https://example.com/source' }] }] } })

test('possible-operation wording keeps evidence unconfirmed and cannot override verified or closed status', () => {
  const data = fixture(), shop = data.test.shops[0]
  assert.equal(shopStatusLabel(shop), '待验证')
  shop.evidenceLabel = '可能营业'
  assert.equal(shopStatusLabel(shop), '可能营业')
  assert.equal(shopDisplayStatus(shop), 'evidence')
  assert.equal(shopDirectoryGroups([shop]).regular.open.length, 0)
  assert.deepEqual(validateShopDirectories(data, [{ id: 'test' }]), [])
  shop.operatingConfirmation = 'official-listing'
  assert.equal(shopStatusLabel(shop), '营业中')
  assert.ok(validateShopDirectories(data, [{ id: 'test' }]).some(e => e.includes('可能营业标签')))
  shop.limited = { scope: 'store', period: '档期待公布' }
  assert.equal(shopStatusLabel(shop), '进行中')
  shop.status = 'closed'
  assert.equal(shopStatusLabel(shop), '已公布闭店')
  shop.inactive = { reason: 'renovation', history: '装修暂停' }
  assert.equal(shopStatusLabel(shop), '装修停业')
})

test('directory notices are optional and must contain text', () => {
  const data = fixture()
  data.test.notice = '部分数据参考META ZX'
  assert.deepEqual(validateShopDirectories(data, [{ id: 'test' }]), [])
  for (const notice of ['', ' ', null, 123]) {
    data.test.notice = notice
    assert.ok(validateShopDirectories(data, [{ id: 'test' }]).some(e => e.includes('店单提示')))
  }
})

test('pending history is explicitly grouped, keeps original source time, and never confirms operation', () => {
  const shop = fixture().test.shops[0]
  shop.sources[0].dateLabel = '编辑于2025-09-03；读取2026-10-05，非原发表日'
  const history = { ...shop, name: '历史线索', pendingReview: { category: 'history', sourceUrl: shop.sources[0].url } }
  const verification = { ...shop, name: '身份冲突', pendingReview: { category: 'verification' } }
  assert.deepEqual(pendingShopGroups([verification, history, shop]).map(g => [g.key, g.shops.map(s => s.name)]), [
    ['history', ['历史线索']], ['verification', ['身份冲突', '测试店']],
  ])
  assert.equal(shopHistorySource(history).time, '编辑于2025-09-03')
  assert.equal(shopHistorySource(shop), undefined)
  assert.equal(shopDisplayStatus(history), 'evidence')
  delete history.sources[0].dateLabel
  assert.equal(shopHistorySource(history).time, '原文日期未注明')
})

test('history groups reject missing source references and cannot be attached to confirmed or closed shops', () => {
  const data = fixture(), shop = data.test.shops[0]
  shop.pendingReview = { category: 'history', sourceUrl: shop.sources[0].url }
  const validate = () => validateShopDirectories(data, [{ id: 'test' }])
  assert.deepEqual(validate(), [])
  shop.pendingReview.sourceUrl = 'https://example.com/unread'
  assert.ok(validate().some(e => e.includes('引用已有')))
  shop.pendingReview.sourceUrl = shop.sources[0].url
  shop.operatingConfirmation = 'official-listing'
  assert.ok(validate().some(e => e.includes('仅适用于')))
  delete shop.operatingConfirmation
  shop.status = 'closed'
  assert.ok(validate().some(e => e.includes('仅适用于')))
})

test('shared evidence URLs appear once while retaining roles, dates and independent merchandise sources', () => {
  const source = { label: '官网门店目录', url: 'https://example.com/store', dateLabel: '2026-10-20读取' }
  const shop = { sources: [source, source], kindSources: [source, { ...source, dateLabel: '2026-10-18读取' }, { label: '商品说明', url: 'https://example.com/products' }] }
  const before = JSON.stringify(shop)
  assert.deepEqual(mergeShopSources(shop), [
    { url: source.url, labels: [source.label], dates: ['2026-10-20读取', '2026-10-18读取'], roles: ['营业／位置', '主营'] },
    { url: 'https://example.com/products', labels: ['商品说明'], dates: [], roles: ['主营'] },
  ])
  assert.equal(JSON.stringify(shop), before)
})

test('only verified account entries are shown as open; closed notices override accounts', () => {
  const shop = fixture().test.shops[0]
  shop.status = 'recent'
  assert.equal(shopDisplayStatus(shop), 'evidence')
  shop.accounts = [{ platform: 'xiaohongshu', name: '测试店', url: 'https://www.xiaohongshu.com/user/profile/123abc', scope: 'store' }]
  assert.equal(shopDisplayStatus(shop), 'open')
  shop.status = 'closed'
  assert.equal(shopDisplayStatus(shop), 'closed')
})

test('user-confirmed text sources retain provenance without inventing URLs or publication dates', () => {
  const data = fixture(), shop = data.test.shops[0]
  shop.sources = [{ label: '商场店单用户转录', providedBy: 'user', dateLabel: '用户2026-10-05确认；原发表日未知' }]
  const validate = () => validateShopDirectories(data, [{ id: 'test' }])
  assert.deepEqual(validate(), [])
  assert.equal(shopDisplayStatus(shop), 'evidence')
  assert.equal(sourcePredatesVisit(shop.sources, '2026-10-06'), false)
  delete shop.sources[0].providedBy
  assert.ok(validate().some(e => e.includes('提供者及确认时间')))
  shop.sources[0].providedBy = 'user'
  delete shop.sources[0].dateLabel
  assert.ok(validate().some(e => e.includes('提供者及确认时间')))
  shop.sources[0].dateLabel = '用户2026-10-05确认'
  for (const invalidUrl of ['', 'http://example.com', 'javascript:alert(1)']) {
    shop.sources[0].url = invalidUrl
    assert.ok(validate().some(e => e.includes('HTTPS')))
  }
})

test('distinct text sources do not collapse together and matching evidence keeps both roles', () => {
  const source = { label: '用户转录商场名单', providedBy: 'user', dateLabel: '用户2026-10-05确认' }
  const result = mergeShopSources({ sources: [source, { ...source, label: '用户提供的原店名说明' }], kindSources: [source] })
  assert.equal(result.length, 2)
  assert.deepEqual(result[0].roles, ['营业／位置', '主营'])
  assert.deepEqual(result[1].labels, ['用户提供的原店名说明'])
  assert.equal(result[0].url, undefined)
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

test('store and hosted theme remain separate, and theme expiry preserves the permanent store', () => {
  const data = fixture()
  const host = data.test.shops[0]
  host.operatingConfirmation = 'official-listing'
  host.description = '角色周边与主题饮品门店。'
  const theme = { ...host, name: '本期主题', hostShop: host.name, limited: { scope: 'theme', period: '至10月5日', endsOn: '2026-10-05' } }
  data.test.shops.push(theme)
  assert.deepEqual(validateShopDirectories(data, [{ id: 'test' }]), [])
  assert.deepEqual(shopDirectoryGroups(data.test.shops).regular.open.map(s => s.name), [host.name])
  assert.deepEqual(shopDirectoryGroups(data.test.shops).limited.open.map(s => s.name), [theme.name])
  data.test.checkedAt = '2026-10-06'
  assert.ok(validateShopDirectories(data, [{ id: 'test' }]).some(e => e.includes('已结束')))
  theme.status = 'closed'
  assert.deepEqual(validateShopDirectories(data, [{ id: 'test' }]), [])
  const result = shopDirectoryGroups(data.test.shops)
  assert.equal(result.regular.open.length, 1)
  assert.equal(result.limited.open.length + result.inactive.length, 0)
})

test('hosted themes must reference a distinct permanent store in the same directory', () => {
  const data = fixture()
  const host = data.test.shops[0]
  const theme = { ...host, name: '主题', hostShop: host.name, limited: { scope: 'theme', period: '档期待核实' } }
  data.test.shops.push(theme)
  for (const hostShop of ['', '异地店', theme.name]) {
    theme.hostShop = hostShop
    assert.ok(validateShopDirectories(data, [{ id: 'test' }]).some(e => e.includes('关联本商圈')))
  }
  theme.hostShop = host.name
  theme.limited.scope = 'store'
  assert.ok(validateShopDirectories(data, [{ id: 'test' }]).some(e => e.includes('关联本商圈')))
  theme.limited.scope = 'theme'
  host.status = 'closed'
  assert.ok(validateShopDirectories(data, [{ id: 'test' }]).some(e => e.includes('所在店铺已停业')))
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


test('inactive histories distinguish external relocation from current stores and floor moves', () => {
  const base = fixture().test.shops[0]
  const account = { platform: 'xiaohongshu', name: '门店本人', url: 'https://www.xiaohongshu.com/user/profile/123abc', scope: 'store' }
  const stopped = { ...base, name: '原六层店', status: 'closed', accounts: [account], inactive: { reason: 'renovation', history: '停业日待核' } }
  const relocated = { ...base, name: '已迁五层店', floor: '五层', status: 'recent', accounts: [account], note: '旧六层停业后迁到五层复业' }
  const hidden = { ...base, name: '仅有旧线索', status: 'closed' }
  const endedTheme = { ...hidden, name: '已结束主题', limited: { scope: 'theme', period: '往期主题' } }
  const movedOut = { ...stopped, name: '迁往其他商场的旧店', inactive: { reason: 'relocated', history: '旧址营业至2026.10.01，现已迁往其他商场' } }
  const result = shopDirectoryGroups([stopped, movedOut, relocated, hidden, endedTheme])
  assert.deepEqual(result.inactive.map(s => s.name), ['原六层店', '迁往其他商场的旧店'])
  assert.deepEqual(result.regular.open.map(s => s.name), ['已迁五层店'])
  assert.equal(result.regular.evidence.length + result.limited.open.length + result.limited.evidence.length, 0)
  assert.equal(shopDisplayStatus(stopped), 'closed')
  assert.equal(stopped.accounts.length, 1)
})

test('inactive records require history and a non-operating status, and cannot turn theme expiry into closure', () => {
  const validate = (inactive, status = 'closed', limited) => {
    const data = fixture()
    Object.assign(data.test.shops[0], { status, inactive, ...(limited ? { limited } : {}) })
    return validateShopDirectories(data, [{ id: 'test' }])
  }
  assert.deepEqual(validate({ reason: 'closed', history: '～2026.10.01' }), [])
  assert.deepEqual(validate({ reason: 'relocated', history: '旧址营业至2026.10.01，已迁往其他商场' }), [])
  assert.deepEqual(validate({ reason: 'unconfirmed', history: '停业日待核；原位置六层' }), [])
  for (const value of [null, {}, { reason: 'moved', history: '已搬家' }, { reason: 'closed', history: '' }]) assert.ok(validate(value).length)
  assert.ok(validate({ reason: 'closed', history: '～2026.10.01' }, 'recent').some(e => e.includes('当前营业列表分开')))
  assert.ok(validate({ reason: 'closed', history: '主题结束' }, 'closed', { scope: 'theme', period: '往期主题' }).some(e => e.includes('主题结束不能')))
})
