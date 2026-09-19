<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Place } from '../types'
import { cityColor, navigationUrl } from '../utils/cities'
const props = defineProps<{ places: Place[]; colors: Record<string, string>; selectedId?: string }>()
const emit = defineEmits<{ select: [id: string] }>()
const points = computed(() => props.places.filter(p => p.location))
const container = ref<HTMLElement>()
const active = ref(false), tileError = ref(false)
let map: L.Map | undefined, layer: L.LayerGroup | undefined, tiles: L.TileLayer | undefined
let resize: ResizeObserver | undefined
const markers = new Map<string, L.Marker>()
function refresh() {
  if (!map || !layer) return
  layer.clearLayers(); markers.clear()
  for (const p of points.value) {
    const icon = document.createElement('span')
    icon.className = 'map-pin'; icon.style.backgroundColor = cityColor(p.city, props.colors); icon.textContent = p.city.slice(0, 1)
    const marker = L.marker([p.location!.lat, p.location!.lng], {
      icon: L.divIcon({ html: icon, className: 'map-pin-wrapper', iconSize: [34, 34], iconAnchor: [17, 17] }),
      title: `${p.city} · ${p.name}`, alt: `${p.city} · ${p.name}`, keyboard: true,
    })
    const popup = document.createElement('div')
    const name = document.createElement('strong'); name.textContent = p.name; popup.append(name)
    const location = document.createElement('p'); location.textContent = `${p.city}${p.isDemo ? ' · 演示' : ''}`; popup.append(location)
    const detail = document.createElement('button'); detail.textContent = '查看视频与详情'; detail.className = 'map-detail-button'; detail.onclick = () => emit('select', p.id); popup.append(detail)
    const go = document.createElement('a'); go.href = navigationUrl(p, true)!; go.textContent = '去这里 ↗'; go.target = '_blank'; go.rel = 'noopener noreferrer'; popup.append(go)
    marker.bindPopup(popup).on('click', () => emit('select', p.id)).addTo(layer)
    markers.set(p.id, marker)
  }
  fitAll(); focusSelected()
}
function fitAll() {
  if (map && points.value.length) map.fitBounds(L.latLngBounds(points.value.map(p => [p.location!.lat, p.location!.lng])), { padding: [45, 45], maxZoom: 14, animate: false })
}
function focusSelected() {
  if (!map) return
  for (const [id, marker] of markers) marker.getElement()?.querySelector('.map-pin')?.classList.toggle('selected', id === props.selectedId)
  const marker = props.selectedId ? markers.get(props.selectedId) : undefined
  if (marker) { map.panTo(marker.getLatLng(), { animate: false }); marker.openPopup() }
}
async function activate() {
  active.value = true; await nextTick()
  if (!container.value || map) return
  map = L.map(container.value, { scrollWheelZoom: false }).setView([0, 0], 2)
  tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).on('tileerror', () => tileError.value = true).addTo(map)
  layer = L.layerGroup().addTo(map)
  resize = new ResizeObserver(() => map?.invalidateSize()); resize.observe(container.value)
  refresh()
}
function retry() { tileError.value = false; tiles?.redraw() }
watch(() => props.places, refresh)
watch(() => props.selectedId, focusSelected)
onBeforeUnmount(() => { resize?.disconnect(); map?.remove() })
</script>
<template>
  <section class="map-section" aria-label="店铺地图">
    <div class="map-toolbar"><span>{{ points.length }} 个位置已收录<span v-if="places.length > points.length"> · {{ places.length - points.length }} 个待补位置</span></span><button v-if="active && points.length" class="text-button" @click="fitAll">查看全部位置</button></div>
    <div v-if="!active" class="map-welcome"><svg viewBox="0 0 120 80" width="120" height="80" fill="none" aria-hidden="true"><path d="m10 17 33-8 33 8 33-8v55l-33 8-33-8-33 8V17Z" stroke="currentColor" stroke-width="1.5"/><path d="M43 9v55m33-47v55" stroke="currentColor" stroke-width="1.5"/><path d="M72 29c0 10-12 21-12 21S48 39 48 29a12 12 0 0 1 24 0Z" fill="#f8f7f3" stroke="currentColor" stroke-width="2"/><circle cx="60" cy="29" r="4" fill="currentColor"/></svg><h2>{{ points.length ? '从榜单，走到店里' : '下一站，等你来标记' }}</h2><p>{{ points.length ? '打开地图，按城市颜色找到想去的地方。' : '暂时没有已填写的位置。补充店铺坐标后，就能在这里查阅。' }}</p><button v-if="points.length" class="button dark" @click="activate">加载互动地图</button><small v-if="points.length">地图由 OpenStreetMap 提供；导航可打开高德。</small></div>
    <div v-show="active" ref="container" class="place-map" aria-label="互动地图"></div>
    <p v-if="active && !points.length" class="map-notice" role="status">当前筛选没有已填写的位置，请重置筛选或从目录查看介绍。</p>
    <div v-if="tileError" class="map-notice" role="status">底图暂时加载失败，仍可通过目录查看地点和导航。<button class="text-button" @click="retry">重试底图</button></div>
  </section>
</template>
