<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import siteData from './data/site.json'
import placeData from './data/places.json'
import directoryData from 'virtual:directory-summary'
import updateData from './data/updates.json'
import type { Place, PlacesByCity, ShopDirectory, Site, Update } from './types'
import { createPlaceSearchIndex, matchPlaces, parsePlaceRoute, placeDetailHash } from './utils/search'
import { flattenPlaces, filterPlaces, publicUpdates, recentBadge, tiers } from './utils/model'
import PlaceCard from './components/PlaceCard.vue'
import PlaceDetail from './components/DeferredDetail.vue'
import BrowseFilters from './components/BrowseFilters.vue'
import ShareFilters from './components/ShareFilters.vue'
import { cityColor } from './utils/cities'
import { useStoredFilters } from './utils/filters'
import { urlWithFilters } from './utils/filterLinks'
import { useTripPlan } from './utils/useTripPlan'
import { useShopToday } from './utils/shopToday'
import TripPlanner from './components/TripPlanner.vue'
import PlaceCompare from './components/PlaceCompare.vue'
import ExportPanel from './components/DeferredExport.vue'
import Guestbook from './components/Guestbook.vue'
import VisitCounter from './components/VisitCounter.vue'
import SiteHeader from './components/SiteHeader.vue'
import MascotMoments from './components/MascotMoments.vue'
import UpdateList from './components/UpdateList.vue'

