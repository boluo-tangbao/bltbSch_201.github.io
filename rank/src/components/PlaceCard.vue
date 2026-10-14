<script setup lang="ts">
import type { Place } from '../types'
import PlaceImage from './PlaceImage.vue'
import SearchMatch from './SearchMatch.vue'
import type { PlaceSearchMatch } from '../utils/search'
defineProps<{ place: Place; rank?: number; badge: string; color: string; href: string; priority?: boolean; match?: PlaceSearchMatch; comfortable?: boolean }>()
</script>
<template>
  <article :id="`place-card-${place.id}`" class="place-card photo-card" :style="{ '--city-color': color }">
    <a :href="href" class="card-link" :aria-label="`${place.city}，${place.name}${rank ? `，档内第 ${rank} 名` : ''}，查看介绍`" :title="`${place.city} · ${place.name}`">
      <div class="card-photo"><PlaceImage :src="place.cover" :alt="`${place.city} · ${place.name}`" :position="place.coverPosition" :priority="priority" :sizes="comfortable ? '(max-width: 580px) calc((100vw - 72px) / 2), (max-width: 1000px) 300px, 280px' : undefined" /></div>
      <div class="photo-caption"><span>{{ place.name }}</span><small>{{ place.city }}<span v-if="rank" class="rank-number"> · #{{ rank }}</span><span v-if="badge"> · {{ badge }}</span></small></div>
    </a>
    <SearchMatch v-if="match" :match="match" />
  </article>
</template>
