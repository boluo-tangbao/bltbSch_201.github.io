<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Place } from '../types'
import { tierLabel } from '../utils/model'
import { baiduMapUrl, googleMapsUrl, navigationUrl, placeAddress } from '../utils/cities'
import AddressMap from './AddressMap.vue'
import PlaceGallery from './PlaceGallery.vue'
import ShopDirectory from './ShopDirectory.vue'
import BilibiliClips from './BilibiliClips.vue'
import shopDirectories from '../data/shop-directories.json'
import type { ShopDirectory as ShopDirectoryData } from '../types'
import { parseRichText, richTextClasses } from '../utils/richText'
import { createPlaceSearchIndex, matchPlaces, searchTargetId } from '../utils/search'
import { assetUrl } from '../utils/assets'
import bilibiliCatalog from '../data/bilibili-videos.json'
import { placeClips } from '../utils/bilibili'
import type { BilibiliCatalog } from '../types/bilibili'

const props = defineProps<{ place: Place; rank?: number; color: string; searchQuery?: string }>()
const address = computed(() => placeAddress(props.place))
const nearbyNavigation = (address: string) => `https://uri.amap.com/search?${new URLSearchParams({ keyword: address, callnative: '1', src: 'tangbao-shop-ranking' })}`
const visitLogos = { mihoyo: assetUrl('images/brands/mihoyo.png'), hypergryph: assetUrl('images/brands/hypergryph.svg'), museum: assetUrl('images/brands/game-museum.svg') }
type NearbyVisit = NonNullable<Place['nearbyVisits']>[number]
const selectedVisit = ref<NearbyVisit | null>(null)
const visitDialog = ref<HTMLDialogElement>()
async function openVisit(spot: NearbyVisit) {
  selectedVisit.value = spot
  await nextTick()
  visitDialog.value?.showModal()
}
watch(() => props.place.id, () => visitDialog.value?.close())
const detailParagraphs = computed(() => props.place.details.split(/\r?\n+/).map(paragraph => paragraph.trim()).filter(Boolean).map(paragraph => parseRichText(paragraph)))
const visitNotes = computed(() => (props.place.visitNotes ?? []).map(note => parseRichText(note)))
const shopDirectory = computed(() => (shopDirectories as Record<string, ShopDirectoryData>)[props.place.id])
const shopDirectoryView = ref<InstanceType<typeof ShopDirectory>>()
const chapterNav = ref<HTMLElement>()
const sideNavOpen = ref(false)
const activeChapter = ref('overview')
const chapterId = (key: string) => `place-${props.place.id}-${key}`
const chapters = computed(() => [
  ...(detailParagraphs.value.length || visitNotes.value.length ? [{ key: 'overview', label: '介绍' }] : []),
  ...(placeClips(bilibiliCatalog as BilibiliCatalog, props.place.id).length ? [{ key: 'video', label: '视频' }] : []),
  ...(shopDirectory.value ? [{ key: 'shops', label: '店铺' }] : []),
  ...(props.place.gallery.length ? [{ key: 'gallery', label: '图集' }] : []),
  ...(address.value ? [{ key: 'nearby', label: '周边' }] : []),
  { key: 'directions', label: '怎么去' },
])
let scrollFrame = 0
let searchFrame = 0
let desktopNav = false
const targetId = (target: Parameters<typeof searchTargetId>[1]) => searchTargetId(props.place.id, target)
function locateSearchMatch() {
  if (searchFrame) cancelAnimationFrame(searchFrame)
  if (!props.searchQuery?.trim()) return
  searchFrame = requestAnimationFrame(() => {
    searchFrame = 0
    const index = createPlaceSearchIndex([props.place], shopDirectory.value ? { [props.place.id]: shopDirectory.value } : {})
    const target = matchPlaces(index, props.searchQuery!).get(props.place.id)?.target
    if (target?.kind === 'shop') shopDirectoryView.value?.revealShop(target.name)
    nextTick(() => {
      const element = target ? document.getElementById(targetId(target)) : null
      if (!element) return
      element.focus({ preventScroll: true })
      element.scrollIntoView({ behavior: 'instant', block: 'start' })
      updateChapter()
    })
  })
}
watch(() => props.searchQuery, () => nextTick(locateSearchMatch))
defineExpose({ locateSearchMatch })
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
function handleResize() {
  const desktop = window.matchMedia('(min-width: 1100px)').matches
  if (desktop !== desktopNav) { desktopNav = desktop; sideNavOpen.value = desktop }
  scheduleChapterUpdate()
}
function goToChapter(key: string) {
  const section = document.getElementById(chapterId(key))
  if (!section) return
  activeChapter.value = key
  section.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
  if (window.matchMedia('(max-width: 800px)').matches) sideNavOpen.value = false
}
function goToTop() {
  window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  if (window.matchMedia('(max-width: 800px)').matches) sideNavOpen.value = false
}
onMounted(() => {
  desktopNav = window.matchMedia('(min-width: 1100px)').matches
  sideNavOpen.value = desktopNav
  window.addEventListener('scroll', scheduleChapterUpdate, { passive: true })
  window.addEventListener('resize', handleResize)
  updateChapter()
  nextTick(locateSearchMatch)
})
watch(chapters, () => nextTick(updateChapter))
onBeforeUnmount(() => {
  window.removeEventListener('scroll', scheduleChapterUpdate)
  window.removeEventListener('resize', handleResize)
  if (scrollFrame) window.cancelAnimationFrame(scrollFrame)
  if (searchFrame) cancelAnimationFrame(searchFrame)
})
</script>

