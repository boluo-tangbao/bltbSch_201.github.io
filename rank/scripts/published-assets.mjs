import { basename } from 'node:path'

export function publishedRankAssets({ places, mediaPreviews, portraitPreviews, characters, originalLinks = {} }) {
  const used = new Set()
  const add = path => { if (path) used.add(path) }
  const media = path => {
    if (!path) return
    const preview = mediaPreviews[path]
    const separateOriginal = originalLinks[path] && preview?.small && preview.large && (preview.display || preview.playback)
    if (!separateOriginal) add(path)
    for (const preview of Object.values(mediaPreviews[path] ?? {})) add(preview)
  }
  for (const place of Object.values(places).flat()) {
    if (!place.published) continue
    media(place.cover)
    media(place.mapSnapshot?.src)
    add(place.mapSnapshot?.src) // Map fallback uses the original URL directly.
    for (const item of place.gallery) { media(item.src); media(item.poster) }
  }
  for (const [file, preview] of Object.entries(portraitPreviews)) {
    add(`images/${file}`)
    add(preview)
  }
  for (const character of characters) { add(character.portrait); add(character.thumbnail) }
  return used
}

export function shouldPublishRankAsset(path, used) {
  const name = basename(path)
  if (name.startsWith('.') || ['desktop.ini', 'thumbs.db'].includes(name.toLowerCase())) return false
  // Only prune managed media families; unrelated public files keep their existing URLs.
  if (/^images\/(?:places\/|previews\/|pixel-[^/]+\.webp$)/.test(path)) return used.has(path)
  return true
}
