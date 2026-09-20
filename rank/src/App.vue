<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import siteData from './data/site.json'
import placeData from './data/places.json'
import updateData from './data/updates.json'
import type { Place, PlacesByCity, Site, Update } from './types'
import { flattenPlaces, filterPlaces, publicUpdates, recentBadge, tierLabel, tiers, updateLabel } from './utils/model'
import PlaceCard from './components/PlaceCard.vue'
import PlaceDetail from './components/PlaceDetail.vue'
import CityLegend from './components/CityLegend.vue'
import TagLegend from './components/TagLegend.vue'
import { cityColor } from './utils/cities'
import { useStoredFilters } from './utils/filters'
import ExportPanel from './components/ExportPanel.vue'
import Guestbook from './components/Guestbook.vue'
import VisitCounter from './components/VisitCounter.vue'

const site = siteData as Site
const colors = site.cityColors || {}
const showLabels = ref(false)
const qaUrl = `${import.meta.env.BASE_URL}qa/`
const homeUrl = `${import.meta.env.BASE_URL}../`
const places = flattenPlaces(placeData as PlacesByCity)
const all = filterPlaces(places)
const updates = publicUpdates(updateData as Update[], places)
const { city, tag, query, reset } = useStoredFilters()
const route = ref(location.hash)
const main = ref<HTMLElement>()
const exportOpen = ref(false)
const syncRoute = () => {
  route.value = location.hash
  nextTick(() => { if (route.value === '#guestbook') document.getElementById('guestbook')?.scrollIntoView(); else { main.value?.focus(); window.scrollTo(0, 0) } })
}
window.addEventListener('hashchange', syncRoute)
onBeforeUnmount(() => { window.removeEventListener('hashchange', syncRoute) })
const filtered = computed(() => filterPlaces(places, city.value, query.value, tag.value))
const tags = computed(() => [...new Set(all.flatMap(p => p.tags))].sort((a, b) => a.localeCompare(b, 'zh-CN')))
const cities = [...new Set(all.map(p => p.city))].sort((a, b) => a.localeCompare(b, 'zh-CN'))
const hasFilters = computed(() => !!city.value || !!tag.value || !!query.value.trim())
const guideUrl = computed(() => `${import.meta.env.BASE_URL}guide/`)
const isHome = computed(() => !route.value || route.value === '#' || route.value === '#/' || route.value === '#guestbook')
onMounted(() => { if (route.value === '#guestbook') nextTick(() => document.getElementById('guestbook')?.scrollIntoView()) })
const currentPlace = computed(() => {
  const match = route.value.match(/^#\/place\/([a-z0-9-]+)$/)
  return match ? all.find(p => p.id === match[1]) : undefined
})
const contentDate = [site.updatedAt, ...all.map(p => p.updatedAt), ...updates.map(u => u.date)].filter(Boolean).sort().at(-1) || null
const rankOf = (p: Place) => all.filter(x => x.tier === p.tier).findIndex(x => x.id === p.id) + 1
const scope = computed(() => hasFilters.value ? `${city.value || '全部城市'}${tag.value ? ` · #${tag.value}` : ''}${query.value.trim() ? ` · 搜索「${query.value.trim()}」` : ''}` : '全榜 · 全部城市')
watch(currentPlace, p => { document.title = `${p ? p.name + ' · ' : ''}${site.title} · ${site.author}` }, { immediate: true })
</script>

<template>
  <a href="#main-content" class="skip-link" @click.prevent="main?.focus()">跳到正文</a>
  <header class="site-header"><div class="header-inner">
    <a href="#/" class="brand"><span class="brand-mark" aria-hidden="true">排</span><span>汤包的逛店手记<small>PLACES & PREFERENCES</small></span></a>
    <nav aria-label="主导航"><a href="#/" :aria-current="isHome ? 'page' : undefined">图片总榜</a><a :href="guideUrl">地图与介绍</a><a :href="qaUrl">QA 与建议</a><a :href="homeUrl">个人主页 <span aria-hidden="true">↗</span></a></nav>
  </div></header>

  <main id="main-content" ref="main" tabindex="-1" class="page-shell">
    <template v-if="isHome">
      <section class="hero" aria-labelledby="page-title">
        <div class="hero-copy"><p class="eyebrow"><span></span> 一份持续更新的个人榜单</p><h1 id="page-title">{{ site.title }}<span class="title-dot">。</span></h1>
          <p class="hero-description">{{ site.description }}</p>
          <div class="byline"><span class="author-avatar" aria-hidden="true">汤</span><span>{{ site.author }}</span><span class="separator">/</span><span>{{ contentDate ? `内容更新于 ${contentDate}` : '等待第一条体验' }}</span></div>
        </div>
        <div class="hero-note" aria-label="榜单概况"><div class="note-top"><span>我的城市探索记录</span><span aria-hidden="true">↗</span></div><div class="stats"><div><strong>{{ String(all.length).padStart(2, '0') }}</strong><span>家店铺</span></div><span class="stats-divider"></span><div><strong>{{ String(cities.length).padStart(2, '0') }}</strong><span>座城市</span></div></div><div class="mini-scale" aria-hidden="true"><span v-for="tier in tiers" :key="tier.id" :style="{ background: tier.color }"></span></div><p>{{ all.length ? '走过的路，留下自己的判断。' : '榜单已就位，故事慢慢填。' }}</p></div>
      </section>

      <section class="board-section" aria-labelledby="board-title">
        <div class="section-heading"><div><span class="section-number">01</span><h2 id="board-title">图片总榜</h2><span class="desktop-note">{{ site.rankWithinTier ? '同档按顺序排名' : '同档不分先后' }}</span></div><button class="button dark" @click="exportOpen = true"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M4 15v5h16v-5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>导出榜单</button></div>
        <div class="filter-bar">
          <label class="city-filter"><span class="sr-only">城市筛选</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18 10c0 5-6 10-6 10S6 15 6 10a6 6 0 1 1 12 0Z" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="10" r="2" stroke="currentColor" stroke-width="1.5"/></svg><select v-model="city" aria-label="城市筛选"><option value="">全部城市</option><option v-if="city && !cities.includes(city)" :value="city">{{ city }}（暂无条目）</option><option v-for="c in cities" :key="c">{{ c }}</option></select></label>
          <label class="search-filter"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" stroke-width="1.5"/><path d="m16 16 4 4" stroke="currentColor" stroke-width="1.5"/></svg><input v-model="query" type="search" placeholder="搜索店名、城市、评价或标签…" aria-label="关键词搜索" /></label>
          <div class="filter-result"><span role="status" aria-live="polite">{{ filtered.length }} 个结果</span><button class="text-button" :disabled="!hasFilters" @click="reset">重置</button></div>
        </div>
        <CityLegend :cities="cities" :colors="colors" :active="city" @select="city = $event" />
        <TagLegend :tags="tags" :active="tag" @select="tag = $event" />
        <div class="photo-options"><span>点击图片，查看详细评价和地图位置</span><label><input v-model="showLabels" type="checkbox" />显示名称与城市</label></div>
        <div v-if="!all.length && !hasFilters" class="empty-intro"><span class="empty-icon" aria-hidden="true">＋</span><div><strong>第一站，还在路上</strong><p>这里暂时没有条目。等真实体验到来，再把每一票投给心里的位置。</p></div><span class="empty-pill">待填充</span></div>
        <div v-if="hasFilters && !filtered.length" class="no-results" role="status"><strong>没有找到匹配的条目</strong><span>试试其他关键词、城市或标签。</span><button class="text-button" @click="reset">重置筛选 ↗</button></div>
        <div class="tier-board photo-board" :class="{ 'show-photo-labels': showLabels }"><section v-for="(tier, index) in tiers" :key="tier.id" class="tier-row" :style="{ '--tier-color': tier.color, '--tier-pale': tier.pale }" :aria-labelledby="`tier-${tier.id}`"><div class="tier-label"><span class="tier-index">0{{ index + 1 }}</span><h3 :id="`tier-${tier.id}`">{{ tier.label }}</h3><span class="tier-count">{{ filtered.filter(p => p.tier === tier.id).length }} 个条目</span></div><div class="tier-content"><div v-if="!filtered.some(p => p.tier === tier.id)" class="tier-empty"><span class="empty-dash" aria-hidden="true"></span><span>暂无条目</span></div><div v-else class="card-grid"><PlaceCard v-for="p in filtered.filter(p => p.tier === tier.id)" :key="p.id" :place="p" :color="cityColor(p.city, colors)" :href="`${guideUrl}#/place/${p.id}`" :rank="site.rankWithinTier ? rankOf(p) : undefined" :badge="recentBadge(p.id, updates, site.recentDays)" /></div></div></section></div>
        <p class="board-caption"><span>推荐度从上到下递减</span><span>{{ site.rankWithinTier ? '同档分先后 · 从左到右，从上到下' : '同档不分先后' }}</span></p>
      </section>

      <section class="guide-entry"><div><h2>心里有一站，就去地图找找</h2><p>同样的城市颜色，对应地图上的位置。详细评价与到访路线也在这里。</p></div><a :href="guideUrl" class="button dark">打开地图与介绍 ↗</a></section>
      <div class="bottom-grid"><section class="updates-section" aria-labelledby="updates-title"><div class="section-heading"><div><span class="section-number">02</span><h2 id="updates-title">最近更新</h2></div><span class="muted tiny">持续记录中</span></div><div v-if="!updates.length" class="quiet-empty"><span class="timeline-dot"></span><div><h3>还没有更新记录</h3><p>新增、改档与评价修改，都会在这里留下足迹。</p></div></div><ol v-else class="update-list"><li v-for="u in updates.slice(0, 10)" :key="u.id"><time>{{ u.date }}</time><div><span class="update-kind">{{ updateLabel(u) }}</span><a :href="`${guideUrl}#/place/${u.placeId}`">{{ all.find(p => p.id === u.placeId)?.name }}</a><p v-if="u.type === 'tier-change'">{{ tierLabel(u.fromTier!) }} → {{ tierLabel(u.toTier!) }}</p><p>{{ u.note }}</p></div></li></ol></section>
      <section class="criteria-section" aria-labelledby="criteria-title"><div class="section-heading"><div><span class="section-number">03</span><h2 id="criteria-title">关于这份榜单</h2></div><span class="about-icon" aria-hidden="true">i</span></div><p>{{ site.criteria }}</p><div class="criteria-scale"><span v-for="t in tiers" :key="t.id"><i :style="{ background: t.color }"></i>{{ t.label }}</span></div><details><summary>查看各档标准与排序规则</summary><dl><template v-for="t in tiers" :key="t.id"><dt>{{ t.label }}</dt><dd>{{ site.tierDescriptions[t.id] }}</dd></template></dl><p>{{ site.rankWithinTier ? '同档有先后，卡片编号表示该档内的完整排名；筛选后保留原排名。' : '同档不分先后，展示顺序仅用于排版。' }}</p><p>到访日期未提供时显示“未记录”；内容更新日期由作者维护。</p></details><p class="personal-note">仅代表个人体验，供你出发前参考。</p></section></div>
      <Guestbook />
    </template>

    <section v-else-if="currentPlace" class="detail-page"><a href="#/" class="back-link">← 返回榜单</a><a :href="`${guideUrl}#/place/${currentPlace.id}`" class="button">地图与地点目录 ↗</a><PlaceDetail :place="currentPlace" :rank="site.rankWithinTier ? rankOf(currentPlace) : undefined" :color="cityColor(currentPlace.city, colors)" /></section>
    <section v-else class="not-found"><p class="eyebrow">这一站暂未收录</p><h1>没有找到这个条目</h1><p>链接可能有误，或条目尚未公开。</p><a href="#/" class="button dark">返回榜单</a></section>
  </main>
  <footer class="site-footer"><span><b>{{ site.author }}</b> · 一店一感受，一次次更新。</span><VisitCounter /></footer>
  <ExportPanel v-if="exportOpen" :site="site" :places="filtered" :all-places="all" :scope="scope" :updated-at="contentDate" @close="exportOpen = false" />
</template>
