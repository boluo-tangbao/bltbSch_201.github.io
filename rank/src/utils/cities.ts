import type { Place } from '../types/index.ts'

export function cityColor(city: string, colors: Record<string, string> = {}) { return colors[city] || '#788477' }
export function hasCoordinates(place: Place): place is Place & { location: Exclude<Place['location'], string | null | undefined> } {
  return !!place.location && typeof place.location === 'object' && Number.isFinite(place.location.lat) && Number.isFinite(place.location.lng)
}
export function placeAddress(place: Place) { return typeof place.location === 'string' ? place.location : place.location?.address || '' }

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
