<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ShopDirectory } from '../types'
import { useShopToday } from '../utils/shopToday'
import { visitNotices } from '../utils/visitNotices'

const props = defineProps<{ directory: ShopDirectory }>()
const emit = defineEmits<{ shop: [name: string]; directory: [] }>()
const today = useShopToday()
const info = computed(() => visitNotices(props.directory, today.value))
const visible = ref(5)
watch(() => props.directory, () => { visible.value = 5 })
</script>

<template>
  <aside class="visit-notices" aria-label="出发前留意">
    <div class="visit-notices-heading"><h2>出发前留意</h2><button type="button" @click="emit('directory')">查看店单与依据 ↓</button></div>
    <p class="visit-notices-counts">已确认：<span>{{ info.regular }}家常规谷店</span><span v-if="info.ongoing"> · {{ info.ongoing }}项快闪进行中</span><span v-if="info.upcoming"> · {{ info.upcoming }}项快闪即将开始</span><span v-if="info.unknown"> · {{ info.unknown }}项快闪档期见原文</span></p>
    <template v-if="info.notices.length">
      <ul>
        <li v-for="notice in info.notices.slice(0, visible)" :key="notice.name"><button type="button" @click="emit('shop', notice.name)"><span class="visit-notice-label">{{ notice.label }}</span><span class="visit-notice-name">{{ notice.name }}<small>{{ notice.detail }}</small></span><span aria-hidden="true">↘</span></button></li>
      </ul>
      <button v-if="info.notices.length > visible" class="visit-notices-more" type="button" @click="visible += 5">再看{{ Math.min(5, info.notices.length - visible) }}条提醒</button>
    </template>
    <p class="visit-notices-note">快闪提示未来7天内的开始／截止日，按中国时区计算；停业与迁出请查看原记录。实时营业及库存以店铺为准。</p>
  </aside>
</template>

<style scoped>
.visit-notices { margin-top: 16px; padding: 16px; border: 1px solid var(--ui-border); border-radius: var(--ui-radius-card); background: var(--ui-surface); }
.visit-notices-heading { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
.visit-notices-heading h2 { font-size: 16px; }
.visit-notices button { font: inherit; cursor: pointer; min-height: var(--ui-touch); }
.visit-notices-heading button, .visit-notices-more { padding: 4px 0; border: 0; background: none; color: var(--ui-accent); font-size: 12px; text-decoration: underline; text-underline-offset: 3px; }
.visit-notices .visit-notices-counts { margin: 8px 0; font-size: 13px; line-height: 1.8; color: var(--ui-ink); }
.visit-notices .visit-notices-note { margin: 8px 0 0; font-size: 12px; line-height: 1.8; color: var(--ui-muted); }
.visit-notices ul { list-style: none; margin: 12px 0; padding: 0; }
.visit-notices li + li { border-top: 1px solid var(--ui-border); }
.visit-notices li button { display: flex; align-items: baseline; gap: 12px; width: 100%; padding: 10px 0; border: 0; background: none; color: var(--ui-ink); text-align: left; }
.visit-notices li button:hover { background: var(--ui-accent-soft); }
.visit-notice-label { flex: none; color: var(--ui-accent); font-size: 12px; }
.visit-notice-name { min-width: 0; flex: 1; font-size: 13px; overflow-wrap: anywhere; }
.visit-notice-name small { display: block; margin-top: 4px; font-size: 12px; color: var(--ui-muted); }
@media (max-width: 580px) { .visit-notices { padding: 12px; } .visit-notices li button { gap: 8px; } .visit-notice-label { max-width: 8em; white-space: normal; } }
</style>