<template>
  <article class="guide-detail has-chapters" :style="{ '--city-color': color }">
    <header class="detail-heading">
      <p class="detail-kicker"><i class="city-dot" :style="{ background: color }"></i><span>{{ place.city }}</span><span aria-hidden="true">/</span><span>{{ tierLabel(place.tier) }}</span><span v-if="rank" aria-hidden="true">/</span><span v-if="rank">档内第 {{ rank }} 名</span></p>
      <h1 :id="targetId({ kind: 'heading' })" tabindex="-1">{{ place.name }}</h1><p :id="targetId({ kind: 'summary' })" tabindex="-1" class="detail-summary">{{ place.summary }}</p>
      <div class="detail-facts"><span v-if="place.visitedAt"><small>到访</small>{{ place.visitedAt }}</span><span><small>更新</small>{{ place.updatedAt }}</span><span v-if="address"><small>地址</small>{{ address }}</span></div>
      <div v-if="place.tags.length" class="tags detail-tags" aria-label="店铺标签"><span v-for="item in place.tags" :key="item"># {{ item }}</span></div>
    </header>
    <nav ref="chapterNav" class="detail-chapters" aria-label="地点章节导航">
      <button v-for="chapter in chapters" :key="chapter.key" type="button" :aria-controls="chapterId(chapter.key)" :aria-current="activeChapter === chapter.key ? 'location' : undefined" @click="goToChapter(chapter.key)">{{ chapter.label }}</button>
    </nav>
    <nav class="detail-side-nav" aria-label="页面侧边导航">
      <button type="button" class="side-nav-toggle" :aria-expanded="sideNavOpen" aria-controls="side-chapter-list" @click="sideNavOpen = !sideNavOpen"><span aria-hidden="true">☰</span> {{ sideNavOpen ? '收起' : '导航' }}</button>
      <div v-if="sideNavOpen" id="side-chapter-list" class="side-nav-list">
        <span class="side-nav-title">快速直达</span>
        <button v-for="chapter in chapters" :key="chapter.key" type="button" :aria-controls="chapterId(chapter.key)" :aria-current="activeChapter === chapter.key ? 'location' : undefined" @click="goToChapter(chapter.key)">{{ chapter.label }}</button>
        <button type="button" @click="goToTop">回到顶部 ↑</button>
      </div>
    </nav>
    <section v-if="detailParagraphs.length || visitNotes.length" :id="chapterId('overview')" class="detail-body detail-review detail-chapter" aria-labelledby="review-heading">
      <header class="detail-review-heading">
        <div><p class="section-label">PLACE OVERVIEW</p><h2 id="review-heading">商圈介绍</h2></div>
        <span v-if="detailParagraphs.length" class="detail-review-meta">{{ detailParagraphs.length }} 段介绍</span>
      </header>
      <p v-if="detailParagraphs.length" class="detail-review-deck">环境、店铺分布与逛店体验</p>
      <div v-if="detailParagraphs.length" class="detail-prose">
        <p v-for="(paragraph, index) in detailParagraphs" :id="targetId({ kind: 'paragraph', index })" :key="index" tabindex="-1"><template v-for="(part, partIndex) in paragraph" :key="partIndex"><strong v-if="part.strong" :class="richTextClasses(part)">{{ part.text }}</strong><span v-else :class="richTextClasses(part)">{{ part.text }}</span></template></p>
      </div>
      <aside v-if="visitNotes.length" class="detail-visit-notes" aria-labelledby="visit-notes-heading">
        <header class="detail-visit-heading"><div><p class="section-label">bltb's picks</p><h3 id="visit-notes-heading">菠萝の建议</h3></div></header>
        <ul class="detail-visit-list"><li v-for="(note, index) in visitNotes" :id="targetId({ kind: 'note', index })" :key="index" tabindex="-1"><span class="detail-visit-mark" aria-hidden="true">↗</span><p><template v-for="(part, partIndex) in note" :key="partIndex"><strong v-if="part.strong" :class="richTextClasses(part)">{{ part.text }}</strong><span v-else :class="richTextClasses(part)">{{ part.text }}</span></template></p></li></ul>
      </aside>
    </section>
    <div v-if="chapters.some(chapter => chapter.key === 'video')" :id="chapterId('video')" class="detail-chapter"><BilibiliClips :key="place.id" :place-id="place.id" :place-name="place.name" /></div>
    <ShopDirectory v-if="shopDirectory" ref="shopDirectoryView" :id="chapterId('shops')" class="detail-chapter" :place-id="place.id" :directory="shopDirectory" :visited-at="place.visitedAt" />
    <div v-if="place.gallery.length" :id="chapterId('gallery')" class="detail-chapter"><PlaceGallery :images="place.gallery" :color="color" /></div>
    <section v-if="address" :id="chapterId('nearby')" class="place-mini-map detail-chapter" aria-labelledby="nearby-map-heading">
      <div class="place-mini-map-heading"><div><p class="section-label">AROUND HERE</p><h2 id="nearby-map-heading">店铺周边</h2></div><span>百度地图 · 无需访客登录 · 可拖动、缩放</span></div>
      <AddressMap :place="place" :color="color" />
      <p class="map-caption">百度在线地图异常时，可显示配置过的每月 500m 备份图。</p>
      <div v-if="place.nearbyVisits?.length" class="nearby-visits">
        <h3>附近参观与打卡</h3>
        <div class="nearby-visit-grid">
          <article v-for="spot in place.nearbyVisits" :key="spot.name" class="nearby-visit" :class="spot.theme && 'nearby-visit--' + spot.theme">
            <div class="nearby-visit-frame">
              <button class="nearby-visit-brand" type="button" :aria-label="`查看${spot.name}的介绍`" aria-haspopup="dialog" @click="openVisit(spot)"><img v-if="spot.theme" :src="visitLogos[spot.theme]" alt=""><span v-else aria-hidden="true">✦</span></button>
              <h4>{{ spot.name }}</h4><p class="nearby-visit-hint">点击图片查看介绍 ↗</p>
            </div>
          </article>
        </div>
      </div>
    </section>
    <Teleport to="body">
      <dialog ref="visitDialog" class="nearby-dialog" aria-labelledby="nearby-dialog-title" @close="selectedVisit = null">
        <div v-if="selectedVisit" class="nearby-dialog-content">
          <button class="nearby-dialog-close" type="button" aria-label="关闭介绍" @click="visitDialog?.close()">×</button>
          <p class="nearby-dialog-kicker">AROUND HERE</p>
          <h2 id="nearby-dialog-title">{{ selectedVisit.name }}</h2>
          <p class="nearby-dialog-address">{{ selectedVisit.address }}</p>
          <p>{{ selectedVisit.note }}</p>
          <div class="nearby-visit-links"><a :href="nearbyNavigation(selectedVisit.address)" target="_blank" rel="noopener noreferrer">高德地图 ↗</a><a :href="selectedVisit.sourceUrl" target="_blank" rel="noopener noreferrer">资料来源 ↗</a></div>
        </div>
      </dialog>
    </Teleport>
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
.detail-side-nav { position: fixed; z-index: 700; right: 12px; top: 50%; transform: translateY(-50%); width: 98px; padding: 6px; border: 2px solid #3a3038; border-radius: 12px; background: #fffaf2; box-shadow: 4px 4px 0 #e6aebc; }
.detail-side-nav button { display: block; width: 100%; min-height: 40px; padding: 7px 5px; border: 0; border-radius: 6px; background: transparent; color: #5d4b56; font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; }
.detail-side-nav button:hover, .detail-side-nav button[aria-current] { background: #f9dbe3; color: #a12f4c; }
.detail-side-nav button:focus-visible { outline: 2px solid #a83750; outline-offset: 1px; }
.detail-side-nav .side-nav-toggle { background: #a83750; color: #fff; }
.side-nav-list { padding-top: 5px; }
.side-nav-title { display: block; padding: 6px 4px; color: #9b7884; text-align: center; font-size: 10px; font-weight: 700; }
@media (max-width: 800px) { .detail-side-nav { right: 6px; top: auto; bottom: 22px; transform: none; width: 80px; } }
.detail-chapter { scroll-margin-top: 72px; }
.has-chapters [tabindex="-1"] { scroll-margin-top: 80px; }
.has-chapters [tabindex="-1"]:focus { outline: 2px solid #a83750; outline-offset: 4px; }
.has-chapters :deep(.place-gallery-group) { scroll-margin-top: 72px; }
.nearby-visits { margin-top: 22px; }
.nearby-visits h3 { margin: 0 0 12px; font-size: 17px; }
.nearby-visit-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr)); gap: 12px; }
.nearby-visit { min-width: 0; padding: 8px; border: 1px solid #e5c5cc; background: #fffdfa; overflow-wrap: anywhere; }
.nearby-visit-frame { height: 100%; padding: 18px; border: 1px solid #e5c5cc; }
.nearby-visit h4 { margin: 14px 0 0; font-size: 16px; line-height: 1.5; }
.nearby-visit p { margin: 9px 0; color: #695862; font-size: 13px; line-height: 1.7; }
.nearby-visit .nearby-visit-hint { margin-bottom: 0; color: #8b6374; }
.nearby-visit-links { display: flex; flex-wrap: wrap; gap: 10px 18px; margin-top: 14px; }
.nearby-visit-links a { color: #a83750; font-size: 13px; font-weight: 700; }
.nearby-visit-brand { display: flex; align-items: center; justify-content: center; width: 100%; height: 100px; padding: 12px; border: 0; background: #1d2739; color: white; cursor: pointer; }
.nearby-visit-brand:focus-visible { outline: 3px solid #a83750; outline-offset: 3px; }
.nearby-visit-brand img { max-width: 150px; width: auto; max-height: 100%; object-fit: contain; }
.nearby-visit--mihoyo { border-color: #77bce1; background: repeating-linear-gradient(135deg, #d8efff 0 8px, #f5fbff 8px 16px); }
.nearby-visit--mihoyo .nearby-visit-frame { border-color: #a6d9ee; background: radial-gradient(circle at 92% 13%, #c6eaff 0 3px, transparent 4px), #f7fcff; }
.nearby-visit--mihoyo .nearby-visit-brand { background: linear-gradient(110deg, #273957, #4889bc); }
.nearby-visit--hypergryph { border-color: #b3a780; background: repeating-linear-gradient(135deg, #dfc274 0 6px, #2f3540 6px 12px); }
.nearby-visit--hypergryph .nearby-visit-frame { border-color: #d2c7a8; background: #f8f7f0; }
.nearby-visit--hypergryph .nearby-visit-brand { background: #252a31; }
.nearby-visit--museum { border-color: #78a6a6; background: repeating-linear-gradient(135deg, #d5eae5 0 8px, #f1f5e8 8px 16px); }
.nearby-visit--museum .nearby-visit-frame { border-color: #aed0ca; background: #f8fcf8; }
.nearby-visit--museum .nearby-visit-brand { padding: 0; background: #243647; }
.nearby-visit--museum .nearby-visit-brand img { width: 100%; max-width: none; height: 100%; object-fit: cover; }
.nearby-dialog { width: min(520px, calc(100% - 32px)); max-height: calc(100% - 32px); padding: 0; border: 1px solid #d4b3bd; border-radius: 12px; background: #fffaf5; color: #382e37; box-shadow: 0 20px 70px #24151d55; }
.nearby-dialog::backdrop { background: #1b1420aa; }
.nearby-dialog-content { position: relative; padding: 30px; }
.nearby-dialog-content h2 { margin: 8px 36px 16px 0; font-size: 23px; line-height: 1.4; }
.nearby-dialog-content p { font-size: 14px; line-height: 1.8; }
.nearby-dialog-content .nearby-dialog-kicker { color: #a83750; font-size: 11px; font-weight: 800; letter-spacing: .15em; }
.nearby-dialog-address { font-weight: 700; }
.nearby-dialog-close { position: absolute; top: 14px; right: 16px; width: 40px; height: 40px; border: 0; border-radius: 50%; background: #f3e7e8; color: #624e58; font-size: 25px; cursor: pointer; }
@media (max-width: 580px) {
  .detail-chapters { gap: 0; padding: 4px 6px; }
  .detail-chapters button { padding: 7px 11px; font-size: 12px; }
}
.text-red.text-red { color: #c62828; background: none; }
.text-large { font-size: 1.25em; font-weight: 800; line-height: 1.6; }
.text-huge { font-size: 2.8em; font-weight: 900; line-height: 1.3; }
</style>
