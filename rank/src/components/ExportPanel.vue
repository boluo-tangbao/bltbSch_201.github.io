<script setup lang="ts">
import { onBeforeUnmount, onMounted, onUnmounted, ref } from 'vue'
import type { Place, Site, Update } from '../types'
import { exportRanking, type ExportMode, type ExportResult } from '../utils/export'
import { exportDocument } from '../utils/exportDocument'
import updateData from '../data/updates.json'
import { publicUpdates } from '../utils/model'
const props = defineProps<{ site: Site; places: Place[]; allPlaces: Place[]; scope: string; updatedAt: string | null }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement>()
const mode = ref<ExportMode | 'full'>('compact'), all = ref(false), busy = ref(false), error = ref('')
const results = ref<ExportResult[]>([])
const documentResult = ref<{ url: string; name: string }>()
let disposed = false
const previousFocus = document.activeElement as HTMLElement | null
const release = () => { results.value.forEach(r => URL.revokeObjectURL(r.url)); results.value = []; if (documentResult.value) URL.revokeObjectURL(documentResult.value.url); documentResult.value = undefined }
onMounted(() => dialog.value?.showModal())
onBeforeUnmount(() => { disposed = true; release(); dialog.value?.close() })
onUnmounted(() => previousFocus?.focus())
async function generate() {
  busy.value = true; error.value = ''; release()
  try {
    if (mode.value === 'full') {
      const generated = await exportDocument(props.site, all.value ? props.allPlaces : props.places, props.allPlaces, publicUpdates(updateData as Update[], props.allPlaces), all.value ? '全榜 · 全部城市' : props.scope, props.updatedAt)
      if (disposed) URL.revokeObjectURL(generated.url)
      else documentResult.value = generated
      return
    }
    const url = new URL(location.href); url.search = ''; url.hash = ''
    const generated = await exportRanking({ site: props.site, places: all.value ? props.allPlaces : props.places, allPlaces: props.allPlaces, mode: mode.value, scope: all.value ? '全榜 · 全部城市' : props.scope, updatedAt: props.updatedAt, websiteUrl: url.href })
    if (disposed) generated.forEach(r => URL.revokeObjectURL(r.url))
    else results.value = generated
  } catch (e) { error.value = e instanceof Error ? e.message : '生成失败，请重试。' }
  finally { busy.value = false }
}
</script>
<template>
  <dialog ref="dialog" class="export-dialog" aria-labelledby="export-title" @cancel="emit('close')" @close="emit('close')">
    <div class="dialog-heading"><h2 id="export-title">把榜单带走</h2><button class="icon-button" aria-label="关闭导出" @click="emit('close')">×</button></div>
    <p>图片适合快速分享；完整内容文件保留图文、视频介绍、来源链接与导航信息，可离线阅读或打印为 PDF。</p>
    <fieldset :disabled="busy"><legend>选择版式</legend><label><input v-model="mode" type="radio" value="compact" name="mode" />简洁排序图 · 图片与名称</label><label><input v-model="mode" type="radio" value="review" name="mode" />短评长图 · 加上一句话评价</label><label><input v-model="mode" type="radio" value="full" name="mode" />完整内容 · HTML 图文存档</label></fieldset>
    <fieldset :disabled="busy"><legend>导出范围</legend><label><input v-model="all" type="radio" :value="false" name="scope" />当前筛选 · {{ places.length }} 个条目</label><label><input v-model="all" type="radio" :value="true" name="scope" />完整榜单 · {{ allPlaces.length }} 个条目</label></fieldset>
    <button class="button dark" :disabled="busy" @click="generate">{{ busy ? '正在生成…' : results.length || documentResult ? '重新生成' : mode === 'full' ? '生成完整内容' : '生成图片' }}</button>
    <p v-if="error" class="export-status export-error" role="alert">{{ error }}</p>
    <p v-else-if="documentResult" class="export-status" role="status">完整内容已生成，图片已嵌入文件；视频和地图链接需要联网打开。</p>
    <p v-else-if="busy || results.length" class="export-status" role="status">{{ busy ? '正在加载字体与图片，请稍候。' : `已生成 ${results.length} 张图片。点击下方链接保存；手机也可长按图片保存。` }}</p>
    <ul class="download-list"><li v-for="(result, index) in results" :key="result.url"><a :href="result.url" :download="result.name">↓ 下载第 {{ index + 1 }} 页 · {{ result.width }} × {{ result.height }}</a><img :src="result.url" :alt="`导出预览，第 ${index + 1} 页`" /></li></ul>
    <a v-if="documentResult" class="button full-download" :href="documentResult.url" :download="documentResult.name">↓ 下载完整内容（HTML）</a>
  </dialog>
</template>
