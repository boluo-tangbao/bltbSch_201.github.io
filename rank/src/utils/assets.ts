import previewData from '../data/media-previews.json'
import originalData from '../data/original-links.json'
import { shopSourceUrl } from './shopSourceUrl'
import { imageUrl, previewSources, type Preview } from './imageSources'

const previews = previewData as Record<string, Preview>
const originals = originalData as Record<string, string>
export const sourceUrl = (url?: string) => url ? shopSourceUrl(url, originals) : undefined

export function originalUrl(path: string) {
  return (import.meta.env.PROD && originals[path]) || assetUrl(path)
}

export function assetUrl(path: string) {
  return imageUrl(import.meta.env.BASE_URL, path)
}

export function previewUrl(path: string) {
  return assetUrl(previews[path]?.small || path)
}

export function previewSrcset(path: string) {
  return previewSources(import.meta.env.BASE_URL, path, previews[path]).srcset
}

export function displayUrl(path: string) {
  return assetUrl(previews[path]?.display || path)
}

export function playbackUrl(path: string) {
  return assetUrl(previews[path]?.playback || path)
}
