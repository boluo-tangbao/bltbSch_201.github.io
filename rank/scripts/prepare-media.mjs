import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, relative, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import sharp from 'sharp'
import ffmpeg from '@ffmpeg-installer/ffmpeg'
import { mascots } from '../src/data/mascots.ts'

// Keep previews separate from original media; content hashes invalidate browser caches.
export async function prepareMedia(root) {
  const publicRoot = resolve(root, 'public')
  // Share biographies with rank pages, but keep the homepage's anime favorites separate.
  const homepageCharacters = mascots.filter(({ id }) => id !== 'miku' && id !== 'deepseek')
  writeFileSync(resolve(publicRoot, 'characters.json'), JSON.stringify(homepageCharacters.map(({ file, ...character }) => ({
    ...character, portrait: `images/${file}`,
  })), null, 2) + '\n')
  const output = resolve(publicRoot, 'images/previews')
  mkdirSync(output, { recursive: true })
  const groups = JSON.parse(readFileSync(resolve(root, 'src/data/places.json'), 'utf8'))
  const sources = new Map()
  for (const place of Object.values(groups).flat()) {
    if (!place.published) continue
    if (place.cover) sources.set(place.cover, place.cover)
    for (const media of place.gallery) sources.set(media.src, media.type === 'video' ? media.poster || media.src : media.src)
  }
  const manifest = {}
  let originalBytes = 0, previewBytes = 0
  for (const [key, source] of sources) {
    const path = resolve(publicRoot, source)
    const rel = relative(publicRoot, path)
    if (rel.startsWith('..') || isAbsolute(rel)) throw new Error(`素材路径越界：${source}`)
    const input = readFileSync(path)
    const hash = createHash('sha256').update(input).update('preview-v1').digest('hex').slice(0, 20)
    const small = `images/previews/${hash}-320.webp`
    const large = `images/previews/${hash}-640.webp`
    let frame
    for (const [width, target] of [[320, small], [640, large]]) {
      const destination = resolve(publicRoot, target)
      if (!existsSync(destination)) {
        if (/\.mp4$/i.test(source) && !frame) {
          frame = execFileSync(ffmpeg.path, ['-v', 'error', '-i', path, '-frames:v', '1', '-vf', 'scale=640:-2', '-f', 'image2pipe', '-vcodec', 'png', 'pipe:1'], { maxBuffer: 16 * 1024 * 1024, timeout: 60000, windowsHide: true })
        }
        await sharp(frame || input).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 72, effort: 4 }).toFile(destination)
      }
    }
    manifest[key] = { small, large }
    originalBytes += input.length
    previewBytes += readFileSync(resolve(publicRoot, small)).length
  }
  writeFileSync(resolve(root, 'src/data/media-previews.json'), JSON.stringify(manifest, null, 2) + '\n')
  console.log(`媒体预览：${sources.size} 个素材，原素材 ${(originalBytes / 1024 / 1024).toFixed(1)} MB → 320px 预览 ${(previewBytes / 1024 / 1024).toFixed(2)} MB。`)
  return manifest
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await prepareMedia(fileURLToPath(new URL('../', import.meta.url)))
}
