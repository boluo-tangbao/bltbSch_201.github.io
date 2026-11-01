<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { Place, ShopDirectory, Site } from '../types'
import directoryData from '../data/shop-directories.json'
import siteData from '../data/site.json'
import { resolveTripStops, tripEntryKey, tripPlanHtml, tripPlanText, tripStopUrl } from '../utils/tripPlan'
import { useTripPlan } from '../utils/useTripPlan'
import { useShopToday } from '../utils/shopToday'
import CopyButton from './CopyButton.vue'
import ExportPanel from './ExportPanel.vue'
import TripJourney from './TripJourney.vue'
import {groupTripStops} from '../utils/tripRouting'

const props = defineProps<{ places: Place[] }>()
const plan = useTripPlan(), today = useShopToday(), dialog = ref<HTMLDialogElement>()
const site = siteData as Site
const guideUrl = new URL(`${import.meta.env.BASE_URL}guide/`, location.origin).href
const stops = computed(() => resolveTripStops(plan.entries.value, props.places, directoryData as Record<string, ShopDirectory>, today.value))
const text = computed(() => tripPlanText(stops.value, guideUrl))
const groups=computed(()=>groupTripStops(stops.value,props.places))
const selectedPlaces = computed(() => props.places.filter(place=>stops.value.some(stop=>stop.placeId===place.id)))
const updatedAt = computed(() => [site.updatedAt, ...selectedPlaces.value.map(place => place.updatedAt)].filter(Boolean).sort().at(-1) || null)
const rankingOpen = ref(false), documentUrl = ref('')
const plannerOpen=ref(false)
function openPlanner(){plannerOpen.value=true;dialog.value?.showModal()}
function finishSelecting(){plan.setSelecting(false);if(stops.value.length)openPlanner()}
function release() { if (documentUrl.value) URL.revokeObjectURL(documentUrl.value); documentUrl.value = '' }
function exportPlan() { release(); documentUrl.value = URL.createObjectURL(new Blob([tripPlanHtml(stops.value, guideUrl, today.value)], { type: 'text/html;charset=utf-8' })) }
function clear() { plan.clear();try{sessionStorage.removeItem('tangbao-trip-routing-session-v1')}catch{};dialog.value?.close() }
watch(stops, value => {
  release()
  if (value.length !== plan.entries.value.length) plan.replace(value.map(({ placeId, shopName,custom }) => ({ placeId, ...(shopName ? { shopName } : {}),...(custom?{custom}:{}) })))
  if (!value.length) { dialog.value?.close(); rankingOpen.value = false }
}, { immediate: true })
onBeforeUnmount(release)
</script>

<template>
  <button v-if="!stops.length&&!plan.selecting.value" type="button" class="trip-plan-launcher" @click="plan.setSelecting(true)"><span aria-hidden="true">↗</span> 规划逛店</button>
  <aside v-if="stops.length||plan.selecting.value" class="trip-plan-dock" aria-label="本次逛店清单">
    <div><strong>{{plan.selecting.value?'正在挑选想逛的地方':'本次逛店清单'}} · {{ groups.length }} 站</strong><small>{{plan.selecting.value?'点「想逛」选地点，也可进入介绍挑具体店铺':'选好下一站，带着清单出发'}}</small></div>
    <div class="trip-dock-actions"><template v-if="plan.selecting.value"><button type="button" class="button dark" @click="finishSelecting">{{stops.length?'选好了，规划路线':'退出选店'}}</button></template><template v-else><button type="button" class="text-button" @click="plan.setSelecting(true)">继续选店</button><button type="button" class="button dark" aria-haspopup="dialog" @click="openPlanner">整理与导出</button></template></div>
  </aside>
  <dialog ref="dialog" class="trip-plan-dialog" aria-labelledby="trip-plan-title" @close="plannerOpen=false">
    <header class="trip-plan-heading"><div><p class="section-label">THIS TRIP</p><h2 id="trip-plan-title">本次逛店清单</h2></div><button type="button" class="trip-plan-close" aria-label="关闭本次清单" @click="dialog?.close()">×</button></header>
    <p class="trip-plan-note">加入地点或具体店铺，按逛店顺序调整。仅保留本次浏览，关闭标签页后清空。</p>
    <TripJourney v-if="stops.length&&plannerOpen" :places="places" :guide-url="guideUrl" @details="dialog?.close()" />
    <footer class="trip-plan-actions">
      <button type="button" class="button dark" :disabled="!stops.length" @click="exportPlan">生成清单文件</button>
      <a v-if="documentUrl" class="button trip-plan-download" :href="documentUrl" :download="`本次逛店清单-${today}.html`">下载清单（HTML）↓</a>
      <CopyButton :text="text" label="复制本次清单" />
      <button type="button" class="button" :disabled="!selectedPlaces.length" @click="rankingOpen = true">导出所选地点榜单</button>
      <button type="button" class="text-button" @click="clear">清空本次清单</button>
    </footer>
    <p class="trip-plan-note">清单文件保留当前顺序、地址、楼层与档期，可离线阅读；地点榜单沿用原排名。详情和导航需联网。</p>
  </dialog>
  <ExportPanel v-if="rankingOpen" :site="site" :places="selectedPlaces" :all-places="places" current-label="本次清单" scope="本次逛店清单" :updated-at="updatedAt" @close="rankingOpen = false" />
