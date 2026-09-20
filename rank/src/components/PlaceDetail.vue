<script setup lang="ts">
import { computed } from 'vue'
import type { Place } from '../types'
import { tierLabel } from '../utils/model'
import { navigationUrl, hasCoordinates, placeAddress } from '../utils/cities'

const props = defineProps<{ place: Place; rank?: number; color: string }>()
const address = computed(() => placeAddress(props.place))
const mapUrl = computed(() => address.value ? `https://uri.amap.com/search?keyword=${encodeURIComponent(address.value)}` : '')
</script>

<template>
  <article class="guide-detail" :style="{ '--city-color': color }">
    <div class="detail-heading">
      <p class="eyebrow"><i class="city-dot" :style="{ background: color }"></i>{{ place.city }} · {{ tierLabel(place.tier) }}<span v-if="rank"> · 档内第 {{ rank }} 名</span></p>
      <h1>{{ place.name }}</h1><p class="detail-summary">{{ place.summary }}</p>
      <p class="muted">到访 · {{ place.visitedAt || '未记录' }}<br />内容更新 · {{ place.updatedAt }}</p>
    </div>
    <section class="detail-body">
      <h2>详细评价</h2><p v-if="!place.details" class="muted">评价待补充。</p>
      <div v-if="place.tags.length" class="tags detail-tags" aria-label="店铺标签"><span v-for="tag in place.tags" :key="tag"># {{ tag }}</span></div>
      <p v-if="place.details" class="detail-text">{{ place.details }}</p>
    </section>
    <section class="destination-section" aria-label="地点地图">
      <h2>地点地图</h2>
      <template v-if="address">
        <p>{{ address }}</p>
        <div class="place-address-map"><iframe :src="mapUrl" :title="`${place.name} 的高德地图`" loading="lazy" referrerpolicy="no-referrer" allowfullscreen></iframe><a :href="mapUrl" target="_blank" rel="noopener noreferrer">在高德地图中打开 ↗</a></div>
        <template v-if="hasCoordinates(place)"><div class="destination-actions"><a :href="navigationUrl(place, true)!" target="_blank" rel="noopener noreferrer" class="button dark">去这里 · 高德地图 ↗</a><a :href="navigationUrl(place)!" target="_blank" rel="noopener noreferrer" class="button">网页版地图</a></div></template>
        <p v-else class="muted navigation-hint">根据填写地址定位；如需统一地图标记和路线按钮，再补充 WGS84 坐标即可。</p>
      </template>
      <p v-else class="muted">位置待补充，暂不提供地图。</p>
    </section>
  </article>
</template>
