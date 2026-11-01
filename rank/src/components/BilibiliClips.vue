<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import catalogData from '../data/bilibili-videos.json'
import type { BilibiliCatalog } from '../types/bilibili'
import { bilibiliUrl, placeClips, validBvid } from '../utils/bilibili'

const props = defineProps<{ placeId: string; placeName: string }>()
const tvIconUrl = `${import.meta.env.BASE_URL}brand/bilibili-tv.svg`
const entries = computed(() => placeClips(catalogData as BilibiliCatalog, props.placeId))
const selectedId = ref('')
const selected = computed(() => entries.value.find(e => e.clip.id === selectedId.value))
const loaded = ref<{ src: string; title: string; id: string; href: string }>()
const cinema = ref<HTMLDialogElement>()
const loadRevision = ref(0)
let previousOverflow: string | undefined
function releasePlayer() {
  loaded.value = undefined
  if (previousOverflow !== undefined) { document.body.style.overflow = previousOverflow; previousOverflow = undefined }
}
function closePlayer() { cinema.value?.close(); releasePlayer() }
watch(() => props.placeId, () => { closePlayer(); selectedId.value = entries.value.find(e => !e.error && e.clip.status === 'verified')?.clip.id ?? entries.value[0]?.clip.id ?? '' }, { immediate: true })
onBeforeUnmount(closePlayer)
const ready = computed(() => selected.value && !selected.value.error && selected.value.clip.status === 'verified')
const externalUrl = computed(() => {
  if (ready.value) return bilibiliUrl(selected.value!.video!.bvid, selected.value!.clip.page, selected.value!.clip.startSeconds!)
  const bvid = selected.value?.video?.bvid
  return validBvid(bvid) ? `https://www.bilibili.com/video/${bvid}/` : undefined
})
async function load() {
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
  if (!src || !cinema.value) return
  loadRevision.value++
  loaded.value = { src, id: clip.id, title: `${props.placeName}的视频片段播放器`, href: bilibiliUrl(video!.bvid, clip.page, clip.startSeconds!)! }
  await nextTick()
  if (!loaded.value || !cinema.value) return
  if (!cinema.value.open) {
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    cinema.value.showModal()
  }
}
</script>

<template>
  <section v-if="entries.length" class="bilibili-clips" :aria-label="placeName + '的 B 站视频片段'">
    <label v-if="entries.length > 1 && !loaded">选择片段 <select v-model="selectedId" :aria-label="placeName + '的视频片段'"><option v-for="(entry, index) in entries" :key="entry.clip.id" :value="entry.clip.id">片段 {{ index + 1 }}</option></select></label>
    <p v-if="!ready" role="status">{{ selected?.error ? '片段配置暂不可用：' + selected.error : '片段起点待确认，暂不提供播放器。' }}</p>
    <div v-if="ready || externalUrl" class="clip-actions">
      <button v-if="ready" type="button" class="clip-load" aria-label="加载此片段播放器" aria-haspopup="dialog" @click="load"><span class="clip-play-mark" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22"><path d="m9 5 11 7-11 7Z" fill="currentColor" /></svg></span><span>观看视频片段</span><span class="clip-spark" aria-hidden="true">↗</span></button>
      <a v-if="externalUrl" :href="externalUrl" target="_blank" rel="noopener noreferrer" class="clip-external"><img class="clip-tv-mark" :src="tvIconUrl" width="28" height="26" alt="" aria-hidden="true" decoding="async" /><span>去 B 站观看 ↗</span></a>
    </div>
    <dialog ref="cinema" class="clip-cinema" :aria-label="placeName + ' · 视频片段'" @cancel.prevent="closePlayer" @close="!cinema?.open && releasePlayer()" @click.self="closePlayer">
      <template v-if="loaded">
        <header class="cinema-heading"><div><span class="cinema-eyebrow">VIDEO ROOM</span><h2>{{ placeName }}<span> / 视频片段</span></h2></div><button type="button" class="cinema-close" aria-label="关闭播放器" autofocus @click="closePlayer">×</button></header>
        <div class="clip-player"><iframe :key="loaded.src + loadRevision" :src="loaded.src" :title="loaded.title" allow="fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
        <footer class="cinema-footer"><div class="cinema-controls"><label v-if="entries.length > 1">选择片段 <select v-model="selectedId" :aria-label="placeName + '的视频片段'"><option v-for="(entry, index) in entries" :key="entry.clip.id" :value="entry.clip.id">片段 {{ index + 1 }}</option></select></label><button type="button" @click="load">{{ loaded.id !== selectedId ? '切换片段' : '重新加载' }}</button><span v-if="loaded.id !== selectedId" role="status">点击切换片段后播放</span></div><a :href="loaded.href" target="_blank" rel="noopener noreferrer">去 B 站观看 ↗</a></footer>
      </template>
    </dialog>
  </section>
</template>

