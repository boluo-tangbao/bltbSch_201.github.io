<script setup lang="ts">
import { computed } from 'vue'
import type { Place } from '../types'
import { tierLabel } from '../utils/model'
import { baiduMapUrl, googleMapsUrl, navigationUrl, placeAddress } from '../utils/cities'
import AddressMap from './AddressMap.vue'
import PlaceGallery from './PlaceGallery.vue'

const props = defineProps<{ place: Place; rank?: number; color: string }>()
const address = computed(() => placeAddress(props.place))
const detailParagraphs = computed(() => props.place.details.split(/\r?\n+/).map((paragraph) => paragraph.trim()).filter(Boolean))
</script>

<template>
  <article class="guide-detail" :style="{ '--city-color': color }">
    <header class="detail-heading">
      <p class="detail-kicker"><i class="city-dot" :style="{ background: color }"></i><span>{{ place.city }}</span><span aria-hidden="true">/</span><span>{{ tierLabel(place.tier) }}</span><span v-if="rank" aria-hidden="true">/</span><span v-if="rank">档内第 {{ rank }} 名</span></p>
      <h1>{{ place.name }}</h1><p class="detail-summary">{{ place.summary }}</p>
      <div class="detail-facts"><span v-if="place.visitedAt"><small>到访</small>{{ place.visitedAt }}</span><span><small>更新</small>{{ place.updatedAt }}</span><span v-if="address"><small>地址</small>{{ address }}</span></div>
      <div v-if="place.tags.length" class="tags detail-tags" aria-label="店铺标签"><span v-for="item in place.tags" :key="item"># {{ item }}</span></div>
    </header>
    <section class="detail-body detail-review" aria-labelledby="review-heading">
      <div class="detail-review-heading">
        <div>
          <p class="section-label">MY NOTES</p>
          <h2 id="review-heading">详细评价</h2>
        </div>
        <span class="detail-note-sticker" aria-hidden="true"><i>✦</i> 逛店手记</span>
      </div>
      <p class="detail-review-deck">沿着我的逛店路线，记录值得留意的细节</p>
      <div v-if="detailParagraphs.length" class="detail-story-card">
        <div class="detail-story-caption"><span class="detail-story-star" aria-hidden="true">✦</span><span>现场观察</span><span class="detail-story-caption-en">FIELD NOTES</span><span class="detail-story-rule"></span></div>
        <div class="detail-paragraphs">
          <p v-for="(paragraph, index) in detailParagraphs" :key="index"><span class="detail-paragraph-index" aria-hidden="true">{{ String(index + 1).padStart(2, '0') }}</span><span>{{ paragraph }}</span></p>
        </div>
        <span class="detail-story-doodle" aria-hidden="true">✧</span>
      </div>
      <p v-else class="detail-empty">评价待补充。</p>
    </section>
    <PlaceGallery v-if="place.gallery.length" :images="place.gallery" :color="color" />
    <section v-if="address" class="place-mini-map" aria-labelledby="nearby-map-heading">
      <div class="place-mini-map-heading"><div><p class="section-label">AROUND HERE</p><h2 id="nearby-map-heading">店铺周边</h2></div><span>百度地图 · 无需访客登录 · 可拖动、缩放</span></div>
      <AddressMap :place="place" :color="color" />
      <p class="map-caption">百度在线地图异常时，可显示配置过的每月 500m 备份图。</p>
    </section>
    <footer class="detail-destination" aria-label="怎么去">
      <div><p class="section-label">DIRECTIONS</p><h2>怎么去</h2><p>{{ address || '位置待补充，暂不提供导航。' }}</p></div>
      <div v-if="address" class="destination-actions"><a :href="baiduMapUrl(place)!" target="_blank" rel="noopener noreferrer" class="button dark">百度地图 ↗</a><a :href="navigationUrl(place, true)!" target="_blank" rel="noopener noreferrer" class="button">高德地图 ↗</a><a :href="googleMapsUrl(place)!" target="_blank" rel="noopener noreferrer" class="button">Google 地图 ↗</a></div>
    </footer>
  </article>
</template>
