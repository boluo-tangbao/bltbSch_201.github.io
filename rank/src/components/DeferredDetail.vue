<script setup lang="ts">
import { ref } from 'vue'
import DeferredFeature from './DeferredFeature.vue'
defineOptions({ inheritAttrs: false })
const feature = ref<InstanceType<typeof DeferredFeature>>()
const load = () => import('./PlaceDetail.vue')
function locateSearchMatch() {
  (feature.value?.instance as { locateSearchMatch?: () => void } | undefined)?.locateSearchMatch?.()
}
defineExpose({ locateSearchMatch })
</script>
<template><DeferredFeature ref="feature" inline :loader="load" title="地点介绍" v-bind="$attrs" /></template>
