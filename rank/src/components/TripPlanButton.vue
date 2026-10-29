<script setup lang="ts">
import { computed } from 'vue'
import { useTripPlan } from '../utils/useTripPlan'
const props = defineProps<{ placeId: string; name: string; shopName?: string }>()
const plan = useTripPlan()
const entry = computed(() => ({ placeId: props.placeId, ...(props.shopName ? { shopName: props.shopName } : {}) }))
</script>

<template>
  <button type="button" class="trip-plan-add" :aria-pressed="plan.contains(entry)" :aria-label="`${plan.contains(entry) ? '从本次清单移除' : '加入本次清单'}：${name}`" @click="plan.toggle(entry)">{{ plan.contains(entry) ? '✓ 已加入清单' : '＋ 加入本次清单' }}</button>
</template>

<style scoped>
.trip-plan-add { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; max-width: 100%; padding: 6px 10px; border: 1px solid #d8bdc5; border-radius: 4px; background: #fffaf1; color: #84394e; font: inherit; font-size: 12px; line-height: 1.6; cursor: pointer; }
.trip-plan-add[aria-pressed=true] { background: #ffe5ec; border-color: #a83750; }
</style>
