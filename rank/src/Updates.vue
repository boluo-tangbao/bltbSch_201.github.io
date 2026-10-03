<script setup lang="ts">
import { ref } from 'vue'
import site from './data/site.json'
import placeData from './data/places.json'
import updateData from './data/updates.json'
import type { PlacesByCity, Update } from './types'
import { filterPlaces, flattenPlaces, publicUpdates } from './utils/model'
import SiteHeader from './components/SiteHeader.vue'
import UpdateList from './components/UpdateList.vue'
import VisitCounter from './components/VisitCounter.vue'

const places = flattenPlaces(placeData as PlacesByCity)
const updates = publicUpdates(updateData as Update[], places)
const main = ref<HTMLElement>()
const boardUrl = import.meta.env.BASE_URL
</script>

<template>
  <a href="#updates-main" class="skip-link" @click.prevent="main?.focus()">跳到正文</a>
  <SiteHeader active="updates" />
  <main id="updates-main" ref="main" tabindex="-1" class="page-shell updates-page">
    <div class="updates-heading"><div><h1>全部更新</h1><p>哪里补了图、改了评价，都记在这儿～</p></div><a :href="boardUrl" class="button">← 回图片总榜</a></div>
    <section class="community-panel updates-archive" aria-label="完整更新记录"><p class="updates-total">共 {{ updates.length }} 条 · 新的在前</p><UpdateList :updates="updates" :places="filterPlaces(places)" show-all-places /></section>
  </main>
  <footer class="site-footer"><span>{{ site.author }} · 随逛随更新</span><VisitCounter /></footer>
</template>
