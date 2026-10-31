import { onBeforeUnmount, onMounted, readonly, ref } from 'vue'
import type { TripEntry } from './tripPlan'
import { readTripEntries, tripEntryKey } from './tripPlan'

const key = 'tangbao-trip-plan-session-v1'
function read() { try { return readTripEntries(sessionStorage.getItem(key)) } catch { return [] } }
const entries = ref<TripEntry[]>(read())
let users = 0
function restore() {
  const next = read()
  if (JSON.stringify(next) !== JSON.stringify(entries.value)) entries.value = next
}
function replace(next: TripEntry[]) {
  entries.value = next
  try { sessionStorage.setItem(key, JSON.stringify(next)) } catch { /* The current page still supports a temporary plan. */ }
}

export function useTripPlan() {
  onMounted(() => {
    if (++users !== 1) return
    restore()
    window.addEventListener('pageshow', restore)
  })
  onBeforeUnmount(() => { if (--users === 0) window.removeEventListener('pageshow', restore) })
  function contains(entry: TripEntry) { return entries.value.some(item => tripEntryKey(item) === tripEntryKey(entry)) }
  function remove(entry: TripEntry) { replace(entries.value.filter(item => tripEntryKey(item) !== tripEntryKey(entry))) }
  function toggle(entry: TripEntry) { if (contains(entry)) remove(entry); else replace([...entries.value, entry]) }
  function move(entry: TripEntry, offset: number) {
    const next = [...entries.value], index = next.findIndex(item => tripEntryKey(item) === tripEntryKey(entry)), target = index + offset
    if (index < 0 || target < 0 || target >= next.length) return
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item!)
    replace(next)
  }
  return { entries: readonly(entries), contains, toggle, remove, move, replace, clear: () => replace([]) }
}
