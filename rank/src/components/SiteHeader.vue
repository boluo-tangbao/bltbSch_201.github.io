<script setup lang="ts">
import BrandEmblem from './BrandEmblem.vue'

const props = defineProps<{ active: 'board' | 'guide' | 'qa' }>()
const base = import.meta.env.BASE_URL
const boardHref = props.active === 'board' ? '#/' : base
const guideHref = props.active === 'guide' ? '#/' : `${base}guide/`
const qaHref = `${base}qa/`
const homeHref = `${base}../`
</script>

<template>
  <header class="site-header">
    <div class="header-inner">
      <a :href="boardHref" class="brand"><BrandEmblem /><span>汤包的逛店手记<small>PLACES & PREFERENCES</small></span></a>
      <nav aria-label="主导航">
        <a :href="boardHref" :aria-current="active === 'board' ? 'page' : undefined">图片总榜</a>
        <a :href="guideHref" :aria-current="active === 'guide' ? 'page' : undefined">地图与介绍</a>
        <a :href="qaHref" :aria-current="active === 'qa' ? 'page' : undefined">QA 与建议</a>
        <a :href="homeHref">个人主页 <span aria-hidden="true">↗</span></a>
      </nav>
    </div>
  </header>
</template>
