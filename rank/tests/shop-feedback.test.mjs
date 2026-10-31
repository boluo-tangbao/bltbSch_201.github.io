import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveShopFeedback, shopFeedbackBody, shopFeedbackUrl } from '../src/utils/shopFeedback.ts'

const place = { id: 'test-place', name: '测试商圈', city: '上海', published: true }
const shop = { name: 'A&B 谷店 #1', floor: '负一层', status: 'listed' }
const directories = { [place.id]: { shops: [shop] } }

test('shop feedback links encode names and resolve their place and floor from published data', () => {
  for (const base of ['/rank/', '/bltbSch_201.github.io/rank/']) {
    const url = new URL(shopFeedbackUrl(base, place.id, shop.name), 'https://example.com')
    assert.equal(url.pathname, base + 'qa/')
    assert.equal(url.hash, '#suggest-title')
    assert.deepEqual(resolveShopFeedback(url.search, [place], directories), {
      placeId: place.id, placeName: place.name, city: place.city, shopName: shop.name, floor: shop.floor,
    })
  }
})

test('invalid, hidden and mismatched feedback links cannot introduce made up store context', () => {
  const search = new URL(shopFeedbackUrl('/rank/', place.id, shop.name), 'https://example.com').search
  assert.equal(resolveShopFeedback(search, [{ ...place, published: false }], directories), undefined)
  for (const query of ['', '?place=missing&shop=anything', '?place=test-place&shop=unknown', '?place=test-place&shop=%3Cscript%3E']) {
    assert.equal(resolveShopFeedback(query, [place], directories), undefined)
  }
  assert.equal(resolveShopFeedback(search, [place], { [place.id]: { shops: [{ ...shop, status: 'closed' }] } }), undefined)
  assert.ok(resolveShopFeedback(search, [place], { [place.id]: { shops: [{ ...shop, status: 'closed', inactive: { reason: 'renovation' } }] } }))
})

test('feedback retains original floor and source page while readers describe a change', () => {
  const context = { placeId: place.id, placeName: place.name, city: place.city, shopName: shop.name, floor: shop.floor }
  const body = shopFeedbackBody(context, '楼层变化', 'https://example.com/rank/guide/#/place/test-place', '现已搬到三层，实地观察日期待补。')
  assert.match(body, /当前记录位置：负一层/)
  assert.match(body, /变化类型：楼层变化/)
  assert.match(body, /页面链接：https:\/\/example.com\/rank\/guide\/#\/place\/test-place/)
  assert.match(body, /现已搬到三层/)
  assert.match(shopFeedbackBody({ ...context, floor: undefined }, '其他信息', 'https://example.com'), /当前记录位置：未注明/)
})
