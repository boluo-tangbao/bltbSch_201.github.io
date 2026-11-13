<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { Place, ShopDirectory, Site } from '../types'
import directoryData from 'virtual:directory-summary'
import siteData from '../data/site.json'
import { resolveTripStops, tripEntryKey, tripPlanHtml, tripPlanText } from '../utils/tripPlan'
import { useTripPlan } from '../utils/useTripPlan'
import { useShopToday } from '../utils/shopToday'
import CopyButton from './CopyButton.vue'
import ExportPanel from './DeferredExport.vue'
import DeferredFeature from './DeferredFeature.vue'
import {groupTripStops} from '../utils/tripRouting'
import { reviewTripEntries, routingKey, type SavedTrip } from '../utils/tripArchive'

const props = defineProps<{ places: Place[]; currentPlace?: Place }>()
const plan = useTripPlan(), today = useShopToday(), dialog = ref<HTMLDialogElement>()
const site = siteData as Site
const guideUrl = new URL(`${import.meta.env.BASE_URL}guide/`, location.origin).href
const stops = computed(() => resolveTripStops(plan.entries.value, props.places, directoryData as Record<string, ShopDirectory>, today.value))
const text = computed(() => tripPlanText(stops.value, guideUrl))
const groups=computed(()=>groupTripStops(stops.value,props.places))
const unavailable = computed(() => reviewTripEntries(plan.entries.value, props.places, directoryData as Record<string, ShopDirectory>, today.value))
const archiveOpen = ref(false), journeyRevision = ref(0)
const shareOpen = ref(false)
const loadShare = () => import('./PublicRouteShare.vue')
function openShare() { dialog.value?.close(); shareOpen.value = true }
const loadArchive = () => import('./TripArchive.vue')
function openArchive() { dialog.value?.close(); archiveOpen.value = true }
async function restoreTrip(trip: SavedTrip) {
  try { sessionStorage.setItem(routingKey, JSON.stringify(trip.preferences)) } catch { /* The current selection still works without session storage. */ }
  plan.replace(trip.entries); plan.setSelecting(false); journeyRevision.value++; archiveOpen.value = false
  await nextTick(); openPlanner()
}
const selectedPlaces = computed(() => props.places.filter(place=>stops.value.some(stop=>stop.placeId===place.id)))
const updatedAt = computed(() => [site.updatedAt, ...selectedPlaces.value.map(place => place.updatedAt)].filter(Boolean).sort().at(-1) || null)
const rankingOpen = ref(false), documentUrl = ref('')
const plannerOpen=ref(false)
const loadJourney = () => import('./TripJourney.vue')
function openPlanner(){plannerOpen.value=true;dialog.value?.showModal()}
function finishSelecting(){plan.setSelecting(false);if(plan.entries.value.length)openPlanner()}
function addCurrentPlace() { if (props.currentPlace) plan.toggle({ placeId: props.currentPlace.id }) }
function release() { if (documentUrl.value) URL.revokeObjectURL(documentUrl.value); documentUrl.value = '' }
function exportPlan() { release(); documentUrl.value = URL.createObjectURL(new Blob([tripPlanHtml(stops.value, guideUrl, today.value)], { type: 'text/html;charset=utf-8' })) }
function clear() { plan.clear();try{sessionStorage.removeItem('tangbao-trip-routing-session-v1')}catch{};dialog.value?.close() }
watch(stops, () => {
  release()
  if (!plan.entries.value.length) { dialog.value?.close(); rankingOpen.value = false }
}, { immediate: true })
onBeforeUnmount(release)
</script>

