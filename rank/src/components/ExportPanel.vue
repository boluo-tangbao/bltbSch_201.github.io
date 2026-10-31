<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, onUnmounted, ref, watch } from 'vue'
import type { Place, Site, Update } from '../types'
import { exportRanking, type ExportMode, type ExportResult } from '../utils/export'
import { documentImagePaths, exportDocument } from '../utils/exportDocument'
import type { ExportProgress } from '../utils/exportTask'
import updateData from '../data/updates.json'
import { publicUpdates } from '../utils/model'
import { previewUrl } from '../utils/assets'
import '../export-poster.css'
const props = defineProps<{ site: Site; places: Place[]; allPlaces: Place[]; scope: string; updatedAt: string | null; currentLabel?: string }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement>()
const mode = ref<ExportMode | 'full'>('compact'), all = ref(false), busy = ref(false), error = ref('')
const includeGallery = ref(false), cancelled = ref(false)
const progress = ref<ExportProgress>({ stage: '准备导出', completed: 0, total: 0 })
const selectedPlaces = computed(() => all.value ? props.allPlaces : props.places)
const selectedCities = computed(() => new Set(selectedPlaces.value.map(place => place.city)).size)
const previewPlaces = computed(() => selectedPlaces.value.slice(0, 6))
const formats = [
  { value: 'compact', name: '简洁排序图', detail: '图片与名称', code: '01', tag: 'PNG / GRID', description: '照片、排名、城市。一眼看完整份偏好。' },
  { value: 'review', name: '短评长图', detail: '加上一句话评价', code: '02', tag: 'PNG / NOTES', description: '给每次到访，留下一句值得带走的话。' },
  { value: 'full', name: '完整内容', detail: 'HTML 图文存档', code: '03', tag: 'HTML / ARCHIVE', description: '把评价与所选图片，收藏进一份离线档案。' },
] as const
const imageCount = computed(() => documentImagePaths(selectedPlaces.value, mode.value === 'full' && includeGallery.value).length)
const results = ref<ExportResult[]>([])
const documentResult = ref<{ url: string; name: string }>()
let disposed = false
let controller: AbortController | undefined
const previousFocus = document.activeElement as HTMLElement | null
const release = () => { results.value.forEach(r => URL.revokeObjectURL(r.url)); results.value = []; if (documentResult.value) URL.revokeObjectURL(documentResult.value.url); documentResult.value = undefined }
onMounted(() => dialog.value?.showModal())
onBeforeUnmount(() => { disposed = true; controller?.abort(); release(); dialog.value?.close() })
onUnmounted(() => previousFocus?.focus())
watch([mode, all, includeGallery, () => props.places], () => { if (!busy.value) { release(); error.value = ''; cancelled.value = false } })
function cancel() { controller?.abort() }
async function generate() {
  if (busy.value || !selectedPlaces.value.length) return
  const task = new AbortController()
  controller = task
  const options = { signal: task.signal, onProgress: (value: ExportProgress) => { if (!disposed && !task.signal.aborted) progress.value = value } }
  busy.value = true; error.value = ''; cancelled.value = false; release()
  try {
    if (mode.value === 'full') {
      const generated = await exportDocument(props.site, selectedPlaces.value, props.allPlaces, publicUpdates(updateData as Update[], props.allPlaces), all.value ? '全榜 · 全部城市' : props.scope, props.updatedAt, { ...options, includeGallery: includeGallery.value })
      if (disposed || task.signal.aborted) URL.revokeObjectURL(generated.url)
      else documentResult.value = generated
      return
    }
    const url = new URL(location.href); url.search = ''; url.hash = ''
    const generated = await exportRanking({ ...options, site: props.site, places: selectedPlaces.value, allPlaces: props.allPlaces, mode: mode.value, scope: all.value ? '全榜 · 全部城市' : props.scope, updatedAt: props.updatedAt, websiteUrl: url.href })
    if (disposed || task.signal.aborted) generated.forEach(r => URL.revokeObjectURL(r.url))
    else results.value = generated
  } catch (e) {
    if (!disposed) {
      if (task.signal.aborted) cancelled.value = true
      else error.value = e instanceof Error ? e.message : '生成失败，请重试。'
    }
  } finally { if (controller === task) { controller = undefined; busy.value = false } }
}
</script>
<template>
  <dialog ref="dialog" class="export-dialog export-studio" aria-labelledby="export-title" @cancel="emit('close')" @close="emit('close')">
    <header class="studio-header">
      <div><span class="studio-kicker">TB / PERSONAL COLLECTION</span><div class="studio-title"><strong aria-hidden="true">EXPORT<span>STUDIO.</span></strong><h2 id="export-title">把榜单<br />带走。</h2></div></div>
      <button type="button" class="studio-close" aria-label="关闭导出" @click="emit('close')">×</button>
      <span class="studio-edition" aria-hidden="true">YOUR TASTE. YOUR EDITION. ↗</span>
    </header>
    <div class="studio-layout">
      <div class="studio-controls">
        <fieldset :disabled="busy" class="studio-fieldset"><legend><span>01 /</span> 选择版式</legend>
          <label v-for="format in formats" :key="format.value" class="studio-format">
            <input v-model="mode" type="radio" :value="format.value" name="mode" :aria-label="`${format.name} · ${format.detail}`" />
            <span class="format-index" aria-hidden="true">{{ format.code }}</span>
            <span class="format-copy"><small>{{ format.tag }}</small><b>{{ format.name }}</b><span>{{ format.description }}</span></span>
            <span class="format-check" aria-hidden="true">↗</span>
          </label>
        </fieldset>
        <fieldset :disabled="busy" class="studio-fieldset"><legend><span>02 /</span> 导出范围</legend>
          <div class="studio-scope"><label><input v-model="all" type="radio" :value="false" name="scope" :aria-label="`${currentLabel || '当前筛选'} · ${places.length} 处地点`" /><span>{{ currentLabel || '当前筛选' }}<b>{{ places.length }}</b></span></label><label><input v-model="all" type="radio" :value="true" name="scope" :aria-label="`完整榜单 · ${allPlaces.length} 处地点`" /><span>完整榜单<b>{{ allPlaces.length }}</b></span></label></div>
        </fieldset>
        <fieldset v-if="mode === 'full'" :disabled="busy" class="studio-fieldset"><legend><span>03 /</span> 图片范围</legend><div class="studio-scope"><label><input v-model="includeGallery" type="radio" :value="false" name="images" aria-label="仅封面" /><span>仅封面</span></label><label><input v-model="includeGallery" type="radio" :value="true" name="images" aria-label="包含图集" /><span>包含图集</span></label></div></fieldset>
        <div class="studio-summary"><span class="studio-summary-label">READY TO TAKE AWAY</span><p class="export-estimate"><b>{{ selectedPlaces.length }}</b> 处地点 <span>/</span> {{ imageCount }} 张图片</p></div>
        <div class="export-actions"><button class="studio-generate" :disabled="busy || !selectedPlaces.length" @click="generate"><span>{{ busy ? '正在生成…' : results.length || documentResult ? '重新生成' : mode === 'full' ? '生成完整内容' : '生成图片' }}</span><span aria-hidden="true">↗</span></button><button v-if="busy" type="button" class="studio-cancel" @click="cancel">取消生成</button></div>
        <div v-if="busy" class="export-progress" :aria-busy="true"><p role="status" aria-live="polite">{{ progress.stage }}<span v-if="progress.total"> · {{ progress.completed }} / {{ progress.total }}</span></p><progress :value="progress.total ? progress.completed : undefined" :max="progress.total || 1" :aria-label="progress.stage" /></div>
        <p v-if="error" class="export-status export-error" role="alert">{{ error }}</p>
        <p v-else-if="cancelled" class="export-status" role="status">已取消生成。</p>
        <p v-else-if="documentResult" class="export-status" role="status">完整内容已生成，所选图片已嵌入；视频与导航需要联网。</p>
        <p v-else-if="results.length" class="export-status" role="status">已生成 {{ results.length }} 张图片。</p>
        <p v-if="!selectedPlaces.length" class="studio-help">当前没有可导出的条目，可以切换到完整榜单。</p>
        <p v-else class="studio-help">{{ mode === 'full' ? '保存一份可以离线翻阅的图文记录。' : '高清 PNG · 自动分页 · 手机可长按预览保存' }}</p>
      </div>
      <section class="studio-preview" aria-label="导出预览">
        <div class="studio-preview-heading"><span>{{ results.length || documentResult ? 'YOUR EDITION / 已生成' : 'LAYOUT PREVIEW / 版式预览' }}</span><span aria-hidden="true">＋</span></div>
        <ul v-if="results.length" class="download-list"><li v-for="(result, index) in results" :key="result.url"><a :href="result.url" :download="result.name"><span>↓ 下载第 {{ index + 1 }} 页</span><small>{{ result.width }} × {{ result.height }}</small></a><img :src="result.url" :alt="`导出预览，第 ${index + 1} 页`" /></li></ul>
        <div v-else-if="mode !== 'full'" class="studio-poster" :class="{ 'is-review': mode === 'review' }" aria-hidden="true">
          <div class="poster-masthead"><span>TB // FIELD NOTES</span><strong>CITY<br /><i>FIELD GUIDE</i></strong><h3>{{ site.title }}</h3><div><span>{{ all ? '全榜 · 全部城市' : scope }}</span><b>{{ String(selectedPlaces.length).padStart(2, '0') }}</b></div></div>
          <div class="poster-body"><div class="poster-section"><span>01 / PERSONAL PICKS</span><span>{{ selectedCities }} CITIES ↗</span></div><div class="poster-cards"><div v-for="(place, index) in previewPlaces" :key="place.id" class="poster-card"><div class="poster-photo"><img v-if="place.cover" :src="previewUrl(place.cover)" alt="" :style="{ objectPosition: `${place.coverPosition?.[0] ?? 50}% ${place.coverPosition?.[1] ?? 50}%` }" /><span v-else>NO IMAGE</span><b>{{ String(index + 1).padStart(2, '0') }}</b></div><small>{{ place.city }}</small><b>{{ place.name }}</b><p v-if="mode === 'review'">{{ place.summary }}</p></div></div><div v-if="!previewPlaces.length" class="poster-empty">等待收录你的下一站。</div><div class="poster-colophon"><span>{{ site.author }}</span><span>PERSONAL / SUBJECTIVE</span></div></div>
        </div>
        <div v-else class="studio-archive"><span class="archive-symbol" aria-hidden="true">[↗]</span><span class="studio-kicker">YOUR OFFLINE COLLECTION</span><h3>留住每一次<br />值得记录的到访。</h3><p>详细评价、到访记录与{{ includeGallery ? '现场图集' : '封面图片' }}，一起打包收藏。</p><div><b>{{ selectedPlaces.length }}</b> PLACES <span>/</span> <b>{{ imageCount }}</b> IMAGES</div><a v-if="documentResult" class="button full-download" :href="documentResult.url" :download="documentResult.name">↓ 下载完整内容（HTML）</a></div>
        <p v-if="!results.length && mode !== 'full'" class="studio-preview-note">版式示意，展示前 {{ previewPlaces.length }} 处地点；生成后可查看完整分页。</p>
      </section>
    </div>
  </dialog>
</template>
