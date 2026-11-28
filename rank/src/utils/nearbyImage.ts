import type { ObjectDirective } from 'vue'

const revealers = new WeakMap<Element, () => void>()
let observer: IntersectionObserver | undefined

// Chromium's native lookahead can cover almost the whole compact board.
// Keep one shorter lookahead for board images and let other galleries stay native.
export const vNearbyImage: ObjectDirective<HTMLImageElement, () => void> = {
  mounted(image, { value: reveal }) {
    if (image.hasAttribute('src')) return
    if (!('IntersectionObserver' in window)) {
      reveal()
      return
    }
    observer ??= new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        observer?.unobserve(entry.target)
        revealers.get(entry.target)?.()
        revealers.delete(entry.target)
      }
    }, { rootMargin: '420px 0px' })
    revealers.set(image, reveal)
    observer.observe(image)
  },
  beforeUnmount(image) {
    observer?.unobserve(image)
    revealers.delete(image)
  },
}
