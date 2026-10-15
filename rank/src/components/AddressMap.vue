<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { Place } from '../types'
import { baiduMapConfigured, escapeMapHtml, loadBaiduMaps, pointForPlace } from '../utils/baiduMaps'
import { assetUrl } from '../utils/assets'
import { placeAddress } from '../utils/cities'
import AddressActions from './AddressActions.vue'

const props = defineProps<{ place: Place; color: string }>()
const container = ref<HTMLElement>()
const status = ref('正在加载百度地图…'), failed = ref(false)
let map: any
let revision = 0

async function render() {
  const current = ++revision
  map?.destroy?.(); map = undefined; failed.value = false
  status.value = baiduMapConfigured() ? '正在加载百度地图…' : '地图暂时无法显示'
  await nextTick()
  if (current !== revision) return
  if (!container.value || !baiduMapConfigured()) { failed.value = true; return }
  try {
    const api = await loadBaiduMaps()
    if (current !== revision) return
    const point = await pointForPlace(api, props.place)
    if (current !== revision) return
    if (!point) throw new Error(`无法解析地址：${props.place.name}`)
    map = new api.Map(container.value, { enableMapClick: false })
    map.centerAndZoom(point, 17)
    map.enableScrollWheelZoom(true)
    map.addControl(new api.ScaleControl({ anchor: 2 }))
    map.addControl(new api.ZoomControl({ anchor: 3 }))
    const marker = new api.Marker(point)
    map.addOverlay(marker)
    const label = new api.Label(escapeMapHtml(props.place.name), { position: point, offset: new api.Size(18, -34) })
    label.setStyle({ border: '0', borderRadius: '5px', padding: '6px 9px', color: '#fff', background: props.color, boxShadow: '0 2px 8px #1f2d1d40', fontSize: '12px', fontWeight: '700' })
    map.addOverlay(label)
    status.value = ''
  } catch (error) {
    if (current !== revision) return
    console.error('[BaiduMap] 店铺地图加载失败', error)
    failed.value = true
    status.value = '地图暂时无法显示'
  }
}

watch(() => props.place.id, render, { immediate: true })
onBeforeUnmount(() => { revision++; map?.destroy?.() })
</script>

<template>
  <div class="place-address-map" :class="{ 'has-map-fallback': failed }">
    <div v-show="!failed" ref="container" class="address-map-canvas" :aria-label="`${place.name} 的百度地图`"></div>
    <div v-if="failed" class="address-map-fallback">
      <p role="status">{{ status }}<button v-if="baiduMapConfigured()" class="text-button" @click="render">重试</button></p>
      <figure v-if="place.mapSnapshot"><img :src="assetUrl(place.mapSnapshot.src)" :alt="place.mapSnapshot.alt" /><figcaption>{{ place.mapSnapshot.updatedAt }} · 500m 备份图</figcaption></figure>
      <p class="fallback-address">{{ placeAddress(place) }}</p>
      <AddressActions :place="place" />
    </div>
    <p v-else-if="status" class="map-status">{{ status }}</p>
  </div>
</template>

<style scoped>
.place-address-map.has-map-fallback { min-height: 0; }
.address-map-fallback { padding: 16px; color: #76515d; font-size: 13px; overflow-wrap: anywhere; }
.address-map-fallback > p { margin: 0 0 12px; }
.address-map-fallback figure { margin: 12px 0; }
.address-map-fallback img { display: block; width: 100%; max-height: 340px; object-fit: contain; }
.address-map-fallback figcaption { margin-top: 6px; font-size: 11px; }
.fallback-address { line-height: 1.8; }
</style>
