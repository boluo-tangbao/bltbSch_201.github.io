<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { Place } from '../types'
import { baiduMapConfigured, escapeMapHtml, loadBaiduMaps, pointForPlace } from '../utils/baiduMaps'
import { assetUrl } from '../utils/assets'

const props = defineProps<{ place: Place; color: string }>()
const container = ref<HTMLElement>()
const status = ref('正在加载百度地图…'), failed = ref(false)
let map: any
let revision = 0

async function render() {
  const current = ++revision
  await nextTick()
  map?.destroy?.(); map = undefined; failed.value = false
  status.value = baiduMapConfigured() ? '正在加载百度地图…' : '百度地图尚未配置，请设置站点 AK'
  if (!container.value || !baiduMapConfigured()) { failed.value = true; return }
  try {
    const api = await loadBaiduMaps()
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
    console.error('[BaiduMap] 店铺地图加载失败', error)
    failed.value = true
    status.value = error instanceof Error ? error.message : '百度地图暂时无法加载'
  }
}

watch(() => props.place.id, render, { immediate: true })
onBeforeUnmount(() => { revision++; map?.destroy?.() })
</script>

<template>
  <div class="place-address-map">
    <div ref="container" class="address-map-canvas" :aria-label="`${place.name} 的百度地图`"></div>
    <div v-if="failed" class="map-status map-snapshot-fallback" role="status">
      <template v-if="place.mapSnapshot"><img :src="assetUrl(place.mapSnapshot.src)" :alt="place.mapSnapshot.alt" /><span>显示 {{ place.mapSnapshot.updatedAt }} 的 500m 备份图</span></template>
      <template v-else><span>{{ status }}</span><button v-if="baiduMapConfigured()" class="text-button" @click="render">重试</button></template>
    </div>
    <p v-else-if="status" class="map-status">{{ status }}</p>
  </div>
</template>
