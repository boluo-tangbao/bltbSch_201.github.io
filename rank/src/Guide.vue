<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import siteData from './data/site.json'
import placeData from './data/places.json'
import type { Place, PlacesByCity, Site } from './types'
import { flattenPlaces, filterPlaces, tierLabel, tiers } from './utils/model'
import { cityColor } from './utils/cities'
import { useStoredFilters } from './utils/filters'
import CityLegend from './components/CityLegend.vue'
import TagLegend from './components/TagLegend.vue'
import PlaceMap from './components/PlaceMap.vue'
import PlaceDetail from './components/PlaceDetail.vue'
import VisitCounter from './components/VisitCounter.vue'
const site = siteData as Site, all = filterPlaces(flattenPlaces(placeData as PlacesByCity))
const colors = site.cityColors || {}, base = import.meta.env.BASE_URL
const { city, tag, query, reset } = useStoredFilters()
const route = ref(location.hash)
const main = ref<HTMLElement>(), detailContainer = ref<HTMLElement>()
const filtered = computed(() => filterPlaces(all, city.value, query.value, tag.value))
const tags = computed(() => [...new Set(all.flatMap(p => p.tags))].sort((a, b) => a.localeCompare(b, 'zh-CN')))
const cities = [...new Set(all.map(p => p.city))].sort((a, b) => a.localeCompare(b, 'zh-CN'))
const citySections = computed(() => cities.map(city => ({ city, places: filtered.value.filter(p => p.city === city) })).filter(section => section.places.length))
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
const boardUrl = computed(() => base)
function sync() {
  route.value = location.hash
  if (route.value.match(/^#\/place\//)) nextTick(() => {
    detailContainer.value?.focus({ preventScroll: true })
    if (window.innerWidth <= 800) detailContainer.value?.scrollIntoView({ behavior: 'instant' })
  })
}
window.addEventListener('hashchange', sync)
onBeforeUnmount(() => { window.removeEventListener('hashchange', sync) })
watch(selected, p => document.title = `${p ? p.name : '地图与介绍'} · ${site.title}`, { immediate: true })
function select(id: string) { location.hash = `/place/${id}` }
function tierColor(p: Place) { return tiers.find(t => t.id === p.tier)?.color || '#dce2d3' }
</script>
<template>
  <a href="#guide-main" class="skip-link" @click.prevent="main?.focus()">跳到正文</a>
  <header class="site-header"><div class="header-inner"><a :href="boardUrl" class="brand"><span class="brand-mark" aria-hidden="true">排</span><span>汤包的逛店手记<small>PLACES & PREFERENCES</small></span></a><nav aria-label="主导航"><a :href="boardUrl">图片总榜</a><a href="#/" aria-current="page">地图与介绍</a><a :href="`${base}qa/`">QA 与建议</a></nav></div></header>
  <main ref="main" id="guide-main" tabindex="-1" class="page-shell guide-page">
    <div class="guide-hero"><div><p class="eyebrow">从画面到地点</p><h1>下一站，去哪逛？</h1><p>按城市找店，在地图上定位。每一站都有自己的体验与评价。</p></div><a :href="boardUrl" class="button">← 回到图片总榜</a></div>
    <div class="filter-bar"><label class="city-filter"><span class="sr-only">城市筛选</span><select v-model="city" aria-label="城市筛选"><option value="">全部城市</option><option v-if="city && !cities.includes(city)" :value="city">{{ city }}（暂无条目）</option><option v-for="c in cities" :key="c">{{ c }}</option></select></label><label class="search-filter"><input v-model="query" type="search" aria-label="关键词搜索" placeholder="找一家店、一个城市…" /></label><div class="filter-result"><span role="status">{{ filtered.length }} 个结果</span><button class="text-button" :disabled="!city && !tag && !query.trim()" @click="reset">重置</button></div></div>
    <CityLegend :cities="cities" :colors="colors" :active="city" @select="city = $event" />
    <TagLegend :tags="tags" :active="tag" @select="tag = $event" />
    <div class="guide-layout">
      <aside class="place-directory" aria-label="地点目录"><div class="directory-heading"><h2>地点目录</h2><span>{{ filtered.length }}</span></div><div v-if="!filtered.length" class="directory-empty"><p>{{ all.length ? '没有找到匹配的条目' : '还没有收录店铺' }}</p><small>{{ all.length ? '换个关键词、城市或标签，或重置筛选。' : '第一条体验发布后，就能从这里直接查看。' }}</small><button v-if="city || tag || query.trim()" class="text-button" @click="reset">重置筛选</button></div><div v-else class="directory-groups"><details v-for="section in citySections" :key="section.city" class="directory-city-group" open><summary><i class="city-dot" :style="{ background: cityColor(section.city, colors) }"></i>{{ section.city }}<span class="directory-city-count">{{ section.places.length }} 家</span></summary><nav :aria-label="section.city + ' 店铺目录'"><a v-for="p in section.places" :key="p.id" class="directory-place" :href="'#/place/' + p.id" :aria-current="selected?.id === p.id ? 'page' : undefined" :style="{ '--city-color': cityColor(p.city, colors), '--tier-color': tierColor(p) }"><span class="directory-rank">{{ tierLabel(p.tier) }}<small v-if="site.rankWithinTier">#{{ rankOf(p) }}</small></span><span class="directory-copy"><strong>{{ p.name }}</strong></span></a></nav></details></div></aside>
      <div class="guide-main-column">
        <section ref="detailContainer" tabindex="-1" class="selected-detail" aria-label="当前地点介绍">
          <template v-if="selected"><p v-if="!filtered.some(p => p.id === selected!.id)" class="map-notice">当前查看的地点不在筛选结果中。<button class="text-button" @click="reset">显示全部地点</button></p><div class="detail-navigation"><a :href="boardUrl">← 返回图片总榜</a><a href="#/">关闭介绍 ×</a></div><PlaceDetail :key="selected.id" :place="selected" :rank="site.rankWithinTier ? rankOf(selected) : undefined" :color="cityColor(selected.city, colors)" /></template>
          <div v-else-if="!isIndex" class="guide-empty-detail"><h2>没有找到这个条目</h2><p>链接可能有误，或条目尚未公开。</p><a href="#/" class="button">返回地图目录</a></div>
          <div v-else class="guide-empty-detail"><span aria-hidden="true">▷</span><h2>每一站，都有一段介绍</h2><p>从地点目录选择一家店，查看评价、店铺周边和导航。</p></div>
        </section>
      </div>
    </div>
    <PlaceMap :places="all" :colors="colors" :selected-id="selected?.id" @select="select" />
  </main>
  <footer class="site-footer"><span>{{ site.author }} · 榜单、地图、介绍同步更新</span><VisitCounter /></footer>
</template>
