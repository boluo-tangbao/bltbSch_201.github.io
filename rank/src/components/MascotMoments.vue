<script setup lang="ts">
import { computed, ref } from 'vue'
import { mascotById } from '../data/mascots'

const props = defineProps<{ ids: string[]; label?: string }>()
const base = import.meta.env.BASE_URL
const characters = computed(() => props.ids.map(id => mascotById[id]).filter(Boolean))
const activeId = ref<string | null>(null)
const active = computed(() => activeId.value ? mascotById[activeId.value] : null)

function onBlur(event: FocusEvent) {
  if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) activeId.value = null
}
</script>

<template>
  <div class="mascot-moments" :aria-label="label || '像素角色'" @mouseleave="activeId = null" @focusout="onBlur" @keydown.esc="activeId = null">
    <div class="mascot-moments-line">
      <button v-for="character in characters" :key="character.id" type="button" class="mascot-moment"
        :aria-label="`${character.name}。${character.description}${character.debut}`"
        :aria-expanded="activeId === character.id"
        @mouseenter="activeId = character.id" @focus="activeId = character.id" @click="activeId = character.id">
        <img :src="`${base}images/${character.file}`" :alt="character.name" width="72" height="72" loading="lazy" />
      </button>
    </div>
    <div v-if="active" class="mascot-bio" role="status">
      <strong>{{ active.name }}</strong>
      <p>{{ active.description }}</p>
      <small>{{ active.debut }}</small>
    </div>
  </div>
</template>
