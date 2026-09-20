<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Place } from '../types'
import { hasCoordinates, placeAddress } from '../utils/cities'

const props = defineProps<{ place: Place; color: string }>()
const container = ref<HTMLElement>()
const status = ref('正在定位…')
let map: L.Map | undefined

async function coordinates(): Promise<L.LatLngTuple | null> {
  if (hasCoordinates(props.place)) return [props.place.location.lat, props.place.location.lng]
  const address = placeAddress(props.place)
  if (!address) return null
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(address)}`)
  const result = await response.json() as Array<{ lat: string; lon: string }>
  return result[0] ? [Number(result[0].lat), Number(result[0].lon)] : null
}

async function render() {
  await nextTick()
  map?.remove(); map = undefined
  if (!container.value) return
  try {
    const point = await coordinates()
    if (!point || !Number.isFinite(point[0]) || !Number.isFinite(point[1])) { status.value = '暂时无法在线定位此地址'; return }
    map = L.map(container.value, { scrollWheelZoom: false, zoomControl: true }).setView(point, 16)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map)
    L.circleMarker(point, { radius: 10, color: '#fff', weight: 3, fillColor: props.color, fillOpacity: 1 }).addTo(map).bindTooltip(props.place.name, { permanent: true, direction: 'top' })
    status.value = ''
  } catch { status.value = '地图暂时无法加载，可使用下方在线地图查看位置' }
}

watch(() => props.place.id, render, { immediate: true })
onBeforeUnmount(() => map?.remove())
</script>

<template>
  <div class="place-address-map">
    <div ref="container" class="address-map-canvas" :aria-label="`${place.name} 的公开地图`"></div>
    <p v-if="status" class="map-status">{{ status }}</p>
  </div>
</template>
