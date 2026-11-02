import type { Place, ShopDirectory } from '../types/index.ts'
import { resolveTripStops, tripEntryKey, type TripEntry } from './tripPlan.ts'
import { shopCalendarDate } from './shopDirectory.ts'

export function placePublicUrl(rankUrl: string, id: string) {
  return new URL(`places/${encodeURIComponent(id)}/`, rankUrl).href
}

export function placeShareText(place: Place, author: string, url: string, checkedAt?: string) {
  return [`${place.city} · ${place.name}`, place.summary, `作者：${author} · 个人逛店评价`,
    `体验到访：${place.visitedAt || '未记录'} · 内容更新：${place.updatedAt}`,
    ...(checkedAt ? [`店单核对：${checkedAt}（不代表当天逐店实访）`] : []), `完整介绍与当前店单：${url}`].join('\n')
}

// Rebuild every item from the site's current public catalog. Never serialize the
// supplied entry object: it may also contain personal names, addresses or notes.
export function publicRouteEntries(entries: readonly TripEntry[], places: Place[], directories: Record<string, ShopDirectory>, today = shopCalendarDate()): TripEntry[] {
  return resolveTripStops(entries.filter(entry => !entry.custom), places, directories, today)
    .map(stop => ({ placeId: stop.placeId, ...(stop.shopName ? { shopName: stop.shopName } : {}) }))
    .filter((entry, i, all) => all.findIndex(other => tripEntryKey(other) === tripEntryKey(entry)) === i)
}

export function publicRouteUrl(rankUrl: string, entries: readonly TripEntry[], places: Place[], directories: Record<string, ShopDirectory>, date = shopCalendarDate()) {
  // Compact tuples are a format boundary, not a copy of the private itinerary.
  const stops = publicRouteEntries(entries, places, directories, date)
  if (!stops.length) throw new Error('还没有可分享的公开地点。')
  if (stops.length > 120) throw new Error('一次最多分享120项选择。')
  const payload = JSON.stringify({ v: 1, date, stops: stops.map(entry => [entry.placeId, ...(entry.shopName ? [entry.shopName] : [])]) })
  const bytes = new TextEncoder().encode(payload)
  if (bytes.length > 4500) throw new Error('路线较长，请减少分享的店铺后重试。')
  const encoded = btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
  if (encoded.length > 6000) throw new Error('路线较长，请减少分享的店铺后重试。')
  const url = new URL('route/', rankUrl)
  url.hash = encoded
  return url.href
}

export function readPublicRoute(hash: string): { entries: TripEntry[]; date: string } | undefined {
  try {
    const value = hash.replace(/^#/, '')
    if (!value || value.length > 6000 || !/^[A-Za-z0-9_-]+$/.test(value)) return undefined
    const decoded = atob(value.replaceAll('-', '+').replaceAll('_', '/'))
    const data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(decoded, c => c.charCodeAt(0))))
    if (!data || data.v !== 1 || typeof data.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.date) || new Date(`${data.date}T00:00:00Z`).toISOString().slice(0, 10) !== data.date || !Array.isArray(data.stops) || !data.stops.length || data.stops.length > 120) return undefined
    if (data.stops.some((item: unknown) => !Array.isArray(item) || item.length < 1 || item.length > 2 || typeof item[0] !== 'string' || !/^[a-z0-9-]{1,120}$/.test(item[0]) || (item.length === 2 && (typeof item[1] !== 'string' || !item[1].trim() || item[1].length > 160)))) return undefined
    return { date: data.date, entries: data.stops.map((item: string[]) => ({ placeId: item[0]!, ...(item[1] ? { shopName: item[1] } : {}) })) }
  } catch { return undefined }
}
