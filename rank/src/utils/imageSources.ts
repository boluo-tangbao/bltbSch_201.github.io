export type Preview = { tiny?: string; small: string; large: string; display?: string; playback?: string }

export const compactCardSizes = '(max-width: 580px) calc((100vw - 102px) / 3), (max-width: 800px) 130px, 160px'
export const comfortableCardSizes = '(max-width: 580px) calc((100vw - 72px) / 2), (max-width: 1000px) 300px, 280px'
export const boardViewKey = 'tangbao-rank-view-v1'
export const storedFiltersKey = 'tangbao-rank-filters-v1'

export function imageUrl(base: string, path: string) {
  return base + path.split('/').map(encodeURIComponent).join('/')
}

export function previewSources(base: string, path: string, preview?: Preview) {
  const src = imageUrl(base, preview?.small || path)
  const tiny = preview?.tiny ? `${imageUrl(base, preview.tiny)} 160w, ` : ''
  const srcset = preview ? `${tiny}${src} 320w, ${imageUrl(base, preview.large)} 640w` : undefined
  return { src, srcset }
}
