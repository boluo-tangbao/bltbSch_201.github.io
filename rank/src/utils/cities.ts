import type { Place } from '../types/index.ts'

export function cityColor(city: string, colors: Record<string, string> = {}) {
  return colors[city] || '#788477'
}
export function hasCoordinates(place: Place): place is Place & { location: Exclude<Place['location'], string | null | undefined> } {
  return !!place.location && typeof place.location === 'object' && Number.isFinite(place.location.lat) && Number.isFinite(place.location.lng)
}
export function placeAddress(place: Place) {
  return typeof place.location === 'string' ? place.location : place.location?.address || ''
}
export function navigationUrl(place: Place, openApp = false) {
  const address = placeAddress(place)
  if (!address) return null
  if (hasCoordinates(place)) {
    const params = new URLSearchParams({
      position: `${place.location.lng},${place.location.lat}`,
      name: `${place.city} · ${place.name}`, coordinate: 'wgs84',
      callnative: openApp ? '1' : '0', src: 'tangbao-shop-ranking',
    })
    return `https://uri.amap.com/marker?${params}`
  }
  const params = new URLSearchParams({ keyword: address, callnative: openApp ? '1' : '0', src: 'tangbao-shop-ranking' })
  return `https://uri.amap.com/search?${params}`
}
