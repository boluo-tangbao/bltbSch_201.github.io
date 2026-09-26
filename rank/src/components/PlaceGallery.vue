<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import type { Place } from '../types'
import { assetUrl } from '../utils/assets'

const props = defineProps<{ images: Place['gallery']; color: string }>()
const activeIndex = ref<number | null>(null)

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
  activeIndex.value = index
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', handleKeydown)
}

function closeGallery() {
  activeIndex.value = null
  document.body.style.overflow = ''
  window.removeEventListener('keydown', handleKeydown)
}

function showRelativeImage(offset: number) {
  if (activeIndex.value === null) return
  activeIndex.value = (activeIndex.value + offset + props.images.length) % props.images.length
}

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <section class="place-gallery" :style="{ '--city-color': color }" aria-labelledby="place-gallery-heading">
    <header class="place-gallery-heading">
      <div>
        <p class="section-label">PHOTO ALBUM</p>
        <h2 id="place-gallery-heading">现场图集</h2>
        <p class="place-gallery-intro">按区域整理的逛店记录，点击图片看大图，视频可直接播放</p>
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
            <video v-if="entry.image.type === 'video'" class="place-gallery-inline-video" controls preload="metadata" playsinline :aria-label="entry.image.alt">
              <source :src="assetUrl(entry.image.src)" type="video/mp4">
              浏览器暂不支持播放此视频。
            </video>
            <button v-else class="place-gallery-image-preview" type="button" :aria-label="`查看：${entry.image.alt}`" @click="openGallery(entry.index)">
              <img :src="assetUrl(entry.image.src)" :alt="entry.image.alt" loading="lazy" decoding="async">
              <span class="place-gallery-zoom" aria-hidden="true">↗</span>
            </button>
            <span v-if="entry.image.type === 'video'" class="place-gallery-video-badge" aria-hidden="true">VIDEO</span>
            <span class="place-gallery-item-caption">{{ entry.image.alt }}</span>
            <a v-if="entry.image.sourceUrl" class="place-gallery-source" :href="entry.image.sourceUrl" target="_blank" rel="noopener noreferrer">来源：{{ entry.image.sourceName || '原始页面' }} ↗</a>
          </article>
        </div>
      </section>
    </div>

    <Teleport to="body">
      <div v-if="currentImage" class="place-gallery-lightbox" role="dialog" aria-modal="true" :aria-label="`${currentImage.alt}，第 ${(activeIndex ?? 0) + 1} 个，共 ${images.length} 个`" @click.self="closeGallery">
        <button class="place-gallery-close" type="button" aria-label="关闭大图" @click="closeGallery">×</button>
        <button class="place-gallery-arrow is-previous" type="button" aria-label="上一个素材" @click="showRelativeImage(-1)">‹</button>
        <figure class="place-gallery-viewer">
          <video v-if="currentImage.type === 'video'" class="place-gallery-lightbox-video" controls preload="metadata" playsinline :aria-label="currentImage.alt">
            <source :src="assetUrl(currentImage.src)" type="video/mp4">
            浏览器暂不支持播放此视频。
          </video>
          <img v-else :src="assetUrl(currentImage.src)" :alt="currentImage.alt">
          <figcaption><span>{{ currentImage.alt }}</span><a v-if="currentImage.sourceUrl" :href="currentImage.sourceUrl" target="_blank" rel="noopener noreferrer">来源：{{ currentImage.sourceName || '原始页面' }} ↗</a><small>{{ (activeIndex ?? 0) + 1 }} / {{ images.length }}</small></figcaption>
        </figure>
        <button class="place-gallery-arrow is-next" type="button" aria-label="下一个素材" @click="showRelativeImage(1)">›</button>
      </div>
    </Teleport>
  </section>
</template>
