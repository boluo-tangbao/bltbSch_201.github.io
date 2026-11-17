<script setup lang="ts">
defineProps<{ name: 'compare' | 'share' | 'export' | 'heart' }>()
</script>

<template>
  <span class="menu-icon-badge" :class="`menu-icon-${name}`" aria-hidden="true"><svg class="menu-tile-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path v-if="name === 'compare'" d="M4 5h6v14H4zM14 5h6v14h-6zM7 9v6M17 9v6" />
    <g v-else-if="name === 'share'"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" /></g>
    <path v-else-if="name === 'export'" d="M12 3v12m-4-4 4 4 4-4M5 16v5h14v-5" />
    <path v-else d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
  </svg></span>
</template>
