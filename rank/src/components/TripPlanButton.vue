<script setup lang="ts">
import { computed } from 'vue'
import { useTripPlan } from '../utils/useTripPlan'
const props = defineProps<{ placeId: string; name: string; shopName?: string; iconOnly?: boolean; plain?: boolean; alwaysVisible?: boolean }>()
const plan = useTripPlan()
const entry = computed(() => ({ placeId: props.placeId, ...(props.shopName ? { shopName: props.shopName } : {}) }))
const selected = computed(() => plan.contains(entry.value))
</script>

<template>
  <button v-if="alwaysVisible || plan.selecting.value" type="button" class="trip-plan-add" :class="{ 'is-icon-only': iconOnly, 'is-plain': plain }" :aria-pressed="selected" :aria-label="`${selected ? '从想逛清单移除' : '加入想逛清单'}：${name}`" :title="`${selected ? '已加入' : '加入清单'} · ${name}`" @click.stop="plan.toggle(entry)">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" /></svg>
    <span v-if="!iconOnly">{{ selected ? '已加入' : '加入清单' }}</span>
  </button>
</template>

<style scoped>
.trip-plan-add { display: inline-flex; flex: none; align-items: center; justify-content: center; gap: 7px; min-height: 44px; max-width: 100%; padding: 0 16px; border: 1px solid #e5d6da; border-radius: 999px; background: var(--ui-surface, #fffdfa); color: #695a60; font: 600 13px/1.2 system-ui, sans-serif; cursor: pointer; transition: color .18s, background .18s, border-color .18s, box-shadow .18s; }
.trip-plan-add svg { width: 18px; height: 18px; fill: transparent; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; transition: fill .18s; }
.trip-plan-add[aria-pressed=true] { background: var(--ui-accent-soft, #fff0f4); border-color: #dba6b5; color: var(--ui-accent, #a83750); }
.trip-plan-add[aria-pressed=true] svg { fill: currentColor; }
.trip-plan-add.is-icon-only { position: relative; isolation: isolate; width: 44px; height: 44px; padding: 0; border: 0; background: transparent; box-shadow: none; }
.trip-plan-add.is-icon-only::before { content: ''; position: absolute; inset: 6px; z-index: -1; border-radius: 50%; background: #fffdfaf5; box-shadow: 0 1px 5px #26202b20; transition: background .18s; }
.trip-plan-add.is-icon-only svg { width: 15px; height: 15px; }
.trip-plan-add.is-icon-only[aria-pressed=true]::before { background: var(--ui-accent-soft, #fff0f4); }
.trip-plan-add.is-plain::before { background: transparent; box-shadow: none; }
.trip-plan-add.is-plain[aria-pressed=true]::before { background: var(--ui-accent-soft, #fff0f4); }
@media (hover: hover) { .trip-plan-add:hover { color: var(--ui-accent, #a83750); border-color: #c48a9a; background: var(--ui-accent-soft, #fff0f4); box-shadow: 0 2px 8px #a8375014; } }
.trip-plan-add.is-icon-only:hover { background: transparent; box-shadow: none; }
.trip-plan-add.is-icon-only:hover::before { background: var(--ui-accent-soft, #fff0f4); }
.trip-plan-add:focus-visible { outline: 3px solid var(--ui-accent, #a83750); outline-offset: 3px; }
@media (prefers-reduced-motion: reduce) { .trip-plan-add, .trip-plan-add svg { transition: none; } }
</style>
