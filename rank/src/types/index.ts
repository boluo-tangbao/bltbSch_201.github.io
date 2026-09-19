export type TierId = 'hang' | 'top' | 'above' | 'npc' | 'bad'
export interface Place {
  id: string; name: string; city: string; tier: TierId; order: number
  summary: string; details: string; pros?: string; cons?: string; tags: string[]
  cover: string | null; coverAlt: string; coverPosition?: [number, number]
  gallery: { src: string; alt: string }[]
  visitedAt: string | null; updatedAt: string; published: boolean; isDemo: boolean
  location?: { lat: number; lng: number; coordinateSystem: 'wgs84'; address: string } | null
  video?: { url: string; title: string; excerpt: string; startSeconds?: number; endSeconds?: number; clip?: string | null } | null
}
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
