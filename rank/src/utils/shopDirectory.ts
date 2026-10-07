import type { DirectoryShop, ShopSource } from '../types/index.ts'

export function shopDisplayStatus(shop: DirectoryShop): 'open' | 'evidence' | 'closed' {
  if (shop.status === 'closed') return 'closed'
  return shop.accounts?.length ? 'open' : 'evidence'
}

export function latestSourceDate(sources: ShopSource[]): string | undefined {
  return sources.flatMap(source => source.date ? [source.date] : []).sort().at(-1)
}

export function sourcePredatesVisit(sources: ShopSource[], visitedAt?: string | null): boolean {
  if (!visitedAt) return false
  // Account profiles have no publication date. Undated posts cannot be ordered against a visit.
  if (sources.some(source => !source.date && !/^https:\/\/(?:www\.)?(?:xiaohongshu\.com\/user\/profile\/|douyin\.com\/user\/)/.test(source.url))) return false
  const date = latestSourceDate(sources)
  return !!date && date < visitedAt
}
