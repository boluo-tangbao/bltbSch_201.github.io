<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ text: string; compact?: boolean }>()
// Keep the authored copy intact; only a few decision points receive visual emphasis.
const highlights = new Set(['值不值得专程去', '固定谷店的数量与品类覆盖', '小而有特色', '越愿意重访'])
const emphasis = /(值不值得专程去|固定谷店的数量与品类覆盖|小而有特色|越愿意重访|实际逛店体验|寄售／中古／同人等淘货空间|次级重点|评价补充|规模大、一时热门不直接等于优秀的二次元商圈|任何人必去、常去|很值得去|带着明确目的|顺路可以逛|不太推荐|成本远大于收获)/
const paragraphs = computed(() => props.text.split(/\n+/).filter(Boolean).map(line => line.split(emphasis)))
</script>

<template>
  <div class="ranking-reading-copy" :class="{ 'is-compact': compact }">
    <p v-for="(parts, index) in paragraphs" :key="index"><template v-for="(part, i) in parts" :key="i"><mark v-if="highlights.has(part)">{{ part }}</mark><strong v-else-if="i % 2">{{ part }}</strong><template v-else>{{ part }}</template></template></p>
  </div>
</template>

<style scoped>
.ranking-reading-copy { color: var(--ui-muted); font-size: 14px; line-height: 1.95; overflow-wrap: anywhere; }
.ranking-reading-copy p { margin: 0 0 14px; }
.ranking-reading-copy p:last-child { margin-bottom: 0; }
.ranking-reading-copy strong { color: var(--ui-ink); font-weight: 650; }
.ranking-reading-copy mark { padding: 0 2px; background: linear-gradient(transparent 54%, var(--ui-menu-shadow) 54% 94%, transparent 94%); color: var(--ui-ink); font-weight: 650; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
.ranking-reading-copy.is-compact { font-size: inherit; line-height: inherit; }
</style>
