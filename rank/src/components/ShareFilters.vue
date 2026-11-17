<script setup lang="ts">
import { computed } from 'vue'
import type { FilterState } from '../utils/filterLinks'
import { filterShareUrl } from '../utils/filterLinks'
import CopyButton from './CopyButton.vue'
import MenuIcon from './MenuIcon.vue'
const props = defineProps<FilterState & { menuTile?: boolean }>()
const url = computed(() => filterShareUrl(location.href, props))
</script>

<template>
  <CopyButton :text="url" label="分享筛选" copied-label="链接已复制" :caption="menuTile ? 'SHARE' : undefined"><template #icon><MenuIcon v-if="menuTile" name="share" /></template></CopyButton>
</template>
