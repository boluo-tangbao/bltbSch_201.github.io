import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createPlaceSearchIndex, matchPlaces, searchHighlights, searchTargetId, placeDetailHash, parsePlaceRoute } from '../src/utils/search.ts'
import { flattenPlaces, filterPlaces } from '../src/utils/model.ts'
import { validateData, validateShopDirectories } from '../scripts/validate-data.mjs'

const place = { id: 'test-place', name: '测试商圈', city: '上海', tier: 'npc', order: 10, published: true, summary: '介绍', details: '这里有 **HIPPIHO** 的乐器展示。', tags: ['乐器'], aliases: ['测试广场'], visitNotes: ['推荐看看 [red]吉他墙[/red]。'] }
const shop = { name: '确认店', aliases: ['OPEN SHOP'], status: 'listed', operatingConfirmation: 'official-listing', note: '核实记录', sources: [{ label: '官方店单', url: 'https://example.com/source' }] }
const directory = { area: '测试商圈', checkedAt: '2026-10-05', shops: [shop] }

test('search handles aliases, introductions and visit notes with case, width and whitespace normalization', () => {
  const index = createPlaceSearchIndex([place])
  assert.equal(matchPlaces(index, '  ＨＩＰＰＩＨＯ  ').get(place.id).label, '介绍提及')
  assert.equal(matchPlaces(index, 'hippiho').get(place.id).text.includes('**'), false)
  assert.equal(matchPlaces(index, '测试广场').get(place.id).label, '地点别名')
  assert.equal(matchPlaces(index, '吉他墙').get(place.id).label, '探访建议')
  assert.equal(matchPlaces(index, '上海 HIPPIHO').size, 1)
  assert.equal(matchPlaces(index, '苏州 HIPPIHO').size, 0)
  assert.equal(matchPlaces(index, '  ').size, 0)
})

test('verified shop names and aliases are indexed but closed and uncertain shops and evidence are not', () => {
  const directories = { [place.id]: { ...directory, shops: [
    shop,
    { ...shop, name: '账号确认店', aliases: [], operatingConfirmation: undefined, accounts: [{ name: '官方账号' }] },
    { ...shop, name: '已闭店', aliases: ['CLOSED SHOP'], status: 'closed' },
    { ...shop, name: '不确定店', aliases: ['UNKNOWN SHOP'], operatingConfirmation: undefined },
  ] } }
  const before = JSON.stringify(directories)
  const index = createPlaceSearchIndex([place], directories)
  assert.equal(matchPlaces(index, 'OPEN SHOP').get(place.id).text, 'OPEN SHOP(确认店)')
  assert.equal(matchPlaces(index, '确认店').get(place.id).label, '店铺一览')
  assert.equal(matchPlaces(index, '账号确认店').size, 1)
  for (const query of ['已闭店', 'CLOSED SHOP', '不确定店', 'UNKNOWN SHOP', '官方店单', 'example.com', '核实记录']) assert.equal(matchPlaces(index, query).size, 0)
  assert.equal(JSON.stringify(directories), before)
})

test('enhanced matching composes with city and tag filters without changing published rank order', () => {
  const places = [place, { ...place, id: 'hidden', published: false }, { ...place, id: 'first', tier: 'hang' }, { ...place, id: 'elsewhere', city: '苏州' }]
  const matches = matchPlaces(createPlaceSearchIndex(places), 'HIPPIHO')
  assert.equal(matches.has('hidden'), false)
  assert.deepEqual(filterPlaces(places, '上海', 'HIPPIHO', '乐器', matches).map(p => p.id), ['first', 'test-place'])
  assert.equal(filterPlaces(places, '上海', 'HIPPIHO', '咖啡', matches).length, 0)
  assert.equal(filterPlaces(places, '', 'not-found', '', new Map()).length, 0)
  assert.deepEqual(filterPlaces(places, '', '', '', new Map()), filterPlaces(places))
})

