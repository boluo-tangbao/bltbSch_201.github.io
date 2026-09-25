import type { Place, PlacesByCity, Update, UpdateItem } from '../types/index.ts'

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

export function filterPlaces(places: Place[], city = '', query = '', tag = '') {
  const keyword = query.trim().toLocaleLowerCase()
  return places.filter(p => p.published && (!city || p.city === city) && (!tag || p.tags.includes(tag)) &&
    (!keyword || [p.name, p.city, p.summary, ...p.tags].join(' ').toLocaleLowerCase().includes(keyword)))
    .sort((a, b) => tiers.findIndex(t => t.id === a.tier) - tiers.findIndex(t => t.id === b.tier) || a.order - b.order || a.id.localeCompare(b.id))
}
export function publicUpdates(updates: Update[], places: Place[]) {
  const ids = new Set(places.filter(p => p.published).map(p => p.id))
  return updates.map(update => {
    const visible = updateItems(update).filter(item => ids.has(item.placeId))
    if (!visible.length) return null
    if (update.changes) return { ...update, changes: visible as Array<Required<UpdateItem>> }
    if (update.placeIds) return { ...update, placeIds: visible.map(item => item.placeId) }
    return update
  }).filter((update): update is Update => Boolean(update))
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
}
export function updateItems(update: Update): UpdateItem[] {
  if (update.changes) return update.changes
  if (update.placeIds) return update.placeIds.map(placeId => ({ placeId }))
  return update.placeId ? [{ placeId: update.placeId, fromTier: update.fromTier, toTier: update.toTier }] : []
}
export function updateItemLabel(update: Update, item: UpdateItem) {
  if (update.type === 'added') return '新增'
  if (update.type === 'edited') return '文案修改'
  if (update.type === 'ranking-change') return '调序'
  if (!item.fromTier || !item.toTier) return '调档'
  return tiers.findIndex(t => t.id === item.toTier) < tiers.findIndex(t => t.id === item.fromTier) ? '升档' : '降档'
}
export function updateLabel(u: Update) {
  const items = updateItems(u)
  if (u.type === 'added') return items.length > 1 ? '批量新增' : '新增'
  if (u.type === 'edited') return items.length > 1 ? '批量修改' : '文案修改'
  if (u.type === 'ranking-change') return items.length > 1 ? '批量调序' : '排名调整'
  const labels = new Set(items.map(item => updateItemLabel(u, item)))
  if (items.length > 1) return labels.size === 1 ? `批量${[...labels][0]}` : '批量调档'
  return items[0] ? updateItemLabel(u, items[0]) : '调档'
}
export function recentBadge(id: string, updates: Update[], days: number, now = Date.now()) {
  for (const update of updates) {
    const item = updateItems(update).find(item => item.placeId === id)
    const age = now - new Date(update.date + 'T00:00:00').getTime()
    if (item && update.type !== 'edited' && age >= 0 && age < days * 86400000) return updateItemLabel(update, item)
  }
  return ''
}
export function tierLabel(id: string) { return tiers.find(t => t.id === id)?.label || id }
