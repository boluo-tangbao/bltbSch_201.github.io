<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import CityLegend from './CityLegend.vue'
import TagLegend from './TagLegend.vue'

const props = defineProps<{ cities: string[]; colors: Record<string, string>; tags: string[]; city: string; tag: string; query: string }>()
const emit = defineEmits<{ city: [value: string]; tag: [value: string]; query: [value: string] }>()
// 仅调整筛选入口顺序，不修改地点标签或搜索匹配规则。
const preferredTags = ['扭蛋', '同人', '中古', '寄售', '手办模型', 'lolita']
const commonTags = computed(() => preferredTags.filter(tag => props.tags.includes(tag)))
const moreTags = computed(() => props.tags.filter(tag => !commonTags.value.includes(tag)))
const expanded = ref(false)
const moreTagsId = useId()
</script>

<template>
  <div class="browse-filters">
    <div class="browse-city-legend"><CityLegend :cities="cities" :colors="colors" :active="city" @select="emit('city', $event)" /></div>
    <div v-if="tags.length" class="common-tags">
      <TagLegend :tags="commonTags" :active="tag" label="常用标签" @select="emit('tag', $event)">
        <button v-if="moreTags.length" type="button" class="more-tags-toggle" :aria-expanded="expanded" :aria-controls="moreTagsId" @click="expanded = !expanded">
          {{ expanded ? '收起更多标签' : '更多标签' }} <small>{{ moreTags.length }}</small><span aria-hidden="true">{{ expanded ? '−' : '+' }}</span><span v-if="moreTags.includes(tag)" class="browse-tag-selected">已选 # {{ tag }}</span>
        </button>
      </TagLegend>
    </div>
    <div v-if="moreTags.length" v-show="expanded" :id="moreTagsId" class="browse-tags">
      <TagLegend :tags="moreTags" :active="tag" label="其他标签" :show-all="false" @select="emit('tag', $event)" />
    </div>
    <div v-if="city || tag || query.trim()" class="active-filters" aria-label="已选筛选条件">
      <button v-if="city" type="button" :aria-label="`移除城市：${city}`" @click="emit('city', '')">{{ city }} <span aria-hidden="true">×</span></button>
      <button v-if="tag" type="button" :aria-label="`移除标签：${tag}`" @click="emit('tag', '')"># {{ tag }} <span aria-hidden="true">×</span></button>
      <button v-if="query.trim()" type="button" :aria-label="`移除关键词：${query.trim()}`" @click="emit('query', '')">{{ query.trim() }} <span aria-hidden="true">×</span></button>
    </div>
  </div>
</template>

<style scoped>
.common-tags :deep(.tag-filter) { margin: 12px 0 6px; gap: 8px; }
.common-tags :deep(.tag-filter button) { min-height: 40px; padding: 7px 12px; font-size: 13px; }
.common-tags :deep(.more-tags-toggle) { display: inline-flex; align-items: center; flex-wrap: wrap; gap: 6px; max-width: 100%; border-style: dashed; background: #fff7f7; color: #84394e; cursor: pointer; }
.common-tags :deep(.more-tags-toggle small) { font-size: 11px; color: #876773; }
.browse-tags { margin: 8px 0 12px; border-top: 1px dashed #dfb8c3; border-bottom: 1px dashed #dfb8c3; }
.browse-tag-selected { color: #a83750; font-size: 12px; }
.browse-tags :deep(.tag-filter) { padding: 8px 0 12px; margin: 0; gap: 8px; }
.browse-tags :deep(.tag-filter-title) { display: none; }
.browse-tags :deep(.tag-filter button) { min-height: 40px; padding: 7px 12px; font-size: 12px; }
.active-filters { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 14px; }
.active-filters button { display: inline-flex; align-items: center; gap: 9px; max-width: 100%; min-height: 36px; padding: 5px 10px; border: 1px solid #d9a9b5; border-radius: 4px; background: #fff0f2; color: #84394e; font-size: 12px; overflow-wrap: anywhere; text-align: left; }
.active-filters button span { flex: none; font-size: 18px; }
@media (max-width: 580px) {
  .browse-city-legend { display: none; }
  .common-tags :deep(.tag-filter) { gap: 6px; }
  .common-tags :deep(.tag-filter-title) { flex-basis: 100%; }
  .common-tags :deep(.tag-filter button), .browse-tags :deep(.tag-filter button) { min-height: 44px; padding: 7px 10px; font-size: 12px; }
  .active-filters { margin-bottom: 10px; }
  .active-filters button { min-height: 44px; }
}
</style>