test('snippets stay bounded, preserve visible text and highlight literal metacharacters safely', () => {
  const long = { ...place, summary: '', details: '前文'.repeat(100) + '[large]HIPPIHO[/large]' + '后文'.repeat(100) }
  const match = matchPlaces(createPlaceSearchIndex([long]), 'HIPPIHO').get(place.id)
  assert.ok(match.text.length <= 102)
  assert.ok(match.text.includes('HIPPIHO'))
  const parts = searchHighlights({ label: '测试', text: 'a+b <img> a+b', terms: ['a+b', '<img>'] })
  assert.equal(parts.map(p => p.text).join(''), 'a+b <img> a+b')
  assert.deepEqual(parts.filter(p => p.hit).map(p => p.text), ['a+b', '<img>', 'a+b'])
})

test('actual HIPPIHO and animate queries find their parent places without requiring new data', () => {
  const groups = JSON.parse(readFileSync(new URL('../src/data/places.json', import.meta.url), 'utf8'))
  const directories = JSON.parse(readFileSync(new URL('../src/data/shop-directories.json', import.meta.url), 'utf8'))
  const index = createPlaceSearchIndex(flattenPlaces(groups), directories)
  assert.deepEqual([...matchPlaces(index, 'HIPPIHO').keys()], ['shanghai-shop-021'])
  assert.equal(matchPlaces(index, 'animate').get('guangzhou-shop-003').label, '店铺一览')
})

test('optional place and shop aliases reject malformed or duplicate entries', () => {
  const site = JSON.parse(readFileSync(new URL('../src/data/site.json', import.meta.url), 'utf8'))
  const { city, ...entry } = { ...place, cover: null, gallery: [], visitedAt: null, updatedAt: '2026-10-05' }
  assert.deepEqual(validateData(site, { [city]: [entry] }, []), [])
  assert.deepEqual(validateShopDirectories({ [place.id]: directory }, [place]), [])
  for (const aliases of [null, '别名', [1], [''], [' alias'], ['alias', 'alias']]) {
    assert.ok(validateData(site, { [city]: [{ ...entry, aliases }] }, []).some(error => error.includes('aliases')))
    assert.ok(validateShopDirectories({ [place.id]: { ...directory, shops: [{ ...shop, aliases }] } }, [place]).some(error => error.includes('aliases')))
  }
})

test('search targets identify exact visible paragraphs, notes and verified shop aliases', () => {
  const entry = { ...place, details: '\n\n第一段\n\n **HIPPIHO** 乐器 \n', visitNotes: ['吉他墙'] }
  const index = createPlaceSearchIndex([entry], { [entry.id]: directory })
  assert.deepEqual(matchPlaces(index, 'HIPPIHO').get(entry.id).target, { kind: 'paragraph', index: 1 })
  assert.deepEqual(matchPlaces(index, '吉他墙').get(entry.id).target, { kind: 'note', index: 0 })
  assert.deepEqual(matchPlaces(index, 'OPEN SHOP').get(entry.id).target, { kind: 'shop', name: '确认店' })
  assert.deepEqual(matchPlaces(index, entry.name).get(entry.id).target, { kind: 'heading' })
  assert.notEqual(searchTargetId(entry.id, { kind: 'shop', name: 'A&B' }), searchTargetId(entry.id, { kind: 'shop', name: 'A B' }))
})

test('explicit search navigation round trips special characters without changing ordinary detail routes', () => {
  for (const query of ['上海 HIPPIHO', 'A&B + #?', '']) {
    assert.deepEqual(parsePlaceRoute(placeDetailHash(place.id, query)), { id: place.id, query })
  }
  assert.equal(placeDetailHash(place.id), '#/place/' + place.id)
  for (const hash of ['#/place/', '#place-card-test-place', '#/place/test-place/extra']) assert.equal(parsePlaceRoute(hash), undefined)
})
