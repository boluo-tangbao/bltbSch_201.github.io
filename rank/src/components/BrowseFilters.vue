<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import CityLegend from './CityLegend.vue'
import TagLegend from './TagLegend.vue'

defineProps<{ cities: string[]; colors: Record<string, string>; tags: string[]; city: string; tag: string; query: string }>()
const emit = defineEmits<{ city: [value: string]; tag: [value: string]; query: [value: string] }>()
const media = window.matchMedia('(max-width: 580px)')
const expanded = ref(!media.matches)
function resize() { expanded.value = !media.matches }
function selectTag(tag: string) {
  emit('tag', tag)
  if (media.matches) expanded.value = false
}
function toggle(event: Event) { expanded.value = (event.target as HTMLDetailsElement).open }
media.addEventListener('change', resize)
onBeforeUnmount(() => media.removeEventListener('change', resize))
</script>

<template>
  <div class="browse-filters">
    <div class="browse-city-legend"><CityLegend :cities="cities" :colors="colors" :active="city" @select="emit('city', $event)" /></div>
    <details v-if="tags.length" class="browse-tags" :open="expanded" @toggle="toggle">
      <summary>标签筛选 <small>{{ tags.length }}</small><span v-if="tag" class="browse-tag-selected">已选 1 项</span></summary>
      <TagLegend :tags="tags" :active="tag" @select="selectTag" />
    </details>
    <div v-if="city || tag || query.trim()" class="active-filters" aria-label="已选筛选条件">
      <button v-if="city" type="button" :aria-label="`移除城市：${city}`" @click="emit('city', '')">{{ city }} <span aria-hidden="true">×</span></button>
      <button v-if="tag" type="button" :aria-label="`移除标签：${tag}`" @click="emit('tag', '')"># {{ tag }} <span aria-hidden="true">×</span></button>
      <button v-if="query.trim()" type="button" :aria-label="`移除关键词：${query.trim()}`" @click="emit('query', '')">{{ query.trim() }} <span aria-hidden="true">×</span></button>
    </div>
  </div>
</template>

<style scoped>
.browse-tags > summary { display: none; }
.active-filters { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 14px; }
.active-filters button { display: inline-flex; align-items: center; gap: 9px; max-width: 100%; min-height: 36px; padding: 5px 10px; border: 1px solid #d9a9b5; border-radius: 4px; background: #fff0f2; color: #84394e; font-size: 12px; overflow-wrap: anywhere; text-align: left; }
.active-filters button span { flex: none; font-size: 18px; }
@media (max-width: 580px) {
  .browse-city-legend { display: none; }
  .browse-tags { margin: 8px 0; border-bottom: 1px dashed #dfb8c3; }
  .browse-tags > summary { display: list-item; min-height: 44px; padding: 10px 0; color: var(--manga-ink, #292932); font-size: 13px; font-weight: 700; cursor: pointer; }
  .browse-tags > summary small { margin-left: 6px; font-size: 11px; color: #876773; font-weight: 400; }
  .browse-tag-selected { margin-left: 12px; color: #a83750; font-size: 11px; }
  .browse-tags :deep(.tag-filter) { padding: 8px 0 12px; margin: 0; gap: 6px; }
  .browse-tags :deep(.tag-filter-title) { display: none; }
  .browse-tags :deep(.tag-filter button) { min-height: 40px; padding: 5px 10px; font-size: 12px; }
  .active-filters { margin-bottom: 10px; }
  .active-filters button { min-height: 40px; }
}
</style>
