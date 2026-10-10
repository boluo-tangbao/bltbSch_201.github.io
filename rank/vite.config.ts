import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import { createReadStream, existsSync, readFileSync } from 'node:fs'
import { extname, isAbsolute, relative, resolve } from 'node:path'

const rankBase = process.env.SITE_BASE || '/bltbSch_201.github.io/rank/'
const homeBase = rankBase.replace(/rank\/$/, '')
const homeRoot = fileURLToPath(new URL('../', import.meta.url))
const homeFiles = new Set(['index.html', 'sports.html', 'art.html', 'anime.html', 'travel.html', 'activities.html'])
const mimeTypes: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.mp4': 'video/mp4' }

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
      if (!homeFiles.has(file) && !/^images\/(?!anime\/events\/).+\.(webp|png|jpe?g|svg)$/i.test(file) && !/^assets\/.+\.(css|js|json|webp|mp4)$/i.test(file)) return next()
      const target = resolve(homeRoot, file), relativePath = relative(homeRoot, target)
      if (relativePath.startsWith('..') || isAbsolute(relativePath) || !existsSync(target)) return next()
      response.setHeader('Content-Type', mimeTypes[extname(target)] || 'application/octet-stream')
      response.setHeader('Cache-Control', 'no-cache')
      createReadStream(target).on('error', () => response.destroy()).pipe(response)
    })
  },
}

// These two portraits are always above the fold: discover them before Vue runs.
const criticalPortraits = {
  name: 'critical-portrait-preload',
  transformIndexHtml(_html: string, context: { filename: string }) {
    const filename = context.filename.replaceAll('\\', '/')
    const file = filename.endsWith('/guide/index.html') ? 'pixel-aqua-profile.webp'
      : filename.endsWith('/qa/index.html') ? 'pixel-deepseek-profile.webp' : null
    const manifest = fileURLToPath(new URL('./src/data/portrait-previews.json', import.meta.url))
    if (!file || !existsSync(manifest)) return []
    const portraits = JSON.parse(readFileSync(manifest, 'utf8')) as Record<string, string>
    return portraits[file] ? [{ tag: 'link', attrs: { rel: 'preload', as: 'image', href: `${rankBase}${portraits[file]}`, fetchpriority: 'high' }, injectTo: 'head' as const }] : []
  },
}

export default defineConfig({
  plugins: [personalSitePreview, criticalPortraits, vue()],
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
