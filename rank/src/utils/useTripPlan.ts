import { onBeforeUnmount, onMounted, readonly, ref } from 'vue'
import type { TripEntry } from './tripPlan'
import { readTripEntries, tripEntryKey } from './tripPlan'

const key = 'tangbao-trip-plan-session-v1'
function read() {
  try {
    const stored = readTripEntries(sessionStorage.getItem(key))
    const publicEntries = stored.filter(entry => !entry.custom)
    if (publicEntries.length !== stored.length) sessionStorage.setItem(key, JSON.stringify(publicEntries))
    return publicEntries
  } catch { return [] }
}
const entries = ref<TripEntry[]>(read())
const selectionKey = 'tangbao-trip-selecting-session-v1'
function readSelecting(){try{return sessionStorage.getItem(selectionKey)==='true'}catch{return false}}
const selecting = ref(readSelecting())
function setSelecting(value:boolean){selecting.value=value;try{sessionStorage.setItem(selectionKey,String(value))}catch{}}
let users = 0
function restore() {
  selecting.value=readSelecting()
  const next = read()
  if (JSON.stringify(next) !== JSON.stringify(entries.value)) entries.value = next
}
function replace(next: TripEntry[]) {
  entries.value = next
  // Personal addresses and notes stay in memory until the visitor explicitly encrypts a saved trip.
  try { sessionStorage.setItem(key, JSON.stringify(next.filter(entry => !entry.custom))) } catch { /* The current page still supports a temporary plan. */ }
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
  return { entries: readonly(entries), selecting:readonly(selecting),setSelecting, contains, toggle, remove, move, replace, clear: () => replace([]) }
}
