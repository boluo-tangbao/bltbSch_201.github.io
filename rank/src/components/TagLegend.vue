<script setup lang="ts">
withDefaults(defineProps<{ tags: string[]; active: string; label?: string; showAll?: boolean }>(), {
  label: '按标签', showAll: true,
})
const emit = defineEmits<{ select: [tag: string] }>()
</script>

<template>
  <div v-if="tags.length || showAll" class="tag-filter" :aria-label="label || '标签筛选'">
    <span v-if="label" class="tag-filter-title">{{ label }}</span>
    <button v-if="showAll" type="button" :aria-pressed="!active" @click="emit('select', '')">全部标签</button>
    <button v-for="tag in tags" :key="tag" type="button" :aria-pressed="active === tag" @click="emit('select', active === tag ? '' : tag)"># {{ tag }}</button>
    <slot />
  </div>
</template>
