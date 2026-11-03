const seenInThisPage = new Map<string, string>()
export const visitNoticeStorageKey = (placeId: string) => `tangbao-visit-notices-v1:${placeId}`

export function hasSeenVisitNotice(placeId: string, signature: string) {
  const key = visitNoticeStorageKey(placeId)
  if (seenInThisPage.get(key) === signature) return true
  try { return localStorage.getItem(key) === signature } catch { return false }
}

export function rememberVisitNotice(placeId: string, signature: string) {
  const key = visitNoticeStorageKey(placeId)
  seenInThisPage.set(key, signature)
  try { localStorage.setItem(key, signature) } catch { /* Keep the acknowledgement in memory when storage is unavailable. */ }
}
