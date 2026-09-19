<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Place } from '../types'
import { tierLabel } from '../utils/model'
import { assetUrl } from '../utils/assets'
import { formatTime, navigationUrl } from '../utils/cities'
import PlaceImage from './PlaceImage.vue'
const props = defineProps<{ place: Place; rank?: number; color: string }>()
const videoBroken = ref(false)
watch(() => props.place.id, () => videoBroken.value = false)
const segment = computed(() => {
  const v = props.place.video
  if (v?.startSeconds === undefined) return ''
  return `${formatTime(v.startSeconds)}${v.endSeconds !== undefined ? `–${formatTime(v.endSeconds)}` : ' 起'}`
})
</script>
<template>
  <article class="guide-detail" :style="{ '--city-color': color }">
    <div class="detail-heading"><p class="eyebrow"><i class="city-dot" :style="{ background: color }"></i>{{ place.city }} · {{ tierLabel(place.tier) }}<span v-if="rank"> · 档内第 {{ rank }} 名</span><span v-if="place.isDemo" class="demo-badge">演示</span></p><h1>{{ place.name }}</h1><p class="detail-summary">{{ place.summary }}</p><p class="muted">到访 · {{ place.visitedAt || '未记录' }}<br />内容更新 · {{ place.updatedAt }}</p></div>
    <section class="video-section" aria-label="视频介绍"><div class="section-heading"><h2>先看这段介绍</h2><span v-if="segment" class="video-time">{{ segment }}</span></div>
      <template v-if="place.video"><video v-if="place.video.clip && !videoBroken" :key="place.id" :src="assetUrl(place.video.clip)" controls playsinline preload="metadata" :aria-label="place.video.title" @error="videoBroken = true"></video><p v-if="videoBroken" role="status">视频片段暂时无法播放，可以打开原视频查看。</p><h3>{{ place.video.title }}</h3><blockquote v-if="place.video.excerpt" class="video-excerpt">{{ place.video.excerpt }}</blockquote><p v-else class="muted">视频文字节选待补充。</p><a class="button dark" :href="place.video.url" target="_blank" rel="noopener noreferrer">打开原视频 ↗</a><p v-if="!place.video.clip" class="muted video-hint">{{ segment ? `对应片段：${segment}。` : '' }}视频暂通过原链接观看。</p></template>
      <div v-else class="video-pending"><span aria-hidden="true">▷</span><p>视频介绍待补充</p><small>收录后，这里会放对应视频片段与文字节选。</small></div>
    </section>
    <section class="destination-section" aria-label="到访导航"><h2>这一站，怎么去</h2><template v-if="place.location"><p>{{ place.location.address || '详细地址待补充' }}</p><div class="destination-actions"><a :href="navigationUrl(place, true)!" target="_blank" rel="noopener noreferrer" class="button dark">去这里 · 高德地图 ↗</a><a :href="navigationUrl(place)!" target="_blank" rel="noopener noreferrer" class="button">网页版地图</a></div><p class="muted navigation-hint">手机可尝试打开高德 App；也可在网页版查看地点，再选择出行路线。</p></template><p v-else class="muted">位置待补充，暂不提供导航。</p></section>
    <section class="detail-body"><h2>图文补充</h2><p v-if="!place.details && !place.pros && !place.cons && !place.cover && !place.gallery.length" class="muted">等下一次线下探访，再慢慢补上图文。</p><div v-if="place.cover" class="detail-photo"><PlaceImage :src="place.cover" :alt="place.coverAlt" :position="place.coverPosition" /></div><div class="tags"><span v-for="tag in place.tags" :key="tag">{{ tag }}</span></div><div v-if="place.pros || place.cons" class="pros-cons"><section v-if="place.pros"><h3>值得一提</h3><p>{{ place.pros }}</p></section><section v-if="place.cons"><h3>有点遗憾</h3><p>{{ place.cons }}</p></section></div><p v-if="place.details" class="detail-text">{{ place.details }}</p><figure v-for="image in place.gallery" :key="image.src"><PlaceImage :src="image.src" :alt="image.alt" /><figcaption>{{ image.alt }}</figcaption></figure></section>
  </article>
</template>
