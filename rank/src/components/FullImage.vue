<script setup lang="ts">
import { ref } from 'vue'
import { displayUrl, previewUrl } from '../utils/assets'

defineProps<{ src: string; alt: string }>()
const loaded = ref(false)
const failed = ref(false)
const attempt = ref(0)
function retry() { loaded.value = false; failed.value = false; attempt.value++ }
</script>

<template>
  <div class="full-image" :aria-busy="!loaded && !failed">
    <img class="full-image-preview" :class="{ 'is-hidden': loaded }" :src="previewUrl(src)" alt="" aria-hidden="true" decoding="async">
    <img :key="`${src}-${attempt}`" class="full-image-original" :class="{ 'is-ready': loaded }" :src="displayUrl(src)" :alt="alt" decoding="async" fetchpriority="high" @load="loaded = true" @error="failed = true">
    <div v-if="!loaded" class="full-image-status" role="status">
      <template v-if="failed">大图加载失败 <button type="button" @click="retry">重试</button></template>
      <template v-else>正在加载高清图片…</template>
    </div>
  </div>
</template>

<style scoped>
.full-image { position: relative; width: 1100px; max-width: 100%; }
.full-image-preview { width: 100%; filter: blur(2px); }
.full-image-preview.is-hidden { visibility: hidden; }
.full-image-original { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; }
.full-image-original.is-ready { opacity: 1; }
.full-image-status { position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%); width: max-content; max-width: 100%; padding: 8px 12px; border-radius: 20px; background: #131713de; color: #fff; font-size: 12px; text-align: center; }
.full-image-status button { margin-left: 8px; padding: 2px 8px; border: 1px solid #ffffff70; border-radius: 4px; background: transparent; color: #fff; cursor: pointer; }
</style>
