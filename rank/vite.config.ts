import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import { createReadStream, existsSync } from 'node:fs'
import { extname, isAbsolute, relative, resolve } from 'node:path'

const rankBase = process.env.SITE_BASE || '/bltbSch_201.github.io/rank/'
const homeBase = rankBase.replace(/rank\/$/, '')
const homeRoot = fileURLToPath(new URL('../', import.meta.url))
const homeFiles = new Set(['index.html', 'sports.html', 'art.html', 'anime.html', 'travel.html', 'style.css', 'script.js'])
const mimeTypes: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml' }

// Vite serves the rank app; also serve the existing personal site at its real URL.
const personalSitePreview = {
  name: 'personal-site-preview',
  apply: 'serve' as const,
  configureServer(server: import('vite').ViteDevServer) {
    server.middlewares.use((request, response, next) => {
      let pathname: string
      try { pathname = decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname) }
      catch { return next() }
      const duplicateHome = `${rankBase}${homeBase.replace(/^\//, '')}`
      if (homeBase !== '/' && pathname === duplicateHome) {
        response.writeHead(302, { Location: homeBase }); response.end(); return
      }
      if (!pathname.startsWith(homeBase) || pathname.startsWith(rankBase)) return next()
      const file = pathname.slice(homeBase.length) || 'index.html'
      if (!homeFiles.has(file) && !/^images\/.+\.(webp|png|jpe?g|svg)$/i.test(file)) return next()
      const target = resolve(homeRoot, file), relativePath = relative(homeRoot, target)
      if (relativePath.startsWith('..') || isAbsolute(relativePath) || !existsSync(target)) return next()
      response.setHeader('Content-Type', mimeTypes[extname(target)] || 'application/octet-stream')
      response.setHeader('Cache-Control', 'no-cache')
      createReadStream(target).on('error', () => response.destroy()).pipe(response)
    })
  },
}

export default defineConfig({
  plugins: [personalSitePreview, vue()],
  base: rankBase,
  build: {
    rolldownOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        guide: fileURLToPath(new URL('./guide/index.html', import.meta.url)),
        qa: fileURLToPath(new URL('./qa/index.html', import.meta.url)),
        updates: fileURLToPath(new URL('./updates/index.html', import.meta.url)),
      },
    },
  },
})
