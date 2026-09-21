<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Place } from '../types'
import { cityCenter, cityColor, geocodeAddress, hasCoordinates, navigationUrl, placeAddress } from '../utils/cities'

const props = defineProps<{ places: Place[]; colors: Record<string, string>; selectedId?: string }>()
const emit = defineEmits<{ select: [id: string] }>()
const groups = computed(() => [...new Set(props.places.filter(place => placeAddress(place)).map(place => place.city))].sort((a, b) => a.localeCompare(b, 'zh-CN')).map(city => ({ city, places: props.places.filter(place => place.city === city && placeAddress(place)), center: cityCenter(city) })))
const total = computed(() => groups.value.reduce((sum, group) => sum + group.places.length, 0))
const selectedCity = ref(''), active = ref(false), tileError = ref(false), locating = ref('')
const selectedGroup = computed(() => groups.value.find(group => group.city === selectedCity.value))
const container = ref<HTMLElement>()
let map: L.Map | undefined, layer: L.LayerGroup | undefined, tiles: L.TileLayer | undefined, resize: ResizeObserver | undefined, revision = 0
const markers = new Map<string, L.Marker>()

function countryView() { selectedCity.value = ''; void refresh() }
function cityView(city: string) { selectedCity.value = city; void refresh() }
async function refresh() {
  if (!map || !layer) return
  revision++; locating.value = ''; layer.clearLayers(); markers.clear()
  if (selectedGroup.value) await renderCity(selectedGroup.value, revision)
  else renderCities()
}
function renderCities() {
  if (!map || !layer) return
  for (const group of groups.value) {
    const pin = document.createElement('button'); pin.type = 'button'; pin.className = 'city-map-pin'; pin.style.setProperty('--pin-color', cityColor(group.city, props.colors))
    const name = document.createElement('strong'); name.textContent = group.city
    const count = document.createElement('small'); count.textContent = `${group.places.length} 家`
    pin.append(name, count); pin.onclick = event => { event.stopPropagation(); cityView(group.city) }
    L.marker(group.center, { icon: L.divIcon({ html: pin, className: 'city-map-pin-wrapper', iconSize: [88, 48], iconAnchor: [44, 24] }), title: `${group.city} · ${group.places.length} 家店` }).on('click', () => cityView(group.city)).addTo(layer)
  }
  if (groups.value.length > 1) map.fitBounds(L.latLngBounds(groups.value.map(group => group.center)), { padding: [60, 60], maxZoom: 5, animate: false })
  else if (groups.value[0]) map.setView(groups.value[0].center, 7, { animate: false })
  else map.setView([35.8, 104.1], 4, { animate: false })
}
async function renderCity(group: { city: string; places: Place[]; center: [number, number] }, currentRevision: number) {
  if (!map || !layer) return
  map.setView(group.center, 11, { animate: false })
  const bounds: [number, number][] = []
  for (let index = 0; index < group.places.length; index++) {
    if (currentRevision !== revision) return
    const place = group.places[index]
    locating.value = `正在定位 ${index + 1}/${group.places.length}`
    try {
      const result = hasCoordinates(place) ? { point: [place.location.lat, place.location.lng] as [number, number], cached: true } : await geocodeAddress(placeAddress(place))
      if (currentRevision !== revision) return
      if (result.point) { addPlaceMarker(place, result.point); bounds.push(result.point) }
      if (!result.cached && index < group.places.length - 1) await new Promise(resolve => setTimeout(resolve, 1100))
    } catch { /* one failed address must not block the remaining city */ }
  }
  locating.value = bounds.length === group.places.length ? `${bounds.length} 个位置已标记` : `${bounds.length}/${group.places.length} 个位置已标记`
  if (bounds.length > 1) map.fitBounds(L.latLngBounds(bounds), { padding: [55, 55], maxZoom: 15, animate: false })
  else if (bounds[0]) map.setView(bounds[0], 16, { animate: false })
  focusSelected()
}
function addPlaceMarker(place: Place, point: [number, number]) {
  if (!layer) return
  const icon = document.createElement('span'); icon.className = 'map-pin'; icon.style.backgroundColor = cityColor(place.city, props.colors); icon.textContent = place.city.slice(0, 1)
  const marker = L.marker(point, { icon: L.divIcon({ html: icon, className: 'map-pin-wrapper', iconSize: [34, 34], iconAnchor: [17, 17] }), title: `${place.city} · ${place.name}`, alt: `${place.city} · ${place.name}` })
  const popup = document.createElement('div'), name = document.createElement('strong'); name.textContent = place.name; popup.append(name)
  const address = document.createElement('p'); address.textContent = placeAddress(place); popup.append(address)
  const detail = document.createElement('button'); detail.textContent = '查看详情'; detail.className = 'map-detail-button'; detail.onclick = () => emit('select', place.id); popup.append(detail)
  const go = document.createElement('a'); go.href = navigationUrl(place, true)!; go.textContent = '去这里 ↗'; go.target = '_blank'; go.rel = 'noopener noreferrer'; popup.append(go)
  marker.bindPopup(popup).on('click', () => emit('select', place.id)).addTo(layer); markers.set(place.id, marker)
}
function focusSelected() {
  for (const [id, marker] of markers) marker.getElement()?.querySelector('.map-pin')?.classList.toggle('selected', id === props.selectedId)
  const marker = props.selectedId ? markers.get(props.selectedId) : undefined
  if (marker && map) { map.panTo(marker.getLatLng(), { animate: false }); marker.openPopup() }
}
async function activate() {
  active.value = true; await nextTick(); if (!container.value || map) return
  map = L.map(container.value, { scrollWheelZoom: false }).setView([35.8, 104.1], 4)
  tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).on('tileerror', () => tileError.value = true).addTo(map)
  layer = L.layerGroup().addTo(map); resize = new ResizeObserver(() => map?.invalidateSize()); resize.observe(container.value); await refresh()
}
function retry() { tileError.value = false; tiles?.redraw() }
watch(() => props.places, () => void refresh())
watch(() => props.selectedId, id => { const place = id ? props.places.find(item => item.id === id) : undefined; if (place) selectedCity.value = place.city; void refresh() })
onBeforeUnmount(() => { revision++; resize?.disconnect(); map?.remove() })
</script>

