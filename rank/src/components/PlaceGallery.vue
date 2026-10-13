<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { Place } from '../types'
import { assetUrl, displayUrl, playbackUrl, previewUrl, previewSrcset } from '../utils/assets'
import GalleryPhoto from './GalleryPhoto.vue'

const props = defineProps<{ images: Place['gallery']; color: string }>()
const activeIndex = ref<number | null>(null)
const closeButton = ref<HTMLButtonElement>()
const lightbox = ref<HTMLElement>()
const zoom = ref(1)
const preloaded = new Set<string>()
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
  if (event.key === 'Escape') { event.preventDefault(); closeGallery(); return }
  if (event.key === 'Tab') {
    const controls = [...(lightbox.value?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], video[controls]') ?? [])].filter(el => el.getClientRects().length)
    const first = controls[0]
    const last = controls.at(-1)
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    return
  }
  if (event.target instanceof HTMLVideoElement) return
  if (event.key === 'ArrowRight') { event.preventDefault(); showRelativeImage(1) }
  if (event.key === 'ArrowLeft') { event.preventDefault(); showRelativeImage(-1) }
}

watch(activeIndex, index => {
  zoom.value = 1
  if (index === null || props.images.length < 2) return
  if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return
  for (const offset of [-1, 1]) {
    const image = props.images[(index + offset + props.images.length) % props.images.length]
    if (image.type === 'video') continue
    const url = displayUrl(image.src)
    if (url === assetUrl(image.src) || preloaded.has(url)) continue
    preloaded.add(url)
    const preload = new Image()
    preload.decoding = 'async'
    preload.fetchPriority = 'low'
    preload.src = url
  }
})

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
  if (activeIndex.value === null || props.images.length < 2) return
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
      <div v-if="currentImage" ref="lightbox" class="place-gallery-lightbox" role="dialog" aria-modal="true" :aria-label="`${currentImage.alt}，第 ${(activeIndex ?? 0) + 1} 个，共 ${images.length} 个`" @click.self="closeGallery">
        <header class="gallery-toolbar">
          <span class="gallery-context">{{ currentImage.group || '现场记录' }}</span>
          <template v-if="currentImage.type !== 'video'">
            <button class="gallery-tool" type="button" aria-label="缩小照片" title="缩小照片" :disabled="zoom <= 1" @click="zoom = Math.max(1, zoom - 0.5)">−</button>
            <button class="gallery-tool" type="button" aria-label="放大照片" title="放大照片" :disabled="zoom >= 4" @click="zoom = Math.min(4, zoom + 0.5)">+</button>
            <button class="gallery-tool" type="button" aria-label="恢复原始大小" title="恢复原始大小" :disabled="zoom === 1" @click="zoom = 1">↺</button>
          </template>
          <button ref="closeButton" class="gallery-tool gallery-close" type="button" aria-label="关闭大图" title="关闭大图" @click="closeGallery">×</button>
        </header>
        <figure class="place-gallery-viewer">
          <div class="gallery-stage">
          <video v-if="currentImage.type === 'video'" :key="currentImage.src" class="place-gallery-lightbox-video" controls autoplay preload="metadata" playsinline :poster="previewUrl(currentImage.src)" :aria-label="currentImage.alt">
            <source :src="playbackUrl(currentImage.src)" type="video/mp4">
            浏览器暂不支持播放此视频。
          </video>
          <GalleryPhoto v-else :key="currentImage.src" v-model:zoom="zoom" :src="currentImage.src" :alt="currentImage.alt" @navigate="showRelativeImage" />
          </div>
          <figcaption><span>{{ currentImage.alt }}</span><a :href="assetUrl(currentImage.src)" target="_blank" rel="noopener noreferrer">{{ currentImage.type === 'video' ? '打开原视频' : '打开原图' }} ↗</a><a v-if="currentImage.sourceUrl" :href="currentImage.sourceUrl" target="_blank" rel="noopener noreferrer">来源：{{ currentImage.sourceName || '原始页面' }} ↗</a><span v-else-if="currentImage.sourceName">来源：{{ currentImage.sourceName }}</span></figcaption>
        </figure>
        <nav class="gallery-pagination" aria-label="图集翻页">
          <button class="gallery-tool" type="button" aria-label="上一个素材" title="上一个素材" :disabled="images.length < 2" @click="showRelativeImage(-1)">‹</button>
          <span class="gallery-position" role="status" aria-live="polite" aria-atomic="true">{{ (activeIndex ?? 0) + 1 }} / {{ images.length }}</span>
          <button class="gallery-tool" type="button" aria-label="下一个素材" title="下一个素材" :disabled="images.length < 2" @click="showRelativeImage(1)">›</button>
        </nav>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.place-gallery-lightbox { display: flex; flex-direction: column; gap: 12px; height: 100dvh; overscroll-behavior: contain; padding: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left)); }
.gallery-toolbar { display: flex; align-items: center; gap: 4px; width: 100%; flex: none; color: #f0f2ed; }
.gallery-context { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
.gallery-tool { display: grid; place-items: center; flex: none; width: 44px; height: 44px; padding: 0; border: 1px solid #ffffff35; border-radius: 4px; background: #ffffff12; color: #fff; font-size: 26px; line-height: 1; }
.gallery-tool:hover:not(:disabled) { background: #ffffff25; }
.gallery-tool:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.gallery-close { margin-left: 4px; }
.place-gallery-viewer { flex: 1; min-height: 0; width: 100%; max-width: 1100px; max-height: none; }
.gallery-stage { flex: 1; min-height: 0; width: 100%; }
.gallery-stage .place-gallery-lightbox-video { width: 100%; height: 100%; max-height: 100%; object-fit: contain; }
.place-gallery-viewer figcaption { flex: none; max-height: min(22dvh, 140px); overflow-y: auto; overflow-wrap: anywhere; gap: 8px 16px; }
.place-gallery-viewer figcaption > span:first-child { flex-basis: 100%; }
.gallery-pagination { display: flex; justify-content: center; align-items: center; gap: 20px; flex: none; }
.gallery-position { min-width: 70px; text-align: center; color: #f0f2ed; font-size: 13px; font-variant-numeric: tabular-nums; }
.gallery-pagination .gallery-tool { width: 56px; font-size: 32px; }
@media (max-width: 580px) {
  .place-gallery-lightbox { gap: 8px; }
  .gallery-stage { width: calc(100% + 24px); }
  .place-gallery-viewer figcaption { padding: 0 2px; }
}
</style>
