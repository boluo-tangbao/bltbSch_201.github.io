<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { pixelMascotById, pixelPortraitVariants } from '../data/mascots'

const props = defineProps<{ ids: string[]; label?: string; rotateAll?: boolean }>()
const base = import.meta.env.BASE_URL
const characters = computed(() => [...new Set(props.rotateAll ? [...props.ids, ...Object.keys(pixelMascotById)] : props.ids)]
  .map(id => pixelMascotById[id]).filter(Boolean))
const currentIndex = ref(0)
const character = computed(() => characters.value[currentIndex.value] ?? null)
const portraitIndexes = ref<Record<string, number>>({})
const portraitFiles = computed(() => character.value
  ? [...(pixelPortraitVariants[character.value.id] || []), character.value.file] : [])
const portraitIndex = computed(() => character.value ? (portraitIndexes.value[character.value.id] || 0) % portraitFiles.value.length : 0)
const portraitFile = computed(() => portraitFiles.value[portraitIndex.value])
const portraitView = computed(() => portraitIndex.value === 0 ? '侧脸' : '正脸')
const portraitStyle = computed(() => character.value?.frame ? {
  '--art-width': `${character.value.frame.width}%`, '--art-left': `${character.value.frame.left}%`,
  '--art-top': `${character.value.frame.top}%`, '--art-clip': character.value.frame.clip || 'none',
} : {})
const showingBio = ref(false)
const bio = ref<HTMLElement>()
const bioShift = ref(0)

watch([showingBio, character], async ([visible]) => {
  bioShift.value = 0
  if (!visible) return
  await nextTick()
  const bounds = bio.value?.getBoundingClientRect()
  if (!bounds) return
  // Keep the biography on screen even when its avatar sits near a card's edge.
  bioShift.value = Math.max(16 - bounds.left, Math.min(0, window.innerWidth - 16 - bounds.right))
})

function nextCharacter() {
  currentIndex.value = (currentIndex.value + 1) % characters.value.length
  // Every newly selected character starts with the side portrait.
  if (character.value) portraitIndexes.value[character.value.id] = 0
  showingBio.value = true
}

function nextPortrait() {
  if (!character.value || portraitFiles.value.length < 2) return
  portraitIndexes.value[character.value.id] = (portraitIndex.value + 1) % portraitFiles.value.length
}

function onBlur(event: FocusEvent) {
  if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) showingBio.value = false
}
</script>

<template>
  <div class="mascot-moments" :aria-label="label || '像素角色'" @mouseleave="showingBio = false" @focusout="onBlur" @keydown.esc="showingBio = false">
    <div class="mascot-moments-line">
      <button v-if="character" type="button" class="mascot-moment"
        :aria-label="`${character.name}。${character.description}${character.debut}。${characters.length > 1 ? '点击人物换一位角色' : '查看角色介绍'}`"
        :aria-expanded="showingBio"
        @mouseenter="showingBio = true" @focus="showingBio = true" @click="nextCharacter">
        <span class="mascot-portrait" :class="{ 'original-art': character.frame }" :style="portraitStyle"><img :src="`${base}images/${portraitFile}`" :alt="character.name" :data-view="portraitView || undefined" width="72" height="72" loading="lazy" /></span>
      </button>
    </div>
    <span v-if="character" class="sr-only" aria-live="polite" aria-atomic="true">{{ character.name }}，{{ portraitView }}</span>
    <div v-if="showingBio && character" ref="bio" class="mascot-bio" :style="{ translate: `${bioShift}px 0` }">
      <strong>{{ character.name }}</strong>
      <p>{{ character.description }}</p>
      <small>{{ character.debut }}</small>
      <a v-if="character.source" class="mascot-source" :href="character.source.url" target="_blank" rel="noopener noreferrer">{{ character.source.label }} ↗</a>
      <button v-if="portraitFiles.length > 1" type="button" class="mascot-angle" @click="nextPortrait" :aria-label="`${character.name}：切换正脸或侧脸`">换个角度 ⇄</button>
      <small v-if="characters.length > 1" class="mascot-interaction-hint">点击人物换一位</small>
    </div>
  </div>
</template>
