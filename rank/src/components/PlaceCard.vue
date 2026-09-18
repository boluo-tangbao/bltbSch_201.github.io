<script setup lang="ts">
import type { Place } from '../types'
import PlaceImage from './PlaceImage.vue'
defineProps<{ place: Place; rank?: number; badge: string }>()
</script>
<template>
  <article class="place-card">
    <a :href="`#/place/${place.id}`" class="card-link" :aria-label="`查看${place.name}的详情`">
      <div class="card-photo"><PlaceImage :src="place.cover" :alt="place.coverAlt" :position="place.coverPosition" /></div>
      <div class="card-copy">
        <div class="card-meta"><span>{{ place.city }}</span><span v-if="place.isDemo" class="demo-badge">演示</span><span v-if="badge" class="change-badge">{{ badge }}</span><span v-if="rank" class="rank-number">#{{ rank }}</span></div>
        <h3>{{ place.name }}</h3>
        <p class="summary">{{ place.summary }}</p>
        <p v-if="place.pros" class="pro-con"><b>亮点</b>{{ place.pros }}</p>
        <p v-if="place.cons" class="pro-con"><b>槽点</b>{{ place.cons }}</p>
        <div class="card-bottom"><span>到访 · {{ place.visitedAt || '未记录' }}</span><span>看详情 ↗</span></div>
      </div>
    </a>
  </article>
</template>
