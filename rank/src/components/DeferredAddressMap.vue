<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { Place } from '../types'
import { placeAddress } from '../utils/cities'
import DeferredFeature from './DeferredFeature.vue'
defineProps<{ place: Place; color: string }>()
const requested = ref(false), root = ref<HTMLElement>()
const load = () => import('./AddressMap.vue')
let observer: IntersectionObserver | undefined
function activate() { requested.value = true; observer?.disconnect() }
defineExpose({ activate })
onMounted(() => {
  if (!('IntersectionObserver' in window)) { activate(); return }
  observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) activate() }, { rootMargin: '300px' })
  if (root.value) observer.observe(root.value)
})
onBeforeUnmount(() => observer?.disconnect())
</script>
<template>
  <div ref="root" class="deferred-map">
    <DeferredFeature v-if="requested" inline :loader="load" title="地点地图" :place="place" :color="color" />
    <div v-else class="deferred-map-placeholder"><p>{{ placeAddress(place) }}</p><button type="button" class="button" @click="activate">加载地点地图</button></div>
  </div>
</template>
<style scoped>
.deferred-map { min-height: 420px; }
.deferred-map-placeholder { min-height: 420px; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 12px; padding: 24px; border: 1px solid var(--ui-border); border-radius: var(--ui-radius-card); background: var(--ui-surface); }
.deferred-map-placeholder p { font-size: 13px; color: var(--ui-muted); }
@media (max-width: 580px) { .deferred-map, .deferred-map-placeholder { min-height: 300px; } }
</style>
