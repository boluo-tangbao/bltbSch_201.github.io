import { test } from 'node:test'
import assert from 'node:assert/strict'
import { placeTagBatch, placeTagTier } from '../src/utils/placeTags.ts'
import { tiers } from '../src/utils/model.ts'

test('toy names link to unique published places, balance all available tiers and cycle through the catalog', () => {
  const places = tiers.flatMap(tier => Array.from({ length: 6 }, (_, i) => ({ id: `${tier.id}-${i}`, name: `商圈${i}`, published: true, tier: tier.id })))
  places.push({ id: 'hidden', name: '未公开商圈', published: false, tier: 'top' })
  const seen = new Set()
  for (let batch = 0; batch < 5; batch++) {
    const tags = placeTagBatch(places, 7, batch)
    assert.equal(tags.length, 7)
    assert.equal(new Set(tags.map(p => p.id)).size, 7)
    assert.equal(new Set(tags.map(p => p.tier)).size, 5)
    for (const place of tags) { assert.ok(place.published); seen.add(place.id) }
  }
  assert.equal(seen.size, 30)
  assert.deepEqual(placeTagBatch([], 7), [])
  assert.equal(placeTagBatch(places.slice(0, 3), 20).length, 3)
})

test('pastel toys always derive their accent from the current ranking tier, including after a tier change', () => {
  for (const tier of tiers) {
    const place = { tier: tier.id }
    assert.equal(placeTagTier(place).color, tier.color)
    assert.equal(placeTagTier(place).pale, tier.pale)
    place.tier = 'npc'
    assert.equal(placeTagTier(place).color, tiers.find(t => t.id === 'npc').color)
  }
})
