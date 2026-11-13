<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import SiteHeader from './components/SiteHeader.vue'
import TripPlanner from './components/TripPlanner.vue'
import placeData from './data/places.json'
import directories from './data/shop-directories.json'
import type { PlacesByCity, ShopDirectory } from './types'
import { flattenPlaces, filterPlaces } from './utils/model'
import { publicRouteEntries, readPublicRoute } from './utils/publicSharing'
import { resolveTripStops, tripEntryKey, tripStopUrl } from './utils/tripPlan'
import { useTripPlan } from './utils/useTripPlan'
import { useShopToday } from './utils/shopToday'
const places = filterPlaces(flattenPlaces(placeData as PlacesByCity)), plan = useTripPlan(), today = useShopToday()
const hash = ref(location.hash), message = ref('')
const readHash = () => { hash.value = location.hash; message.value = '' }
onMounted(() => window.addEventListener('hashchange', readHash))
onBeforeUnmount(() => window.removeEventListener('hashchange', readHash))
const route = computed(() => readPublicRoute(hash.value))
const entries = computed(() => publicRouteEntries(route.value?.entries || [], places, directories as Record<string, ShopDirectory>, today.value))
const stops = computed(() => resolveTripStops(entries.value, places, directories as Record<string, ShopDirectory>, today.value))
const missing = computed(() => entries.value.filter(entry => !plan.contains(entry)))
const guideUrl = new URL(`${import.meta.env.BASE_URL}guide/`, location.origin).href
const boardUrl = import.meta.env.BASE_URL
function add() {
  const merged = [...plan.entries.value, ...missing.value]
  if (merged.length > 120) { message.value = '加入后超过120项，请先整理当前清单。'; return }
  plan.replace(merged.filter((entry, index, all) => all.findIndex(other => tripEntryKey(other) === tripEntryKey(entry)) === index))
  plan.setSelecting(false)
  message.value = '已加入你的想逛清单，原有选择保留。可从底部查看、调整或保存。'
}
</script>

<template>
  <SiteHeader active="route" />
  <main class="public-route-page page-shell">
    <p class="eyebrow">一起去逛店</p><h1>朋友分享的逛店路线</h1>
    <template v-if="route">
      <p>分享日期 {{ route.date }} · 当前可用 {{ new Set(stops.map(s => s.placeId)).size }} 站、{{ stops.length }} 项选择</p>
      <p>以下按分享顺序展示，地点、楼层与档期已按当前店单重新读取。</p>
      <p v-if="entries.length !== route.entries.length" role="status">{{ route.entries.length - entries.length }} 项已结束、停业、重复或无法对应当前店单的选择未加入。出发前请查看原文与店铺公告。</p>
      <ol class="public-route-stops"><li v-for="(stop, i) in stops" :key="i"><h2>{{ stop.name }}</h2><p>{{ stop.city }} · {{ stop.placeName }}<template v-if="stop.floor"> · {{ stop.floor }}</template></p><p>{{ stop.address || '地址待补充' }}</p><p v-if="stop.period">{{ stop.status }} · {{ stop.period }}</p><a :href="tripStopUrl(stop, guideUrl)">查看介绍与当前店单 ↗</a></li></ol>
      <button type="button" class="button dark" :disabled="!missing.length" @click="add">{{ entries.length && !missing.length ? '已加入' : '加入想逛清单' }}</button>
      <p role="status">{{ message }}</p>
      <p class="route-note">打开链接只预览；点击加入后才合并到你的想逛清单。此链接不包含对方的行程名称、自填内容、出行设置或地图轨迹。</p>
    </template>
    <p v-else role="status">路线链接不完整或无法读取，请让朋友重新复制公开路线链接。</p>
    <a :href="boardUrl">返回图片榜单 ↗</a>
  </main>
  <TripPlanner :places="places" />
</template>

<style scoped>
.public-route-page { max-width: 820px; padding-top: 32px; padding-bottom: 40px; overflow-wrap: anywhere; }
h1 { margin: 12px 0; font-size: clamp(26px, 5vw, 38px); } h2 { font-size: 20px; }
p { margin: 12px 0; font-size: 14px; line-height: 1.8; }
.public-route-stops { padding-left: 24px; margin: 24px 0; }
li { margin: 16px 0; padding: 16px; border: 1px solid var(--ui-border); border-radius: var(--ui-radius-card); background: var(--ui-surface); }
li p { margin: 4px 0; } a { display: inline-flex; align-items: center; min-height: 44px; color: var(--ui-accent); text-decoration: underline; }
.route-note { color: var(--ui-muted); font-size: 12px; }
</style>
