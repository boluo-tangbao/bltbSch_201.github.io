import type { Place, Site, Update } from '../types'
import { assetUrl } from './assets'
import { baiduMapUrl, cityColor, hasCoordinates, placeAddress } from './cities'
import { tiers, tierLabel, updateItems, updateLabel } from './model'

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
}
async function embeddedImage(path: string) {
  const response = await fetch(assetUrl(path), { signal: AbortSignal.timeout(15000) })
  if (!response.ok) throw new Error(`图片加载失败：${path}`)
  const blob = await response.blob()
  if (!blob.type.startsWith('image/')) throw new Error(`图片格式无效：${path}`)
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error(`无法读取图片：${path}`))
    reader.readAsDataURL(blob)
  })
}
export async function exportDocument(site: Site, places: Place[], allPlaces: Place[], updates: Update[], scope: string, updatedAt: string | null) {
  const imagePaths = [...new Set(places.flatMap(p => [...(p.cover ? [p.cover] : []), ...p.gallery.filter(g => g.type !== 'video').map(g => g.src)]))]
  const images = new Map<string, string>()
  for (const path of imagePaths) images.set(path, await embeddedImage(path))
  const e = escapeHtml
  const website = new URL(import.meta.env.BASE_URL, location.origin).href
  const paragraph = (label: string, text?: string) => text ? `<h4>${e(label)}</h4><p class="prose">${e(text)}</p>` : ''
  const legend = [...new Set(places.map(p => p.city))].map(city => `<span><i style="background:${cityColor(city, site.cityColors)}"></i>${e(city)}</span>`).join('')
  const content = tiers.map(t => `<section><h2 style="background:${t.color}">${t.label}</h2>${places.filter(p => p.tier === t.id).map(p => {
    const rank = allPlaces.filter(x => x.tier === p.tier).findIndex(x => x.id === p.id) + 1
    return `<article style="border-color:${cityColor(p.city, site.cityColors)}"><p>${e(p.city)}${site.rankWithinTier ? ` · 档内第 ${rank} 名` : ''}</p><h3>${e(p.name)}</h3>${p.cover ? `<img src="${images.get(p.cover)}" alt="${e(p.city + ' · ' + p.name)}">` : '<p>暂无图片</p>'}<p class="prose">${e(p.summary)}</p><p>到访：${e(p.visitedAt || '未记录')} · 内容更新：${e(p.updatedAt)}</p>${p.tags.length ? `<p>标签：${p.tags.map(e).join(' / ')}</p>` : ''}${paragraph('详细评价', p.details)}${p.gallery.map(g => g.type === 'video' ? `<figure><video controls preload="metadata" aria-label="${e(g.alt)}"><source src="${e(new URL(assetUrl(g.src), location.origin).href)}" type="video/mp4"></video><figcaption>${e(g.alt)}</figcaption></figure>` : `<figure><img src="${images.get(g.src)}" alt="${e(g.alt)}"><figcaption>${e(g.alt)}</figcaption></figure>`).join('')}${p.location ? `<h4>位置与导航</h4><p>${e(placeAddress(p) || '详细地址待补充')}</p>${hasCoordinates(p) ? `<p>WGS84：${p.location.lat}, ${p.location.lng}</p>` : '<p>地址已记录，坐标由百度地图在线解析。</p>'}<a href="${e(baiduMapUrl(p)!)}">在百度地图查看</a>` : '<p>位置待补充。</p>'}<p><a href="${website}guide/#/place/${p.id}">查看最新介绍</a></p></article>`
  }).join('') || '<p>暂无条目</p>'}</section>`).join('')
  const ids = new Set(places.map(p => p.id))
  const placeById = new Map(places.map(place => [place.id, place]))
  const history = updates.map(update => {
    const items = updateItems(update).filter(item => ids.has(item.placeId))
    if (!items.length) return ''
    const names = items.map(item => `${e(placeById.get(item.placeId)!.name)}${update.type === 'tier-change' ? `（${e(tierLabel(item.fromTier!))} → ${e(tierLabel(item.toTier!))}）` : ''}`).join('、')
    return `<li>${e(update.date)} · ${e(updateLabel(update))} · ${names}<p class="prose">${e(update.note)}</p></li>`
  }).filter(Boolean).join('')
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(site.title)} · 完整内容</title><style>body{font:16px/1.8 "Microsoft YaHei",sans-serif;max-width:980px;margin:40px auto;padding:0 20px;color:#303c2b;background:#f8f7f3;overflow-wrap:anywhere}h1{font-size:32px}h2{padding:10px 18px;border-radius:5px}h3{font-size:24px;margin:10px 0}h4{margin:20px 0 5px}article{border:4px solid;padding:24px;background:white;margin:20px 0;border-radius:8px}img,video{display:block;max-width:100%;max-height:600px;object-fit:contain}figure{margin:24px 0}figcaption{font-size:14px;color:#76836a}.prose{white-space:pre-wrap}a{color:#4e7138}.legend{display:flex;gap:15px;flex-wrap:wrap}.legend i{display:inline-block;width:12px;height:12px;border-radius:50%;margin-right:7px}blockquote{border-left:3px solid #cad4be;padding-left:18px;margin-left:0}@media print{body{background:white;margin:0;max-width:none}h2,h3,h4{break-after:avoid}img{max-height:400px}a{color:inherit}article{border-width:2px}}</style></head><body><header><p>完整内容存档 · ${e(scope)}</p><h1>${e(site.title)}</h1><p>${e(site.author)} · 内容更新：${e(updatedAt || '暂无内容更新')}</p><p>${e(site.description)}</p><div class="legend">${legend || '尚未收录城市'}</div><p>图片已包含在文件中，可离线阅读。导航需要联网。</p><p><a href="${website}">访问最新榜单</a></p></header>${content}<section><h2>评价标准</h2><p>${e(site.criteria)}</p><p>${site.rankWithinTier ? '同档分先后；筛选后保留原档内排名。' : '同档不分先后。'}</p><ul>${tiers.map(t => `<li>${t.label}：${e(site.tierDescriptions[t.id])}</li>`).join('')}</ul></section><section><h2>更新记录</h2>${history ? `<ul>${history}</ul>` : '<p>暂无更新记录</p>'}</section></body></html>`
  const date = new Date(), stamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return { url: URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' })), name: `逛店榜-${stamp}-完整内容.html` }
}
