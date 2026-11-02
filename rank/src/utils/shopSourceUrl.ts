export function shopSourceUrl(url: string, originalLinks: Record<string, string>) {
  try {
    const source = new URL(url)
    const prefix = '/bltbSch_201.github.io/rank/'
    if (source.origin !== 'https://boluo-tangbao.github.io' || !source.pathname.startsWith(prefix)) return url
    const path = decodeURIComponent(source.pathname.slice(prefix.length))
    return originalLinks[path] ?? url
  } catch { return url }
}