const site = siteData as Site
const colors = site.cityColors || {}
const showLabels = ref(true)
type BoardView = 'compact' | 'comfortable'
const tierActions: Record<string, string> = { hang: '值得专程去', top: '很值得一逛', above: '带着目的去', npc: '顺路可以逛', bad: '不太推荐' }
const boardViewKey = 'tangbao-rank-view-v1'
function savedBoardView(): BoardView {
  try {
    const saved = localStorage.getItem(boardViewKey)
    if (saved === 'compact' || saved === 'comfortable') return saved
  } catch {}
  return new URLSearchParams(location.search).get('city')?.trim() ? 'comfortable' : 'compact'
}
const boardView = ref<BoardView>(savedBoardView())
watch(boardView, value => { try { localStorage.setItem(boardViewKey, value) } catch {} })
const places = flattenPlaces(placeData as PlacesByCity)
const today = useShopToday()
const searchIndex = computed(() => createPlaceSearchIndex(places, directoryData as Record<string, ShopDirectory>, today.value))
const all = filterPlaces(places)
const updates = publicUpdates(updateData as Update[], places)
const { city, tag, query, reset, linkTo } = useStoredFilters()
const route = ref(location.hash)
const main = ref<HTMLElement>()
const exportOpen = ref(false)
const toolsOpen = ref(false)
const criteriaOpen = ref(false)
const plan = useTripPlan()
async function showTierMeaning(id: string) {
  criteriaOpen.value = true
  await nextTick()
  const target = document.getElementById(`tier-meaning-${id}`)
  target?.focus({ preventScroll: true })
  target?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
}
type BoardPosition = { id: string; top: number; width: number; view: BoardView; labels: boolean; tools: boolean }
const positionKey = 'tangbaoBoardPosition'
const returnKey = 'tangbaoBoardReturn'
let restoreFrame = 0
let restoringBoard = false
function plainClick(event: MouseEvent) {
  return !event.defaultPrevented && event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey
}
function openBoardPlace(event: MouseEvent) {
  if (!plainClick(event) || !(event.target instanceof Element)) return
  const link = event.target.closest<HTMLAnchorElement>('.place-card a')
  if (!link || link.target || link.hasAttribute('download')) return
  const target = parsePlaceRoute(new URL(link.href).hash)
  const card = link.closest<HTMLElement>('.place-card')
  if (!target || !card) return
  event.preventDefault()
  const position: BoardPosition = { id: target.id, top: card.getBoundingClientRect().top, width: innerWidth, view: boardView.value, labels: showLabels.value, tools: toolsOpen.value }
  const boardUrl = new URL(urlWithFilters(location.href, { city: city.value, tag: tag.value, query: query.value }))
  boardUrl.hash = `place-card-${target.id}`
  history.replaceState({ ...history.state, [positionKey]: position }, '', boardUrl)
  history.pushState({ [returnKey]: target.id }, '', link.href)
  syncRoute()
}
function returnToBoard(event: MouseEvent) {
  if (!plainClick(event) || history.state?.[returnKey] !== currentPlace.value?.id) return
  event.preventDefault()
  history.back()
}
function restoreBoardFocus() {
  if (!isHome.value) return
  if (restoreFrame) cancelAnimationFrame(restoreFrame)
  const position = history.state?.[positionKey] as BoardPosition | undefined
  if (position) {
    restoringBoard = true
    boardView.value = position.view
    showLabels.value = position.labels
    toolsOpen.value = position.tools
    restoringBoard = false
  }
  nextTick(() => {
    restoreFrame = requestAnimationFrame(() => {
      restoreFrame = 0
      if (!isHome.value) return
      const card = position && document.getElementById(`place-card-${position.id}`)
      if (!card) { focusBoardCard(); return }
      card.querySelector<HTMLAnchorElement>('.card-link')?.focus({ preventScroll: true })
      if (position.width === innerWidth) window.scrollTo({ top: window.scrollY + card.getBoundingClientRect().top - position.top, behavior: 'instant' })
      else card.scrollIntoView({ block: 'center', behavior: 'instant' })
    })
  })
}
function focusBoardCard() {
  const id = route.value.match(/^#place-card-([a-z0-9-]+)$/)?.[1]
  const card = id ? document.getElementById(`place-card-${id}`) : null
  if (!card) return false
  card.scrollIntoView({ block: 'center', behavior: 'instant' })
  card.querySelector<HTMLAnchorElement>('a')?.focus({ preventScroll: true })
  return true
}
const syncRoute = () => {
  route.value = location.hash
  nextTick(() => {
    if (route.value === '#guestbook') document.getElementById('guestbook')?.scrollIntoView()
    else if (isHome.value && (history.state?.[positionKey] || route.value.startsWith('#place-card-'))) restoreBoardFocus()
    else { main.value?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }) }
  })
}
window.addEventListener('hashchange', syncRoute)
window.addEventListener('pageshow', restoreBoardFocus)
onBeforeUnmount(() => {
  window.removeEventListener('hashchange', syncRoute)
  window.removeEventListener('pageshow', restoreBoardFocus)
  if (restoreFrame) window.cancelAnimationFrame(restoreFrame)
})
const searchMatches = computed(() => matchPlaces(searchIndex.value, query.value))
const filtered = computed(() => filterPlaces(places, city.value, query.value, tag.value, searchMatches.value))
const firstPhotoId = computed(() => tiers.map(tier => filtered.value.find(place => place.tier === tier.id && place.cover)).find(Boolean)?.id)
const tags = computed(() => [...new Set(all.flatMap(p => p.tags))].sort((a, b) => a.localeCompare(b, 'zh-CN')))
const cities = [...new Set(all.map(p => p.city))].sort((a, b) => a.localeCompare(b, 'zh-CN'))
const hasFilters = computed(() => !!city.value || !!tag.value || !!query.value.trim())
const boardSections = computed(() => tiers.map((tier, index) => ({ ...tier, index, places: filtered.value.filter(place => place.tier === tier.id) })).filter(section => !hasFilters.value || section.places.length))
const base = import.meta.env.BASE_URL
const guideUrl = computed(() => linkTo(`${import.meta.env.BASE_URL}guide/`))
const updatesUrl = `${import.meta.env.BASE_URL}updates/`
const citiesUrl = `${import.meta.env.BASE_URL}cities/`
function browseBoard() {
  const heading = document.getElementById('board-title')
  heading?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
}
const isHome = computed(() => !route.value || route.value === '#' || route.value === '#/' || route.value === '#guestbook' || /^#place-card-[a-z0-9-]+$/.test(route.value))
watch([boardView, showLabels, toolsOpen, city, tag, query], () => {
  if (!isHome.value || restoringBoard || !history.state?.[positionKey]) return
  const { [positionKey]: previousPosition, ...state } = history.state
  history.replaceState(state, '')
}, { flush: 'sync' })
onMounted(() => nextTick(() => {
  if (route.value === '#guestbook') document.getElementById('guestbook')?.scrollIntoView()
  else if (isHome.value) restoreBoardFocus()
}))
function detailReady() {
  if (!currentPlace.value || parsePlaceRoute(route.value)?.query || document.querySelector('dialog[open]')) return
  document.querySelector<HTMLElement>('.detail-page .detail-heading h1')?.focus({ preventScroll: true })
  window.scrollTo({ top: 0, behavior: 'instant' })
}
const currentPlace = computed(() => {
  const match = parsePlaceRoute(route.value)
  return match ? all.find(p => p.id === match.id) : undefined
})
const contentDate = [site.updatedAt, ...all.map(p => p.updatedAt), ...updates.map(u => u.date)].filter(Boolean).sort().at(-1) || null
const rankOf = (p: Place) => all.filter(x => x.tier === p.tier).findIndex(x => x.id === p.id) + 1
const scope = computed(() => hasFilters.value ? `${city.value || '全部城市'}${tag.value ? ` · #${tag.value}` : ''}${query.value.trim() ? ` · 搜索「${query.value.trim()}」` : ''}` : '全榜 · 全部城市')
watch(currentPlace, p => { document.title = `${p ? p.name + ' · ' : ''}${site.title} · ${site.author}` }, { immediate: true })
</script>

<template>
  <a href="#main-content" class="skip-link" @click.prevent="main?.focus()">跳到正文</a>
  <SiteHeader active="board" :guide-url="guideUrl" />

  <main id="main-content" ref="main" tabindex="-1" class="page-shell board-page">
    <div v-show="isHome" class="board-browse-content" @click="openBoardPlace">
      <section class="hero compact-board-hero" aria-labelledby="page-title">
        <div class="hero-copy"><p class="eyebrow"><span></span> 本人亲测 随逛随更新</p><h1 id="page-title">{{ site.title }}<span class="title-dot">。</span></h1></div>
        <div class="byline"><span>{{ site.author }}</span><span>{{ contentDate ? `更新 ${contentDate}` : '等我逛完第一站～' }}</span></div>
        <div class="hero-actions"><div class="hero-counts" aria-label="榜单概况"><span><strong>{{ all.length }}</strong> 处逛店地点</span><span><strong>{{ cities.length }}</strong> 座城</span></div><div class="hero-browse-links"><a href="#board-title" @click.prevent="browseBoard">图片榜单 ↓</a><a :href="guideUrl">地图找店 ↗</a></div></div>
      </section>

      <section class="board-section" aria-labelledby="board-title">
        <div class="section-heading board-heading"><div><span class="section-number">01</span><h2 id="board-title">图片榜单</h2><span class="desktop-note">{{ site.rankWithinTier ? '同档按顺序排名' : '同档不分先后' }}</span></div>
          <div class="board-view-controls" role="group" aria-label="榜单视图">
                <span>榜单视图</span>
                <button type="button" :aria-pressed="boardView === 'compact'" @click="boardView = 'compact'">紧凑</button>
                <button type="button" :aria-pressed="boardView === 'comfortable'" @click="boardView = 'comfortable'">舒适</button>
          </div></div>
        <div class="filter-bar">
          <label class="city-filter"><span class="sr-only">城市筛选</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18 10c0 5-6 10-6 10S6 15 6 10a6 6 0 1 1 12 0Z" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="10" r="2" stroke="currentColor" stroke-width="1.5"/></svg><select v-model="city" aria-label="城市筛选"><option value="">全部城市</option><option v-if="city && !cities.includes(city)" :value="city">{{ city }}（暂无条目）</option><option v-for="c in cities" :key="c">{{ c }}</option></select></label>
          <label class="search-filter"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" stroke-width="1.5"/><path d="m16 16 4 4" stroke="currentColor" stroke-width="1.5"/></svg><input v-model="query" type="search" placeholder="搜索地点、店铺、城市或标签…" aria-label="关键词搜索" /></label>
          <div class="filter-result"><span role="status" aria-live="polite">{{ filtered.length }} 个结果</span><button class="text-button" :disabled="!hasFilters" @click="reset">重置</button></div>
        </div>
        <div class="board-tools">
          <button type="button" class="mobile-tools-toggle" :aria-expanded="toolsOpen" aria-controls="board-tools-content" @click="toolsOpen = !toolsOpen"><span>{{ toolsOpen ? '收起筛选与工具' : '筛选与工具' }}<small v-if="tag"> · # {{ tag }}</small></span><span aria-hidden="true">{{ toolsOpen ? '−' : '+' }}</span></button>
          <div id="board-tools-content" class="board-tools-content" :class="{ 'is-open': toolsOpen }">
            <BrowseFilters :cities="cities" :colors="colors" :tags="tags" :city="city" :tag="tag" @city="city = $event" @tag="tag = $event" />
            <div class="photo-options">
              <label v-if="boardView === 'compact'"><input v-model="showLabels" type="checkbox" />显示名称与城市</label>
              <PlaceCompare v-if="isHome" :places="all" />
              <ShareFilters :city="city" :tag="tag" :query="query" />
              <button type="button" class="button" @click="exportOpen = true">导出榜单</button>
              <button v-if="!plan.selecting.value" type="button" class="button" @click="plan.setSelecting(true)">开始选店</button>
              <span class="board-view-hint">点击卡片查看详情<span v-if="boardView === 'compact'" class="compact-hover-hint"> · 悬停隐藏店名</span><span v-else> · 图片下方显示店名、城市与短评</span></span>
            </div>
          </div>
        </div>
        <div v-if="!all.length && !hasFilters" class="empty-intro"><span class="empty-icon" aria-hidden="true">＋</span><div><strong>规划中，还在路上待访问</strong><p>等亲自来，再写~</p></div><span class="empty-pill">待填充</span></div>
        <div v-if="hasFilters && !filtered.length" class="no-results" role="status"><strong>没有找到匹配的条目</strong><span>试试其他关键词、城市或标签。</span><button class="text-button" @click="reset">重置筛选 ↗</button></div>
        <div v-if="boardSections.length" class="tier-board photo-board" :class="{ 'show-photo-labels': showLabels, 'comfortable-view': boardView === 'comfortable' }"><section v-for="tier in boardSections" :key="tier.id" class="tier-row" :style="{ '--tier-color': tier.color, '--tier-pale': tier.pale }" :aria-labelledby="`tier-${tier.id}`"><div class="tier-label"><span class="tier-index">0{{ tier.index + 1 }}</span><h3 :id="`tier-${tier.id}`"><a class="tier-meaning-link" :aria-label="`${tier.label}：查看档位说明`" :href="`#tier-meaning-${tier.id}`" :aria-describedby="`tier-hint-${tier.id}`" @click.prevent="showTierMeaning(tier.id)">{{ tier.label }}<span class="tier-help-mark" aria-hidden="true">?</span><span :id="`tier-hint-${tier.id}`" class="tier-hint" role="tooltip">{{ site.tierDescriptions[tier.id] }}<small>点击查看完整排序说明 ↓</small></span></a></h3><span class="tier-action">{{ tierActions[tier.id] }}</span><span class="tier-count">{{ tier.places.length }} 处地点</span></div><div class="tier-content"><div v-if="!tier.places.length" class="tier-empty"><span class="empty-dash" aria-hidden="true"></span><span>暂无条目</span></div><div v-else class="card-grid"><PlaceCard v-for="p in tier.places" :key="p.id" :place="p" :color="cityColor(p.city, colors)" :href="linkTo(`${base}${placeDetailHash(p.id, query)}`)" :rank="site.rankWithinTier ? rankOf(p) : undefined" :priority="p.id === firstPhotoId" :comfortable="boardView === 'comfortable'" :badge="recentBadge(p.id, updates, site.recentDays)" :match="searchMatches.get(p.id)" /></div></div></section></div>
        <p v-if="boardSections.length" class="board-caption"><span>推荐度从上到下递减</span><span>{{ site.rankWithinTier ? '同档分先后 · 从左到右，从上到下' : '同档不分先后' }}</span></p>
      </section>

      <section class="guide-entry" aria-labelledby="guide-entry-title">
        <MascotMoments class="mascot-embedded mascot-map-entry" :ids="['aqua', 'emilia']" rotate-all label="地图入口角色" />
        <div class="guide-entry-copy"><h2 id="guide-entry-title">不知道在哪里？怎么去？那就去地图找找</h2><p>同样的城市颜色，对应地图上的位置。详细评价与到访路线也在这里。</p><a :href="guideUrl" class="button dark">地图找店 ↗</a></div>
      </section>
      <div class="bottom-grid"><section class="updates-section" aria-labelledby="updates-title"><div class="section-heading"><div><span class="section-number">02</span><h2 id="updates-title">最近更新</h2></div><a :href="updatesUrl" target="_blank" rel="noopener noreferrer" class="updates-all-link">查看全部 ↗<span class="sr-only">（新标签页）</span></a></div><UpdateList :updates="updates.slice(0, 2)" :places="all" /></section>
      <section class="criteria-section" aria-labelledby="criteria-title"><div class="section-heading"><div><span class="section-number">03</span><h2 id="criteria-title">关于这份榜单</h2></div></div><p class="criteria-copy">{{ site.criteria }}</p><div class="criteria-scale"><span v-for="t in tiers" :key="t.id"><i :style="{ background: t.color }"></i>{{ t.label }}</span></div><details :open="criteriaOpen" @toggle="criteriaOpen = ($event.target as HTMLDetailsElement).open"><summary>查看各档标准与排序规则</summary><dl><template v-for="t in tiers" :key="t.id"><dt :id="`tier-meaning-${t.id}`" tabindex="-1">{{ t.label }}</dt><dd>{{ site.tierDescriptions[t.id] }}</dd></template></dl><p>{{ site.rankWithinTier ? '同档有先后，卡片编号表示该档内的完整排名；筛选后保留原排名。' : '同档不分先后。' }}</p><p>到访日期未提供时显示“未记录”；内容更新日期由作者维护。</p></details><p class="personal-note">仅代表个人体验，供你出发前参考。</p></section></div>
      <Guestbook />
    </div>

    <section v-if="currentPlace" class="detail-page"><nav class="detail-navigation" aria-label="地点浏览操作"><a :href="`#place-card-${currentPlace.id}`" class="back-link" @click="returnToBoard">← 返回图片榜单</a><div class="detail-secondary-actions"><a :href="`${guideUrl}#/place/${currentPlace.id}`">地图找店 ↗</a><PlaceCompare :places="all" :current-place="currentPlace" /></div></nav><PlaceDetail :key="currentPlace.id" @ready="detailReady" :search-query="parsePlaceRoute(route)?.query" :place="currentPlace" :rank="site.rankWithinTier ? rankOf(currentPlace) : undefined" :color="cityColor(currentPlace.city, colors)" /></section>
    <section v-else-if="!isHome" class="not-found"><p class="eyebrow">这一站暂未收录</p><h1>没有找到这个条目</h1><p>链接可能有误，或条目尚未公开。</p><a href="#/" class="button dark">返回图片榜单</a></section>
  </main>
  <TripPlanner :places="all" :current-place="currentPlace" />
  <footer class="site-footer"><span><b>{{ site.author }}</b> · 一站一更新，纯主观感受，你们永远对。 <a :href="citiesUrl">城市逛店指南 ↗</a></span><VisitCounter /></footer>
  <ExportPanel v-if="exportOpen" :site="site" :places="filtered" :all-places="all" :scope="scope" :updated-at="contentDate" @close="exportOpen = false" />
</template>

<style scoped>
.board-browse-content { display: contents; }
.photo-board .tier-action { display: block; font-size: 12px; line-height: 1.5; font-weight: 500; margin: 6px 0; }
</style>
