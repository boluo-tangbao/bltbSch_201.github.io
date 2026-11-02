<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, useAttrs, type Component, type ComponentPublicInstance } from 'vue'
defineOptions({ inheritAttrs: false })
const props = defineProps<{ loader: () => Promise<{ default: Component }>; title: string; inline?: boolean }>()
const emit = defineEmits<{ close: [] }>()
const attrs = useAttrs(), feature = shallowRef<Component>(), failed = ref(false), pending = ref<HTMLDialogElement>()
const instance = shallowRef<ComponentPublicInstance>()
defineExpose({ instance })
let active = true
async function load() {
  failed.value = false
  try {
    const module = await props.loader()
    if (!active) return
    pending.value?.close() // Restore the trigger before the real panel takes focus.
    feature.value = module.default
  } catch {
    if (active) failed.value = true
  }
}
function close() { active = false; pending.value?.close(); emit('close') }
function refresh() { location.reload() }
onMounted(() => { if (!props.inline) pending.value?.showModal(); void load() })
onBeforeUnmount(() => { active = false; pending.value?.close() })
</script>

<template>
  <component v-if="feature" ref="instance" :is="feature" v-bind="attrs" @close="emit('close')" />
  <div v-else-if="inline" class="deferred-inline" :aria-busy="!failed">
    <p role="status">{{ failed ? `${title}加载失败，请刷新页面后重试` : `正在准备${title}…` }}</p>
    <button v-if="failed" type="button" class="button" @click="refresh">刷新页面</button>
  </div>
  <dialog v-else ref="pending" class="deferred-dialog" :aria-label="title + '加载'" @cancel.prevent="close">
    <header><strong>{{ title }}</strong><button type="button" class="text-button" aria-label="关闭加载" autofocus @click="close">关闭</button></header>
    <p role="status">{{ failed ? '加载失败，请刷新页面后重试。' : '正在准备，请稍候…' }}</p>
    <button v-if="failed" type="button" class="button" @click="refresh">刷新页面</button>
  </dialog>
</template>

<style scoped>
.deferred-dialog { width: min(360px, calc(100% - 32px)); border: 1px solid var(--ui-border); border-radius: var(--ui-radius-dialog); padding: 20px; background: var(--ui-surface); color: var(--ui-ink); }
.deferred-dialog::backdrop { background: #29283070; }
.deferred-dialog header { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.deferred-dialog p, .deferred-inline p { font-size: 13px; color: var(--ui-muted); }
.deferred-inline { min-height: 100px; padding: 16px 0; }
</style>
