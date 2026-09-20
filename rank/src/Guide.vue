<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import siteData from './data/site.json'
import placeData from './data/places.json'
import type { Place, Site } from './types'
import { filterPlaces, tierLabel } from './utils/model'
import { cityColor } from './utils/cities'
import CityLegend from './components/CityLegend.vue'
import PlaceMap from './components/PlaceMap.vue'
import PlaceDetail from './components/PlaceDetail.vue'
import VisitCounter from './components/VisitCounter.vue'
const site = siteData as Site, all = filterPlaces(placeData as Place[])
const colors = site.cityColors || {}, base = import.meta.env.BASE_URL
const params = new URLSearchParams(location.search)
const city = ref(params.get('city') || ''), query = ref(params.get('q') || '')
const route = ref(location.hash), mobileView = ref<'map' | 'list'>('map')
const main = ref<HTMLElement>(), detailContainer = ref<HTMLElement>()
const filtered = computed(() => filterPlaces(all, city.value, query.value))
const cities = [...new Set(all.map(p => p.city))].sort((a, b) => a.localeCompare(b, 'zh-CN'))
const selected = computed(() => {
  const id = route.value.match(/^#\/place\/([a-z0-9-]+)$/)?.[1]
  return id ? all.find(p => p.id === id) : undefined
})
const isIndex = computed(() => !route.value || route.value === '#' || route.value === '#/')
onMounted(() => {
  if (!isIndex.value) nextTick(() => {
    detailContainer.value?.focus({ preventScroll: true })
    detailContainer.value?.scrollIntoView({ behavior: 'instant', block: 'start' })
  })
})
const rankOf = (p: Place) => all.filter(x => x.tier === p.tier).findIndex(x => x.id === p.id) + 1
const boardUrl = computed(() => {
  const p = new URLSearchParams()
  if (city.value) p.set('city', city.value)
  if (query.value.trim()) p.set('q', query.value.trim())
  return `${base}${p.size ? '?' + p : ''}`
})
function sync() {
  const params = new URLSearchParams(location.search)
  city.value = params.get('city') || ''; query.value = params.get('q') || ''; route.value = location.hash
  if (route.value.match(/^#\/place\//)) nextTick(() => {
    detailContainer.value?.focus({ preventScroll: true })
    if (window.innerWidth <= 800) detailContainer.value?.scrollIntoView({ behavior: 'instant' })
  })
}
window.addEventListener('hashchange', sync); window.addEventListener('popstate', sync)
onBeforeUnmount(() => { window.removeEventListener('hashchange', sync); window.removeEventListener('popstate', sync) })
watch([city, query], () => {
  const url = new URL(location.href)
  city.value ? url.searchParams.set('city', city.value) : url.searchParams.delete('city')
  query.value.trim() ? url.searchParams.set('q', query.value.trim()) : url.searchParams.delete('q')
  history.replaceState(null, '', url)
})
watch(selected, p => document.title = `${p ? p.name : '地图与介绍'} · ${site.title}`, { immediate: true })
function select(id: string) { location.hash = `/place/${id}` }
function reset() { city.value = ''; query.value = '' }
</script>
<template>
  <a href="#guide-main" class="skip-link" @click.prevent="main?.focus()">跳到正文</a>
  <header class="site-header"><div class="header-inner"><a :href="boardUrl" class="brand"><span class="brand-mark" aria-hidden="true">排</span><span>汤包的逛店手记<small>PLACES & PREFERENCES</small></span></a><nav aria-label="主导航"><a :href="boardUrl">图片总榜</a><a href="#/" aria-current="page">地图与介绍</a><a :href="`${base}qa/`">QA 与建议</a></nav></div></header>
  <main ref="main" id="guide-main" tabindex="-1" class="page-shell guide-page">
    <div class="guide-hero"><div><p class="eyebrow">从画面到地点</p><h1>下一站，去哪逛？</h1><p>按城市找店，在地图上定位。每一站的介绍，先从我的视频开始。</p></div><a :href="boardUrl" class="button">← 回到图片总榜</a></div>
    <div class="filter-bar"><label class="city-filter"><span class="sr-only">城市筛选</span><select v-model="city" aria-label="城市筛选"><option value="">全部城市</option><option v-if="city && !cities.includes(city)" :value="city">{{ city }}（暂无条目）</option><option v-for="c in cities" :key="c">{{ c }}</option></select></label><label class="search-filter"><input v-model="query" type="search" aria-label="关键词搜索" placeholder="找一家店、一个城市…" /></label><div class="filter-result"><span role="status">{{ filtered.length }} 个结果</span><button class="text-button" :disabled="!city && !query.trim()" @click="reset">重置</button></div></div>
    <CityLegend :cities="cities" :colors="colors" :active="city" @select="city = $event" />
    <div class="mobile-guide-switch" role="group" aria-label="切换浏览方式"><button :aria-pressed="mobileView === 'map'" @click="mobileView = 'map'">地图</button><button :aria-pressed="mobileView === 'list'" @click="mobileView = 'list'">地点目录 · {{ filtered.length }}</button></div>
    <div class="guide-layout" :class="`mobile-${mobileView}`">
      <aside class="place-directory" aria-label="地点目录"><div class="directory-heading"><h2>地点目录</h2><span>{{ filtered.length }}</span></div><div v-if="!filtered.length" class="directory-empty"><p>{{ all.length ? '没有找到匹配的条目' : '还没有收录店铺' }}</p><small>{{ all.length ? '换个关键词，或重置筛选。' : '第一条体验发布后，就能从这里直接查看。' }}</small><button v-if="city || query.trim()" class="text-button" @click="reset">重置筛选</button></div><nav v-else aria-label="选择店铺"><a v-for="p in filtered" :key="p.id" :href="`#/place/${p.id}`" :aria-current="selected?.id === p.id ? 'page' : undefined" :style="{ '--city-color': cityColor(p.city, colors) }"><span class="directory-city"><i class="city-dot" :style="{ background: cityColor(p.city, colors) }"></i>{{ p.city }} · {{ tierLabel(p.tier) }}<span v-if="p.isDemo" class="demo-badge">演示</span></span><strong>{{ p.name }}</strong><small>{{ p.video ? '视频介绍' : '介绍待补充' }} · {{ p.location ? '位置已收录' : '位置待补充' }}</small></a></nav></aside>
      <div class="guide-main-column"><div class="guide-map-slot"><PlaceMap :places="filtered" :colors="colors" :selected-id="selected?.id" @select="select" /></div>
        <section ref="detailContainer" tabindex="-1" class="selected-detail" aria-label="当前地点介绍">
          <template v-if="selected"><p v-if="!filtered.some(p => p.id === selected!.id)" class="map-notice">当前查看的地点不在筛选结果中。<button class="text-button" @click="reset">显示全部地点</button></p><div class="detail-navigation"><a :href="boardUrl">← 返回图片总榜</a><a href="#/">关闭介绍 ×</a></div><PlaceDetail :key="selected.id" :place="selected" :rank="site.rankWithinTier ? rankOf(selected) : undefined" :color="cityColor(selected.city, colors)" /></template>
          <div v-else-if="!isIndex" class="guide-empty-detail"><h2>没有找到这个条目</h2><p>链接可能有误，或条目尚未公开。</p><a href="#/" class="button">返回地图目录</a></div>
          <div v-else class="guide-empty-detail"><span aria-hidden="true">▷</span><h2>每一站，都有一段介绍</h2><p>从地图标记或地点目录选择一家店，查看视频节选、导航和后续图文。</p></div>
        </section>
      </div>
    </div>
  </main>
  <footer class="site-footer"><span>{{ site.author }} · 榜单、地图、介绍同步更新</span><VisitCounter /></footer>
</template>
