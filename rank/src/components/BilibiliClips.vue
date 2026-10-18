<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import catalogData from '../data/bilibili-videos.json'
import type { BilibiliCatalog } from '../types/bilibili'
import { bilibiliUrl, placeClips, validBvid } from '../utils/bilibili'

const props = defineProps<{ placeId: string; placeName: string }>()
const tvIconUrl = `${import.meta.env.BASE_URL}brand/bilibili-tv.svg`
const entries = computed(() => placeClips(catalogData as BilibiliCatalog, props.placeId))
const selectedId = ref('')
const selected = computed(() => entries.value.find(e => e.clip.id === selectedId.value))
const loaded = ref<{ src: string; title: string; id: string }>()
watch(() => props.placeId, () => { loaded.value = undefined; selectedId.value = entries.value.find(e => !e.error && e.clip.status === 'verified')?.clip.id ?? entries.value[0]?.clip.id ?? '' }, { immediate: true })
const ready = computed(() => selected.value && !selected.value.error && selected.value.clip.status === 'verified')
const externalUrl = computed(() => {
  if (ready.value) return bilibiliUrl(selected.value!.video!.bvid, selected.value!.clip.page, selected.value!.clip.startSeconds!)
  const bvid = selected.value?.video?.bvid
  return validBvid(bvid) ? `https://www.bilibili.com/video/${bvid}/` : undefined
})
function load() {
  if (!ready.value) return
  const network = navigator as Navigator & {
    connection?: { type?: string }; mozConnection?: { type?: string }; webkitConnection?: { type?: string }
  }
  const connection = network.connection ?? network.mozConnection ?? network.webkitConnection
  // effectiveType measures speed, not Wi-Fi vs cellular. Unknown connections
  // load directly so browsers without a connection type never mislabel Wi-Fi.
  if (connection?.type === 'cellular' && !window.confirm('加载后可能产生流量，点击播放器内的播放按钮开始观看。')) return
  const { video, clip } = selected.value!
  const src = bilibiliUrl(video!.bvid, clip.page, clip.startSeconds!, true)
  if (src) loaded.value = { src, id: clip.id, title: `${props.placeName}的视频片段播放器` }
}
</script>

<template>
  <section v-if="entries.length" class="bilibili-clips" :aria-label="placeName + '的 B 站视频片段'">
    <label v-if="entries.length > 1">选择片段 <select v-model="selectedId" :aria-label="placeName + '的视频片段'"><option v-for="(entry, index) in entries" :key="entry.clip.id" :value="entry.clip.id">片段 {{ index + 1 }}</option></select></label>
    <p v-if="!ready" role="status">{{ selected?.error ? '片段配置暂不可用：' + selected.error : '片段起点待确认，暂不提供播放器。' }}</p>
    <div v-if="ready || externalUrl" class="clip-actions">
      <button v-if="ready" type="button" class="clip-load" @click="load"><span class="clip-play-mark" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22"><path d="m9 5 11 7-11 7Z" fill="currentColor" /></svg></span><span>加载此片段播放器</span><span class="clip-spark" aria-hidden="true">✦</span></button>
      <a v-if="externalUrl" :href="externalUrl" target="_blank" rel="noopener noreferrer" class="clip-external"><img class="clip-tv-mark" :src="tvIconUrl" width="28" height="26" alt="" aria-hidden="true" decoding="async" /><span>去 B 站观看 ↗</span></a>
    </div>
    <template v-if="loaded">
      <p v-if="loaded.id !== selectedId" role="status">点击加载按钮切换到所选片段。</p>
      <div class="clip-player"><iframe :key="loaded.src" :src="loaded.src" :title="loaded.title" allow="fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
      <button type="button" class="text-button" @click="loaded = undefined">关闭播放器</button>
    </template>
  </section>
</template>

<style scoped>
.bilibili-clips { margin: 0; padding: 0 48px 38px; border: 0; border-radius: 0; background: none; font-size: 14px; overflow-wrap: anywhere; }
.clip-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 18px 22px; padding: 8px 6px 6px; }
.clip-load, .clip-external { display: inline-flex; align-items: center; justify-content: center; gap: 12px; max-width: 100%; min-height: 56px; padding: 12px 20px; border: 2px solid var(--manga-ink, #292830); color: var(--manga-ink, #292830); font: inherit; font-weight: 850; text-decoration: none; transition: transform .16s ease, box-shadow .16s ease; }
.clip-load { position: relative; border-radius: 14px 5px 14px 5px; background: radial-gradient(#ffffff90 1px, transparent 1.4px) 0 0 / 7px 7px, linear-gradient(120deg, #ffbad0, #ffe5ed); box-shadow: 4px 4px 0 var(--manga-ink, #292830); font-size: 16px; transform: rotate(-1deg); }
.clip-play-mark { display: grid; place-items: center; width: 32px; height: 32px; flex: none; border: 2px solid currentColor; border-radius: 50%; background: #fffaf1; }
.clip-spark { position: absolute; top: -16px; right: 13px; color: #a83750; font-size: 27px; line-height: 1; text-shadow: 1px 1px 0 #fffaf1, -1px -1px 0 #fffaf1; pointer-events: none; }
.clip-external { min-height: 48px; padding: 10px 15px; border-radius: 5px 12px 5px 12px; background: #fffaf1; box-shadow: 3px 3px 0 #efb1c3; color: #96344f; font-size: 14px; }
.clip-tv-mark { display: block; width: 28px; height: 26px; flex: none; object-fit: contain; }
.clip-load:hover { transform: translate(-1px, -2px) rotate(-1deg); box-shadow: 5px 6px 0 var(--manga-ink, #292830); }
.clip-external:hover { transform: translate(-1px, -2px); box-shadow: 4px 5px 0 #efb1c3; }
.clip-load:active, .clip-external:active { transform: translate(2px, 2px); box-shadow: 1px 1px 0 var(--manga-ink, #292830); }
.clip-load:focus-visible, .clip-external:focus-visible { outline: 3px solid #a83750; outline-offset: 6px; }
.bilibili-clips label { display: block; margin-top: 10px; }
.bilibili-clips select { display: block; width: 100%; max-width: 100%; min-height: 44px; margin-top: 4px; }
.clip-player { aspect-ratio: 16 / 9; width: 100%; margin-top: 14px; background: #111; }
.clip-player iframe { display: block; width: 100%; height: 100%; border: 0; }
@media (max-width: 800px) {
  .bilibili-clips { padding: 0 28px 32px; }
}
@media (max-width: 580px) {
  .clip-actions { align-items: center; flex-direction: column; gap: 16px; }
  .clip-load, .clip-external { width: min(100%, 280px); padding: 12px; }
  .clip-load { gap: 10px; font-size: 14px; }
  .clip-play-mark { width: 28px; height: 28px; }
}
@media (prefers-reduced-motion: reduce) {
  .clip-load, .clip-external { transition: none; }
}
</style>
