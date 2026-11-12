<script setup lang="ts">
import type { Place } from '../types'
import PlaceImage from './PlaceImage.vue'
import PlaceChangeNotice from './PlaceChangeNotice.vue'
import SearchMatch from './SearchMatch.vue'
import TripPlanButton from './TripPlanButton.vue'
import type { PlaceSearchMatch } from '../utils/search'
defineProps<{ place: Place; rank?: number; badge: string; color: string; href: string; priority?: boolean; comfortable?: boolean; match?: PlaceSearchMatch }>()
</script>
<template>
  <article :id="`place-card-${place.id}`" class="place-card photo-card" :class="{ 'has-search-match': !!match }" :style="{ '--city-color': color }">
    <a :href="href" class="card-link" :aria-label="`${place.city}，${place.name}${rank ? `，档内第 ${rank} 名` : ''}，查看介绍`" :aria-describedby="comfortable && place.summary ? `card-summary-${place.id}` : undefined" :title="`${place.city} · ${place.name}`">
      <div class="card-photo"><PlaceImage :src="place.cover" :alt="`${place.city} · ${place.name}`" :position="place.coverPosition" :priority="priority" :sizes="comfortable ? '(max-width: 580px) calc((100vw - 72px) / 2), (max-width: 1000px) 300px, 280px' : undefined" /></div>
      <div class="photo-caption"><span>{{ place.name }}</span><small>{{ place.city }}<span v-if="rank" class="rank-number"> · #{{ rank }}</span><span v-if="badge"> · {{ badge }}</span></small></div>
      <p v-if="comfortable && place.summary" :id="`card-summary-${place.id}`" class="card-summary"><small v-if="place.changeNotice" class="original-summary-label">原体验短评</small>{{ place.summary }}</p>
    </a>
    <a v-if="place.changeNotice" :href="href" class="card-change-link" :aria-label="`${place.name}：${place.changeNotice.title}，查看详情`"><PlaceChangeNotice :notice="place.changeNotice" :compact="!comfortable" /></a>
    <a v-if="match" :href="href" class="card-search-link" :aria-label="`${place.name}的搜索匹配说明，查看详情`"><SearchMatch :match="match" /></a>
    <TripPlanButton :place-id="place.id" :name="place.name" icon-only class="card-trip-add" />
  </article>
</template>

<style scoped>
.photo-card .card-link { height: auto; }
.photo-card { position: relative; }
.card-change-link { display: block; text-decoration: none; }
.card-change-link:focus-visible { outline: 3px solid var(--ui-accent); outline-offset: 3px; }
.card-summary { margin: 0; padding: 12px; background: var(--ui-surface, #fffdfa); color: var(--ui-ink, #292830); font-size: 13px; line-height: 1.8; overflow-wrap: anywhere; }
.card-summary { padding: 0 10px 12px; }
.original-summary-label { display: block; margin-bottom: 3px; color: var(--ui-muted); font-size: 11px; font-weight: 400; }
.photo-card > .card-trip-add.trip-plan-add { position: absolute; top: 4px; right: 4px; z-index: 3; }
@media (max-width: 580px) { .photo-card > .card-trip-add.trip-plan-add { top: 0; right: 0; } }
.card-search-link { display: block; margin-top: 8px; padding: 10px; border: 1px solid #e5c5cc; border-radius: 4px; background: #fffdfa; }
.card-search-link:hover { background: #fff0f3; }
.card-search-link:focus-visible { outline: 3px solid #a83750; outline-offset: 3px; }
</style>

