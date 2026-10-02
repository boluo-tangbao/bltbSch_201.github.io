<script setup lang="ts">
const base = import.meta.env.BASE_URL
const characters = [
  { name: '初音未来', file: 'pixel-miku-profile.webp' },
  { name: 'DeepSeek 娘', file: 'pixel-deepseek-profile.webp' },
  { name: '黑川茜', file: 'pixel-akane-profile.webp' },
  { name: '霞之丘诗羽', file: 'pixel-utaha-profile.webp' },
  { name: '由比滨结衣', file: 'pixel-yui-profile.webp' },
]
</script>

<template>
  <div class="mascot-strip" role="group" aria-label="像素角色">
    <img v-for="character in characters" :key="character.file" class="pixel-mascot" :src="`${base}images/${character.file}`" :alt="character.name" width="84" height="84" />
  </div>
</template>
