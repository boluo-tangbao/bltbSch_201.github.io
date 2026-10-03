<script setup lang="ts">
import { ref } from 'vue'
import type { Place, Update } from '../types'
import { tierLabel, updateItems, updateLabel } from '../utils/model'

const props = defineProps<{ updates: Update[]; places: Place[]; showAllPlaces?: boolean }>()
const guideUrl = `${import.meta.env.BASE_URL}guide/`
const names = new Map(props.places.map(place => [place.id, place.name]))
const expanded = ref<string[]>([])
const visibleItems = (update: Update) => props.showAllPlaces || expanded.value.includes(update.id)
  ? updateItems(update) : updateItems(update).slice(0, 2)
function toggle(id: string) {
  expanded.value = expanded.value.includes(id) ? expanded.value.filter(item => item !== id) : [...expanded.value, id]
}
</script>

<template>
  <div v-if="!updates.length" class="quiet-empty"><span class="timeline-dot"></span><div><h3>还没有更新记录</h3><p>等我逛完，再来唠唠～</p></div></div>
  <ol v-else class="update-list"><li v-for="update in updates" :key="update.id">
    <time :datetime="update.date">{{ update.date }}</time>
    <div class="update-body">
      <div class="update-summary"><span class="update-kind">{{ updateLabel(update) }}</span><strong v-if="updateItems(update).length > 1">{{ updateItems(update).length }} 个地点</strong></div>
      <div class="update-places"><a v-for="item in visibleItems(update)" :key="item.placeId" :href="`${guideUrl}#/place/${item.placeId}`"><span>{{ names.get(item.placeId) }}</span><small v-if="update.type === 'tier-change'">{{ tierLabel(item.fromTier!) }} → {{ tierLabel(item.toTier!) }}</small></a><button v-if="!showAllPlaces && updateItems(update).length > 2" type="button" class="update-more" :aria-expanded="expanded.includes(update.id)" @click="toggle(update.id)">{{ expanded.includes(update.id) ? '收起' : `展开其余 ${updateItems(update).length - 2} 处` }} <span aria-hidden="true">{{ expanded.includes(update.id) ? '−' : '＋' }}</span></button></div>
      <p>{{ update.note }}</p>
    </div>
  </li></ol>
</template>
