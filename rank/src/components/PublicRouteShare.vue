<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import type { Place, ShopDirectory } from '../types'
import type { TripEntry } from '../utils/tripPlan'
import { resolveTripStops } from '../utils/tripPlan'
import { publicRouteEntries, publicRouteUrl } from '../utils/publicSharing'
import { useShopToday } from '../utils/shopToday'
import CopyButton from './CopyButton.vue'
const props = defineProps<{ entries: readonly TripEntry[]; places: Place[]; directories: Record<string, ShopDirectory> }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement>(), today = useShopToday()
const entries = computed(() => publicRouteEntries(props.entries, props.places, props.directories, today.value))
const stops = computed(() => resolveTripStops(entries.value, props.places, props.directories, today.value))
const share = computed(() => {
  if (!entries.value.length) return { error: '还没有可分享的公开地点，请先从榜单添加。', url: '' }
  try { return { error: '', url: publicRouteUrl(new URL(import.meta.env.BASE_URL, location.origin).href, entries.value, props.places, props.directories, today.value) } }
  catch (error) { return { error: (error as Error).message, url: '' } }
})
const text = computed(() => ['一起去逛店', ...stops.value.map((s, i) => `${i + 1}. ${s.city} · ${s.name}${s.floor ? ` · ${s.floor}` : ''}`), `分享日期：${today.value}`, `打开路线，查看当前店单并加入自己的清单：${share.value.url}`].join('\n'))
onMounted(() => dialog.value?.showModal())
onBeforeUnmount(() => dialog.value?.close())
</script>

<template>
  <dialog ref="dialog" class="public-route-share" aria-labelledby="route-share-title" @close="emit('close')">
    <header><h2 id="route-share-title">分享公开路线</h2><button type="button" class="text-button" aria-label="关闭路线分享" @click="dialog?.close()">关闭</button></header>
    <p>仅分享本站当前可用的地点与店铺及其顺序。不包含行程名称、自填店名、地址、备注、停留时长或出行设置。</p>
    <p v-if="props.entries.length !== entries.length">本次有 {{ props.entries.length - entries.length }} 项自填、失效或重复选择未包含在分享中。</p>
    <ol><li v-for="(stop, i) in stops" :key="i"><strong>{{ stop.name }}</strong><span>{{ stop.city }} · {{ stop.placeName }}<template v-if="stop.floor"> · {{ stop.floor }}</template></span></li></ol>
    <p class="route-share-date">分享日期 {{ today }} · 接收时会按最新店单重新检查可用状态。</p>
    <p v-if="share.error" role="status">{{ share.error }}</p>
    <template v-else><div class="route-share-actions"><CopyButton :text="share.url" label="复制公开路线链接" /><CopyButton :text="text" label="复制路线介绍" /></div><a :href="share.url" target="_blank" rel="noopener noreferrer">预览接收页面 ↗</a></template>
  </dialog>
</template>

<style scoped>
.public-route-share { width: min(620px, calc(100% - 24px)); max-height: calc(100dvh - 32px); padding: 20px; margin: auto; border: 1px solid var(--ui-border); border-radius: var(--ui-radius-dialog); background: var(--ui-paper); color: var(--ui-ink); overflow-y: auto; overflow-wrap: anywhere; }
.public-route-share::backdrop { background: #29283088; }
header { display: flex; align-items: center; justify-content: space-between; gap: 12px; } h2 { font-size: 22px; }
p, li { margin: 12px 0; font-size: 13px; line-height: 1.8; } ol { padding-left: 24px; }
li span { display: block; color: var(--ui-muted); } .route-share-date { color: var(--ui-muted); }
.route-share-actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0; }
a { display: inline-flex; align-items: center; min-height: 44px; color: var(--ui-accent); text-decoration: underline; }
</style>
