import type { Place } from '../types'
import { hasCoordinates, placeAddress } from './cities'

type BMapApi = Record<string, any>
export type BaiduPoint = { lng: number; lat: number }

declare global {
  interface Window {
    BMapGL?: BMapApi
    __shopRankingBaiduMapReady?: () => void
    _BMapSecurityConfig?: { serviceHost: string }
  }
}

const CACHE_KEY = 'shop-ranking-baidu-geocode-v1'
let apiPromise: Promise<BMapApi> | undefined

function env(name: 'VITE_BAIDU_MAP_AK' | 'VITE_BAIDU_MAP_PROXY_URL') {
  return String(import.meta.env[name] || '').trim()
}

export function baiduMapConfigured() {
  return Boolean(env('VITE_BAIDU_MAP_AK') || env('VITE_BAIDU_MAP_PROXY_URL'))
}

export function loadBaiduMaps(): Promise<BMapApi> {
  if (window.BMapGL) return Promise.resolve(window.BMapGL)
  if (apiPromise) return apiPromise
  const ak = env('VITE_BAIDU_MAP_AK')
  const proxy = env('VITE_BAIDU_MAP_PROXY_URL').replace(/\/$/, '')
  if (!ak && !proxy) return Promise.reject(new Error('尚未配置百度地图 AK'))

  apiPromise = new Promise((resolve, reject) => {
    const callback = '__shopRankingBaiduMapReady'
    const script = document.createElement('script')
    const timeout = window.setTimeout(() => fail(new Error('百度地图服务连接超时')), 15000)
    function cleanup() { window.clearTimeout(timeout); delete window[callback] }
    function fail(error: Error) { cleanup(); apiPromise = undefined; script.remove(); reject(error) }
    window[callback] = () => {
      if (!window.BMapGL) { fail(new Error('百度地图 API 返回异常')); return }
      cleanup(); resolve(window.BMapGL)
    }
    if (proxy) {
      const serviceRoot = `${proxy}/_BMapService`
      window._BMapSecurityConfig = { serviceHost: `${serviceRoot}/` }
      script.src = `${serviceRoot}/api?v=1.0&type=webgl&callback=${callback}`
    } else {
      script.src = `https://api.map.baidu.com/api?v=1.0&type=webgl&ak=${encodeURIComponent(ak)}&callback=${callback}`
    }
    script.async = true
    script.referrerPolicy = 'strict-origin-when-cross-origin'
    script.onerror = () => fail(new Error('百度地图脚本加载失败，请检查 AK、Referer 白名单和网络'))
    document.head.append(script)
  })
  return apiPromise
}

function readCache(): Record<string, [number, number]> {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') } catch { return {} }
}
function writeCache(cache: Record<string, [number, number]>) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)) } catch { /* cache is optional */ }
}

export async function geocodeWithBaidu(api: BMapApi, address: string, city = ''): Promise<BaiduPoint | null> {
  const key = `${city}|${address}`
  const cache = readCache()
  if (cache[key]) return new api.Point(cache[key][0], cache[key][1])
  const point = await new Promise<BaiduPoint | null>((resolve) => {
    new api.Geocoder().getPoint(address, (result: BaiduPoint | null) => resolve(result || null), city)
  })
  if (point) { cache[key] = [point.lng, point.lat]; writeCache(cache) }
  return point
}

async function convertWgs84(api: BMapApi, lng: number, lat: number): Promise<BaiduPoint | null> {
  return new Promise(resolve => {
    new api.Convertor().translate([new api.Point(lng, lat)], 1, 5, (result: { status: number; points?: BaiduPoint[] }) => {
      resolve(result.status === 0 && result.points?.[0] ? result.points[0] : null)
    })
  })
}

export async function pointForPlace(api: BMapApi, place: Place): Promise<BaiduPoint | null> {
  if (hasCoordinates(place)) return convertWgs84(api, place.location.lng, place.location.lat)
  const address = placeAddress(place)
  return address ? geocodeWithBaidu(api, address, place.city) : null
}

export function escapeMapHtml(value: string) {
  return value.replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]!)
}
