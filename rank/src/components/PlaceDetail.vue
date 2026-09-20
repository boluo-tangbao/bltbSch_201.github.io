<script setup lang="ts">
import type { Place } from '../types'
import { tierLabel } from '../utils/model'
import { navigationUrl, hasCoordinates, placeAddress } from '../utils/cities'
import PlaceImage from './PlaceImage.vue'
defineProps<{ place: Place; rank?: number; color: string }>()
</script>
<template>
  <article class="guide-detail" :style="{ '--city-color': color }">
    <div class="detail-heading"><p class="eyebrow"><i class="city-dot" :style="{ background: color }"></i>{{ place.city }} · {{ tierLabel(place.tier) }}<span v-if="rank"> · 档内第 {{ rank }} 名</span></p><h1>{{ place.name }}</h1><p class="detail-summary">{{ place.summary }}</p><p class="muted">到访 · {{ place.visitedAt || '未记录' }}<br />内容更新 · {{ place.updatedAt }}</p></div>
    <section class="detail-body"><h2>详细评价</h2><p v-if="!place.details && !place.cover && !place.gallery.length" class="muted">等下一次线下探访，再慢慢补上图文。</p><div v-if="place.cover" class="detail-photo"><PlaceImage :src="place.cover" :alt="place.city + ' · ' + place.name" :position="place.coverPosition" /></div><div class="tags"><span v-for="tag in place.tags" :key="tag">{{ tag }}</span></div><p v-if="place.details" class="detail-text">{{ place.details }}</p><figure v-for="image in place.gallery" :key="image.src"><PlaceImage :src="image.src" :alt="image.alt" /><figcaption>{{ image.alt }}</figcaption></figure></section>
    <section class="destination-section" aria-label="到访导航"><h2>这一站，怎么去</h2><template v-if="place.location"><p>{{ placeAddress(place) || '详细地址待补充' }}</p><template v-if="hasCoordinates(place)"><div class="destination-actions"><a :href="navigationUrl(place, true)!" target="_blank" rel="noopener noreferrer" class="button dark">去这里 · 高德地图 ↗</a><a :href="navigationUrl(place)!" target="_blank" rel="noopener noreferrer" class="button">网页版地图</a></div><p class="muted navigation-hint">手机可尝试打开高德 App；也可在网页版查看地点，再选择出行路线。</p></template><p v-else class="muted navigation-hint">地址已记录，补充坐标后可在地图定位与导航。</p></template><p v-else class="muted">位置待补充，暂不提供导航。</p></section>
  </article>
</template>
