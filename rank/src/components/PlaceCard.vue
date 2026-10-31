<script setup lang="ts">
import type { Place } from '../types'
import PlaceImage from './PlaceImage.vue'
import SearchMatch from './SearchMatch.vue'
import TripPlanButton from './TripPlanButton.vue'
import type { PlaceSearchMatch } from '../utils/search'
defineProps<{ place: Place; rank?: number; badge: string; color: string; href: string; priority?: boolean; comfortable?: boolean; match?: PlaceSearchMatch }>()
</script>
<template>
  <article :id="`place-card-${place.id}`" class="place-card photo-card" :class="{ 'has-search-match': !!match }" :style="{ '--city-color': color }">
    <a :href="href" class="card-link" :aria-label="`${place.city}，${place.name}${rank ? `，档内第 ${rank} 名` : ''}，查看介绍`" :title="`${place.city} · ${place.name}`">
      <div class="card-photo"><PlaceImage :src="place.cover" :alt="`${place.city} · ${place.name}`" :position="place.coverPosition" :priority="priority" :sizes="comfortable ? '(max-width: 580px) calc((100vw - 72px) / 2), (max-width: 1000px) 300px, 280px' : undefined" /></div>
      <div class="photo-caption"><span>{{ place.name }}</span><small>{{ place.city }}<span v-if="rank" class="rank-number"> · #{{ rank }}</span><span v-if="badge"> · {{ badge }}</span></small></div>
    </a>
    <a v-if="match" :href="href" class="card-search-link" :aria-label="`${place.name}的搜索匹配说明，查看详情`"><SearchMatch :match="match" /></a>
    <TripPlanButton :place-id="place.id" :name="place.name" class="card-trip-add" />
  </article>
</template>

<style scoped>
.photo-card .card-link { height: auto; }
.card-trip-add { margin-top: 8px; width: 100%; }
.card-search-link { display: block; margin-top: 8px; padding: 10px; border: 1px solid #e5c5cc; border-radius: 4px; background: #fffdfa; }
.card-search-link:hover { background: #fff0f3; }
.card-search-link:focus-visible { outline: 3px solid #a83750; outline-offset: 3px; }
</style>

