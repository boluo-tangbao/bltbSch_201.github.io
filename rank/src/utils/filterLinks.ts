export interface FilterState { city: string; tag: string; query: string }
const keys = ['filters', 'city', 'tag', 'q']

export function filtersFromSearch(search: string): FilterState | null {
  const params = new URLSearchParams(search)
  if (!keys.some(key => params.has(key))) return null
  return { city: params.get('city') || '', tag: params.get('tag') || '', query: params.get('q') || '' }
}

export function urlWithFilters(href: string, filters: FilterState): string {
  const url = new URL(href)
  keys.forEach(key => url.searchParams.delete(key))
  url.searchParams.set('filters', '1')
  for (const [key, value] of [['city', filters.city], ['tag', filters.tag], ['q', filters.query.trim()]]) {
    if (value) url.searchParams.set(key, value)
  }
  return url.href
}

export function filterShareUrl(href: string, filters: FilterState): string {
  const url = new URL(href)
  url.search = ''
  url.hash = ''
  return urlWithFilters(url.href, filters)
}
