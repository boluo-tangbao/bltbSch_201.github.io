<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { Place, ShopDirectory } from '../types'
import directoryData from 'virtual:directory-summary'
import { comparisonFacts, comparisonRows } from '../utils/placeComparison'
import { placeDetailHash } from '../utils/search'
import { useShopToday } from '../utils/shopToday'
import PlaceImage from './PlaceImage.vue'

const props = defineProps<{ places: Place[]; currentPlace?: Place }>()
const storageKey = 'tangbao-place-comparison-v1'
const directories = directoryData as Record<string, ShopDirectory>
const today = useShopToday()
const dialog = ref<HTMLDialogElement>()
const query = ref(''), city = ref(''), differencesOnly = ref(false), choosing = ref(true)
const message = ref('')
function readSelection(): string[] {
  try {
    const ids: unknown = JSON.parse(localStorage.getItem(storageKey) || '[]')
    return Array.isArray(ids) ? [...new Set(ids.filter((id): id is string => typeof id === 'string' && props.places.some(p => p.id === id)))].slice(0, 3) : []
  } catch { return [] }
}
const ids = ref(readSelection())
watch(ids, value => { try { localStorage.setItem(storageKey, JSON.stringify(value)) } catch {} })
const selected = computed(() => ids.value.flatMap(id => props.places.find(p => p.id === id) ?? []))
const cities = computed(() => [...new Set(props.places.map(p => p.city))])
const candidates = computed(() => props.places.filter(p => (!city.value || p.city === city.value) &&
  `${p.name} ${p.city} ${p.tags.join(' ')} ${(p.aliases || []).join(' ')}`.toLocaleLowerCase().includes(query.value.trim().toLocaleLowerCase())))
const columns = computed(() => selected.value.map(place => ({ place, facts: comparisonFacts(place, directories[place.id], today.value) })))
const rows = computed(() => comparisonRows.filter(row => !differencesOnly.value || new Set(columns.value.map(column => column.facts[row.key])).size > 1))
const guideBase = `${import.meta.env.BASE_URL}guide/`
let previousOverflow = '', locked = false
function unlock() {
  if (locked) document.body.style.overflow = previousOverflow
  locked = false
}
function open() {
  if (!dialog.value || document.querySelector('dialog[open]')) return
  if (props.currentPlace && !ids.value.includes(props.currentPlace.id) && ids.value.length < 3) ids.value = [...ids.value, props.currentPlace.id]
  choosing.value = selected.value.length < 2
  message.value = ''; query.value = ''; city.value = ''
  previousOverflow = document.body.style.overflow
  dialog.value.showModal()
  document.body.style.overflow = 'hidden'; locked = true
}
function close() { dialog.value?.close(); unlock() }
function toggle(id: string) {
  message.value = ''
  if (ids.value.includes(id)) ids.value = ids.value.filter(value => value !== id)
  else if (ids.value.length < 3) ids.value = [...ids.value, id]
  else message.value = '最多对比 3 个商圈，请先移除一个。'
  if (ids.value.length < 2) choosing.value = true
}
function clear() { ids.value = []; message.value = ''; choosing.value = true }
onBeforeUnmount(close)
</script>

