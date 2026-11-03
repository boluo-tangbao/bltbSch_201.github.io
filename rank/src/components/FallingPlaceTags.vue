<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import placeData from '../data/places.json'
import type { PlacesByCity } from '../types'
import { filterPlaces, flattenPlaces } from '../utils/model'
import { placeTagBatch, placeTagTier } from '../utils/placeTags'
import { placeDetailHash } from '../utils/search'
import type { TagPhysics } from '../utils/tagPhysics'

type Lane = { left: number; width: number; count: number }
type Layout = { top: number; height: number; lanes: Lane[] }
const places = filterPlaces(flattenPlaces(placeData as PlacesByCity))
const preferenceKey = 'tangbao-place-toys-hidden-v1'
const root = ref<HTMLElement>(), layout = ref<Layout>()
const collapsed = ref(false), reduced = ref(false), batch = ref(0)
const ready = ref([false, false]), resting = ref([false, false])
const tags = computed(() => placeTagBatch(places, layout.value?.lanes.reduce((n, lane) => n + lane.count, 0) || 0, batch.value))
const guideBase = `${import.meta.env.BASE_URL}guide/`
const physics: TagPhysics[] = []
let observer: ResizeObserver | undefined, media: MediaQueryList | undefined
let version = 0, alive = true, geometryKey = ''
type Drag = { id: number; lane: number; element: HTMLElement; x: number; y: number; lastX: number; lastY: number; lastTime: number; time: number; vx: number; vy: number; moved: boolean }
let drag: Drag | undefined
const suppressed = new WeakSet<HTMLElement>()
const laneTags = (side: number) => tags.value.slice(side ? layout.value!.lanes[0]!.count : 0, side ? undefined : layout.value!.lanes[0]!.count)
const stage = (side: number) => root.value?.querySelector<HTMLElement>(`[data-side="${side}"]`)
function cancelDrag() {
  if (!drag) return
  const current = drag; drag = undefined
  suppressed.add(current.element); current.element.classList.remove('is-held')
  if (current.element.hasPointerCapture(current.id)) current.element.releasePointerCapture(current.id)
  physics[current.lane]?.release()
}
function dispose() { cancelDrag(); for (const world of physics) world.dispose(); physics.length = 0 }
async function rebuild() {
  const token = ++version
  dispose(); ready.value = [false, false]; resting.value = [false, false]
  if (collapsed.value || !layout.value || !alive) return
  await nextTick()
  if (token !== version || !alive || !layout.value) return
  if (reduced.value) { ready.value = [true, true]; resting.value = [true, true]; return }
  try {
    await document.fonts.ready
    const { createTagPhysics } = await import('../utils/tagPhysics')
    if (token !== version || !alive || !layout.value) return
    for (let side = 0; side < 2; side++) {
      const surface = stage(side)
      if (!surface) continue
      const shapes = [...surface.querySelectorAll<HTMLElement>('.falling-place-tag')].map(element => ({ element, width: element.offsetWidth, height: element.offsetHeight }))
      physics[side] = createTagPhysics(shapes, surface.clientWidth, surface.clientHeight, () => {
        if (token === version && alive) resting.value[side] = true
      }, { narrow: true })
      ready.value[side] = true
      if (document.hidden) physics[side]!.pause()
    }
  } catch {
    if (token === version && alive) { dispose(); reduced.value = true; ready.value = [true, true]; resting.value = [true, true] }
  }
}
function measureGutters() {
  if (!alive) return
  const main = document.querySelector<HTMLElement>('#app > main.page-shell')
  const header = document.querySelector<HTMLElement>('.site-header')
  if (!main || !header) return
  const bounds = main.getBoundingClientRect(), style = getComputedStyle(main)
  const viewport = document.documentElement.clientWidth
  // Leave 12px to the content border on each side for shadows and focus outlines.
  const free = [bounds.left + parseFloat(style.paddingLeft), viewport - bounds.right + parseFloat(style.paddingRight)]
  const widths = free.map(space => Math.min(248, Math.floor(space - 24)))
  const top = Math.ceil(header.getBoundingClientRect().height) + 52
  const height = Math.floor(innerHeight - top - 112)
  const next = Math.min(...widths) >= 88 && height >= 260 ? {
    top, height,
    lanes: widths.map((width, side) => ({
      width, left: side === 0 ? Math.floor((free[0]! - width) / 2) : viewport - free[1]! + Math.floor((free[1]! - width) / 2),
      count: Math.max(3, Math.min(8, Math.floor(width * height / 16000))),
    })),
  } : undefined
  const key = JSON.stringify(next)
  if (key === geometryKey) return
  geometryKey = key; layout.value = next; void rebuild()
}
function toggle() {
  collapsed.value = !collapsed.value
  try { sessionStorage.setItem(preferenceKey, String(collapsed.value)) } catch { /* Optional preference. */ }
  void rebuild()
}
function replay() { batch.value++; void rebuild() }
function point(event: PointerEvent, side: number) {
  const bounds = stage(side)!.getBoundingClientRect()
  return { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
}
function down(event: PointerEvent, side: number, index: number) {
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || !physics[side] || drag) return
  const element = event.currentTarget as HTMLElement
  suppressed.delete(element); event.preventDefault(); element.setPointerCapture(event.pointerId)
  const p = point(event, side)
  drag = { id: event.pointerId, lane: side, element, x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY, lastTime: event.timeStamp, time: event.timeStamp, vx: 0, vy: 0, moved: false }
  element.classList.add('is-held'); resting.value[side] = false; physics[side]!.grab(index, p.x, p.y)
}
function move(event: PointerEvent) {
  if (!drag || drag.id !== event.pointerId) return
  if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 7) drag.moved = true
  const dt = Math.max(8, event.timeStamp - drag.lastTime)
  drag.vx = (event.clientX - drag.lastX) / dt * 16.67; drag.vy = (event.clientY - drag.lastY) / dt * 16.67
  drag.lastX = event.clientX; drag.lastY = event.clientY; drag.lastTime = event.timeStamp
  const p = point(event, drag.lane); physics[drag.lane]?.move(p.x, p.y)
}
function up(event: PointerEvent) {
  if (!drag || drag.id !== event.pointerId) return
  const current = drag; drag = undefined
  if (current.moved || event.timeStamp - current.time > 350) suppressed.add(current.element)
  current.element.classList.remove('is-held')
  if (current.element.hasPointerCapture(event.pointerId)) current.element.releasePointerCapture(event.pointerId)
  const recent = event.timeStamp - current.lastTime < 100 && current.moved
  physics[current.lane]?.release(recent ? current.vx : 0, recent ? current.vy : 0)
}
function click(event: MouseEvent) {
  const element = event.currentTarget as HTMLElement
  if (event.detail > 0 && suppressed.has(element)) { event.preventDefault(); suppressed.delete(element) }
}
function visibility() { cancelDrag(); for (const world of physics) if (document.hidden) world.pause(); else world.resume() }
function motionPreference() { reduced.value = media?.matches ?? false; void rebuild() }
onMounted(() => {
  try { collapsed.value = sessionStorage.getItem(preferenceKey) === 'true' } catch { /* Optional preference. */ }
  media = matchMedia('(prefers-reduced-motion: reduce)'); reduced.value = media.matches
  media.addEventListener('change', motionPreference)
  observer = new ResizeObserver(measureGutters)
  void nextTick(() => {
    if (!alive) return
    for (const element of document.querySelectorAll('#app > main.page-shell, .site-header')) observer?.observe(element)
    measureGutters()
  })
  window.addEventListener('resize', measureGutters)
  document.addEventListener('visibilitychange', visibility)
})
onBeforeUnmount(() => {
  alive = false; ++version; dispose(); observer?.disconnect()
  media?.removeEventListener('change', motionPreference)
  window.removeEventListener('resize', measureGutters)
  document.removeEventListener('visibilitychange', visibility)
})
</script>