<template>
  <div v-if="!plan.entries.value.length&&!plan.selecting.value" class="trip-plan-entry" :class="{ 'is-browsing': !currentPlace }" aria-label="想逛清单操作">
    <button type="button" class="trip-saved-launcher" aria-haspopup="dialog" @click="openArchive">本机行程</button>
    <button v-if="currentPlace" type="button" class="trip-current-add" @click="addCurrentPlace">加入清单</button>
    <button type="button" class="trip-plan-launcher" :class="{ 'has-current-place': currentPlace }" @click="plan.setSelecting(true)"><span aria-hidden="true">＋</span> 开始选店</button>
  </div>
  <aside v-if="plan.entries.value.length||plan.selecting.value" class="trip-plan-dock" aria-label="想逛清单">
    <div><strong>{{plan.selecting.value?'正在挑选想逛的地方':'想逛清单'}} · {{ groups.length }} 站</strong><small>{{plan.selecting.value?'点心形加入清单，也可进入介绍挑具体店铺':'选好下一站，带着清单出发'}}</small></div>
    <div class="trip-dock-actions"><template v-if="plan.selecting.value"><button type="button" class="button dark" @click="finishSelecting">{{plan.entries.value.length?'查看清单':'退出选店'}}</button></template><template v-else><button type="button" class="text-button" @click="plan.setSelecting(true)">继续选店</button><button type="button" class="button dark" aria-haspopup="dialog" @click="openPlanner">查看清单</button></template></div>
  </aside>
  <dialog ref="dialog" class="trip-plan-dialog" aria-labelledby="trip-plan-title" @close="plannerOpen=false">
    <header class="trip-plan-heading"><div><p class="section-label">THIS TRIP</p><h2 id="trip-plan-title">想逛清单</h2></div><button type="button" class="trip-plan-close" aria-label="关闭想逛清单" @click="dialog?.close()">×</button></header>
    <p class="trip-plan-note">想逛清单默认临时使用，关闭标签页后清空；需下次继续，可主动加密保存到本机。自填地址和备注仅本页暂存，刷新或切换页面前请加密保存。</p>
    <button type="button" class="button" @click="openArchive">保存／恢复行程</button>
    <section v-if="unavailable.length" class="trip-plan-unavailable" aria-label="原计划中需调整的条目"><h3>原计划中需调整</h3><p class="trip-plan-note">这些条目保留在原计划中，暂不参加路线与当前清单导出。</p><ul><li v-for="item in unavailable" :key="tripEntryKey(item.entry)">{{ item.name }} · {{ item.reason }} <button type="button" class="text-button" :aria-label="`移除失效条目：${item.name}`" @click="plan.remove(item.entry)">移除</button></li></ul></section>
    <DeferredFeature v-if="stops.length&&plannerOpen" :key="journeyRevision" inline :loader="loadJourney" title="行程规划" :places="places" :guide-url="guideUrl" @details="dialog?.close()" />
    <footer class="trip-plan-actions">
      <button type="button" class="button dark" :disabled="!stops.length" @click="exportPlan">生成清单文件</button>
      <a v-if="documentUrl" class="button trip-plan-download" :href="documentUrl" :download="`想逛清单-${today}.html`">下载清单（HTML）↓</a>
      <CopyButton :text="text" label="复制想逛清单" />
      <button type="button" class="button" aria-haspopup="dialog" @click="openShare">分享公开路线</button>
      <button type="button" class="button" :disabled="!selectedPlaces.length" @click="rankingOpen = true">导出所选地点榜单</button>
      <button type="button" class="text-button" @click="clear">清空想逛清单</button>
    </footer>
    <p class="trip-plan-note">清单文件保留当前顺序、地址、楼层与档期，可离线阅读；地点榜单沿用原排名。详情和导航需联网。</p>
  </dialog>
  <DeferredFeature v-if="archiveOpen" :loader="loadArchive" title="本机行程" :entries="plan.entries.value" :places="places" :directories="directoryData" @close="archiveOpen = false" @restore="restoreTrip" />
  <DeferredFeature v-if="shareOpen" :loader="loadShare" title="公开路线分享" :entries="plan.entries.value" :places="places" :directories="directoryData" @close="shareOpen = false; openPlanner()" />
  <ExportPanel v-if="rankingOpen" :site="site" :places="selectedPlaces" :all-places="places" current-label="想逛清单" scope="想逛清单" :updated-at="updatedAt" @close="rankingOpen = false" />
</template>

