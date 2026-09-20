export type TierId = 'hang' | 'top' | 'above' | 'npc' | 'bad'
export interface PlaceEntry {
  id: string; name: string; tier: TierId; order: number
  summary: string; details: string; tags: string[]
  cover: string | null; coverPosition?: [number, number]
  gallery: { src: string; alt: string }[]
  visitedAt: string | null; updatedAt: string; published: boolean
  location?: string | { lat: number; lng: number; coordinateSystem: 'wgs84'; address: string } | null
}
export type PlacesByCity = Record<string, PlaceEntry[]>
export interface Place extends PlaceEntry { city: string }
export interface Update {
  id: string; placeId: string; date: string; type: 'added' | 'tier-change' | 'edited'
  fromTier?: TierId; toTier?: TierId; note: string
}
export interface Site {
  title: string; description: string; author: string; updatedAt: string | null
  rankWithinTier: boolean; recentDays: number; criteria: string
  tierDescriptions: Record<TierId, string>
  cityColors?: Record<string, string>
}