<template>
  <section class="map-section atlas-map" aria-labelledby="atlas-title">
    <header class="atlas-heading"><div><p class="section-label">PLACE ATLAS</p><h2 id="atlas-title">从全国，到一座城</h2><p>先选城市，再在城市地图里选择店铺。</p></div><div class="atlas-count"><strong>{{ total }}</strong><span>个地址<br />{{ groups.length }} 座城市</span></div></header>
    <div class="map-toolbar"><div class="map-breadcrumb"><button :aria-current="!selectedCity || undefined" @click="countryView">中国</button><span>›</span><b>{{ selectedCity || '选择城市' }}</b></div><span v-if="locating">{{ locating }}</span><button v-if="active && selectedCity" class="text-button" @click="countryView">返回全国</button></div>
    <div v-if="!active" class="map-welcome"><h3>{{ total ? '打开全榜地图' : '下一站，等你来标记' }}</h3><p>{{ total ? `已收录 ${groups.length} 座城市的 ${total} 个地址。` : '暂时没有已填写的位置。' }}</p><button v-if="total" class="button dark" @click="activate">加载分层地图</button><small v-if="total">全国层显示城市；进入城市后逐步定位店铺并缓存结果。</small></div>
    <template v-else><div class="city-map-tabs"><button v-for="group in groups" :key="group.city" :aria-pressed="selectedCity === group.city" @click="cityView(group.city)"><i :style="{ background: cityColor(group.city, colors) }"></i>{{ group.city }}<small>{{ group.places.length }}</small></button></div><div ref="container" class="place-map atlas-map-canvas" :aria-label="selectedCity ? `${selectedCity} 店铺地图` : '中国城市分布地图'"></div><div v-if="selectedGroup" class="city-place-list"><button v-for="place in selectedGroup.places" :key="place.id" :aria-current="selectedId === place.id || undefined" @click="$emit('select', place.id)"><i :style="{ background: cityColor(place.city, colors) }"></i><span><strong>{{ place.name }}</strong><small>{{ placeAddress(place) }}</small></span><b>→</b></button></div></template>
    <div v-if="tileError" class="map-notice" role="status">在线底图暂时加载失败，目录与外部导航仍可使用。<button class="text-button" @click="retry">重试底图</button></div>
  </section>
</template>
