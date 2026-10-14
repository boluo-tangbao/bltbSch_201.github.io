<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Place } from '../types'
import { tierLabel } from '../utils/model'
import { baiduMapUrl, googleMapsUrl, navigationUrl, placeAddress } from '../utils/cities'
import AddressMap from './AddressMap.vue'
import PlaceGallery from './PlaceGallery.vue'
import ShopDirectory from './ShopDirectory.vue'
import shopDirectories from '../data/shop-directories.json'
import type { ShopDirectory as ShopDirectoryData } from '../types'
import { parseRichText, richTextClasses } from '../utils/richText'

const props = defineProps<{ place: Place; rank?: number; color: string }>()
const address = computed(() => placeAddress(props.place))
const detailParagraphs = computed(() => props.place.details.split(/\r?\n+/).map(paragraph => paragraph.trim()).filter(Boolean).map(paragraph => parseRichText(paragraph)))
const visitNotes = computed(() => (props.place.visitNotes ?? []).map(note => parseRichText(note)))
const shopDirectory = computed(() => (shopDirectories as Record<string, ShopDirectoryData>)[props.place.id])
const chapterNav = ref<HTMLElement>()
const activeChapter = ref('overview')
const chapterId = (key: string) => `place-${props.place.id}-${key}`
const chapters = computed(() => [
  ...(detailParagraphs.value.length || visitNotes.value.length ? [{ key: 'overview', label: '介绍' }] : []),
  ...(shopDirectory.value ? [{ key: 'shops', label: '店铺' }] : []),
  ...(props.place.gallery.length ? [{ key: 'gallery', label: '图集' }] : []),
  ...(address.value ? [{ key: 'nearby', label: '周边' }] : []),
  { key: 'directions', label: '怎么去' },
])
let scrollFrame = 0
function updateChapter() {
  scrollFrame = 0
  const boundary = (chapterNav.value?.getBoundingClientRect().bottom ?? 48) + 24
  let current = chapters.value[0]?.key ?? 'directions'
  for (const chapter of chapters.value) {
    const section = document.getElementById(chapterId(chapter.key))
    if (section && section.getBoundingClientRect().top <= boundary) current = chapter.key
  }
  if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) current = 'directions'
  activeChapter.value = current
}
function scheduleChapterUpdate() {
  if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateChapter)
}
function goToChapter(key: string) {
  const section = document.getElementById(chapterId(key))
  if (!section) return
  activeChapter.value = key
  section.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
}
onMounted(() => {
  window.addEventListener('scroll', scheduleChapterUpdate, { passive: true })
  window.addEventListener('resize', scheduleChapterUpdate)
  updateChapter()
})
watch(chapters, () => nextTick(updateChapter))
onBeforeUnmount(() => {
  window.removeEventListener('scroll', scheduleChapterUpdate)
  window.removeEventListener('resize', scheduleChapterUpdate)
  if (scrollFrame) window.cancelAnimationFrame(scrollFrame)
})
</script>

