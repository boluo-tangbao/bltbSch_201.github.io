import { onBeforeUnmount, onMounted, readonly, ref } from 'vue'
import { shopCalendarDate } from './shopDirectory'

const today = ref(shopCalendarDate())
let users = 0
let timer: ReturnType<typeof setInterval> | undefined
function refresh() { today.value = shopCalendarDate() }

export function useShopToday() {
  onMounted(() => {
    refresh()
    if (++users !== 1) return
    timer = setInterval(refresh, 60_000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
  })
  onBeforeUnmount(() => {
    if (--users !== 0) return
    clearInterval(timer)
    window.removeEventListener('focus', refresh)
    document.removeEventListener('visibilitychange', refresh)
  })
  return readonly(today)
}
