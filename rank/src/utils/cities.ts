import type { Place } from '../types/index.ts'

export function cityColor(city: string, colors: Record<string, string> = {}) {
  return colors[city] || '#788477'
}
export function navigationUrl(place: Place, openApp = false) {
  if (!place.location) return null
  const params = new URLSearchParams({
    position: `${place.location.lng},${place.location.lat}`,
    name: `${place.city} · ${place.name}`, coordinate: 'wgs84',
    callnative: openApp ? '1' : '0', src: 'tangbao-shop-ranking',
  })
  return `https://uri.amap.com/marker?${params}`
}
export function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = Math.floor(seconds % 60)
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`
}
