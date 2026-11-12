import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { directorySummary } from '../scripts/directory-summary.mjs'
import { createPlaceSearchIndex } from '../src/utils/search.ts'
import { flattenPlaces } from '../src/utils/model.ts'
import { comparisonFacts } from '../src/utils/placeComparison.ts'
import { resolveTripStops } from '../src/utils/tripPlan.ts'
import { reviewTripEntries } from '../src/utils/tripArchive.ts'

test('light directories preserve search, comparison and saved trip behavior across activity dates', () => {
  const read = file => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'))
  const full = read('../src/data/shop-directories.json')
  const light = directorySummary(full)
  const places = flattenPlaces(read('../src/data/places.json'))
  const original = JSON.stringify(full)
  const entries = Object.entries(full).flatMap(([placeId, directory]) => [{ placeId }, ...directory.shops.map(shop => ({ placeId, shopName: shop.name }))])
  const dates = [...new Set(['2026-11-12', ...Object.values(full).flatMap(directory => directory.shops.flatMap(shop => [shop.limited?.startsOn, shop.limited?.endsOn].filter(Boolean)))])]
  for (const date of dates) {
    assert.deepEqual(createPlaceSearchIndex(places, light, date), createPlaceSearchIndex(places, full, date))
    for (const place of places) assert.deepEqual(comparisonFacts(place, light[place.id], date), comparisonFacts(place, full[place.id], date))
    assert.deepEqual(resolveTripStops(entries, places, light, date), resolveTripStops(entries, places, full, date))
    assert.deepEqual(reviewTripEntries(entries, places, light, date), reviewTripEntries(entries, places, full, date))
  }
  assert.equal(JSON.stringify(full), original)
  assert.ok(JSON.stringify(light).length < original.length * 0.6)
})
