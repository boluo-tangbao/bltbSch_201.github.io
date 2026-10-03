import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { resolve, relative, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import sharp from 'sharp'
import ffmpeg from '@ffmpeg-installer/ffmpeg'
import { mascots, pixelMascotById, pixelPortraitVariants } from '../src/data/mascots.ts'

function publicPath(publicRoot, source) {
  const path = resolve(publicRoot, source), rel = relative(publicRoot, path)
  if (rel.startsWith('..') || isAbsolute(rel)) throw new Error(`素材路径越界：${source}`)
  return path
}

export async function prepareCharacters(root, characters = mascots, pixelFiles = [
  ...Object.values(pixelMascotById).map(character => character.file), ...Object.values(pixelPortraitVariants).flat(),
]) {
  const publicRoot = resolve(root, 'public')
  mkdirSync(resolve(publicRoot, 'images/previews'), { recursive: true })
  const portraits = {}
  let originalBytes = 0, previewBytes = 0
  for (const file of new Set(pixelFiles)) {
    const input = readFileSync(publicPath(publicRoot, `images/${file}`))
    const hash = createHash('sha256').update(input).update('pixel-nearlossless-q45-v2').digest('hex').slice(0, 20)
    const small = `images/previews/${hash}-pixel.webp`
    const output = publicPath(publicRoot, small)
    if (!existsSync(output)) await sharp(input).webp({ nearLossless: true, quality: 45, alphaQuality: 100, effort: 6 }).toFile(output)
    // Pixel geometry and transparent edges stay at the original resolution.
    portraits[file] = small
    originalBytes += input.length; previewBytes += statSync(output).size
  }
  const homepageCharacters = []
  for (const { file, ...character } of characters.filter(({ id }) => id !== 'miku' && id !== 'deepseek')) {
    const input = readFileSync(publicPath(publicRoot, `images/${file}`))
    const hash = createHash('sha256').update(input).update('character-thumb-640-q82-v1').digest('hex').slice(0, 20)
    const thumbnail = `images/previews/${hash}-character.webp`
    const output = publicPath(publicRoot, thumbnail)
    if (!existsSync(output)) await sharp(input).resize({ width: 640, withoutEnlargement: true }).webp({ quality: 82, alphaQuality: 100, effort: 4 }).toFile(output)
    homepageCharacters.push({ ...character, portrait: `images/${file}`, thumbnail })
  }
  writeFileSync(resolve(root, 'src/data/portrait-previews.json'), JSON.stringify(portraits, null, 2) + '\n')
  writeFileSync(resolve(publicRoot, 'characters.json'), JSON.stringify(homepageCharacters, null, 2) + '\n')
  console.log(`像素头像：${(originalBytes / 1024).toFixed(0)} KB → ${(previewBytes / 1024).toFixed(0)} KB。`)
  return portraits
}

// Keep previews separate from original media; content hashes invalidate browser caches.
export async function prepareMedia(root) {
  const publicRoot = resolve(root, 'public')
  const output = resolve(publicRoot, 'images/previews')
  mkdirSync(output, { recursive: true })
  const groups = JSON.parse(readFileSync(resolve(root, 'src/data/places.json'), 'utf8'))
  const sources = new Map()
  const videos = new Set()
  for (const place of Object.values(groups).flat()) {
    if (!place.published) continue
    if (place.cover) sources.set(place.cover, place.cover)
    for (const media of place.gallery) {
      sources.set(media.src, media.type === 'video' ? media.poster || media.src : media.src)
      if (media.type === 'video') videos.add(media.src)
    }
  }
  const manifest = {}
  let originalBytes = 0, previewBytes = 0
  for (const [key, source] of sources) {
    const path = publicPath(publicRoot, source)
    const input = readFileSync(path)
    const hash = createHash('sha256').update(input).update('preview-v1').digest('hex').slice(0, 20)
    const small = `images/previews/${hash}-320.webp`
    const large = `images/previews/${hash}-640.webp`
    const display = `images/previews/${hash}-1280.webp`
    let frame
    for (const [width, target] of [[320, small], [640, large], ...(videos.has(key) ? [] : [[1280, display]])]) {
      const destination = resolve(publicRoot, target)
      if (!existsSync(destination)) {
        if (/\.mp4$/i.test(source) && !frame) {
          frame = execFileSync(ffmpeg.path, ['-v', 'error', '-i', path, '-frames:v', '1', '-vf', 'scale=640:-2', '-f', 'image2pipe', '-vcodec', 'png', 'pipe:1'], { maxBuffer: 16 * 1024 * 1024, timeout: 60000, windowsHide: true })
        }
        await sharp(frame || input).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: width === 1280 ? 82 : 72, effort: 4 }).toFile(destination)
      }
    }
    manifest[key] = { small, large, ...(videos.has(key) ? {} : { display }) }
    originalBytes += input.length
    previewBytes += readFileSync(resolve(publicRoot, small)).length
  }
  let originalVideoBytes = 0, playbackBytes = 0
  for (const source of videos) {
    const path = publicPath(publicRoot, source)
    const input = readFileSync(path)
    const hash = createHash('sha256').update(input).update('h264-longedge1280-crf25-faststart-v1').digest('hex').slice(0, 20)
    const playback = `images/previews/${hash}-playback.mp4`
    const destination = publicPath(publicRoot, playback)
    if (!existsSync(destination)) {
      const temporary = publicPath(publicRoot, `images/previews/${hash}-playback.tmp.mp4`)
      try {
        console.log(`生成在线播放视频：${source}`)
        execFileSync(ffmpeg.path, ['-v', 'error', '-y', '-i', path, '-map', '0:v:0', '-map', '0:a:0?',
          '-vf', "scale='min(1280,iw)':'min(1280,ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=30,setsar=1",
          '-c:v', 'libx264', '-preset', 'fast', '-crf', '25', '-maxrate', '1800k', '-bufsize', '3600k', '-threads', '2',
          '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', temporary],
        { timeout: 180000, windowsHide: true })
        renameSync(temporary, destination)
      } finally { if (existsSync(temporary)) unlinkSync(temporary) }
    }
    manifest[source].playback = playback
    originalVideoBytes += input.length; playbackBytes += statSync(destination).size
  }
  writeFileSync(resolve(root, 'src/data/media-previews.json'), JSON.stringify(manifest, null, 2) + '\n')
  console.log(`媒体预览：${sources.size} 个素材，原素材 ${(originalBytes / 1024 / 1024).toFixed(1)} MB → 320px 预览 ${(previewBytes / 1024 / 1024).toFixed(2)} MB。`)
  if (videos.size) console.log(`在线播放视频：${(originalVideoBytes / 1024 / 1024).toFixed(2)} MB → ${(playbackBytes / 1024 / 1024).toFixed(2)} MB。`)
  return manifest
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('../', import.meta.url))
  await prepareCharacters(root)
  await prepareMedia(root)
}
