<script setup lang="ts">
import { computed } from 'vue'
import { searchHighlights } from '../utils/search'
import type { PlaceSearchMatch } from '../utils/search'

const props = defineProps<{ match: PlaceSearchMatch }>()
const highlights = computed(() => searchHighlights(props.match))
</script>

<template>
  <span class="search-match">
    <span class="search-match-label">{{ match.target?.kind === 'shop' ? '匹配店铺' : match.label }}：</span>
    <span class="search-match-text"><template v-for="(part, index) in highlights" :key="index"><mark v-if="part.hit">{{ part.text }}</mark><span v-else>{{ part.text }}</span></template></span>
    <span v-if="match.location" class="search-match-location">位于 {{ match.location }}</span>
  </span>
</template>

<style scoped>
.search-match { display: block; min-width: 0; color: #534a52; font-size: 12px; font-weight: 400; line-height: 1.7; overflow-wrap: anywhere; }
.search-match-label { color: #84394e; font-weight: 700; }
.search-match-location { display: block; margin-top: 4px; color: #79626b; }
mark { padding: 0 1px; background: #ffe5a3; color: #532b36; border-radius: 2px; }
</style>