</template>

<style scoped>
:global(body:has(.trip-plan-dock)) { padding-bottom: 100px; }
.trip-plan-dock { position: fixed; z-index: 850; bottom: max(12px, env(safe-area-inset-bottom)); left: 50%; transform: translateX(-50%); display: flex; align-items: center; justify-content: space-between; gap: 12px; width: min(760px, calc(100% - 28px)); padding: 12px 16px; border: 2px solid #292932; background: #fffaf1; box-shadow: 4px 4px 0 #efb1bb; }
.trip-plan-dock > div { min-width: 0; }
.trip-plan-launcher { position:fixed;z-index:850;right:20px;bottom:max(20px,env(safe-area-inset-bottom));display:flex;align-items:center;gap:8px;min-height:44px;padding:10px 18px;border:1px solid #a83750;border-radius:28px;background:#fffaf1;color:#84394e;font:inherit;font-size:14px;box-shadow:2px 3px 0 #efb1bb;cursor:pointer; }
.trip-plan-launcher span { font-size:20px; }
.trip-plan-launcher:focus-visible { outline:3px solid #a83750;outline-offset:4px; }
.trip-dock-actions { display:flex;align-items:center;gap:10px;flex:none; }
.trip-plan-dock strong { display: block; font-size: 15px; }
.trip-plan-dock small { display: block; margin-top: 3px; color: #79626b; font-size: 12px; }
.trip-plan-dock button { flex: none; min-height: 44px; }
.trip-plan-dialog { width: min(900px, calc(100% - 24px)); max-height: calc(100dvh - 36px); margin: auto; padding: 24px; border: 2px solid #292932; background: #fffaf1; color: #292932; overflow-y: auto; }
.trip-plan-dialog::backdrop { background: #29293288; }
.trip-plan-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.trip-plan-heading h2 { margin: 0; font-size: 26px; }
.trip-plan-close { flex: none; width: 44px; height: 44px; border: 1px solid #d8bdc5; background: #fffdfa; color: #84394e; font-size: 26px; }
.trip-plan-note { margin: 10px 0; color: #79626b; font-size: 12px; line-height: 1.8; }
.trip-plan-stops { list-style: none; margin: 20px 0; padding: 0; }
.trip-plan-stop { display: grid; grid-template-columns: 24px minmax(0, 1fr); gap: 10px; padding: 16px 0; border-top: 1px solid #e5c5cc; }
.trip-plan-number { color: #a83750; font-weight: 800; }
.trip-plan-stop-copy { min-width: 0; overflow-wrap: anywhere; font-size: 13px; line-height: 1.8; }
.trip-plan-stop h3 { margin: 0 0 5px; font-size: 16px; }
.trip-plan-stop p { margin: 4px 0; }
.trip-plan-period { color: #84394e; }
.trip-plan-links,.trip-plan-order,.trip-plan-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.trip-plan-links a { display: inline-flex; align-items: center; min-height: 44px; margin-right: 10px; color: #84394e; text-decoration: underline; text-underline-offset: 3px; }
.trip-plan-order button { min-height: 44px; padding: 6px 10px; border: 1px solid #d8bdc5; border-radius: 4px; background: #fffdfa; color: #84394e; font: inherit; font-size: 12px; }
.trip-plan-dialog button:disabled { opacity: .45; cursor: default; }
.trip-plan-actions { border-top: 1px solid #e5c5cc; padding-top: 16px; }
.trip-plan-actions > .button { min-height: 44px; font-size: 12px; }
.trip-plan-download { overflow-wrap: anywhere; }
@media (max-width: 580px) {
  .trip-plan-dock { padding: 10px; gap: 8px; }
  .trip-plan-dock strong { font-size: 13px; }
  .trip-plan-dock small { font-size: 10px; }
  .trip-plan-dock button { font-size: 12px; padding: 7px 10px; }
  .trip-plan-dialog { padding: 16px; }
}
@media (max-width: 800px) { :global(body:has(.trip-plan-dock) .detail-side-nav) { bottom: calc(110px + env(safe-area-inset-bottom)); } }
</style>