<template>
  <button type="button" class="button compare-launch" aria-haspopup="dialog" @click="open">商圈对比<span v-if="selected.length"> · {{ selected.length }}</span></button>
  <Teleport to="body">
    <dialog ref="dialog" class="place-compare" aria-labelledby="place-compare-title" @close="unlock">
      <header class="compare-heading"><div><h2 id="place-compare-title">商圈对比</h2><p>今天去哪逛？放在一起看看。</p></div><button type="button" class="button" autofocus @click="close">关闭</button></header>
      <div class="compare-body">
        <div class="compare-toolbar"><button type="button" class="button" :aria-expanded="choosing" aria-controls="compare-picker" @click="choosing = !choosing">{{ choosing ? '收起选择' : '更换商圈' }}</button><span role="status">已选 {{ selected.length }} / 3</span><button v-if="selected.length" type="button" class="text-button" @click="clear">清空</button></div>
        <section v-show="choosing" id="compare-picker" class="compare-picker" aria-label="选择对比商圈">
          <div class="compare-filters"><label><span class="sr-only">对比城市</span><select v-model="city" aria-label="对比城市"><option value="">全部城市</option><option v-for="item in cities" :key="item">{{ item }}</option></select></label><label><span class="sr-only">搜索对比商圈</span><input v-model="query" type="search" aria-label="搜索对比商圈" placeholder="搜索名称或标签" /></label></div>
          <div class="compare-candidates"><button v-for="place in candidates" :key="place.id" type="button" :aria-pressed="ids.includes(place.id)" @click="toggle(place.id)"><span class="compare-check" aria-hidden="true">{{ ids.includes(place.id) ? '✓' : '+' }}</span><span><strong>{{ place.name }}</strong><small>{{ place.city }}</small></span></button><p v-if="!candidates.length">没有匹配商圈，试试其他关键词。</p></div>
          <p class="compare-message" role="status">{{ message || '选择 2—3 个商圈，可以跨城市比较。' }}</p>
          <button v-if="selected.length >= 2" type="button" class="button dark" @click="choosing = false">查看对比 ↓</button>
        </section>
        <div v-if="selected.length" class="compare-selected" aria-label="已选对比商圈"><button v-for="place in selected" :key="place.id" type="button" :aria-label="`移除${place.name}`" @click="toggle(place.id)">{{ place.name }} <span aria-hidden="true">×</span></button></div>
        <template v-if="selected.length >= 2">
          <div class="compare-table-tools"><label><input v-model="differencesOnly" type="checkbox" />只看不同项</label><small>手机可左右滑动表格</small></div>
          <div class="compare-table-scroll" tabindex="0" role="region" aria-label="商圈对比表，可左右滚动">
            <table class="compare-table"><caption class="sr-only">所选商圈的档位、特色和店单对比，地点附在名称下方</caption><thead><tr><th scope="col">对比项目</th><th v-for="column in columns" :key="column.place.id" scope="col"><div class="compare-cover"><PlaceImage :src="column.place.cover" :alt="column.place.name" :position="column.place.coverPosition" sizes="220px" /></div><small>{{ column.place.city }}</small><strong>{{ column.place.name }}</strong><p class="compare-address">地点：{{ column.facts.address }}</p><a :href="guideBase + placeDetailHash(column.place.id)" @click="close">查看详情 ↗</a></th></tr></thead><tbody><tr v-for="row in rows" :key="row.key"><th scope="row">{{ row.label }}</th><td v-for="column in columns" :key="column.place.id" :class="{ 'compare-tier': row.key === 'tier' }">{{ column.facts[row.key] }}</td></tr></tbody></table>
          </div>
          <p class="compare-note">档位是作者的个人体验。店铺数量仅反映已整理店单，未整理不代表没有；快闪按活动项计数，已结束活动不计入。实时营业与库存以店铺为准。</p>
        </template>
        <p v-else class="compare-empty">{{ selected.length ? '再选一个商圈，就能逐项对比。' : '先选两个想去的商圈吧。' }}</p>
      </div>
    </dialog>
  </Teleport>
</template>

