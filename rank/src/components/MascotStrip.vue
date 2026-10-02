<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

const base = import.meta.env.BASE_URL
const featured = [
  { name: '初音未来', file: 'pixel-miku-profile.webp' },
  { name: 'DeepSeek 娘', file: 'pixel-deepseek-profile.webp' },
  { name: '黑川茜', file: 'pixel-akane-profile.webp' },
  { name: '霞之丘诗羽', file: 'pixel-utaha-profile.webp' },
  { name: '由比滨结衣', file: 'pixel-yui-profile.webp' },
]

// 两组按用户给出的顺序交叉：奇数位在 A 组，偶数位在 B 组。
const groupA = [
  { name: '川岛亚美', file: 'pixel-ami-profile.webp' },
  { name: '诗乃', file: 'pixel-sinon-profile.webp' },
  { name: '小野寺小咲', file: 'pixel-onodera-profile.webp' },
  { name: '黄前久美子', file: 'pixel-kumiko-profile.webp' },
  { name: '艾米莉亚', file: 'pixel-emilia-profile.webp' },
  { name: '一之濑帆波', file: 'pixel-ichinose-profile.webp' },
  { name: '赫斯缇雅', file: 'pixel-hestia-profile.webp' },
  { name: '宝多六花', file: 'pixel-rikka-profile.webp' },
  { name: '雷赛', file: 'pixel-reze-profile.webp' },
  { name: '若叶睦', file: 'pixel-mutsumi-profile.webp' },
]
const groupB = [
  { name: '食蜂操祈', file: 'pixel-misaki-profile.webp' },
  { name: '远坂凛', file: 'pixel-rin-profile.webp' },
  { name: '艾斯德斯', file: 'pixel-esdeath-profile.webp' },
  { name: '阿库娅', file: 'pixel-aqua-profile.webp' },
  { name: '山田妖精', file: 'pixel-elf-profile.webp' },
  { name: '莫德雷德', file: 'pixel-mordred-profile.webp' },
  { name: '02', file: 'pixel-zero-two-profile.webp' },
  { name: '艾莉丝', file: 'pixel-eris-profile.webp' },
  { name: '喜多川海梦', file: 'pixel-marin-profile.webp' },
  { name: '潮留美海', file: 'pixel-miuna-profile.webp' },
]
const characters = [...featured, ...groupA.flatMap((character, index) => [character, groupB[index]])]
const windowElement = ref<HTMLElement>()
const atStart = ref(true)
const atEnd = ref(false)

function syncButtons() {
  const element = windowElement.value
  if (!element) return
  atStart.value = element.scrollLeft < 2
  atEnd.value = element.scrollLeft + element.clientWidth >= element.scrollWidth - 2
}

function scrollCharacters(direction: -1 | 1) {
  const element = windowElement.value
  if (!element) return
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  element.scrollBy({ left: direction * element.clientWidth * .8, behavior: reducedMotion ? 'auto' : 'smooth' })
}

onMounted(() => {
  nextTick(syncButtons)
  window.addEventListener('resize', syncButtons)
})
onBeforeUnmount(() => window.removeEventListener('resize', syncButtons))
</script>

<template>
  <div class="mascot-strip" role="group" aria-label="像素角色">
    <button class="mascot-scroll" type="button" aria-label="向前浏览像素角色" :disabled="atStart" @click="scrollCharacters(-1)">‹</button>
    <div ref="windowElement" class="mascot-window" role="region" aria-label="像素角色，可横向滚动" tabindex="0" @scroll="syncButtons">
      <div class="mascot-track">
        <img v-for="character in characters" :key="character.file" class="pixel-mascot" :src="`${base}images/${character.file}`" :alt="character.name" :title="character.name" width="84" height="84" loading="lazy" />
      </div>
    </div>
    <button class="mascot-scroll" type="button" aria-label="向后浏览像素角色" :disabled="atEnd" @click="scrollCharacters(1)">›</button>
  </div>
</template>
