<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Place } from '../types'
import { geocodeAddress, hasCoordinates, placeAddress } from '../utils/cities'
import { assetUrl } from '../utils/assets'

const props = defineProps<{ place: Place; color: string }>()
const container = ref<HTMLElement>()
const status = ref('正在定位…'), tileError = ref(false)
let map: L.Map | undefined, tiles: L.TileLayer | undefined

async function coordinates(): Promise<[number, number] | null> {
  if (hasCoordinates(props.place)) return [props.place.location.lat, props.place.location.lng]
  const address = placeAddress(props.place)
  return address ? (await geocodeAddress(address)).point : null
}
async function render() {
  await nextTick(); map?.remove(); map = undefined; status.value = '正在定位…'; tileError.value = false
  if (!container.value) return
  try {
    const point = await coordinates()
    if (!point) { status.value = '暂时无法在线定位此地址'; return }
    map = L.map(container.value, { scrollWheelZoom: false, zoomControl: true }).setView(point, 16)
    tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).on('tileerror', () => tileError.value = true).addTo(map)
    L.circleMarker(point, { radius: 10, color: '#fff', weight: 3, fillColor: props.color, fillOpacity: 1 }).addTo(map).bindTooltip(props.place.name, { permanent: true, direction: 'top' })
    L.control.scale({ imperial: false, maxWidth: 120, position: 'bottomleft' }).addTo(map)
    status.value = ''
  } catch { status.value = '地图暂时无法加载，可使用下方地图服务查看位置' }
}
function retry() { tileError.value = false; tiles?.redraw() }
watch(() => props.place.id, render, { immediate: true })
onBeforeUnmount(() => map?.remove())
</script>

<template>
  <div class="place-address-map">
    <div ref="container" class="address-map-canvas" :aria-label="`${place.name} 的公开地图`"></div>
    <div v-if="tileError" class="map-status map-snapshot-fallback" role="status">
      <template v-if="place.mapSnapshot"><img :src="assetUrl(place.mapSnapshot.src)" :alt="place.mapSnapshot.alt" /><span>显示 {{ place.mapSnapshot.updatedAt }} 的 500m 备份图</span></template>
      <template v-else><span>在线底图暂时无法加载</span><button class="text-button" @click="retry">重试</button></template>
    </div>
    <p v-else-if="status" class="map-status">{{ status }}</p>
  </div>
</template>
