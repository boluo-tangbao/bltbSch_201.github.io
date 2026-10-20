import type { BilibiliCatalog, BilibiliVideo } from '../types/bilibili.ts'

const object = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v)
const text = (v: unknown): v is string => typeof v === 'string' && !!v.trim()
const seconds = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) >= 0
const pageNumber = (v: unknown): v is number => seconds(v) && v > 0
const date = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v
export const validBvid = (v: unknown): v is string => typeof v === 'string' && /^BV[0-9A-Za-z]{10}$/.test(v)

export function bilibiliUrl(bvid: string, page: number, start: number, player = false): string | undefined {
  if (!validBvid(bvid) || !pageNumber(page) || !seconds(start)) return undefined
  const url = new URL(player ? 'https://player.bilibili.com/player.html' : `https://www.bilibili.com/video/${bvid}/`)
  if (player) { url.searchParams.set('bvid', bvid); url.searchParams.set('autoplay', '0') }
  url.searchParams.set('p', String(page))
  url.searchParams.set('t', String(start))
  return url.href
}

export function formatVideoTime(value: number): string {
  return [Math.floor(value / 60), value % 60].map(n => String(n).padStart(2, '0')).join(':')
}

export function videoErrors(v: unknown): string[] {
  if (!object(v)) return ['视频配置必须是对象']
  const errors: string[] = []
  if (!text(v.id) || !text(v.title) || !validBvid(v.bvid)) errors.push('视频 ID、真实标题或 BV 号无效')
  if (!date(v.retrievedAt) || !text(v.metadataSource) || !text(v.chapterSource)) errors.push('缺少读取日期或来源')
  if (v.sourceUrl !== `https://www.bilibili.com/video/${v.bvid}/`) errors.push('原视频链接与 BV 号不符')
  if ('cover' in v || 'poster' in v) errors.push('视频配置不能包含封面')
  const pages = new Map<number, number>()
  if (!Array.isArray(v.pages) || !v.pages.length) errors.push('缺少分 P 数据')
  else for (const p of v.pages) {
    if (!object(p) || !pageNumber(p.page) || pages.has(p.page) || !seconds(p.durationSeconds) || !p.durationSeconds || !pageNumber(p.cid) || !text(p.title)) errors.push('分 P 编号、时长或 CID 无效或重复')
    else pages.set(p.page, p.durationSeconds)
  }
  const ids = new Set(), previous = new Map<number, number>()
  if (!['available', 'none', 'unavailable'].includes(v.chapterStatus) || !Array.isArray(v.chapters)) errors.push('章节读取状态无效')
  else {
    if ((v.chapterStatus === 'available') !== (v.chapters.length > 0)) errors.push('章节状态与章节列表不一致')
    for (const c of v.chapters) {
      if (!object(c) || !text(c.id) || ids.has(c.id) || !text(c.title) || !pages.has(c.page) || !seconds(c.startSeconds) || !seconds(c.endSeconds) || c.endSeconds <= c.startSeconds || c.endSeconds > pages.get(c.page)! || c.startSeconds <= (previous.get(c.page) ?? -1)) errors.push('章节 ID、分 P、时间或顺序无效')
      if (object(c)) { ids.add(c.id); previous.set(c.page, c.startSeconds) }
    }
  }
  return errors
}

export function clipErrors(c: unknown, video: BilibiliVideo | undefined): string[] {
  if (!object(c)) return ['片段配置必须是对象']
  const errors: string[] = []
  if (!text(c.id) || !text(c.placeId) || !text(c.videoId) || !text(c.evidence) || !date(c.checkedAt) || !['verified', 'pending'].includes(c.status)) errors.push('片段 ID、状态或定位依据不完整')
  if (!video || videoErrors(video).length) return [...errors, '关联视频配置不可用']
  const part = video.pages.find(p => p.page === c.page)
  if (!part) errors.push('关联分 P 不存在')
  const chapter = video.chapters.find(ch => ch.id === c.chapterId)
  if (c.chapterId !== undefined && (!chapter || chapter.page !== c.page)) errors.push('所属章节不存在或分 P 不符')
  if (c.status === 'verified') {
    if (!seconds(c.startSeconds) || !part || c.startSeconds >= part.durationSeconds) errors.push('片段起始秒数无效')
    if (!['video-frames', 'direct-viewing', 'subtitles', 'transcript'].includes(c.method)) errors.push('缺少明确核查方式')
    if (video.chapterStatus === 'unavailable') errors.push('章节读取失败，不能启用片段')
    // Authored chapter markers can lag behind the actual introduction. Keep the
    // verified lead-in only when the evidence explicitly explains that overlap.
    if (video.chapterStatus === 'available' && (!chapter || c.startSeconds >= chapter.endSeconds || (c.startSeconds < chapter.startSeconds && !text(c.chapterOverlapNote)))) errors.push('片段起点不在所属章节范围内，或缺少保留引入的说明')
    if (video.chapterStatus === 'none' && c.startSeconds !== 0) errors.push('确认无章节的视频应从整段 0 秒开始')
    if (c.reviewUrl !== bilibiliUrl(video.bvid, c.page, c.startSeconds)) errors.push('复查链接与片段时间不符')
  } else if (c.startSeconds !== undefined || c.reviewUrl !== undefined) errors.push('待确认片段不能填写估算时间或带时间复查链接')
  return errors
}

export function validateBilibiliCatalog(value: unknown, placeIds?: string[]): string[] {
  if (!object(value) || !Array.isArray(value.videos) || !Array.isArray(value.clips)) return ['视频目录需要 videos 和 clips 数组']
  const errors: string[] = [], ids = new Set(), bvids = new Set(), clipIds = new Set(), pairs = new Set()
  for (const v of value.videos) {
    errors.push(...videoErrors(v).map(e => `视频 ${v?.id ?? '?'}：${e}`))
    if (ids.has(v?.id) || bvids.has(v?.bvid)) errors.push('视频 ID 或 BV 重复，应复用一份元数据')
    ids.add(v?.id); bvids.add(v?.bvid)
  }
  for (const c of value.clips) {
    errors.push(...clipErrors(c, value.videos.find((v: BilibiliVideo) => v?.id === c?.videoId)).map(e => `片段 ${c?.id ?? '?'}：${e}`))
    const key = `${c?.placeId}:${c?.videoId}:${c?.page}:${c?.startSeconds}`
    if (clipIds.has(c?.id) || pairs.has(key)) errors.push('片段 ID 或商圈片段重复')
    if (placeIds && !placeIds.includes(c?.placeId)) errors.push(`片段 ${c?.id}：商圈稳定 ID 不存在`)
    clipIds.add(c?.id); pairs.add(key)
  }
  return errors
}

export function placeClips(catalog: BilibiliCatalog, placeId: string) {
  return catalog.clips.filter(c => c.placeId === placeId).map(clip => {
    const video = catalog.videos.find(v => v.id === clip.videoId)
    return { clip, video, error: clipErrors(clip, video).join('；') }
  })
}
