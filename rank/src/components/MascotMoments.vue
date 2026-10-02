<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { mascotById } from '../data/mascots'

const props = defineProps<{ ids: string[]; label?: string }>()
const base = import.meta.env.BASE_URL
const characters = computed(() => props.ids.map(id => mascotById[id]).filter(Boolean))
const currentIndex = ref(0)
const character = computed(() => characters.value[currentIndex.value] ?? null)
const showingBio = ref(false)
const bio = ref<HTMLElement>()
const bioShift = ref(0)

watch(showingBio, async visible => {
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
  showingBio.value = true
}

function onBlur(event: FocusEvent) {
  if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) showingBio.value = false
}
</script>

<template>
  <div class="mascot-moments" :aria-label="label || '像素角色'" @mouseleave="showingBio = false" @focusout="onBlur" @keydown.esc="showingBio = false">
    <div class="mascot-moments-line">
      <button v-if="character" type="button" class="mascot-moment"
        :aria-label="`${character.name}。${character.description}${character.debut}`"
        :aria-expanded="showingBio"
        @mouseenter="showingBio = true" @focus="showingBio = true" @click="showingBio = true">
        <img :src="`${base}images/${character.file}`" :alt="character.name" width="72" height="72" loading="lazy" />
      </button>
    </div>
    <div v-if="showingBio && character" ref="bio" class="mascot-bio" :style="{ translate: `${bioShift}px 0` }">
      <strong>{{ character.name }}</strong>
      <p>{{ character.description }}</p>
      <small>{{ character.debut }}</small>
      <button v-if="characters.length > 1" type="button" class="mascot-next" @click="nextCharacter">换一位 ↻</button>
    </div>
  </div>
</template>
