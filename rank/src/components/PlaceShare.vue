<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Place, Site } from '../types'
import CopyButton from './CopyButton.vue'
import { placePublicUrl, placeShareText } from '../utils/publicSharing'
const props = defineProps<{ place: Place; author: Site['author']; checkedAt?: string }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement>(), imageUrl = ref(''), error = ref(''), busy = ref(false)
const url = computed(() => placePublicUrl(new URL(import.meta.env.BASE_URL, location.origin).href, props.place.id))
const text = computed(() => placeShareText(props.place, props.author, url.value, props.checkedAt))
let active = true
async function createImage() {
  busy.value = true; error.value = ''
  try {
    const { placeShareImage } = await import('../utils/shareImage')
    const blob = await placeShareImage(props.place, props.author, url.value, props.checkedAt)
    if (!active) return
    if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
    imageUrl.value = URL.createObjectURL(blob)
  } catch { if (active) error.value = '图片生成失败，请重试；也可复制图文分享。' }
  finally { if (active) busy.value = false }
}
onMounted(() => dialog.value?.showModal())
onBeforeUnmount(() => { active = false; dialog.value?.close(); if (imageUrl.value) URL.revokeObjectURL(imageUrl.value) })
</script>

<template>
  <dialog ref="dialog" class="public-share-dialog" aria-labelledby="place-share-title" @close="emit('close')">
    <header><h2 id="place-share-title">分享这处地点</h2><button type="button" class="text-button" aria-label="关闭地点分享" @click="dialog?.close()">关闭</button></header>
    <article class="place-share-preview"><small>{{ place.city }} · {{ author }}的逛店手记</small><h3>{{ place.name }}</h3><p>{{ place.summary }}</p><small>体验到访 {{ place.visitedAt || '未记录' }}<br>内容更新 {{ place.updatedAt }}<template v-if="checkedAt"><br>店单核对 {{ checkedAt }}</template></small><a :href="url">完整介绍与当前店单 ↗</a></article>
    <div class="public-share-actions"><CopyButton :text="text" label="复制图文分享" /><CopyButton :text="url" label="复制地点链接" /><button type="button" class="button" :disabled="busy" @click="createImage">{{ busy ? '正在生成…' : '生成分享图片' }}</button></div>
    <p v-if="error" role="alert">{{ error }}</p>
    <template v-if="imageUrl"><img class="share-result" :src="imageUrl" :alt="`${place.city} · ${place.name}分享图片`"><a class="button" :href="imageUrl" :download="`${place.name}-逛店分享.png`">下载分享图片</a><p class="share-note">手机也可长按图片保存。图中附原文地址；复制图文分享可直接打开链接。</p></template>
    <p class="share-note">日期分别表示到访、内容维护与店单整理，不代表实时营业或库存。</p>
  </dialog>
</template>

<style>
.public-share-dialog { width: min(600px, calc(100% - 24px)); max-height: calc(100dvh - 32px); margin: auto; padding: 20px; border: 1px solid var(--ui-border); border-radius: var(--ui-radius-dialog); background: var(--ui-paper); color: var(--ui-ink); overflow-y: auto; overflow-wrap: anywhere; }
.public-share-dialog::backdrop { background: #29283088; }
.public-share-dialog > header { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.public-share-dialog h2 { font-size: 22px; }
.public-share-actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0; }
.public-share-dialog p { font-size: 14px; line-height: 1.8; }
.place-share-preview { margin-top: 16px; padding: 20px; border: 1px solid var(--ui-border); border-left: 4px solid var(--ui-accent); border-radius: var(--ui-radius-card); background: var(--ui-surface); }
.place-share-preview h3 { margin: 8px 0; font-size: 24px; }
.place-share-preview small, .public-share-dialog .share-note { display: block; margin-top: 12px; font-size: 12px; line-height: 1.8; color: var(--ui-muted); }
.place-share-preview a { display: inline-flex; align-items: center; min-height: 44px; color: var(--ui-accent); text-decoration: underline; }
.share-result { display: block; width: 100%; height: auto; margin: 12px 0; border-radius: var(--ui-radius-control); }
</style>
