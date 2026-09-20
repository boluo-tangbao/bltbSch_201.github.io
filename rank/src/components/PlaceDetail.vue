<script setup lang="ts">
import { computed } from 'vue'
import type { Place } from '../types'
import { tierLabel } from '../utils/model'
import { navigationUrl, placeAddress } from '../utils/cities'
import AddressMap from './AddressMap.vue'

const props = defineProps<{ place: Place; rank?: number; color: string }>()
const address = computed(() => placeAddress(props.place))
const onlineMapUrl = computed(() => address.value ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(address.value)}` : '')
</script>

<template>
  <article class="guide-detail" :style="{ '--city-color': color }">
    <div class="detail-heading">
      <p class="eyebrow"><i class="city-dot" :style="{ background: color }"></i>{{ place.city }} · {{ tierLabel(place.tier) }}<span v-if="rank"> · 档内第 {{ rank }} 名</span></p>
      <div class="detail-name-line"><h1>{{ place.name }}</h1><p class="detail-summary">{{ place.summary }}</p></div>
      <p class="muted detail-dates"><span v-if="place.visitedAt">到访 · {{ place.visitedAt }}</span><span>内容更新 · {{ place.updatedAt }}</span></p>
    </div>
    <section class="detail-body">
      <div v-if="place.tags.length" class="tags detail-tags" aria-label="店铺标签"><span v-for="tag in place.tags" :key="tag"># {{ tag }}</span></div>
      <h2>详细评价</h2><p v-if="!place.details" class="muted">评价待补充。</p>
      <p v-if="place.details" class="detail-text">{{ place.details }}</p>
    </section>
    <section class="destination-section" aria-label="地点地图">
      <h2>地点地图</h2>
      <template v-if="address">
        <p>{{ address }}</p>
        <AddressMap :place="place" :color="color" />
        <div class="destination-actions"><a :href="onlineMapUrl" target="_blank" rel="noopener noreferrer" class="button">在线地图查看</a><a :href="navigationUrl(place, true)!" target="_blank" rel="noopener noreferrer" class="button dark">怎么去 · 高德地图 ↗</a></div>
        <p class="muted navigation-hint">地图按填写地址在线定位；“怎么去”会优先交给已安装的高德地图处理。</p>
      </template>
      <p v-else class="muted">位置待补充，暂不提供地图。</p>
    </section>
  </article>
</template>
