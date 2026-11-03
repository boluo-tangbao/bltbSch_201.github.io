<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ShopDirectory } from '../types'
import { useShopToday } from '../utils/shopToday'
import { visitNotices } from '../utils/visitNotices'
import { hasSeenVisitNotice, rememberVisitNotice } from '../utils/visitNoticeSeen'

const props = defineProps<{ directory: ShopDirectory; placeId: string }>()
const emit = defineEmits<{ shop: [name: string]; directory: [] }>()
const today = useShopToday()
const info = computed(() => visitNotices(props.directory, today.value))
const signature = computed(() => JSON.stringify(info.value))
const dialog = ref<HTMLDialogElement>()
const historyDetails = ref<HTMLDetailsElement>()
const titleId = computed(() => `visit-notices-title-${props.placeId}`)
let frame = 0
let previousOverflow = ''
let scrollLocked = false
let openedSignature = ''
function open() {
  if (!dialog.value || dialog.value.open || document.querySelector('dialog[open]')) return
  visible.value = 5; historyVisible.value = 5
  if (historyDetails.value) historyDetails.value.open = false
  openedSignature = signature.value
  previousOverflow = document.body.style.overflow
  dialog.value.showModal()
  document.body.style.overflow = 'hidden'
  scrollLocked = true
}
function unlockScroll() {
  if (scrollLocked) document.body.style.overflow = previousOverflow
  scrollLocked = false
}
function close() {
  dialog.value?.close()
  unlockScroll()
}
function acknowledged() {
  rememberVisitNotice(props.placeId, openedSignature)
  unlockScroll()
}
function goToDirectory() { close(); emit('directory') }
function goToShop(name: string) { close(); emit('shop', name) }
onMounted(() => nextTick(() => {
  frame = requestAnimationFrame(() => {
    if (!hasSeenVisitNotice(props.placeId, signature.value)) open()
  })
}))
onBeforeUnmount(() => { cancelAnimationFrame(frame); close() })
const visible = ref(5)
const historyVisible = ref(5)
const currentNotices = computed(() => info.value.notices.filter(notice => notice.sortDate))
const historyNotices = computed(() => info.value.notices.filter(notice => !notice.sortDate))
watch(() => props.directory, () => { visible.value = 5; historyVisible.value = 5 })
</script>

<template>
  <button type="button" class="visit-notices-trigger" aria-haspopup="dialog" @click="open">出发前留意<span v-if="info.notices.length"> · {{ info.notices.length }}条提醒</span></button>
  <Teleport to="body">
  <dialog ref="dialog" class="visit-notices-dialog" :aria-labelledby="titleId" @close="acknowledged">
  <aside class="visit-notices" aria-label="出发前留意">
    <div class="visit-notices-heading"><h2 :id="titleId">出发前留意</h2><button type="button" @click="goToDirectory">查看店单与依据 ↓</button></div>
    <p class="visit-notices-counts">已确认：<span>{{ info.regular }}家常规谷店</span><span v-if="info.ongoing"> · {{ info.ongoing }}项快闪进行中</span><span v-if="info.upcoming"> · {{ info.upcoming }}项快闪即将开始</span><span v-if="info.unknown"> · {{ info.unknown }}项快闪档期见原文</span></p>
    <template v-if="currentNotices.length">
      <ul>
        <li v-for="notice in currentNotices.slice(0, visible)" :key="notice.name"><button type="button" @click="goToShop(notice.name)"><span class="visit-notice-label">{{ notice.label }}</span><span class="visit-notice-name">{{ notice.name }}<small>{{ notice.detail }}</small></span><span aria-hidden="true">↘</span></button></li>
      </ul>
      <button v-if="currentNotices.length > visible" class="visit-notices-more" type="button" @click="visible += 5">再看{{ Math.min(5, currentNotices.length - visible) }}条提醒</button>
    </template>
    <details v-if="historyNotices.length" ref="historyDetails" :key="directory.area" class="visit-notices-history">
      <summary>停业与迁址记录 <span>{{ historyNotices.length }}条</span></summary>
      <ul>
        <li v-for="notice in historyNotices.slice(0, historyVisible)" :key="notice.name"><button type="button" @click="goToShop(notice.name)"><span class="visit-notice-label">{{ notice.label }}</span><span class="visit-notice-name">{{ notice.name }}<small>{{ notice.detail }}</small></span><span aria-hidden="true">↘</span></button></li>
      </ul>
      <button v-if="historyNotices.length > historyVisible" class="visit-notices-more" type="button" @click="historyVisible += 5">再看{{ Math.min(5, historyNotices.length - historyVisible) }}条记录</button>
    </details>
    <p class="visit-notices-note"><template v-if="currentNotices.length">快闪提示未来7天内的开始／截止日，按中国时区计算。</template>实时营业及库存以店铺为准。</p>
    <button type="button" class="visit-notices-acknowledge" autofocus @click="close">知道了，继续看介绍</button>
  </aside>
  </dialog>
  </Teleport>
</template>

<style scoped>
.visit-notices-trigger { display: inline-flex; align-items: center; min-height: var(--ui-touch); margin-top: 8px; padding: 4px 0; border: 0; background: none; color: var(--ui-accent); font: inherit; font-size: 12px; cursor: pointer; text-decoration: underline; text-underline-offset: 4px; }
.visit-notices-trigger:focus-visible { outline: 2px solid var(--ui-accent); outline-offset: 3px; }
.visit-notices-dialog { width: min(520px, calc(100% - 24px)); max-height: calc(100dvh - 40px); margin: auto; padding: 0; overflow: auto; overscroll-behavior: contain; border: 1px solid var(--ui-border); border-radius: var(--ui-radius-dialog); background: var(--ui-surface); color: var(--ui-ink); }
.visit-notices-dialog::backdrop { background: #29283066; }
.visit-notices { padding: 24px; }
.visit-notices .visit-notices-acknowledge { display: block; width: 100%; margin-top: 20px; padding: 10px 16px; border: 1px solid var(--ui-accent); border-radius: var(--ui-radius-control); background: var(--ui-accent); color: white; font-size: 13px; }
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
.visit-notices-history { border-top: 1px solid var(--ui-border); }
.visit-notices-history summary { min-height: var(--ui-touch); padding: 12px 0; cursor: pointer; font-size: 13px; color: var(--ui-muted); }
.visit-notices-history summary span { margin-left: 8px; }
.visit-notices-history ul { margin-top: 0; }
.visit-notices :is(button, summary):focus-visible { outline: 2px solid var(--ui-accent); outline-offset: 3px; }
@media (max-width: 580px) { .visit-notices { padding: 12px; } .visit-notices li button { gap: 8px; } .visit-notice-label { max-width: 8em; white-space: normal; } }
</style>