<template>
  <article class="guide-detail has-chapters" :style="{ '--city-color': color }">
    <header class="detail-heading">
      <p class="detail-kicker"><i class="city-dot" :style="{ background: color }"></i><span>{{ place.city }}</span><span aria-hidden="true">/</span><span>{{ tierLabel(place.tier) }}</span><span v-if="rank" aria-hidden="true">/</span><span v-if="rank">档内第 {{ rank }} 名</span></p>
      <h1>{{ place.name }}</h1><p class="detail-summary">{{ place.summary }}</p>
      <div class="detail-facts"><span v-if="place.visitedAt"><small>到访</small>{{ place.visitedAt }}</span><span><small>更新</small>{{ place.updatedAt }}</span><span v-if="address"><small>地址</small>{{ address }}</span></div>
      <div v-if="place.tags.length" class="tags detail-tags" aria-label="店铺标签"><span v-for="item in place.tags" :key="item"># {{ item }}</span></div>
    </header>
    <nav ref="chapterNav" class="detail-chapters" aria-label="地点章节导航">
      <button v-for="chapter in chapters" :key="chapter.key" type="button" :aria-controls="chapterId(chapter.key)" :aria-current="activeChapter === chapter.key ? 'location' : undefined" @click="goToChapter(chapter.key)">{{ chapter.label }}</button>
    </nav>
    <section v-if="detailParagraphs.length || visitNotes.length" :id="chapterId('overview')" class="detail-body detail-review detail-chapter" aria-labelledby="review-heading">
      <header class="detail-review-heading">
        <div><p class="section-label">PLACE OVERVIEW</p><h2 id="review-heading">商圈介绍</h2></div>
        <span v-if="detailParagraphs.length" class="detail-review-meta">{{ detailParagraphs.length }} 段介绍</span>
      </header>
      <p v-if="detailParagraphs.length" class="detail-review-deck">环境、店铺分布与逛店体验</p>
      <div v-if="detailParagraphs.length" class="detail-prose">
        <p v-for="(paragraph, index) in detailParagraphs" :key="index"><template v-for="(part, partIndex) in paragraph" :key="partIndex"><strong v-if="part.strong" :class="richTextClasses(part)">{{ part.text }}</strong><span v-else :class="richTextClasses(part)">{{ part.text }}</span></template></p>
      </div>
      <aside v-if="visitNotes.length" class="detail-visit-notes" aria-labelledby="visit-notes-heading">
        <header class="detail-visit-heading"><div><p class="section-label">bltb's picks</p><h3 id="visit-notes-heading">菠萝の建议</h3></div></header>
        <ul class="detail-visit-list"><li v-for="(note, index) in visitNotes" :key="index"><span class="detail-visit-mark" aria-hidden="true">↗</span><p><template v-for="(part, partIndex) in note" :key="partIndex"><strong v-if="part.strong" :class="richTextClasses(part)">{{ part.text }}</strong><span v-else :class="richTextClasses(part)">{{ part.text }}</span></template></p></li></ul>
      </aside>
    </section>
    <ShopDirectory v-if="shopDirectory" :id="chapterId('shops')" class="detail-chapter" :directory="shopDirectory" :visited-at="place.visitedAt" />
    <div v-if="place.gallery.length" :id="chapterId('gallery')" class="detail-chapter"><PlaceGallery :images="place.gallery" :color="color" /></div>
    <section v-if="address" :id="chapterId('nearby')" class="place-mini-map detail-chapter" aria-labelledby="nearby-map-heading">
      <div class="place-mini-map-heading"><div><p class="section-label">AROUND HERE</p><h2 id="nearby-map-heading">店铺周边</h2></div><span>百度地图 · 无需访客登录 · 可拖动、缩放</span></div>
      <AddressMap :place="place" :color="color" />
      <p class="map-caption">百度在线地图异常时，可显示配置过的每月 500m 备份图。</p>
    </section>
    <footer :id="chapterId('directions')" class="detail-destination detail-chapter" aria-label="怎么去">
      <div><p class="section-label">DIRECTIONS</p><h2>怎么去</h2><p>{{ address || '位置待补充，暂不提供导航。' }}</p></div>
      <div v-if="address" class="destination-actions"><a :href="baiduMapUrl(place)!" target="_blank" rel="noopener noreferrer" class="button dark">百度地图 ↗</a><a :href="navigationUrl(place, true)!" target="_blank" rel="noopener noreferrer" class="button">高德地图 ↗</a><a :href="googleMapsUrl(place)!" target="_blank" rel="noopener noreferrer" class="button">Google 地图 ↗</a></div>
    </footer>
  </article>
</template>

<style scoped>
.guide-detail.has-chapters { overflow: visible; }
.detail-chapters { position: sticky; top: 0; z-index: 600; display: flex; gap: 4px; overflow-x: auto; padding: 6px 16px; border-top: 1px solid #dfb8c3; border-bottom: 1px solid #dfb8c3; background: var(--manga-paper, #fffaf1); }
.detail-chapters button { flex: none; min-height: 44px; padding: 7px 14px; border: 0; border-bottom: 3px solid transparent; background: transparent; color: #755d6a; font: inherit; font-size: 13px; font-weight: 700; }
.detail-chapters button[aria-current] { border-bottom-color: #a83750; color: #a83750; background: #fff0f2; }
.detail-chapter { scroll-margin-top: 72px; }
.has-chapters :deep(.place-gallery-group) { scroll-margin-top: 72px; }
@media (max-width: 580px) {
  .detail-chapters { gap: 0; padding: 4px 6px; }
  .detail-chapters button { padding: 7px 11px; font-size: 12px; }
}
.text-red.text-red { color: #c62828; background: none; }
.text-large { font-size: 1.25em; font-weight: 800; line-height: 1.6; }
.text-huge { font-size: 2.8em; font-weight: 900; line-height: 1.3; }
</style>
