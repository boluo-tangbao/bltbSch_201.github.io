<script setup lang="ts">
import { computed } from 'vue'
import BrandEmblem from './BrandEmblem.vue'

const props = defineProps<{ active: 'board' | 'guide' | 'qa' | 'updates'; boardUrl?: string; guideUrl?: string }>()
const base = import.meta.env.BASE_URL
const boardHref = computed(() => props.active === 'board' ? '#/' : props.boardUrl || base)
const guideHref = computed(() => props.active === 'guide' ? '#/' : props.guideUrl || `${base}guide/`)
const qaHref = `${base}qa/`
const homeHref = `${base}../`
</script>

<template>
  <header class="site-header">
    <div class="header-inner">
      <a :href="boardHref" class="brand" aria-label="bltb scho · 汤包的逛店手记"><BrandEmblem /><span class="brand-copy">汤包的逛店手记<small>PLACES & PREFERENCES</small></span></a>
      <nav aria-label="主导航">
        <a :href="boardHref" aria-label="图片总榜" :aria-current="active === 'board' ? 'page' : undefined"><span class="header-label">图片</span><span class="header-label">总榜</span></a>
        <a :href="guideHref" aria-label="地图与介绍" :aria-current="active === 'guide' ? 'page' : undefined"><span class="header-label">地图<span class="header-wide-only">与</span></span><span class="header-label">介绍</span></a>
        <a :href="qaHref" aria-label="QA 与建议" :aria-current="active === 'qa' ? 'page' : undefined"><span class="header-label">QA<span class="header-wide-only"> 与</span><span class="header-compact-only">与</span></span><span class="header-label">建议</span></a>
        <div class="header-secondary">
          <a :href="`${base}../activities.html?topic=acg#event-records`">活动记录 <span aria-hidden="true">↗</span></a>
          <a :href="homeHref" class="header-home">个人主页 <span aria-hidden="true">↗</span></a>
        </div>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.header-secondary { display: contents; }
.header-compact-only { display: none; }
.site-header nav .header-home { display: inline-flex; font-size: inherit; }
.site-header nav .header-home span { font-size: inherit; }
@media (max-width: 900px) {
  .site-header .header-inner { min-height: 0; padding: 10px 12px; flex-wrap: nowrap; gap: 12px; }
  .site-header .brand { display: flex; flex: none; justify-content: center; width: auto; min-width: 44px; min-height: 64px; gap: 8px; font-size: 14px; }
  .site-header .brand-copy { white-space: nowrap; }
  .site-header .brand small { display: none; }
  .site-header nav { display: grid; flex: 1; min-width: 0; grid-template-columns: repeat(3, minmax(0, 1fr)) minmax(68px, 1.25fr); width: auto; gap: 3px; overflow: visible; font-size: 14px; }
  .site-header nav > a { flex-direction: column; justify-content: center; gap: 4px; height: 64px; min-height: 64px; padding: 6px; line-height: 1.3; }
  .site-header nav > a[aria-current]::before { display: none; }
  .header-wide-only { display: none; }
  .header-compact-only { display: inline; }
  .site-header .header-secondary { display: grid; grid-template-rows: repeat(2, minmax(0, 1fr)); min-width: 0; height: 64px; border: 1px solid #dcb4be; border-radius: 3px; overflow: hidden; }
  .site-header .header-secondary a { justify-content: center; width: 100%; min-height: 0; height: 100%; padding: 2px 4px; border: 0; border-radius: 0; font-size: 12px; line-height: 1.25; }
  .site-header .header-secondary a + a { border-top: 1px solid #dcb4be; }
  .site-header .header-secondary a:hover { transform: none; }
  .site-header .header-secondary a:focus-visible { outline-offset: -3px; }
}
@media (max-width: 480px) {
  .site-header .brand-copy { display: none; }
}
@media (max-width: 359px) {
  .site-header nav { gap: 2px; font-size: 13px; }
  .site-header nav > a { padding: 4px; }
  .site-header .header-secondary a { padding: 2px; font-size: 11px; }
}
</style>