<style scoped>
:global(body:has(.trip-plan-dock)) { padding-bottom: 100px; }
.trip-plan-dock { position: fixed; z-index: 850; bottom: max(12px, env(safe-area-inset-bottom)); left: 50%; transform: translateX(-50%); display: flex; align-items: center; justify-content: space-between; gap: 12px; width: min(760px, calc(100% - 28px)); padding: 12px 16px; border: 2px solid #292932; background: #fffaf1; box-shadow: 4px 4px 0 #efb1bb; }
.trip-plan-dock > div { min-width: 0; }
.trip-plan-launcher { position:fixed;z-index:850;right:20px;bottom:max(20px,env(safe-area-inset-bottom));display:flex;align-items:center;gap:8px;min-height:44px;padding:10px 18px;border:1px solid var(--ui-accent, #a83750);border-radius:28px;background:#fffaf1;color:#84394e;font:inherit;font-size:14px;box-shadow:2px 3px 0 #efb1bb;cursor:pointer; }
.trip-plan-launcher span { font-size:20px; }
.trip-saved-launcher { position: fixed; z-index: 850; left: 20px; bottom: max(20px, env(safe-area-inset-bottom)); min-height: 44px; padding: 10px 14px; border: 1px solid var(--ui-border); border-radius: var(--ui-radius-control); background: var(--ui-surface); color: var(--ui-accent); font: inherit; font-size: 13px; }
.trip-plan-unavailable { margin-top: 16px; padding: 12px; border: 1px solid var(--ui-border); font-size: 13px; overflow-wrap: anywhere; }
.trip-plan-launcher:focus-visible { outline:3px solid var(--ui-accent, #a83750);outline-offset:4px; }
.trip-dock-actions { display:flex;align-items:center;gap:10px;flex:none; }
.trip-plan-dock strong { display: block; font-size: 15px; }
.trip-plan-dock small { display: block; margin-top: 3px; color: var(--ui-muted, #79626b); font-size: 12px; }
.trip-plan-dock button { flex: none; min-height: 44px; }
.trip-plan-dialog { width: min(900px, calc(100% - 24px)); max-height: calc(100dvh - 36px); margin: auto; padding: 24px; border: 2px solid #292932; background: #fffaf1; color: #292932; overflow-y: auto; }
.trip-plan-dialog::backdrop { background: #29293288; }
.trip-plan-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.trip-plan-heading h2 { margin: 0; font-size: 26px; }
.trip-plan-close { flex: none; width: 44px; height: 44px; border: 1px solid #d8bdc5; background: var(--ui-surface, #fffdfa); color: #84394e; font-size: 26px; }
.trip-plan-note { margin: 10px 0; color: var(--ui-muted, #79626b); font-size: 12px; line-height: 1.8; }
.trip-plan-stops { list-style: none; margin: 20px 0; padding: 0; }
.trip-plan-stop { display: grid; grid-template-columns: 24px minmax(0, 1fr); gap: 10px; padding: 16px 0; border-top: 1px solid var(--ui-border, #e5c5cc); }
.trip-plan-number { color: var(--ui-accent, #a83750); font-weight: 800; }
.trip-plan-stop-copy { min-width: 0; overflow-wrap: anywhere; font-size: 13px; line-height: 1.8; }
.trip-plan-stop h3 { margin: 0 0 5px; font-size: 16px; }
.trip-plan-stop p { margin: 4px 0; }
.trip-plan-period { color: #84394e; }
.trip-plan-links,.trip-plan-order,.trip-plan-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.trip-plan-links a { display: inline-flex; align-items: center; min-height: 44px; margin-right: 10px; color: #84394e; text-decoration: underline; text-underline-offset: 3px; }
.trip-plan-order button { min-height: 44px; padding: 6px 10px; border: 1px solid #d8bdc5; border-radius: 4px; background: var(--ui-surface, #fffdfa); color: #84394e; font: inherit; font-size: 12px; }
.trip-plan-dialog button:disabled { opacity: .45; cursor: default; }
.trip-plan-actions { border-top: 1px solid var(--ui-border, #e5c5cc); padding-top: 16px; }
.trip-plan-actions > .button { min-height: 44px; font-size: 12px; }
.trip-plan-download { overflow-wrap: anywhere; }
.trip-current-add { display: none; }
@media (max-width: 580px) {
  :global(body:has(.trip-plan-entry:not(.is-browsing))), :global(body:has(.trip-plan-dock)) { padding-bottom: calc(100px + env(safe-area-inset-bottom)); }
  .trip-plan-entry, .trip-plan-dock { position: fixed; z-index: 850; inset: auto 0 0; width: 100%; transform: none; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); border: 0; border-top: 1px solid var(--ui-border); background: var(--ui-surface); box-shadow: 0 -3px 16px #2928300a; }
  .trip-plan-entry > button { position: static; min-height: 44px; margin: 0; border-radius: var(--ui-radius-control); box-shadow: none; font: inherit; font-size: 13px; cursor: pointer; }
  .trip-plan-entry .trip-saved-launcher { padding: 8px; border: 0; background: none; color: var(--ui-muted); }
  .trip-plan-entry .trip-plan-launcher, .trip-plan-entry .trip-current-add { justify-content: center; min-width: 136px; padding: 10px 20px; border: 1px solid var(--ui-accent); background: var(--ui-accent); color: var(--ui-surface); }
  .trip-plan-entry .trip-current-add { display: inline-flex; }
  .trip-plan-entry .trip-plan-launcher.has-current-place { display: none; }
  .trip-plan-dock strong { font-size: 13px; }
  .trip-plan-dock small { font-size: 12px; line-height: 1.5; }
  .trip-dock-actions { gap: 4px; }
  .trip-plan-dock button { font-size: 12px; padding: 7px 10px; }
  .trip-plan-dialog { padding: 16px; }
  .trip-plan-entry button:focus-visible { outline: 2px solid var(--ui-accent); outline-offset: 2px; }
}
.trip-plan-entry.is-browsing { position: static; display: flex; flex-wrap: wrap; justify-content: center; gap: 8px 20px; width: auto; margin: 20px auto; padding: 0 16px; border: 0; background: none; box-shadow: none; transform: none; }
.trip-plan-entry.is-browsing > button { position: static; min-width: 0; min-height: 44px; padding: 8px 12px; border: 1px solid var(--ui-border); border-radius: var(--ui-radius-control); background: var(--ui-surface); color: var(--ui-muted); box-shadow: none; font: inherit; font-size: 13px; }
@media (max-width: 800px) { :global(body:has(.trip-plan-dock) .detail-side-nav), :global(body:has(.trip-plan-entry:not(.is-browsing)) .detail-side-nav) { bottom: calc(110px + env(safe-area-inset-bottom)); } }
</style>
