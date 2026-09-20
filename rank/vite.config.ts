import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  base: process.env.SITE_BASE || '/jimmyGu.github.io/rank/',
  build: {
    rolldownOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        guide: fileURLToPath(new URL('./guide/index.html', import.meta.url)),
        qa: fileURLToPath(new URL('./qa/index.html', import.meta.url)),
      },
    },
  },
})
