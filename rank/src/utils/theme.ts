import { ref, watch } from 'vue'
import { themePalettes, type Theme } from './themePalette'
import '../themes.css'

const storageKey = 'tangbao-theme-v1'
function savedTheme(): Theme {
  try { return localStorage.getItem(storageKey) === 'night' ? 'night' : 'day' } catch { return 'day' }
}
export const theme = ref<Theme>(savedTheme())
function applyTheme(value: Theme) {
  const palette = themePalettes[value]
  document.documentElement.dataset.theme = value
  document.documentElement.style.colorScheme = value === 'night' ? 'dark' : 'light'
  for (const [name, color] of Object.entries(palette)) document.documentElement.style.setProperty(`--edition-${name.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase())}`, color)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', palette.paper)
}
watch(theme, value => {
  applyTheme(value)
  try { localStorage.setItem(storageKey, value) } catch { /* Storage can be disabled. */ }
}, { flush: 'sync' })
applyTheme(theme.value)
window.addEventListener('storage', event => {
  if (event.key === storageKey || event.key === null) theme.value = event.newValue === 'night' ? 'night' : 'day'
})
