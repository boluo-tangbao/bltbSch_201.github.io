import type { Place, ShopDirectory } from '../types/index.ts'
import { parseRichText } from './richText.ts'
import { shopDisplayStatus } from './shopDirectory.ts'

export type SearchTarget = { kind: 'heading' | 'summary' } | { kind: 'paragraph' | 'note'; index: number } | { kind: 'shop'; name: string }
export interface PlaceSearchMatch { label: string; text: string; terms: string[]; target?: SearchTarget }
interface SearchField { label: string; text: string; normalized: string; target: SearchTarget }
export type PlaceSearchIndex = Map<string, SearchField[]>

export function searchTargetId(placeId: string, target: SearchTarget) {
  const suffix = target.kind === 'shop' ? `shop-${encodeURIComponent(target.name)}` : 'index' in target ? `${target.kind}-${target.index}` : target.kind
  return `place-${placeId}-search-${suffix}`
}

export function placeDetailHash(id: string, query = '') {
  return `#/place/${id}${query.trim() ? `?${new URLSearchParams({ find: query.trim() })}` : ''}`
}

export function parsePlaceRoute(hash: string) {
  const match = hash.match(/^#\/place\/([a-z0-9-]+)(?:\?(.*))?$/)
  return match ? { id: match[1]!, query: new URLSearchParams(match[2] ?? '').get('find') ?? '' } : undefined
}

function cleanText(text: string) {
  return text.normalize('NFKC').replace(/\s+/g, ' ').trim()
}
function searchTerms(query: string) {
  return [...new Set(cleanText(query).toLocaleLowerCase().split(' ').filter(Boolean))]
}

export function createPlaceSearchIndex(places: Place[], directories: Record<string, ShopDirectory> = {}): PlaceSearchIndex {
  return new Map(places.filter(place => place.published).map(place => {
    const fields: SearchField[] = []
    const add = (label: string, value: string, target: SearchTarget = { kind: 'heading' }) => {
      const text = cleanText(value)
      if (text) fields.push({ label, text, normalized: text.toLocaleLowerCase(), target })
    }
    add('地点名称', place.name)
    for (const alias of place.aliases ?? []) add('地点别名', alias)
    for (const shop of directories[place.id]?.shops ?? []) {
      if (shopDisplayStatus(shop) !== 'open') continue
      add('店铺一览', shop.name, { kind: 'shop', name: shop.name })
      for (const alias of shop.aliases ?? []) add('店铺一览', `${alias}（${shop.name}）`, { kind: 'shop', name: shop.name })
    }
    add('介绍提及', place.summary, { kind: 'summary' })
    for (const [index, paragraph] of (place.details ?? '').split(/\r?\n+/).map(text => text.trim()).filter(Boolean).entries()) add('介绍提及', parseRichText(paragraph).map(part => part.text).join(''), { kind: 'paragraph', index })
    for (const [index, note] of (place.visitNotes ?? []).entries()) add('探访建议', parseRichText(note).map(part => part.text).join(''), { kind: 'note', index })
    add('城市', place.city)
    for (const tag of place.tags) add('标签', tag)
    return [place.id, fields]
  }))
}

export function matchPlaces(index: PlaceSearchIndex, query: string): Map<string, PlaceSearchMatch> {
  const terms = searchTerms(query)
  const matches = new Map<string, PlaceSearchMatch>()
  if (!terms.length) return matches
  for (const [id, fields] of index) {
    if (!terms.every(term => fields.some(field => field.normalized.includes(term)))) continue
    const field = fields.find(field => terms.some(term => field.normalized.includes(term)))!
    const first = Math.min(...terms.map(term => field.normalized.indexOf(term)).filter(position => position >= 0))
    const start = Math.max(0, first - 18)
    const end = Math.min(field.text.length, start + 100)
    const text = `${start ? '…' : ''}${field.text.slice(start, end)}${end < field.text.length ? '…' : ''}`
    matches.set(id, { label: field.label, text, terms, target: field.target })
  }
  return matches
}

export function searchHighlights(match: PlaceSearchMatch): { text: string; hit: boolean }[] {
  const parts: { text: string; hit: boolean }[] = []
  const lower = match.text.toLocaleLowerCase()
  let cursor = 0
  while (cursor < match.text.length) {
    const next = match.terms.map(term => ({ term, position: lower.indexOf(term, cursor) }))
      .filter(hit => hit.position >= 0).sort((a, b) => a.position - b.position || b.term.length - a.term.length)[0]
    if (!next) { parts.push({ text: match.text.slice(cursor), hit: false }); break }
    if (next.position > cursor) parts.push({ text: match.text.slice(cursor, next.position), hit: false })
    parts.push({ text: match.text.slice(next.position, next.position + next.term.length), hit: true })
    cursor = next.position + next.term.length
  }
  return parts
}
