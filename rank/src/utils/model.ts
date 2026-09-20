import type { Place, PlacesByCity, Update } from '../types/index.ts'

export const tiers = [
  { id: 'hang', label: '夯', color: '#ed765e', pale: '#fff4ef' },
  { id: 'top', label: '顶级', color: '#edb966', pale: '#fff9ee' },
  { id: 'above', label: '人上人', color: '#d6cc87', pale: '#faf9ed' },
  { id: 'npc', label: 'NPC', color: '#9ebdb0', pale: '#f1f7f4' },
  { id: 'bad', label: '拉完了', color: '#afb9c8', pale: '#f3f5f8' },
] as const

export function flattenPlaces(groups: PlacesByCity): Place[] {
  return Object.entries(groups).flatMap(([city, places]) => places.map(place => ({ ...place, city })))
}

export function filterPlaces(places: Place[], city = '', query = '') {
  const keyword = query.trim().toLocaleLowerCase()
  return places.filter(p => p.published && (!city || p.city === city) &&
    (!keyword || [p.name, p.city, p.summary, ...p.tags].join(' ').toLocaleLowerCase().includes(keyword)))
    .sort((a, b) => tiers.findIndex(t => t.id === a.tier) - tiers.findIndex(t => t.id === b.tier) || a.order - b.order || a.id.localeCompare(b.id))
}
export function publicUpdates(updates: Update[], places: Place[]) {
  const ids = new Set(places.filter(p => p.published).map(p => p.id))
  return updates.filter(u => ids.has(u.placeId)).sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
}
export function updateLabel(u: Update) {
  if (u.type === 'added') return '新增'
  if (u.type === 'edited') return '文案修改'
  return tiers.findIndex(t => t.id === u.toTier) < tiers.findIndex(t => t.id === u.fromTier) ? '升档' : '降档'
}
export function recentBadge(id: string, updates: Update[], days: number, now = Date.now()) {
  const found = updates.find(u => {
    const age = now - new Date(u.date + 'T00:00:00').getTime()
    return u.placeId === id && u.type !== 'edited' && age >= 0 && age < days * 86400000
  })
  return found ? updateLabel(found) : ''
}
export function tierLabel(id: string) { return tiers.find(t => t.id === id)?.label || id }
