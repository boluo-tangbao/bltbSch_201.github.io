<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { Place } from '../types'
import { baiduMapConfigured, escapeMapHtml, geocodeWithBaidu, loadBaiduMaps, pointForPlace, type BaiduPoint } from '../utils/baiduMaps'
import { baiduMapUrl, cityColor, hasCoordinates, placeAddress } from '../utils/cities'

const props = defineProps<{ places: Place[]; colors: Record<string, string>; selectedId?: string }>()
const emit = defineEmits<{ select: [id: string] }>()
const groups = computed(() => [...new Set(props.places.filter(place => placeAddress(place)).map(place => place.city))].sort((a, b) => a.localeCompare(b, 'zh-CN')).map(city => ({ city, places: props.places.filter(place => place.city === city && placeAddress(place)) })))
const total = computed(() => groups.value.reduce((sum, group) => sum + group.places.length, 0))
const selectedCity = ref(''), active = ref(false), locating = ref(''), mapError = ref('')
const selectedGroup = computed(() => groups.value.find(group => group.city === selectedCity.value))
const container = ref<HTMLElement>()
let api: any, map: any, revision = 0
const markers = new Map<string, { overlay: any; point: BaiduPoint; sequence: number; place: Place }>()

function countryView() { selectedCity.value = ''; void refresh() }
function cityView(city: string) { selectedCity.value = city; void refresh() }
function markerHtml(sequence: number, place: Place, selected = false) {
  return `<span class="map-pin map-sequence-pin${selected ? ' selected' : ''}" style="background:${cityColor(place.city, props.colors)}">${sequence}</span>`
}
function labelStyle() { return { border: '0', padding: '0', background: 'transparent', cursor: 'pointer' } }

async function refresh() {
  if (!map || !api) return
  const current = ++revision
  locating.value = ''; mapError.value = ''; map.clearOverlays(); markers.clear()
  try {
    if (selectedGroup.value) await renderCity(selectedGroup.value, current)
    else await renderCities(current)
  } catch (error) {
    console.error('[BaiduMap] 全榜地图刷新失败', error)
    mapError.value = error instanceof Error ? error.message : '百度地图暂时无法加载'
  }
}

async function renderCities(current: number) {
  const points: BaiduPoint[] = []
  for (const group of groups.value) {
    const point = await cityCenter(group)
    if (current !== revision) return
    if (!point) continue
    points.push(point)
    const html = `<button class="city-map-pin" style="--pin-color:${cityColor(group.city, props.colors)}"><strong>${escapeMapHtml(group.city)}</strong><small>${group.places.length} 家</small></button>`
    const label = new api.Label(html, { position: point, offset: new api.Size(-44, -24) })
    label.setStyle(labelStyle()); label.addEventListener('click', () => cityView(group.city)); map.addOverlay(label)
  }
  if (points.length > 1) map.setViewport(points, { margins: [70, 70, 70, 70] })
  else if (points[0]) map.centerAndZoom(points[0], 10)
  else map.centerAndZoom(new api.Point(104.1954, 35.8617), 5)
}

async function renderCity(group: { city: string; places: Place[] }, current: number) {
  const cityPoint = await cityCenter(group)
  if (current !== revision) return
  if (cityPoint) map.centerAndZoom(cityPoint, 12)
  const points: BaiduPoint[] = []
  for (let index = 0; index < group.places.length; index++) {
    if (current !== revision) return
    const place = group.places[index]
    locating.value = `正在定位 ${index + 1}/${group.places.length}`
    const point = await pointForPlace(api, place)
    if (!point || current !== revision) continue
    points.push(point); addPlaceMarker(place, point, index + 1)
  }
  locating.value = points.length === group.places.length ? `${points.length} 个位置已标记` : `${points.length}/${group.places.length} 个位置已标记`
  if (points.length > 1) map.setViewport(points, { margins: [65, 65, 65, 65] })
  else if (points[0]) map.centerAndZoom(points[0], 17)
  focusSelected()
}

async function cityCenter(group: { city: string; places: Place[] }): Promise<BaiduPoint | null> {
  const locatedPlaces = group.places.filter(hasCoordinates)
  if (!locatedPlaces.length) return geocodeWithBaidu(api, group.city, group.city)
  const points = (await Promise.all(locatedPlaces.map(place => pointForPlace(api, place)))).filter((point): point is BaiduPoint => Boolean(point))
  if (!points.length) return null
  return new api.Point(
    points.reduce((sum, point) => sum + point.lng, 0) / points.length,
    points.reduce((sum, point) => sum + point.lat, 0) / points.length,
  )
}

