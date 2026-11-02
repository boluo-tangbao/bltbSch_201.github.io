import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { shopSourceUrl } from '../src/utils/shopSourceUrl.ts'

test('legacy evidence photo URLs use the committed original route; other sources stay unchanged', () => {
  const url = 'https://boluo-tangbao.github.io/bltbSch_201.github.io/rank/images/places/广州/门头%20%23.jpg'
  const links = { 'images/places/广州/门头 #.jpg': 'https://github.com/example/repo/blob/revision/photo.jpg' }
  assert.equal(shopSourceUrl(url, links), links['images/places/广州/门头 #.jpg'])
  assert.equal(shopSourceUrl(url, {}), url)
  for (const other of ['https://example.com/bltbSch_201.github.io/rank/images/places/广州/门头%20%23.jpg', 'https://www.douyin.com/note/123', 'https://boluo-tangbao.github.io/other/photo.jpg', 'invalid', url + '%ZZ']) {
    assert.equal(shopSourceUrl(other, links), other)
  }
})

test('the screenshot evidence remains a dated author photograph, with its original source text intact', () => {
  const data = JSON.parse(readFileSync(new URL('../src/data/shop-directories.json', import.meta.url)))
  const source = data['guangzhou-shop-002'].shops.find(shop => shop.name === '晶臣玩物').sources.find(source => source.label === '作者本店门头与商品实拍')
  assert.ok(source.url.endsWith('QQ%E5%9B%BE%E7%89%8720260124193853.jpg'))
  assert.equal(source.dateLabel, '作者到访／实拍2026-01-21，非帖子发表日')
})
