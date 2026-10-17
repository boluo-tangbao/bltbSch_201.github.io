export interface BilibiliChapter {
  id: string; title: string; page: number; startSeconds: number; endSeconds: number
}
export interface BilibiliVideo {
  id: string; bvid: string; title: string; sourceUrl: string; retrievedAt: string
  metadataSource: string; chapterSource: string
  chapterStatus: 'available' | 'none' | 'unavailable'
  pages: { page: number; cid: number; title: string; durationSeconds: number }[]
  chapters: BilibiliChapter[]
}
export interface BilibiliClip {
  id: string; placeId: string; videoId: string; chapterId?: string; page: number
  status: 'verified' | 'pending'; startSeconds?: number
  evidence: string; method?: 'video-frames' | 'direct-viewing' | 'subtitles' | 'transcript'
  checkedAt: string; reviewUrl?: string; chapterOverlapNote?: string; evidenceFrames?: number[]
}
export interface BilibiliCatalog { videos: BilibiliVideo[]; clips: BilibiliClip[] }
