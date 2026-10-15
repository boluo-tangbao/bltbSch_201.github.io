<script setup lang="ts">
import type { Place } from '../types'
import { baiduMapUrl, navigationUrl, placeAddress } from '../utils/cities'
import CopyButton from './CopyButton.vue'
defineProps<{ place: Place }>()
</script>

<template>
  <div v-if="placeAddress(place)" class="address-actions">
    <CopyButton :text="placeAddress(place)" label="复制地址" />
    <a :href="navigationUrl(place, true)!" target="_blank" rel="noopener noreferrer">高德导航 ↗</a>
    <a :href="baiduMapUrl(place)!" target="_blank" rel="noopener noreferrer">百度地图 ↗</a>
  </div>
</template>

<style scoped>
.address-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.address-actions a { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 7px 10px; border: 1px solid #d5a5b2; border-radius: 4px; color: #84394e; background: #fffaf1; font-size: 12px; }
</style>
