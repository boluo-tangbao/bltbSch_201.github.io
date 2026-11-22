import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const defaultRoot = fileURLToPath(new URL('../', import.meta.url))
const sharp = createRequire(new URL('../rank/package.json', import.meta.url))('sharp')
export async function prepareShortTrips({ root = defaultRoot } = {}) {
 root = resolve(root)
 const output = resolve(root, 'assets/short-trips')
 const records = JSON.parse(readFileSync(resolve(root, 'content/short-trips/records.json'), 'utf8'))
 const manifest = resolve(output, 'manifest.json')
 const previous = existsSync(manifest) ? JSON.parse(readFileSync(manifest, 'utf8')) : []
 const result = [], ids = new Set(), used = new Set()
 mkdirSync(resolve(output, 'media'), { recursive: true })
 for (const trip of records) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trip.id) || ids.has(trip.id)) throw new Error('小旅行 ID 无效或重复')
  ids.add(trip.id)
  if (!trip.title || !trip.city || !trip.description || !Array.isArray(trip.tags) || !trip.photos?.length) throw new Error('小旅行缺少展示信息')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trip.date) || !Number.isFinite(Date.parse(trip.date)) || new Date(trip.date).toISOString().slice(0, 10) !== trip.date) throw new Error('小旅行日期无效')
  const folder = resolve(root, trip.sourceFolder), sourceRel = relative(resolve(root, 'content/pilgrimage'), folder)
  if (!sourceRel || sourceRel.startsWith('..') || isAbsolute(sourceRel)) throw new Error('小旅行源目录越界')
  const photos = [], names = new Set()
  for (const photo of trip.photos) {
   if (names.has(photo.file) || !/^[^/\\]+\.(jpg|jpeg|png|webp)$/i.test(photo.file) || !photo.caption) throw new Error('小旅行照片信息无效')
   names.add(photo.file)
   if (!Number.isSafeInteger(photo.trimBottom ?? 0) || (photo.trimBottom ?? 0) < 0) throw new Error('照片裁切参数无效')
   const input = resolve(folder, photo.file)
   let media
   if (existsSync(input)) {
    const bytes = readFileSync(input)
    const hash = createHash('sha256').update('short-trip-v1:' + (photo.trimBottom || 0) + ':').update(bytes).digest('hex').slice(0, 20)
    const metadata = await sharp(bytes).metadata()
    const swap = [5, 6, 7, 8].includes(metadata.orientation)
    const width = swap ? metadata.height : metadata.width
    const height = (swap ? metadata.width : metadata.height) - (photo.trimBottom || 0)
    if (height < 1) throw new Error('照片裁切超过画面')
    for (const size of [480, 1600]) {
     const file = resolve(output, 'media', hash + '-' + size + '.webp')
     if (!existsSync(file)) await sharp(bytes).rotate().extract({ left: 0, top: 0, width, height })
      .resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true }).webp({ quality: size === 480 ? 78 : 85 }).toFile(file)
    }
    const full = await sharp(resolve(output, 'media', hash + '-1600.webp')).metadata()
    media = { file: photo.file, preview: 'assets/short-trips/media/' + hash + '-480.webp', src: 'assets/short-trips/media/' + hash + '-1600.webp', width: full.width, height: full.height }
   } else {
    media = previous.find(item => item.id === trip.id)?.photos.find(item => item.file === photo.file)
    if (!media) throw new Error('缺少小旅行源照片和网页副本：' + photo.file)
   }
   for (const path of [media.preview, media.src]) {
    if (!/^assets\/short-trips\/media\/[a-f0-9]{20}-(480|1600)\.webp$/.test(path) || !existsSync(resolve(root, path))) throw new Error('小旅行网页副本缺失或路径无效')
    used.add(path.split('/').at(-1))
   }
   photos.push({ ...media, caption: photo.caption })
  }
  const cover = photos.find(photo => photo.file === trip.cover)
  if (!cover) throw new Error('小旅行封面不在照片清单中')
  result.push({ id: trip.id, title: trip.title, city: trip.city, date: trip.date, description: trip.description, tags: trip.tags, cover: cover.preview, photos })
 }
 result.sort((a, b) => b.date.localeCompare(a.date))
 writeFileSync(manifest, JSON.stringify(result, null, 2) + '\n')
 for (const file of readdirSync(resolve(output, 'media'))) if (/^[a-f0-9]{20}-(480|1600)\.webp$/.test(file) && !used.has(file)) unlinkSync(resolve(output, 'media', file))
 console.log(`小旅行集：${result.length} 份记录、${result.reduce((sum, trip) => sum + trip.photos.length, 0)} 张照片；网页副本可独立构建。`)
 return result
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await prepareShortTrips()
