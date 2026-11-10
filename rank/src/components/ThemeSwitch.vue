<script setup lang="ts">
import { theme } from '../utils/theme'
defineProps<{ disabled?: boolean }>()
</script>
<template>
  <div class="theme-switch" role="group" aria-label="页面与导出风格">
    <button type="button" :disabled="disabled" :aria-pressed="theme === 'day'" @click="theme = 'day'"><span aria-hidden="true">☀</span> Day<span class="theme-version"> version</span></button>
    <button type="button" :disabled="disabled" :aria-pressed="theme === 'night'" @click="theme = 'night'"><span aria-hidden="true">☾</span> Night<span class="theme-version"> version</span></button>
  </div>
</template>
