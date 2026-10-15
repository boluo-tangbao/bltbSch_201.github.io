<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, onUnmounted, ref, watch } from 'vue'
import type { Place, Site, Update } from '../types'
import { exportRanking, type ExportMode, type ExportResult } from '../utils/export'
import { documentImagePaths, exportDocument } from '../utils/exportDocument'
import type { ExportProgress } from '../utils/exportTask'
import updateData from '../data/updates.json'
import { publicUpdates } from '../utils/model'
const props = defineProps<{ site: Site; places: Place[]; allPlaces: Place[]; scope: string; updatedAt: string | null }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement>()
const mode = ref<ExportMode | 'full'>('compact'), all = ref(false), busy = ref(false), error = ref('')
const includeGallery = ref(false), cancelled = ref(false)
const progress = ref<ExportProgress>({ stage: '准备导出', completed: 0, total: 0 })
const selectedPlaces = computed(() => all.value ? props.allPlaces : props.places)
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
  <dialog ref="dialog" class="export-dialog" aria-labelledby="export-title" @cancel="emit('close')" @close="emit('close')">
    <div class="dialog-heading"><h2 id="export-title">把榜单带走</h2><button class="icon-button" aria-label="关闭导出" @click="emit('close')">×</button></div>
    <fieldset :disabled="busy"><legend>选择版式</legend><label><input v-model="mode" type="radio" value="compact" name="mode" />简洁排序图 · 图片与名称</label><label><input v-model="mode" type="radio" value="review" name="mode" />短评长图 · 加上一句话评价</label><label><input v-model="mode" type="radio" value="full" name="mode" />完整内容 · HTML 图文存档</label></fieldset>
    <fieldset :disabled="busy"><legend>导出范围</legend><label><input v-model="all" type="radio" :value="false" name="scope" />当前筛选 · {{ places.length }} 个条目</label><label><input v-model="all" type="radio" :value="true" name="scope" />完整榜单 · {{ allPlaces.length }} 个条目</label></fieldset>
    <fieldset v-if="mode === 'full'" :disabled="busy"><legend>图片范围</legend><label><input v-model="includeGallery" type="radio" :value="false" name="images" />仅封面</label><label><input v-model="includeGallery" type="radio" :value="true" name="images" />包含图集</label></fieldset>
    <p class="export-estimate">{{ selectedPlaces.length }} 个条目 · {{ imageCount }} 张图片</p>
    <div class="export-actions"><button class="button dark" :disabled="busy || !selectedPlaces.length" @click="generate">{{ busy ? '正在生成…' : results.length || documentResult ? '重新生成' : mode === 'full' ? '生成完整内容' : '生成图片' }}</button><button v-if="busy" type="button" class="button" @click="cancel">取消生成</button></div>
    <div v-if="busy" class="export-progress" :aria-busy="true"><p role="status" aria-live="polite">{{ progress.stage }}<span v-if="progress.total"> · {{ progress.completed }} / {{ progress.total }}</span></p><progress :value="progress.total ? progress.completed : undefined" :max="progress.total || 1" :aria-label="progress.stage" /></div>
    <p v-if="error" class="export-status export-error" role="alert">{{ error }}</p>
    <p v-else-if="cancelled" class="export-status" role="status">已取消生成。</p>
    <p v-else-if="documentResult" class="export-status" role="status">完整内容已生成，所选图片已嵌入；视频与导航需要联网。</p>
    <p v-else-if="results.length" class="export-status" role="status">已生成 {{ results.length }} 张图片。</p>
    <ul class="download-list"><li v-for="(result, index) in results" :key="result.url"><a :href="result.url" :download="result.name">↓ 下载第 {{ index + 1 }} 页 · {{ result.width }} × {{ result.height }}</a><img :src="result.url" :alt="`导出预览，第 ${index + 1} 页`" /></li></ul>
    <a v-if="documentResult" class="button full-download" :href="documentResult.url" :download="documentResult.name">↓ 下载完整内容（HTML）</a>
  </dialog>
</template>

<style scoped>
.export-dialog fieldset { margin: 16px 0; }
.export-dialog .icon-button { width: 44px; height: 44px; flex: none; }
.export-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.export-actions .button { min-height: 44px; }
.export-progress { margin-top: 16px; }
.export-progress p { margin: 0 0 8px; }
.export-progress progress { display: block; width: 100%; height: 12px; accent-color: #bb4961; }
.export-estimate { font-variant-numeric: tabular-nums; }
</style>
