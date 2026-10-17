<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import catalogData from '../data/bilibili-videos.json'
import type { BilibiliCatalog } from '../types/bilibili'
import { bilibiliUrl, formatVideoTime, placeClips, validBvid } from '../utils/bilibili'

const props = defineProps<{ placeId: string; placeName: string }>()
const entries = computed(() => placeClips(catalogData as BilibiliCatalog, props.placeId))
const selectedId = ref('')
const selected = computed(() => entries.value.find(e => e.clip.id === selectedId.value))
const loaded = ref<{ src: string; title: string; id: string; label: string }>()
watch(() => props.placeId, () => { loaded.value = undefined; selectedId.value = entries.value.find(e => !e.error && e.clip.status === 'verified')?.clip.id ?? entries.value[0]?.clip.id ?? '' }, { immediate: true })
const ready = computed(() => selected.value && !selected.value.error && selected.value.clip.status === 'verified')
const selectedLabel = computed(() => ready.value ? `${props.placeName}片段 · P${selected.value!.clip.page} · ${formatVideoTime(selected.value!.clip.startSeconds!)}` : '')
const externalUrl = computed(() => {
  if (ready.value) return bilibiliUrl(selected.value!.video!.bvid, selected.value!.clip.page, selected.value!.clip.startSeconds!)
  const bvid = selected.value?.video?.bvid
  return validBvid(bvid) ? `https://www.bilibili.com/video/${bvid}/` : undefined
})
function load() {
  if (!ready.value) return
  const { video, clip } = selected.value!
  const src = bilibiliUrl(video!.bvid, clip.page, clip.startSeconds!, true)
  if (src) loaded.value = { src, id: clip.id, title: `${video!.title} · ${selectedLabel.value}`, label: selectedLabel.value }
}
</script>

<template>
  <section v-if="entries.length" class="bilibili-clips" :aria-label="placeName + '的 B 站视频片段'">
    <h3>对应商圈视频片段</h3>
    <p class="clip-video-title">{{ selected?.video?.title || '视频资料暂不可用' }}</p>
    <label v-if="entries.length > 1">选择片段 <select v-model="selectedId" :aria-label="placeName + '的视频片段'"><option v-for="entry in entries" :key="entry.clip.id" :value="entry.clip.id">{{ entry.video?.title }} · {{ entry.clip.status === 'verified' && !entry.error ? 'P' + entry.clip.page + ' · ' + formatVideoTime(entry.clip.startSeconds!) : '待确认' }}</option></select></label>
    <p v-if="ready" class="clip-selection" role="status">已选择：{{ selectedLabel }}</p>
    <p v-else role="status">{{ selected?.error ? '片段配置暂不可用：' + selected.error : '片段起点待确认，暂不提供播放器。' }}</p>
    <div v-if="ready || externalUrl" class="clip-actions"><button v-if="ready" type="button" class="button" @click="load">加载此片段播放器</button><a v-if="externalUrl" :href="externalUrl" target="_blank" rel="noopener noreferrer" class="text-button">去 B 站观看 ↗</a></div>
    <p v-if="ready" class="clip-hint">加载后可能产生流量，点击播放器内的播放按钮开始观看。</p>
    <template v-if="loaded">
      <p v-if="loaded.id !== selectedId" role="status">点击加载按钮切换到所选片段；当前加载：{{ loaded.label }}</p>
      <div class="clip-player"><iframe :key="loaded.src" :src="loaded.src" :title="loaded.title" allow="fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
      <button type="button" class="text-button" @click="loaded = undefined">关闭播放器</button>
    </template>
  </section>
</template>

<style scoped>
.bilibili-clips { margin: 22px 0; padding: 16px; border: 1px solid var(--line, #dfb8c3); border-radius: 8px; font-size: 14px; overflow-wrap: anywhere; }
.bilibili-clips h3 { font-size: 16px; margin: 0 0 8px; }
.clip-video-title { font-weight: 600; }
.clip-selection, .clip-hint { margin-top: 8px; }
.clip-hint { color: var(--muted, #755d6a); font-size: 12px; }
.clip-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; margin-top: 12px; }
.bilibili-clips label { display: block; margin-top: 10px; }
.bilibili-clips select { display: block; width: 100%; max-width: 100%; min-height: 44px; margin-top: 4px; }
.clip-player { aspect-ratio: 16 / 9; width: 100%; margin-top: 14px; background: #111; }
.clip-player iframe { display: block; width: 100%; height: 100%; border: 0; }
</style>
