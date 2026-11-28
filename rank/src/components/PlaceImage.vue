<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import covers from 'virtual:cover-previews'
import { compactCardSizes, previewSources } from '../utils/imageSources'
import { vNearbyImage } from '../utils/nearbyImage'
const props = withDefaults(defineProps<{ src: string | null; alt: string; position?: [number, number]; priority?: boolean; sizes?: string }>(), {
  sizes: compactCardSizes,
})
const sources = computed(() => props.src && previewSources(import.meta.env.BASE_URL, props.src, covers[props.src]))
const requested = ref(!!props.priority)
const broken = ref(false)
watch(() => props.priority, priority => { if (priority) requested.value = true })
watch(() => props.src, () => broken.value = false)
</script>
<template>
  <img v-if="sources && !broken" v-nearby-image="() => requested = true" :fetchpriority="priority ? 'high' : 'auto'" decoding="async" :sizes="sizes" :srcset="requested ? sources.srcset : undefined" :src="requested ? sources.src : undefined" :alt="alt" :style="{ objectPosition: `${position?.[0] ?? 50}% ${position?.[1] ?? 50}%`, visibility: requested ? undefined : 'hidden' }" @error="broken = true" />
  <div v-else class="image-placeholder" role="img" :aria-label="src ? '图片暂不可用' : '暂无图片'">
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="9" r="1.5" fill="currentColor"/><path d="m4 17 5-5 4 4 3-3 5 4" stroke="currentColor" stroke-width="1.3"/></svg>
    <span>{{ src ? '图片暂不可用' : '等待一张现场照片' }}</span>
  </div>
</template>
