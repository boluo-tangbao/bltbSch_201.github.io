import type { Place, ShopDirectory } from '../types/index.ts'
import { navigationUrl, placeAddress } from './cities.ts'
import { shopCalendarDate, shopDisplayStatus, shopStatusLabel } from './shopDirectory.ts'
import { placeDetailHash } from './search.ts'

export interface TripEntry { placeId: string; shopName?: string }
export interface TripStop extends TripEntry {
  name: string; placeName: string; city: string; address: string; floor?: string
  period?: string; status?: string; checkedAt?: string; navigation: string | null
}
export const tripEntryKey = (entry: TripEntry) => JSON.stringify([entry.placeId, entry.shopName ?? null])

export function readTripEntries(value: string | null): TripEntry[] {
  try {
    const entries: unknown = JSON.parse(value || '[]')
    if (!Array.isArray(entries)) return []
    const seen = new Set<string>()
    return entries.filter((entry): entry is TripEntry => {
      if (!entry || typeof entry !== 'object' || typeof entry.placeId !== 'string' || !entry.placeId || (entry.shopName !== undefined && (typeof entry.shopName !== 'string' || !entry.shopName))) return false
      const key = tripEntryKey(entry)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    }).map(({ placeId, shopName }) => ({ placeId, ...(shopName ? { shopName } : {}) }))
  } catch { return [] }
}

export function resolveTripStops(entries: readonly TripEntry[], places: Place[], directories: Record<string, ShopDirectory>, today = shopCalendarDate()): TripStop[] {
  return entries.flatMap(entry => {
    const place = places.find(place => place.published && place.id === entry.placeId)
    if (!place) return []
    const directory = directories[place.id]
    const shop = entry.shopName ? directory?.shops.find(shop => shop.name === entry.shopName && shopDisplayStatus(shop, today) === 'open') : undefined
    if (entry.shopName && !shop) return []
    return [{ ...entry, name: shop?.name ?? place.name, placeName: place.name, city: place.city, address: placeAddress(place), floor: shop?.floor,
      period: shop?.limited?.period, status: shop ? shopStatusLabel(shop, today) : undefined, checkedAt: shop ? directory?.checkedAt : undefined, navigation: navigationUrl(place, true) }]
  })
}

export function tripStopUrl(stop: TripEntry, guideUrl: string) {
  return `${guideUrl}${placeDetailHash(stop.placeId, stop.shopName)}`
}

export function tripPlanText(stops: TripStop[], guideUrl: string) {
  return ['本次逛店清单', ...stops.map((stop, index) => [
    `${index + 1}. ${stop.name}`,
    `${stop.city} · ${stop.placeName}${stop.floor ? ` · ${stop.floor}` : ''}`,
    `地址：${stop.address || '地址待补充'}`,
    ...(stop.period ? [`${stop.status} · ${stop.period}`] : []),
    ...(stop.checkedAt ? [`店单核对：${stop.checkedAt}`] : []),
    `详情：${tripStopUrl(stop, guideUrl)}`,
    ...(stop.navigation ? [`导航：${stop.navigation}`] : []),
  ].join('\n'))].join('\n\n')
}

function escape(value: string) { return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!) }

export function tripPlanHtml(stops: TripStop[], guideUrl: string, today = shopCalendarDate()) {
  const rows = stops.map((stop, index) => `<li><span class="number">${index + 1}</span><div><h2>${escape(stop.name)}</h2><p>${escape(stop.city)} · ${escape(stop.placeName)}${stop.floor ? ` · ${escape(stop.floor)}` : ''}</p><p>地址：${escape(stop.address || '地址待补充')}</p>${stop.period ? `<p>${escape(stop.status || '')} · ${escape(stop.period)}</p>` : ''}${stop.checkedAt ? `<p class="note">店单核对：${escape(stop.checkedAt)}</p>` : ''}<p><a href="${escape(tripStopUrl(stop, guideUrl))}">查看详情</a>${stop.navigation ? ` · <a href="${escape(stop.navigation)}">高德导航</a>` : ''}</p></div></li>`).join('')
  return `<!doctype html><html lang="zh-CN"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>本次逛店清单</title><style>body{max-width:850px;margin:32px auto;padding:0 20px;background:#fffaf1;color:#292932;font:16px/1.8 system-ui,sans-serif}h1{font-size:30px}h2{margin:0;font-size:20px}ol{list-style:none;padding:0}li{display:flex;gap:16px;margin:20px 0;padding:20px;border:1px solid #d8bdc5;break-inside:avoid}li>div{min-width:0;overflow-wrap:anywhere}.number{font-weight:bold;color:#a83750}p{margin:6px 0}.note{color:#79626b;font-size:13px}a{color:#84394e}@media print{body{background:white;margin:0;max-width:none}}</style><h1>本次逛店清单</h1><p>${stops.length} 站 · 导出日期 ${escape(today)}</p><p class="note">按选定的逛店顺序排列。地址、楼层与档期供出发前参考；详情和导航需联网。</p><ol>${rows}</ol></html>`
}
