import { ref, watch, type Ref } from 'vue'

type SavedFilters = { city?: string; tag?: string; query?: string }
const key = 'tangbao-rank-filters-v1'

function read(): Required<SavedFilters> {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '{}') as SavedFilters
    return { city: typeof value.city === 'string' ? value.city : '', tag: typeof value.tag === 'string' ? value.tag : '', query: typeof value.query === 'string' ? value.query : '' }
  } catch { return { city: '', tag: '', query: '' } }
}

export function useStoredFilters(): { city: Ref<string>; tag: Ref<string>; query: Ref<string>; reset: () => void } {
  const saved = read(), city = ref(saved.city), tag = ref(saved.tag), query = ref(saved.query)
  watch([city, tag, query], () => {
    try { localStorage.setItem(key, JSON.stringify({ city: city.value, tag: tag.value, query: query.value })) } catch {}
  })
  return { city, tag, query, reset: () => { city.value = ''; tag.value = ''; query.value = '' } }
}
