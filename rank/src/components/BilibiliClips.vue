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
      <button v-if="ready" type="button" class="clip-load" aria-label="加载此片段播放器" title="观看这个商圈的视频片段" aria-haspopup="dialog" @click="load"><span class="clip-play-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m10 8 6 4-6 4Z" fill="currentColor" /></svg></span><span class="clip-entry-copy"><span>看视频</span><small>弹窗播放</small></span></button>
      <a v-if="externalUrl" :href="externalUrl" target="_blank" rel="noopener noreferrer" class="clip-external" aria-label="去 B 站观看 ↗" title="去 B 站观看 ↗"><img class="clip-tv-mark" :src="tvIconUrl" width="28" height="26" alt="" aria-hidden="true" decoding="async" /><span class="clip-external-copy"><span>去 B 站</span><span>观看 <span aria-hidden="true">↗</span></span></span></a>
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
.bilibili-clips { display: inline-flex; flex: none; align-items: center; gap: 8px; margin: 0; padding: 0; border: 0; background: none; font-size: 12px; }
.clip-actions { display: inline-flex; align-items: center; gap: 2px; padding: 2px; border: 1px solid #e0bdc8; border-radius: 10px; background: #fff8f8; }
.clip-load, .clip-external { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; border: 0; border-radius: 7px; background: transparent; text-decoration: none; transition: background .18s, color .18s; }
.clip-load { gap: 7px; padding: 0 8px; color: #a83750; font: 600 12px/1.4 system-ui, sans-serif; white-space: nowrap; cursor: pointer; }
.clip-play-mark { display: grid; place-items: center; width: 23px; height: 23px; border: 1px solid #d49eaf; border-radius: 50%; color: #a83750; }
.clip-play-mark svg { width: 21px; height: 21px; }
.clip-entry-copy { display: grid; gap: 3px; text-align: left; line-height: 1.25; }
.clip-entry-copy small { color: #96727e; font-size: 9px; font-weight: 400; }
.clip-external { position: relative; gap: 5px; width: 70px; color: #79626b; font: 400 10px/1.25 system-ui, sans-serif; white-space: nowrap; }
.clip-external-copy { display: grid; gap: 3px; text-align: left; }
.clip-external::before { content: ''; position: absolute; left: -1px; width: 1px; height: 18px; background: #ecd5dd; }
.clip-tv-mark { display: block; width: 18px; height: 17px; object-fit: contain; filter: saturate(.65); }
@media (hover: hover) {
  .clip-load:hover, .clip-external:hover { background: #f9e5eb90; color: #7f243c; }
}
.clip-load:active { background: #f4dce4; }
.clip-load:focus-visible, .clip-external:focus-visible { outline: 2px solid #a83750; outline-offset: 2px; }
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
@media (max-width: 580px) {
  .clip-load { gap: 5px; padding: 0 5px; }
  .clip-external { width: 60px; font-size: 9px; }
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
