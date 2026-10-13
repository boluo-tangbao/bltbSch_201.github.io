<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import FullImage from './FullImage.vue'

const props = defineProps<{ src: string; alt: string; zoom: number }>()
const emit = defineEmits<{ 'update:zoom': [value: number]; navigate: [offset: number] }>()
const surface = ref<HTMLElement>()
const scale = ref(props.zoom)
const x = ref(0)
const y = ref(0)
type Point = { x: number; y: number }
const pointers = new Map<number, Point>()
let start: { point: Point; time: number; x: number; y: number; swipe: boolean } | null = null
let pinch: { center: Point; distance: number; scale: number; x: number; y: number } | null = null
let observer: ResizeObserver | undefined

function clampPosition() {
  const root = surface.value
  if (!root) return
  const image = root.querySelector<HTMLImageElement>('.full-image-original')
  const preview = root.querySelector<HTMLImageElement>('.full-image-preview')
  const loaded = image?.naturalWidth ? image : preview
  const ratio = loaded?.naturalWidth ? loaded.naturalWidth / loaded.naturalHeight : root.clientWidth / root.clientHeight
  const width = Math.min(root.clientWidth, root.clientHeight * ratio)
  const height = Math.min(root.clientHeight, root.clientWidth / ratio)
  const limitX = Math.max(0, (width * scale.value - root.clientWidth) / 2)
  const limitY = Math.max(0, (height * scale.value - root.clientHeight) / 2)
  x.value = Math.max(-limitX, Math.min(limitX, x.value))
  y.value = Math.max(-limitY, Math.min(limitY, y.value))
}

function localPoint(point: Point) {
  const box = surface.value!.getBoundingClientRect()
  return { x: point.x - box.x - box.width / 2, y: point.y - box.y - box.height / 2 }
}

function pinchPoints() {
  const [a, b] = [...pointers.values()]
  return { center: localPoint({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }), distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)) }
}

function setScale(value: number) {
  scale.value = Math.max(1, Math.min(4, value))
  clampPosition()
  emit('update:zoom', scale.value)
}

function pointerDown(event: PointerEvent) {
  if ((event.target as HTMLElement).closest('button')) return
  if (event.pointerType === 'mouse' && event.button !== 0) return
  if (pointers.size >= 2) return
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  surface.value?.setPointerCapture(event.pointerId)
  if (pointers.size === 2) {
    pinch = { ...pinchPoints(), scale: scale.value, x: x.value, y: y.value }
    if (start) start.swipe = false
  } else {
    start = { point: { x: event.clientX, y: event.clientY }, time: performance.now(), x: x.value, y: y.value, swipe: scale.value === 1 }
  }
}

function pointerMove(event: PointerEvent) {
  if (!pointers.has(event.pointerId)) return
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  if (pointers.size === 2 && pinch) {
    const current = pinchPoints()
    const next = Math.max(1, Math.min(4, pinch.scale * current.distance / pinch.distance))
    // Keep the point between the two fingers anchored while scaling.
    x.value = current.center.x - (pinch.center.x - pinch.x) * next / pinch.scale
    y.value = current.center.y - (pinch.center.y - pinch.y) * next / pinch.scale
    setScale(next)
  } else if (start && scale.value > 1) {
    x.value = start.x + event.clientX - start.point.x
    y.value = start.y + event.clientY - start.point.y
    clampPosition()
  }
}

function pointerEnd(event: PointerEvent, cancelled = false) {
  if (!pointers.has(event.pointerId)) return
  const dx = start ? event.clientX - start.point.x : 0
  const dy = start ? event.clientY - start.point.y : 0
  const swipe = !cancelled && pointers.size === 1 && start?.swipe && performance.now() - start.time < 800 && Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy) * 1.3
  pointers.delete(event.pointerId)
  pinch = null
  if (pointers.size) {
    start = { point: [...pointers.values()][0], time: performance.now(), x: x.value, y: y.value, swipe: false }
  } else {
    start = null
  }
  if (swipe) emit('navigate', dx < 0 ? 1 : -1)
}

function doubleClick(event: MouseEvent) {
  if (scale.value > 1) {
    x.value = y.value = 0
    setScale(1)
  } else {
    const point = localPoint({ x: event.clientX, y: event.clientY })
    x.value = -point.x
    y.value = -point.y
    setScale(2)
  }
}

watch(() => props.zoom, value => {
  if (value === scale.value) return
  const ratio = value / scale.value
  x.value *= ratio
  y.value *= ratio
  scale.value = value
  clampPosition()
})
onMounted(() => {
  observer = new ResizeObserver(clampPosition)
  if (surface.value) observer.observe(surface.value)
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div ref="surface" class="gallery-photo-surface" :class="{ 'is-zoomed': scale > 1 }" :data-zoom="scale.toFixed(2)" @pointerdown.prevent="pointerDown" @pointermove="pointerMove" @pointerup="pointerEnd($event)" @pointercancel="pointerEnd($event, true)" @lostpointercapture="pointerEnd($event, true)" @dblclick.prevent="doubleClick" @dragstart.prevent @load.capture="clampPosition">
    <div class="gallery-photo-transform" :style="{ transform: `translate(${x}px, ${y}px) scale(${scale})` }">
      <FullImage :src="src" :alt="alt" contained />
    </div>
  </div>
</template>

<style scoped>
.gallery-photo-surface { position: relative; width: 100%; height: 100%; overflow: hidden; touch-action: none; user-select: none; cursor: zoom-in; }
.gallery-photo-surface.is-zoomed { cursor: grab; }
.gallery-photo-surface.is-zoomed:active { cursor: grabbing; }
.gallery-photo-transform { width: 100%; height: 100%; transform-origin: center; }
</style>
