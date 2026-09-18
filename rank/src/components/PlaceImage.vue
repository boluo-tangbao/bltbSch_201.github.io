<script setup lang="ts">
import { ref, watch } from 'vue'
import { assetUrl } from '../utils/assets'
const props = defineProps<{ src: string | null; alt: string; position?: [number, number] }>()
const broken = ref(false)
watch(() => props.src, () => broken.value = false)
</script>
<template>
  <img v-if="src && !broken" :src="assetUrl(src)" :alt="alt" loading="lazy" :style="{ objectPosition: `${position?.[0] ?? 50}% ${position?.[1] ?? 50}%` }" @error="broken = true" />
  <div v-else class="image-placeholder" role="img" :aria-label="src ? '图片暂不可用' : '暂无图片'">
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="9" r="1.5" fill="currentColor"/><path d="m4 17 5-5 4 4 3-3 5 4" stroke="currentColor" stroke-width="1.3"/></svg>
    <span>{{ src ? '图片暂不可用' : '等待一张现场照片' }}</span>
  </div>
</template>
