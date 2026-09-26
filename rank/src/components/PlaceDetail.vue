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
const visitNotes = computed(() => props.place.visitNotes ?? [])
</script>

<template>
  <article class="guide-detail" :style="{ '--city-color': color }">
    <header class="detail-heading">
      <p class="detail-kicker"><i class="city-dot" :style="{ background: color }"></i><span>{{ place.city }}</span><span aria-hidden="true">/</span><span>{{ tierLabel(place.tier) }}</span><span v-if="rank" aria-hidden="true">/</span><span v-if="rank">档内第 {{ rank }} 名</span></p>
      <h1>{{ place.name }}</h1><p class="detail-summary">{{ place.summary }}</p>
      <div class="detail-facts"><span v-if="place.visitedAt"><small>到访</small>{{ place.visitedAt }}</span><span><small>更新</small>{{ place.updatedAt }}</span><span v-if="address"><small>地址</small>{{ address }}</span></div>
      <div v-if="place.tags.length" class="tags detail-tags" aria-label="店铺标签"><span v-for="item in place.tags" :key="item"># {{ item }}</span></div>
    </header>
    <section v-if="detailParagraphs.length || visitNotes.length" class="detail-body detail-review" aria-labelledby="review-heading">
      <header class="detail-review-heading">
        <div><p class="section-label">PLACE OVERVIEW</p><h2 id="review-heading">商圈介绍</h2></div>
        <span v-if="detailParagraphs.length" class="detail-review-meta">{{ detailParagraphs.length }} 段介绍</span>
      </header>
      <p v-if="detailParagraphs.length" class="detail-review-deck">环境、店铺分布与逛店体验</p>
      <div v-if="detailParagraphs.length" class="detail-prose">
        <p v-for="(paragraph, index) in detailParagraphs" :key="index">{{ paragraph }}</p>
      </div>
      <aside v-if="visitNotes.length" class="detail-visit-notes" aria-labelledby="visit-notes-heading">
        <header class="detail-visit-heading"><span class="detail-visit-icon" aria-hidden="true">✦</span><div><p class="section-label">FIELD NOTES</p><h3 id="visit-notes-heading">到访手记</h3></div></header>
        <ul class="detail-visit-list"><li v-for="(note, index) in visitNotes" :key="index"><span class="detail-visit-mark" aria-hidden="true">↗</span><p>{{ note }}</p></li></ul>
      </aside>
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