function addPlaceMarker(place: Place, point: BaiduPoint, sequence: number) {
  const label = new api.Label(markerHtml(sequence, place, props.selectedId === place.id), { position: point, offset: new api.Size(-19, -19) })
  label.setStyle(labelStyle())
  label.setTitle(`${sequence}号地点：${place.name}`)
  label.addEventListener('click', () => {
    const content = `<strong>${sequence}. ${escapeMapHtml(place.name)}</strong><p>${escapeMapHtml(placeAddress(place))}</p><a href="${baiduMapUrl(place)}" target="_blank" rel="noopener noreferrer">在百度地图查看 ↗</a>`
    map.openInfoWindow(new api.InfoWindow(content, { width: 250, title: '' }), point)
    emit('select', place.id)
  })
  map.addOverlay(label); markers.set(place.id, { overlay: label, point, sequence, place })
}

function focusSelected() {
  for (const [id, marker] of markers) marker.overlay.setContent(markerHtml(marker.sequence, marker.place, id === props.selectedId))
  const marker = props.selectedId ? markers.get(props.selectedId) : undefined
  if (marker) map.panTo(marker.point)
}

async function activate() {
  active.value = true; mapError.value = ''; await nextTick()
  if (!container.value || map) return
  if (!baiduMapConfigured()) { mapError.value = '百度地图尚未配置，请设置站点 AK'; return }
  try {
    api = await loadBaiduMaps()
    map = new api.Map(container.value, { enableMapClick: false })
    map.enableScrollWheelZoom(true)
    map.addControl(new api.ScaleControl({ anchor: 2 }))
    map.addControl(new api.ZoomControl({ anchor: 3 }))
    await refresh()
  } catch (error) {
    console.error('[BaiduMap] 全榜地图加载失败', error)
    mapError.value = error instanceof Error ? error.message : '百度地图暂时无法加载'
  }
}

async function retry() { revision++; map?.destroy?.(); map = undefined; api = undefined; await activate() }
watch(() => props.places, () => void refresh())
watch(() => props.selectedId, id => {
  const place = id ? props.places.find(item => item.id === id) : undefined
  if (place && selectedCity.value !== place.city) cityView(place.city); else focusSelected()
})
onBeforeUnmount(() => { revision++; map?.destroy?.() })
</script>

<template>
  <section class="map-section atlas-map" aria-labelledby="atlas-title">
    <header class="atlas-heading"><div><p class="section-label">PLACE ATLAS</p><h2 id="atlas-title">从全国，到一座城</h2><p>先选城市，再按地图序号选择店铺。</p></div><div class="atlas-count"><strong>{{ total }}</strong><span>个地址<br />{{ groups.length }} 座城市</span></div></header>
    <div class="map-toolbar"><div class="map-breadcrumb"><button :aria-current="!selectedCity || undefined" @click="countryView">中国</button><span>›</span><b>{{ selectedCity || '选择城市' }}</b></div><span v-if="locating">{{ locating }}</span><button v-if="active && selectedCity" class="text-button" @click="countryView">返回全国</button></div>
    <div v-if="!active" class="map-welcome"><h3>{{ total ? '打开全榜地图' : '下一站，等你来标记' }}</h3><p>{{ total ? `已收录 ${groups.length} 座城市的 ${total} 个地址。` : '暂时没有已填写的位置。' }}</p><button v-if="total" class="button dark" @click="activate">加载百度分层地图</button><small v-if="total">访客无需登录；全国层显示城市，城市层显示店铺序号。</small></div>
    <template v-else><div class="city-map-tabs"><button v-for="group in groups" :key="group.city" :aria-pressed="selectedCity === group.city" @click="cityView(group.city)"><i :style="{ background: cityColor(group.city, colors) }"></i>{{ group.city }}<small>{{ group.places.length }}</small></button></div><div ref="container" class="place-map atlas-map-canvas" :aria-label="selectedCity ? `${selectedCity} 百度店铺地图` : '百度中国城市分布地图'"></div><div v-if="selectedGroup" class="city-place-list"><button v-for="(place, index) in selectedGroup.places" :key="place.id" :aria-current="selectedId === place.id || undefined" :aria-label="`${index + 1}号地点：${place.name}`" @click="$emit('select', place.id)"><i class="place-sequence" :style="{ background: cityColor(place.city, colors) }">{{ index + 1 }}</i><span><strong>{{ place.name }}</strong><small>{{ placeAddress(place) }}</small></span><b>→</b></button></div></template>
    <div v-if="mapError" class="map-notice" role="status">{{ mapError }}<button v-if="baiduMapConfigured()" class="text-button" @click="retry">重试</button></div>
  </section>
</template>
