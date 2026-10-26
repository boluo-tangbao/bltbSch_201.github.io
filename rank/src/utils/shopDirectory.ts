import type { DirectoryShop, ShopSource } from '../types/index.ts'

export function mergeShopSources(shop: Pick<DirectoryShop, 'sources' | 'kindSources'>) {
  const merged = new Map<string, { url?: string; labels: string[]; dates: string[]; roles: string[] }>()
  for (const [role, sources] of [['营业／位置', shop.sources], ['主营', shop.kindSources ?? []]] as const) {
    for (const source of sources) {
      const key = source.url ?? JSON.stringify([source.label, source.date ?? source.dateLabel])
      const entry = merged.get(key) ?? { url: source.url, labels: [], dates: [], roles: [] }
      if (!entry.labels.includes(source.label)) entry.labels.push(source.label)
      const date = source.dateLabel || source.date
      if (date && !entry.dates.includes(date)) entry.dates.push(date)
      if (!entry.roles.includes(role)) entry.roles.push(role)
      merged.set(key, entry)
    }
  }
  return [...merged.values()]
}

export function shopDisplayStatus(shop: DirectoryShop): 'open' | 'evidence' | 'closed' {
  if (shop.status === 'closed') return 'closed'
  return shop.operatingConfirmation === 'official-listing' || shop.accounts?.length ? 'open' : 'evidence'
}

export function shopDirectoryGroups<T extends DirectoryShop>(shops: T[]) {
  const groups = {
    inactive: [] as T[],
    regular: { open: [] as T[], evidence: [] as T[] },
    limited: { open: [] as T[], evidence: [] as T[] },
  }
  for (const shop of shops) {
    const status = shopDisplayStatus(shop)
    if (status === 'closed') {
      if (shop.inactive) groups.inactive.push(shop)
    } else groups[shop.limited ? 'limited' : 'regular'][status].push(shop)
  }
  return groups
}

export function latestSourceDate(sources: ShopSource[]): string | undefined {
  return sources.flatMap(source => source.date ? [source.date] : []).sort().at(-1)
}

export function pendingShopGroups<T extends DirectoryShop>(shops: T[]) {
  return [
    { key: 'history', title: '有探店攻略历史', shops: shops.filter(shop => shop.pendingReview?.category === 'history') },
    { key: 'verification', title: '待验证', shops: shops.filter(shop => shop.pendingReview?.category !== 'history') },
  ].filter(group => group.shops.length)
}

export function shopHistorySource(shop: DirectoryShop) {
  const review = shop.pendingReview
  if (review?.category !== 'history') return undefined
  const source = shop.sources.find(source => source.url === review.sourceUrl)
  if (!source) return undefined
  return { ...source, time: source.date ?? source.dateLabel?.split(/[；;]/)[0] ?? '原文日期未注明' }
}

export function sourcePredatesVisit(sources: ShopSource[], visitedAt?: string | null): boolean {
  if (!visitedAt) return false
  // Account profiles have no publication date. Undated posts cannot be ordered against a visit.
  if (sources.some(source => !source.date && !/^https:\/\/(?:www\.)?(?:xiaohongshu\.com\/user\/profile\/|douyin\.com\/user\/)/.test(source.url ?? ''))) return false
  const date = latestSourceDate(sources)
  return !!date && date < visitedAt
}
