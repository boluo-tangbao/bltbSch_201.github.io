<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
const state = ref<'loading' | 'ready' | 'failed' | 'local'>('loading')
const value = ref<HTMLElement>()
let observer: MutationObserver | undefined, timer: ReturnType<typeof setTimeout> | undefined
onMounted(() => {
  if (location.hostname !== 'boluo-tangbao.github.io') { state.value = 'local'; return }
  observer = new MutationObserver(() => {
    if (/^\d+$/.test(value.value?.textContent || '')) { state.value = 'ready'; clearTimeout(timer) }
  })
  if (value.value) observer.observe(value.value, { childList: true, subtree: true, characterData: true })
  timer = setTimeout(() => { if (state.value !== 'ready') state.value = 'failed' }, 12000)
  const script = document.createElement('script')
  script.src = 'https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js'
  script.async = true
  script.onerror = () => { state.value = 'failed'; clearTimeout(timer) }
  document.head.append(script)
})
onBeforeUnmount(() => { observer?.disconnect(); clearTimeout(timer) })
</script>
<template>
  <div class="visit-counter" role="status" aria-live="polite">
    <span v-show="state === 'ready'">累计访问 <strong id="busuanzi_value_site_pv" ref="value"></strong> 次</span>
    <span v-if="state === 'loading'">访问次数加载中…</span>
    <span v-else-if="state === 'failed'">访问统计暂不可用</span>
    <span v-else-if="state === 'local'">本地预览不计入访问</span>
    <small>打开或刷新页面计一次 · 非独立访客人数 · <a href="https://busuanzi.ibruce.info/" target="_blank" rel="noopener noreferrer">不蒜子统计</a></small>
  </div>
</template>
