import type { Place } from '../types/index.ts'
import { tiers } from './model.ts'

/** Balance the toy shelf across tiers without changing the actual ranking. */
export function placeTagBatch(places: Place[], count: number, batch = 0) {
  const publicPlaces = places.filter(place => place.published)
  const groups = tiers.map(tier => publicPlaces.filter(place => place.tier === tier.id))
  const balanced: Place[] = []
  for (let row = 0; groups.some(group => row < group.length); row++) {
    for (const group of groups) if (group[row]) balanced.push(group[row]!)
  }
  if (!balanced.length) return []
  const size = Math.min(count, balanced.length), start = (batch * size) % balanced.length
  return Array.from({ length: size }, (_, i) => balanced[(start + i) % balanced.length]!)
}

export function placeTagTier(place: Place) {
  return tiers.find(tier => tier.id === place.tier)!
}
