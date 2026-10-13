<script setup lang="ts">
import { computed } from 'vue'
import { searchHighlights, type PlaceSearchMatch } from '../utils/search'
const props = defineProps<{ match: PlaceSearchMatch }>()
const parts = computed(() => searchHighlights(props.match))
</script>

<template>
  <span class="search-match" :title="`${match.label}：${match.text}`">
    <small>{{ match.label }}</small>
    <span class="search-match-text"><template v-for="(part, index) in parts" :key="index"><mark v-if="part.hit">{{ part.text }}</mark><template v-else>{{ part.text }}</template></template></span>
  </span>
</template>

<style scoped>
.search-match { display: block; margin-top: 6px; text-align: left; white-space: normal; overflow-wrap: anywhere; }
.search-match small { display: block; margin-bottom: 3px; font-size: 10px; line-height: 1.4; color: #916370; }
.search-match-text { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; font-size: 12px; font-weight: 400; line-height: 1.6; color: #61545c; }
.search-match mark { background: #ffe3a4; color: #5b3431; font-weight: 700; }
</style>
