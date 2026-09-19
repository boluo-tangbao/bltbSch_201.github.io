<script setup lang="ts">
import type { Place } from '../types'
import PlaceImage from './PlaceImage.vue'
defineProps<{ place: Place; rank?: number; badge: string; color: string; href: string }>()
</script>
<template>
  <article class="place-card photo-card" :style="{ '--city-color': color }">
    <a :href="href" class="card-link" :aria-label="`${place.city}，${place.name}${rank ? `，档内第 ${rank} 名` : ''}，查看介绍`" :title="`${place.city} · ${place.name}`">
      <div class="card-photo"><PlaceImage :src="place.cover" :alt="place.coverAlt || place.name" :position="place.coverPosition" /></div>
      <span v-if="place.isDemo" class="photo-demo demo-badge">演示</span>
      <div class="photo-caption"><span>{{ place.name }}</span><small>{{ place.city }}<span v-if="rank" class="rank-number"> · #{{ rank }}</span><span v-if="badge"> · {{ badge }}</span></small></div>
    </a>
  </article>
</template>
