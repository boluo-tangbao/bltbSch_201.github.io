<script setup lang="ts">
const emblemUrl = `${import.meta.env.BASE_URL}brand/pineapple-tangbao-pixel.png`
</script>

<template>
  <span class="brand-mark" aria-hidden="true">
    <span class="brand-signature"><b><span v-for="(letter, index) in 'bltb'" :key="index" class="brand-letter">{{ letter }}</span></b></span>
    <img :src="emblemUrl" alt="" width="128" height="128" decoding="async" />
    <span class="brand-signature brand-signature-bottom"><b><span v-for="fragment in ['sc', 'ho']" :key="fragment" class="brand-fragment"><span v-for="(letter, index) in fragment" :key="index" class="brand-letter">{{ letter }}</span></span></b></span>
  </span>
</template>

<style scoped>
.site-header .brand-mark {
  position: relative;
  display: grid;
  place-items: center;
  width: 60px;
  height: 44px;
  padding-right: 8px;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  transform: none;
}
.brand-mark img {
  display: block;
  width: 44px;
  height: 44px;
  object-fit: contain;
  image-rendering: pixelated;
}
.brand-signature {
  position: absolute;
  z-index: 1;
  top: 0;
  left: 0;
  right: 8px;
  display: block;
  text-align: center;
  font-family: 'Guide Cartoon', 'Comic Sans MS', cursive;
  font-size: 17px;
  line-height: 14px;
  letter-spacing: 0;
  color: #292932;
  text-shadow: -1px -1px 0 #fffaf1, 1px -1px 0 #fffaf1, -1px 1px 0 #fffaf1, 1px 1px 0 #fffaf1;
}
.brand-signature b { display: inline-flex; font-weight: 400; transform: rotate(-6deg); }
.brand-letter { display: inline-block; }
.brand-letter:nth-child(2) { transform: translateY(1px) rotate(8deg); }
.brand-letter:nth-child(3) { transform: translateY(-1px) rotate(-7deg); }
.brand-signature-bottom { top: auto; bottom: -2px; color: #a65264; font-size: 16px; font-style: italic; }
.brand-signature-bottom b { width: 50px; justify-content: space-between; transform: none; }
.brand-fragment { display: inline-flex; transform: rotate(-5deg); }
.brand-fragment + .brand-fragment { transform: translateX(8px) rotate(5deg); }
.brand-fragment .brand-letter:nth-child(2) { transform: translateY(-1px) rotate(-5deg); }
</style>