<template>
  <aside v-if="places.length" v-show="layout" ref="root" class="falling-place-toys" aria-label="商圈标签玩具">
    <template v-if="layout">
      <div class="place-toy-toolbar" :style="{ left: `${layout.lanes[1]!.left}px`, width: `${layout.lanes[1]!.width}px`, top: `${layout.top - 44}px` }"><button v-if="!collapsed" type="button" @click="replay">{{ reduced ? '换一批' : '再掉一次' }}</button><button type="button" :aria-expanded="!collapsed" @click="toggle">{{ collapsed ? '展开标签' : '收起' }}</button></div>
      <template v-if="!collapsed">
        <div v-for="(lane, side) in layout.lanes" :key="side" class="place-toy-stage" :class="{ 'is-ready': ready[side], 'is-static': reduced }" :data-side="side" :data-state="ready[side] ? resting[side] ? 'resting' : 'falling' : 'loading'" :style="{ left: `${lane.left}px`, width: `${lane.width}px`, top: `${layout.top}px`, height: `${layout.height}px` }">
          <a v-for="(place, index) in laneTags(side)" :key="place.id" class="falling-place-tag" :href="`${guideBase}${placeDetailHash(place.id)}`" :aria-label="`${place.city} · ${place.name}，${placeTagTier(place).label}，查看介绍`" :title="`${place.city} · ${place.name} · ${placeTagTier(place).label}`" :data-place-id="place.id" :data-tier="place.tier" :style="{ '--tag-color': placeTagTier(place).color }" draggable="false" @pointerdown="down($event, side, index)" @pointermove="move" @pointerup="up" @pointercancel="cancelDrag" @lostpointercapture="cancelDrag" @click="click">{{ place.name }}</a>
        </div>
      </template>
    </template>
  </aside>
