import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { validateShopDirectories } from '../scripts/validate-data.mjs'

const directories = JSON.parse(readFileSync(new URL('../src/data/shop-directories.json', import.meta.url), 'utf8'))
const groups = JSON.parse(readFileSync(new URL('../src/data/places.json', import.meta.url), 'utf8'))
const places = Object.values(groups).flat()
const fixture = () => ({ test: { area: '东区', checkedAt: '2026-10-05', shops: [{ name: '测试店', floor: '负二层', status: 'unverified', note: '保留旧线索', sources: [{ label: '来源', url: 'https://example.com/source' }] }] } })

test('published shop directories reference actual places and carry source evidence', () => {
  assert.deepEqual(validateShopDirectories(directories, places), [])
})
test('unknown operating status does not prevent attaching a verified store account', () => {
  const data = fixture()
  data.test.shops[0].accounts = [{ platform: 'xiaohongshu', name: '测试店', url: 'https://www.xiaohongshu.com/user/profile/123abc', scope: 'store' }]
  assert.deepEqual(validateShopDirectories(data, [{ id: 'test' }]), [])
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
