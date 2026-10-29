<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
const props = withDefaults(defineProps<{ text: string; label: string; copiedLabel?: string; variant?: 'plain' | 'share' }>(), { copiedLabel: '已复制', variant: 'plain' })
const copied = ref(false), fallback = ref(false), field = ref<HTMLInputElement | HTMLTextAreaElement>()
let timer: ReturnType<typeof setTimeout> | undefined
let disposed = false
function clear() { clearTimeout(timer); copied.value = false; fallback.value = false }
async function copy() {
  const text = props.text
  clear()
  try {
    await navigator.clipboard.writeText(text)
    if (disposed || props.text !== text) return
    copied.value = true
    timer = setTimeout(() => { copied.value = false }, 2500)
  } catch {
    if (disposed || props.text !== text) return
    fallback.value = true
    await nextTick()
    field.value?.focus(); field.value?.select()
  }
}
watch(() => props.text, clear)
onBeforeUnmount(() => { disposed = true; clearTimeout(timer) })
</script>

<template>
  <span class="copy-control">
    <button type="button" class="copy-button" :class="{ 'is-share': variant === 'share', 'is-copied': copied }" :aria-label="label" :title="label" @click="copy"><span aria-live="polite">{{ copied ? copiedLabel : label }}</span></button>
    <span v-if="fallback" class="copy-fallback"><span role="status">暂时无法自动复制</span><textarea v-if="text.includes('\n')" ref="field" :value="text" readonly rows="5" :aria-label="`${label}内容`" @focus="field?.select()"></textarea><input v-else ref="field" :value="text" readonly :aria-label="`${label}内容`" @focus="field?.select()" /></span>
  </span>
</template>

<style scoped>
.copy-control { display: inline-flex; flex-direction: column; gap: 5px; min-width: 0; max-width: 100%; }
.copy-button { min-width: 96px; min-height: 44px; padding: 7px 10px; border: 1px solid #d5a5b2; border-radius: 4px; background: #fffaf1; color: #84394e; font: inherit; font-size: 12px; font-weight: 700; white-space: nowrap; }
.copy-button:hover { background: #fff0f2; }
.copy-fallback { display: grid; gap: 4px; max-width: 100%; font-size: 11px; color: #84394e; }
.copy-fallback input,.copy-fallback textarea { width: 100%; min-width: 0; min-height: 40px; padding: 6px; border: 1px solid #d5a5b2; background: #fff; font: inherit; font-size: 12px; }
.copy-button.is-share {
  --share-shape: polygon(8% 12%, 26% 12%, 31% 0, 43% 9%, 90% 5%, 96% 23%, 100% 24%, 95% 43%, 100% 65%, 92% 72%, 95% 92%, 65% 92%, 58% 100%, 46% 91%, 9% 96%, 5% 77%, 0 70%, 5% 50%, 0 32%, 7% 29%);
  position: relative;
  isolation: isolate;
  width: 112px;
  height: 52px;
  padding: 8px 12px;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: #292932;
  font-family: 'Guide Cartoon', 'Microsoft YaHei', sans-serif;
  font-size: 15px;
  font-weight: 400;
  filter: drop-shadow(3px 3px 0 #e5a3b4);
  transition: transform .15s ease;
}
.copy-button.is-share::before, .copy-button.is-share::after { content: ''; position: absolute; z-index: -1; clip-path: var(--share-shape); pointer-events: none; }
.copy-button.is-share::before { inset: 0; background: #292932; }
.copy-button.is-share::after { inset: 2px; background: #d8f65c; transition: background .15s ease; }
.copy-button.is-share > span { display: inline-block; transform: rotate(-3deg); }
.copy-button.is-share:hover { background: transparent; transform: translateY(-1px); }
.copy-button.is-share:hover::after { background: #ffdb66; }
.copy-button.is-share.is-copied::after { background: #a7ead6; }
.copy-button.is-share:active { transform: translate(1px, 1px); }
.copy-button.is-share:focus-visible { outline: 3px solid #a83750; outline-offset: 4px; }
@media (prefers-reduced-motion: reduce) { .copy-button.is-share, .copy-button.is-share::after { transition: none; } }
</style>
