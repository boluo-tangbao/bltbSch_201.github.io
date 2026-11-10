<script setup lang="ts">
import type { PlaceEntry } from '../types'
defineProps<{ notice: NonNullable<PlaceEntry['changeNotice']>; compact?: boolean }>()
</script>

<template>
  <p class="place-change-notice" :class="{ 'is-compact': compact }">
    <strong>{{ notice.title }}</strong><span v-if="!compact">{{ notice.summary }}</span>
  </p>
</template>

<style scoped>
.place-change-notice { margin: 10px 0; padding: 10px 12px; border-left: 3px solid var(--ui-accent); border-radius: var(--ui-radius-control, 8px); background: var(--ui-accent-soft); color: var(--ui-ink); font-size: 12px; line-height: 1.8; overflow-wrap: anywhere; }
.place-change-notice strong { display: block; color: var(--ui-accent); }
.place-change-notice span { display: block; }
.place-change-notice.is-compact { margin: 4px 0 0; padding: 4px 6px; font-size: 11px; line-height: 1.5; }
</style>
