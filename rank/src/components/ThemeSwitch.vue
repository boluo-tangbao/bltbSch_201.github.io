<script setup lang="ts">
import { theme } from '../utils/theme'
defineProps<{ disabled?: boolean }>()
</script>
<template>
  <div class="theme-switch" role="group" aria-label="页面风格">
    <button type="button" :disabled="disabled" :aria-pressed="theme === 'day'" aria-label="Day version" title="Day version（日间风格）" @click="theme = 'day'"><span class="theme-icon" aria-hidden="true">☀</span><span class="theme-label" aria-hidden="true">Day version</span></button>
    <button type="button" :disabled="disabled" :aria-pressed="theme === 'night'" aria-label="Night version" title="Night version（夜间风格）" @click="theme = 'night'"><span class="theme-icon" aria-hidden="true">☾</span><span class="theme-label" aria-hidden="true">Night version</span></button>
  </div>
</template>