<style scoped>
.compare-launch { white-space: nowrap; }
.place-compare { box-sizing: border-box; width: min(1000px, calc(100% - 24px)); max-height: calc(100dvh - 32px); margin: auto; padding: 0; overflow: auto; border: 1px solid var(--ui-border); border-radius: var(--ui-radius-dialog); color: var(--ui-ink); background: var(--ui-surface); overscroll-behavior: contain; }
.place-compare::backdrop { background: #29283080; }
.compare-heading { position: sticky; top: 0; z-index: 3; display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 20px 24px; border-bottom: 1px solid var(--ui-border); background: var(--ui-surface); }
.compare-heading h2 { margin: 0; font-size: 23px; }
.compare-heading p { margin: 5px 0 0; font-size: 13px; color: var(--ui-muted); }
.compare-body { padding: 20px 24px; }
.compare-toolbar, .compare-filters, .compare-selected, .compare-table-tools { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.compare-toolbar { margin-bottom: 12px; font-size: 13px; }
.compare-toolbar > span { margin-left: auto; color: var(--ui-muted); }
.compare-picker { padding: 16px; border: 1px solid var(--ui-border); border-radius: var(--ui-radius-card); background: var(--ui-paper); }
.compare-filters { flex-wrap: nowrap; margin-bottom: 12px; }
.compare-filters label:last-child { flex: 1; min-width: 0; }
.compare-filters input, .compare-filters select { box-sizing: border-box; width: 100%; min-height: 44px; padding: 8px; border: 1px solid var(--ui-border); border-radius: var(--ui-radius-control); background: var(--ui-surface); color: var(--ui-ink); font: inherit; font-size: 13px; }
.compare-candidates { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; max-height: 240px; overflow-y: auto; padding: 3px; }
.compare-candidates button { display: flex; align-items: center; gap: 8px; padding: 10px; min-height: 52px; border: 1px solid var(--ui-border); border-radius: var(--ui-radius-control); background: var(--ui-surface); color: var(--ui-ink); text-align: left; cursor: pointer; }
.compare-candidates button[aria-pressed="true"] { border-color: var(--ui-accent); background: var(--ui-accent-soft); }
.compare-candidates strong, .compare-candidates small { display: block; overflow-wrap: anywhere; }
.compare-candidates strong { font-size: 13px; }.compare-candidates small { margin-top: 3px; color: var(--ui-muted); font-size: 12px; }
.compare-check { color: var(--ui-accent); font-size: 18px; }
.compare-message { margin: 12px 0; font-size: 12px; color: var(--ui-muted); }
.compare-selected { margin: 16px 0; }
.compare-selected button { min-height: 44px; padding: 8px 12px; border: 1px solid var(--ui-border); border-radius: var(--ui-radius-control); background: var(--ui-accent-soft); color: var(--ui-accent); cursor: pointer; }
.compare-selected button span { margin-left: 8px; }
.compare-table-tools { justify-content: space-between; margin: 12px 0; font-size: 13px; }
.compare-table-tools label { display: flex; align-items: center; min-height: 44px; gap: 6px; }.compare-table-tools input { accent-color: var(--ui-accent); }
.compare-table-tools small { font-size: 12px; color: var(--ui-muted); }
.compare-table-scroll { overflow-x: auto; border: 1px solid var(--ui-border); border-radius: var(--ui-radius-card); }
.compare-table { width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed; text-align: left; font-size: 13px; line-height: 1.7; }
.compare-table th, .compare-table td { padding: 14px; border-right: 1px solid var(--ui-border); border-bottom: 1px solid var(--ui-border); overflow-wrap: anywhere; vertical-align: top; }
.compare-table tr > :last-child { border-right: 0; }.compare-table tbody tr:last-child > * { border-bottom: 0; }
.compare-table tr > :first-child { position: sticky; left: 0; z-index: 1; width: 110px; background: var(--ui-table-heading, #fff4ef); font-weight: 500; }
.compare-table thead th:not(:first-child) { background: var(--ui-paper); }
.compare-cover { height: 110px; margin-bottom: 10px; overflow: hidden; border-radius: 8px; background: var(--ui-accent-soft); }
.compare-cover :deep(img) { width: 100%; height: 100%; object-fit: cover; }.compare-cover :deep(.image-placeholder) { height: 100%; font-size: 12px; }
.compare-table thead strong, .compare-table thead small { display: block; }.compare-table thead strong { font-size: 16px; }.compare-table thead small { font-weight: 400; color: var(--ui-muted); }
.compare-address { margin: 8px 0 0; color: var(--ui-muted); font-size: 12px; font-weight: 400; }
.compare-table a { display: inline-flex; align-items: center; min-height: 44px; color: var(--ui-accent); font-size: 13px; font-weight: 400; }
.compare-tier { color: var(--ui-accent); font-weight: 700; }
.compare-note, .compare-empty { margin: 16px 0 0; color: var(--ui-muted); font-size: 12px; line-height: 1.9; }
.place-compare button:focus-visible, .place-compare input:focus-visible, .place-compare select:focus-visible, .compare-table-scroll:focus-visible, .place-compare a:focus-visible { outline: 2px solid var(--ui-accent); outline-offset: 2px; }
@media (max-width: 800px) { .compare-table { min-width: 640px; }.compare-heading { padding: 16px; }.compare-body { padding: 12px; }.compare-picker { padding: 10px; }.compare-candidates { grid-template-columns: repeat(2, minmax(0, 1fr)); }.compare-table tr > :first-child { width: 84px; }.compare-table th, .compare-table td { padding: 10px; }.compare-heading h2 { font-size: 20px; } }
</style>
