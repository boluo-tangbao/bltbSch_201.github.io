<script setup lang="ts">
import { onBeforeUnmount, onMounted, onUnmounted, ref } from 'vue'
import type { Place, Site } from '../types'
import { exportRanking, type ExportMode, type ExportResult } from '../utils/export'
const props = defineProps<{ site: Site; places: Place[]; allPlaces: Place[]; scope: string; updatedAt: string | null }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement>()
const mode = ref<ExportMode>('compact'), all = ref(false), busy = ref(false), error = ref('')
const results = ref<ExportResult[]>([])
let disposed = false
const previousFocus = document.activeElement as HTMLElement | null
const release = () => { results.value.forEach(r => URL.revokeObjectURL(r.url)); results.value = [] }
onMounted(() => dialog.value?.showModal())
onBeforeUnmount(() => { disposed = true; release(); dialog.value?.close() })
onUnmounted(() => previousFocus?.focus())
async function generate() {
  busy.value = true; error.value = ''; release()
  try {
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
    <p>生成清晰的 PNG 图片，方便保存与分享。内容较多时自动分成多页，每一页都可单独下载。</p>
    <fieldset :disabled="busy"><legend>选择版式</legend><label><input v-model="mode" type="radio" value="compact" name="mode" />简洁排序图 · 图片与名称</label><label><input v-model="mode" type="radio" value="review" name="mode" />短评长图 · 加上一句话评价</label></fieldset>
    <fieldset :disabled="busy"><legend>导出范围</legend><label><input v-model="all" type="radio" :value="false" name="scope" />当前筛选 · {{ places.length }} 个条目</label><label><input v-model="all" type="radio" :value="true" name="scope" />完整榜单 · {{ allPlaces.length }} 个条目</label></fieldset>
    <button class="button dark" :disabled="busy" @click="generate">{{ busy ? '正在生成图片…' : results.length ? '重新生成' : '生成图片' }}</button>
    <p v-if="error" class="export-status export-error" role="alert">{{ error }}</p>
    <p v-else-if="busy || results.length" class="export-status" role="status">{{ busy ? '正在加载字体与图片，请稍候。' : `已生成 ${results.length} 张图片。点击下方链接保存；手机也可长按图片保存。` }}</p>
    <ul class="download-list"><li v-for="(result, index) in results" :key="result.url"><a :href="result.url" :download="result.name">↓ 下载第 {{ index + 1 }} 页 · {{ result.width }} × {{ result.height }}</a><img :src="result.url" :alt="`导出预览，第 ${index + 1} 页`" /></li></ul>
  </dialog>
</template>