<style scoped>
.bilibili-clips { margin: 0; padding: 0 48px 38px; border: 0; border-radius: 0; background: none; font-size: 14px; overflow-wrap: anywhere; }
.clip-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-start; gap: 12px 20px; padding: 0; }
.clip-load, .clip-external { display: inline-flex; align-items: center; justify-content: center; gap: 12px; max-width: 100%; min-height: 56px; padding: 12px 20px; border: 2px solid var(--manga-ink, #292830); color: var(--manga-ink, #292830); font: inherit; font-weight: 850; text-decoration: none; transition: transform .16s ease, box-shadow .16s ease; }
.clip-load { position: relative; min-height: 44px; padding: 6px 14px 6px 8px; gap: 9px; border: 1px solid #dca8b8; border-radius: 999px; background: linear-gradient(120deg, #ffe0eb, #fff7fa); box-shadow: 0 3px 10px #a8375010; font-size: 13px; }
.clip-play-mark { display: grid; place-items: center; width: 28px; height: 28px; flex: none; border-radius: 50%; background: #a83750; color: #fff; }
.clip-play-mark svg { width: 16px; height: 16px; }
.clip-spark { color: #a83750; font-size: 16px; }
.clip-external { min-height: 44px; padding: 0; gap: 7px; border: 0; background: transparent; color: #79626b; font-size: 12px; font-weight: 600; }
.clip-tv-mark { display: block; width: 20px; height: 19px; flex: none; object-fit: contain; }
.clip-load:hover { transform: translateY(-2px); box-shadow: 0 5px 14px #a8375020; }
.clip-external:hover { color: #a83750; }
.clip-load:active, .clip-external:active { transform: translate(2px, 2px); box-shadow: 1px 1px 0 var(--manga-ink, #292830); }
.clip-load:focus-visible, .clip-external:focus-visible { outline: 3px solid #a83750; outline-offset: 6px; }
.bilibili-clips label { display: block; margin-top: 10px; }
.bilibili-clips select { display: block; width: 100%; max-width: 100%; min-height: 44px; margin-top: 4px; }
.clip-cinema { width: min(1040px, calc(100vw - 32px), calc((100dvh - 160px) * 16 / 9)); max-width: calc(100vw - 24px); max-height: calc(100dvh - 24px); padding: 0; margin: auto; overflow: auto; border: 1px solid #f3c7d640; border-radius: 18px; background: #201d25; color: #fff5f8; box-shadow: 0 32px 100px #0009, 0 0 60px #d975a015; }
.clip-cinema::backdrop { background: #11101bc9; backdrop-filter: blur(9px); }
.clip-cinema[open] { animation: cinema-enter .22s ease-out; }
.cinema-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px 20px; background: radial-gradient(ellipse at top left, #85395755, transparent 75%), #201d25; }
.clip-cinema .cinema-heading h2 { margin: 3px 0 0; color: #fff5f8; font: 600 17px/1.5 system-ui, sans-serif; overflow-wrap: anywhere; }
.cinema-heading h2 span { color: #bdaebc; font-size: 12px; font-weight: 400; }
.cinema-eyebrow { color: #f2a8c2; font: 600 9px/1.5 system-ui, sans-serif; letter-spacing: .2em; }
.cinema-close { flex: none; width: 44px; height: 44px; border: 1px solid #ffffff24; border-radius: 50%; background: #ffffff08; color: #fff; font-size: 26px; cursor: pointer; }
.cinema-close:hover { background: #ffffff20; }
.clip-player { aspect-ratio: 16 / 9; width: 100%; background: #000; }
.clip-player iframe { display: block; width: 100%; height: 100%; border: 0; }
.cinema-footer { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px 16px; padding: 8px 20px; font-size: 12px; color: #bdaebc; }
.cinema-controls { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
.cinema-footer a { display: inline-flex; align-items: center; min-height: 44px; color: #f2a8c2; text-decoration: none; }
.cinema-footer button { min-height: 44px; border: 0; padding: 0 4px; color: #bdaebc; background: none; font: inherit; cursor: pointer; }
.cinema-footer label { display: flex; align-items: center; gap: 6px; margin: 0; }
.cinema-footer select { width: auto; margin: 0; border: 1px solid #ffffff30; border-radius: 6px; background: #29242e; color: #fff5f8; }
.clip-cinema :is(button, a, select):focus-visible { outline: 2px solid #f2a8c2; outline-offset: 3px; }
@keyframes cinema-enter { from { opacity: 0; transform: translateY(12px) scale(.98); } to { opacity: 1; transform: none; } }
@media (max-width: 800px) {
  .bilibili-clips { padding: 0 28px 32px; }
}
@media (max-width: 580px) {
  .clip-actions { gap: 6px 14px; }
  .clip-cinema { border-radius: 12px; }
  .cinema-heading { padding: 12px; }
  .cinema-heading h2 { font-size: 15px; }
  .cinema-footer { padding: 6px 12px; }
}
@media (prefers-reduced-motion: reduce) {
  .clip-load, .clip-external { transition: none; }
  .clip-cinema[open] { animation: none; }
}
</style>
