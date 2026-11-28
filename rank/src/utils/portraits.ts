import portraitData from '../data/portrait-previews.json'
import { imageUrl } from './imageSources'

const portraits = portraitData as Record<string, string>

export function portraitUrl(file: string) {
  return imageUrl(import.meta.env.BASE_URL, portraits[file] || `images/${file}`)
}
