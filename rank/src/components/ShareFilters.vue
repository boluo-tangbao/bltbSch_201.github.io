<script setup lang="ts">
import { computed } from 'vue'
import type { FilterState } from '../utils/filterLinks'
import { filterShareUrl } from '../utils/filterLinks'
import CopyButton from './CopyButton.vue'
const props = defineProps<FilterState>()
const url = computed(() => filterShareUrl(location.href, props))
</script>

<template>
  <CopyButton :text="url" label="分享筛选" copied-label="链接已复制" variant="share" />
</template>
