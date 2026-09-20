<script setup lang="ts">
defineProps<{ tags: string[]; active: string }>()
const emit = defineEmits<{ select: [tag: string] }>()
</script>

<template>
  <div v-if="tags.length" class="tag-filter" aria-label="标签筛选">
    <span class="tag-filter-title">按标签</span>
    <button type="button" :aria-pressed="!active" @click="emit('select', '')">全部标签</button>
    <button v-for="tag in tags" :key="tag" type="button" :aria-pressed="active === tag" @click="emit('select', active === tag ? '' : tag)"># {{ tag }}</button>
  </div>
</template>
