import type { Place } from '../types/index.ts'

const CITY_CENTERS: Record<string, [number, number]> = {
  上海: [31.2304, 121.4737], 广州: [23.1291, 113.2644], 苏州: [31.2989, 120.5853], 兰州: [36.0611, 103.8343],
}
const GEOCODE_CACHE_KEY = 'shop-ranking-geocode-v1'

export function cityColor(city: string, colors: Record<string, string> = {}) { return colors[city] || '#788477' }
export function cityCenter(city: string): [number, number] { return CITY_CENTERS[city] || [35.8, 104.1] }
export function hasCoordinates(place: Place): place is Place & { location: Exclude<Place['location'], string | null | undefined> } {
  return !!place.location && typeof place.location === 'object' && Number.isFinite(place.location.lat) && Number.isFinite(place.location.lng)
}
export function placeAddress(place: Place) { return typeof place.location === 'string' ? place.location : place.location?.address || '' }

export async function geocodeAddress(address: string): Promise<{ point: [number, number] | null; cached: boolean }> {
  let cache: Record<string, [number, number]> = {}
  try { cache = JSON.parse(localStorage.getItem(GEOCODE_CACHE_KEY) || '{}') } catch { /* cache is optional */ }
  if (cache[address]) return { point: cache[address], cached: true }
  const params = new URLSearchParams({ format: 'jsonv2', limit: '1', countrycodes: 'cn', q: address })
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { headers: { 'Accept-Language': 'zh-CN,zh;q=0.9' } })
  if (!response.ok) return { point: null, cached: false }
  const result = await response.json() as Array<{ lat: string; lon: string }>
  const point = result[0] ? [Number(result[0].lat), Number(result[0].lon)] as [number, number] : null
  if (point?.every(Number.isFinite)) {
    cache[address] = point
    try { localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache)) } catch { /* cache is optional */ }
  }
  return { point, cached: false }
}

export function navigationUrl(place: Place, openApp = false) {
  const address = placeAddress(place); if (!address) return null
  if (hasCoordinates(place)) {
    const params = new URLSearchParams({ position: `${place.location.lng},${place.location.lat}`, name: `${place.city} · ${place.name}`, coordinate: 'wgs84', callnative: openApp ? '1' : '0', src: 'tangbao-shop-ranking' })
    return `https://uri.amap.com/marker?${params}`
  }
  return `https://uri.amap.com/search?${new URLSearchParams({ keyword: address, callnative: openApp ? '1' : '0', src: 'tangbao-shop-ranking' })}`
}
export function baiduMapUrl(place: Place) {
  const address = placeAddress(place); if (!address) return null
  if (hasCoordinates(place)) return `https://api.map.baidu.com/marker?${new URLSearchParams({ location: `${place.location.lat},${place.location.lng}`, title: place.name, content: address, output: 'html', coord_type: 'wgs84', src: 'webapp.tangbao.shopranking' })}`
  return `https://api.map.baidu.com/geocoder?${new URLSearchParams({ address, output: 'html', src: 'webapp.tangbao.shopranking' })}`
}
export function googleMapsUrl(place: Place) {
  const address = placeAddress(place); if (!address) return null
  const destination = hasCoordinates(place) ? `${place.location.lat},${place.location.lng}` : address
  return `https://www.google.com/maps/dir/?${new URLSearchParams({ api: '1', destination })}`
}
