import { onBeforeUnmount, ref, watch } from 'vue'
import { filtersFromSearch, urlWithFilters } from './filterLinks'

type SavedFilters = { city?: string; tag?: string; query?: string }
const key = 'tangbao-rank-filters-v1'

function read(): Required<SavedFilters> {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '{}') as SavedFilters
    return { city: typeof value.city === 'string' ? value.city : '', tag: typeof value.tag === 'string' ? value.tag : '', query: typeof value.query === 'string' ? value.query : '' }
  } catch { return { city: '', tag: '', query: '' } }
}

export function useStoredFilters() {
  const fromUrl = filtersFromSearch(location.search)
  const urlMode = ref(fromUrl !== null)
  const saved = fromUrl ?? read(), city = ref(saved.city), tag = ref(saved.tag), query = ref(saved.query)
  watch([city, tag, query], () => {
    const filters = { city: city.value, tag: tag.value, query: query.value }
    try { localStorage.setItem(key, JSON.stringify(filters)) } catch {}
    if (urlMode.value) {
      const href = urlWithFilters(location.href, filters)
      if (href !== location.href) history.replaceState(history.state, '', href)
    }
  }, { immediate: true })
  function restore() {
    const filters = filtersFromSearch(location.search)
    urlMode.value = filters !== null
    const value = filters ?? read()
    city.value = value.city; tag.value = value.tag; query.value = value.query
  }
  window.addEventListener('popstate', restore)
  onBeforeUnmount(() => window.removeEventListener('popstate', restore))
  function linkTo(path: string) {
    if (!urlMode.value) return path
    const url = new URL(urlWithFilters(new URL(path, location.href).href, { city: city.value, tag: tag.value, query: query.value }))
    return `${url.pathname}${url.search}${url.hash}`
  }
  return { city, tag, query, linkTo, reset: () => { city.value = ''; tag.value = ''; query.value = '' } }
}
