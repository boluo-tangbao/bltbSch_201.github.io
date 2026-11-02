<script setup lang="ts">
import DeferredFeature from './DeferredFeature.vue'
defineOptions({ inheritAttrs: false })
const emit = defineEmits<{ close: [] }>()
const load = () => import('./ExportPanel.vue')
</script>
<template>
  <DeferredFeature :loader="load" title="导出榜单" v-bind="$attrs" @close="emit('close')" />
</template>
