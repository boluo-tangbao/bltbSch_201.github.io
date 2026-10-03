import previewData from '../data/media-previews.json'
import portraitData from '../data/portrait-previews.json'

const previews = previewData as Record<string, { small: string; large: string; display?: string; playback?: string }>
const portraits = portraitData as Record<string, string>

export function assetUrl(path: string) {
  return `${import.meta.env.BASE_URL}${path.split('/').map(encodeURIComponent).join('/')}`
}

export function previewUrl(path: string) {
  return assetUrl(previews[path]?.small || path)
}

export function previewSrcset(path: string) {
  const preview = previews[path]
  return preview ? `${assetUrl(preview.small)} 320w, ${assetUrl(preview.large)} 640w` : undefined
}

export function displayUrl(path: string) {
  return assetUrl(previews[path]?.display || path)
}

export function playbackUrl(path: string) {
  return assetUrl(previews[path]?.playback || path)
}

export function portraitUrl(file: string) {
  return assetUrl(portraits[file] || `images/${file}`)
}
