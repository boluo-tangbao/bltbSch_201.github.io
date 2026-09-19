<script setup lang="ts">
import { cityColor } from '../utils/cities'
defineProps<{ cities: string[]; colors: Record<string, string>; active?: string }>()
defineEmits<{ select: [city: string] }>()
</script>
<template>
  <div class="city-legend" aria-label="城市颜色图例">
    <span class="legend-title">边框颜色 = 城市</span>
    <span v-if="!cities.length" class="muted">收录第一家店后显示城市图例</span>
    <button v-for="city in cities" :key="city" :aria-pressed="active === city" @click="$emit('select', active === city ? '' : city)"><i :style="{ background: cityColor(city, colors) }" aria-hidden="true"></i>{{ city }}</button>
  </div>
</template>
