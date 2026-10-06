<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import type { Place } from '../types'
import { assetUrl, playbackUrl, previewUrl, previewSrcset } from '../utils/assets'
import FullImage from './FullImage.vue'

const props = defineProps<{ images: Place['gallery']; color: string }>()
const activeIndex = ref<number | null>(null)
const closeButton = ref<HTMLButtonElement>()
let previousFocus: HTMLElement | null = null
let previousOverflow = ''

const groups = computed(() => {
  const result: { name: string; id: string; images: { image: Place['gallery'][number]; index: number }[] }[] = []
  const indexes = new Map<string, number>()
  props.images.forEach((image, index) => {
    const name = image.group || '现场记录'
    let groupIndex = indexes.get(name)
    if (groupIndex === undefined) {
      groupIndex = result.length
      indexes.set(name, groupIndex)
      result.push({ name, id: `place-gallery-group-${groupIndex}`, images: [] })
    }
    result[groupIndex].images.push({ image, index })
  })
  return result
})

const currentImage = computed(() => activeIndex.value === null ? null : props.images[activeIndex.value] ?? null)

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') closeGallery()
  if (event.key === 'ArrowRight') showRelativeImage(1)
  if (event.key === 'ArrowLeft') showRelativeImage(-1)
}

function scrollToGroup(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
}

function openGallery(index: number) {
  previousFocus = document.activeElement as HTMLElement | null
  previousOverflow = document.body.style.overflow
  activeIndex.value = index
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', handleKeydown)
  nextTick(() => closeButton.value?.focus())
}

function closeGallery() {
  activeIndex.value = null
  document.body.style.overflow = previousOverflow
  window.removeEventListener('keydown', handleKeydown)
  previousFocus?.focus({ preventScroll: true })
}

function showRelativeImage(offset: number) {
  if (activeIndex.value === null) return
  activeIndex.value = (activeIndex.value + offset + props.images.length) % props.images.length
}

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (activeIndex.value !== null) document.body.style.overflow = previousOverflow
})
</script>

<template>
  <section class="place-gallery" :style="{ '--city-color': color }" aria-labelledby="place-gallery-heading">
    <header class="place-gallery-heading">
      <div>
        <p class="section-label">PHOTO ALBUM</p>
        <h2 id="place-gallery-heading">现场图集</h2>
        <p class="place-gallery-intro">点击照片放大，点击视频封面播放</p>
      </div>
      <span class="place-gallery-count"><strong>{{ images.length }}</strong> 个素材</span>
    </header>

    <nav v-if="groups.length > 1" class="place-gallery-nav" aria-label="图集分组">
      <button v-for="group in groups" :key="group.id" type="button" @click="scrollToGroup(group.id)">{{ group.name }}<small>{{ group.images.length }}</small></button>
    </nav>

    <div class="place-gallery-groups">
      <section v-for="group in groups" :id="group.id" :key="group.id" class="place-gallery-group" :aria-label="group.name">
        <div class="place-gallery-group-heading"><h3>{{ group.name }}</h3><span>{{ group.images.length }} 个素材</span></div>
        <div class="place-gallery-grid">
          <article v-for="entry in group.images" :key="entry.image.src" class="place-gallery-item">
            <button class="place-gallery-image-preview" type="button" :aria-label="`${entry.image.type === 'video' ? '播放' : '查看'}：${entry.image.alt}`" @click="openGallery(entry.index)">
              <img :src="previewUrl(entry.image.src)" :srcset="previewSrcset(entry.image.src)" sizes="(max-width: 580px) 40vw, (max-width: 800px) 160px, 220px" :alt="entry.image.alt" loading="lazy" decoding="async">
              <span v-if="entry.image.type === 'video'" class="place-gallery-play" aria-hidden="true">▶</span>
              <span v-else class="place-gallery-zoom" aria-hidden="true">↗</span>
            </button>
            <span v-if="entry.image.type === 'video'" class="place-gallery-video-badge" aria-hidden="true">VIDEO</span>
            <span class="place-gallery-item-caption">{{ entry.image.alt }}</span>
            <a v-if="entry.image.sourceUrl" class="place-gallery-source" :href="entry.image.sourceUrl" target="_blank" rel="noopener noreferrer">来源：{{ entry.image.sourceName || '原始页面' }} ↗</a>
            <span v-else-if="entry.image.sourceName" class="place-gallery-source">来源：{{ entry.image.sourceName }}</span>
          </article>
        </div>
      </section>
    </div>

    <Teleport to="body">
      <div v-if="currentImage" class="place-gallery-lightbox" role="dialog" aria-modal="true" :aria-label="`${currentImage.alt}，第 ${(activeIndex ?? 0) + 1} 个，共 ${images.length} 个`" @click.self="closeGallery">
        <button ref="closeButton" class="place-gallery-close" type="button" aria-label="关闭大图" @click="closeGallery">×</button>
        <button class="place-gallery-arrow is-previous" type="button" aria-label="上一个素材" @click="showRelativeImage(-1)">‹</button>
        <figure class="place-gallery-viewer">
          <video v-if="currentImage.type === 'video'" :key="currentImage.src" class="place-gallery-lightbox-video" controls autoplay preload="metadata" playsinline :poster="previewUrl(currentImage.src)" :aria-label="currentImage.alt">
            <source :src="playbackUrl(currentImage.src)" type="video/mp4">
            浏览器暂不支持播放此视频。
          </video>
          <FullImage v-else :key="currentImage.src" :src="currentImage.src" :alt="currentImage.alt" />
          <figcaption><span>{{ currentImage.alt }}</span><a :href="assetUrl(currentImage.src)" target="_blank" rel="noopener noreferrer">{{ currentImage.type === 'video' ? '打开原视频' : '打开原图' }} ↗</a><a v-if="currentImage.sourceUrl" :href="currentImage.sourceUrl" target="_blank" rel="noopener noreferrer">来源：{{ currentImage.sourceName || '原始页面' }} ↗</a><span v-else-if="currentImage.sourceName">来源：{{ currentImage.sourceName }}</span><small>{{ (activeIndex ?? 0) + 1 }} / {{ images.length }}</small></figcaption>
        </figure>
        <button class="place-gallery-arrow is-next" type="button" aria-label="下一个素材" @click="showRelativeImage(1)">›</button>
      </div>
    </Teleport>
  </section>
</template>
