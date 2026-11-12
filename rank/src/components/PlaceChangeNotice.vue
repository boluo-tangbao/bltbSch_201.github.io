<script setup lang="ts">
import type { PlaceEntry } from '../types'
defineProps<{ notice: NonNullable<PlaceEntry['changeNotice']>; compact?: boolean; detail?: boolean; visitedAt?: string | null; hasDirectory?: boolean }>()
defineEmits<{ directory: [] }>()
</script>

<template>
  <aside class="place-change-notice" :class="{ 'is-compact': compact, 'is-context': detail }" :aria-label="detail ? '这份评价的背景' : '评价变化提醒'">
    <strong>{{ detail ? '这份评价的背景' : notice.title }}</strong>
    <template v-if="!compact">
      <span v-if="detail" class="review-context-date"><template v-if="visitedAt">原体验记录于 <time :datetime="visitedAt">{{ visitedAt }}</time>。</template><template v-else>原体验的到访日期未记录。</template></span>
      <span>{{ notice.summary }}</span>
      <p v-if="detail && notice.ratingNote" class="review-rating-note"><b>当前暂定评价</b><span>{{ notice.ratingNote }}</span></p>
      <button v-if="detail && hasDirectory" type="button" class="review-directory-link" @click="$emit('directory')">查看当前店单 ↓</button>
    </template>
  </aside>
</template>

<style scoped>
.place-change-notice { margin: 10px 0; padding: 10px 12px; border-left: 3px solid var(--ui-accent); border-radius: var(--ui-radius-control, 8px); background: var(--ui-accent-soft); color: var(--ui-ink); font-size: 12px; line-height: 1.8; overflow-wrap: anywhere; }
.place-change-notice strong { display: block; color: var(--ui-accent); }
.place-change-notice span { display: block; }
.place-change-notice.is-compact { margin: 4px 0 0; padding: 4px 6px; font-size: 11px; line-height: 1.5; }
.review-rating-note { margin: 8px 0 0; padding-top: 8px; border-top: 1px solid var(--ui-border); }
.review-rating-note b { font-weight: 600; }
.review-context-date { margin: 4px 0; }
.review-directory-link { display: inline-flex; align-items: center; min-height: 44px; padding: 4px 0; border: 0; background: transparent; color: var(--ui-accent); font: inherit; font-weight: 600; text-decoration: underline; text-underline-offset: 4px; cursor: pointer; }
.review-directory-link:focus-visible { outline: 2px solid var(--ui-accent); outline-offset: 3px; }
</style>
