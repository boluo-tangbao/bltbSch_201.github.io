export type TierId = 'hang' | 'top' | 'above' | 'npc' | 'bad'
export interface GalleryMedia { src: string; alt: string; group?: string; type?: 'image' | 'video'; poster?: string; sourceName?: string; sourceUrl?: string }
export interface ShopAccount {
  platform: 'xiaohongshu' | 'douyin'; name: string; handle?: string; url: string; scope: 'store' | 'brand'
}
export interface ShopSource { label: string; url: string; date?: string; dateLabel?: string }
export interface DirectoryShop {
  name: string; floor?: string; kind?: string
  status: 'recent' | 'listed' | 'older' | 'unverified' | 'closed'
  note: string; sources: ShopSource[]; kindSources?: ShopSource[]; accounts?: ShopAccount[]
}
export interface ShopDirectory { area: string; checkedAt: string; shops: DirectoryShop[] }
export interface PlaceEntry {
  id: string; name: string; tier: TierId; order: number
  summary: string; details: string; visitNotes?: string[]; tags: string[]
  cover: string | null; coverPosition?: [number, number]
  gallery: GalleryMedia[]
  visitedAt: string | null; updatedAt: string; published: boolean
  location?: string | { lat: number; lng: number; coordinateSystem: 'wgs84'; address: string } | null
  mapSnapshot?: { src: string; alt: string; updatedAt: string }
}
export type PlacesByCity = Record<string, PlaceEntry[]>
export interface Place extends PlaceEntry { city: string }
export interface UpdateItem {
  placeId: string; fromTier?: TierId; toTier?: TierId
}
export interface Update {
  id: string; date: string; type: 'added' | 'tier-change' | 'ranking-change' | 'edited'; note: string
  /** Edited updates can distinguish writing, galleries, and map information. */
  category?: 'content' | 'gallery' | 'map'
  /** Legacy single-place form. */
  placeId?: string; fromTier?: TierId; toTier?: TierId
  /** Compact batch form for added/edited/ranking-change updates. */
  placeIds?: string[]
  /** Batch form for rank changes whose transitions may differ. */
  changes?: Array<Required<UpdateItem>>
}
export interface Site {
  title: string; description: string; author: string; updatedAt: string | null
  rankWithinTier: boolean; recentDays: number; criteria: string
  tierDescriptions: Record<TierId, string>
  cityColors?: Record<string, string>
}
