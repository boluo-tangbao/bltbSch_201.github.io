import previewData from '../data/media-previews.json'

const previews = previewData as Record<string, { small: string; large: string }>

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