</template>

<style scoped>
.falling-place-toys { position: fixed; inset: 0; z-index: 20; pointer-events: none; color: var(--ui-ink); }
.place-toy-toolbar { position: absolute; margin: 0; min-height: 40px; }
.place-toy-toolbar { display: flex; justify-content: center; gap: 10px; pointer-events: auto; }
.place-toy-toolbar button { min-height: 44px; padding: 4px 0; border: 0; background: none; color: var(--ui-muted); font: inherit; font-size: 11px; cursor: pointer; }
.place-toy-toolbar button:hover { color: var(--ui-accent); }
.place-toy-stage { position: absolute; overflow: hidden; overflow: clip; pointer-events: none; }
.falling-place-tag { position: absolute; left: 0; top: 0; display: inline-flex; align-items: center; justify-content: center; width: max-content; max-width: 180px; min-height: 44px; padding: 10px 16px; border: 2px solid color-mix(in srgb, var(--tag-color) 60%, white); border-radius: 999px; background: color-mix(in srgb, var(--tag-color) 28%, white); color: #65515b; box-shadow: inset 0 2px 0 #ffffffa6, 0 3px 5px #49384412; font: 400 15px/1.5 'YouYuan', 'Yuanti SC', 'Hiragino Maru Gothic ProN', 'Guide Cartoon', 'Microsoft YaHei', sans-serif; letter-spacing: .025em; text-align: center; overflow-wrap: anywhere; user-select: none; -webkit-user-select: none; touch-action: none; cursor: grab !important; visibility: hidden; transform-origin: center; pointer-events: auto; }
.is-ready .falling-place-tag { visibility: visible; }
.falling-place-tag.is-held { z-index: 2; cursor: grabbing !important; box-shadow: inset 0 2px 0 #fff9, 0 6px 14px #49384428; }
.falling-place-tag:focus-visible { z-index: 3; outline: 3px solid var(--ui-accent); outline-offset: -5px; }
.is-static { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 12px; padding: 6px; }
.is-static .falling-place-tag { position: static; flex: none; width: 100%; max-width: 180px; font-size: 13px; transform: none !important; touch-action: pan-y; cursor: pointer !important; }
</style>
