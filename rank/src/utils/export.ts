import type { Place, Site } from '../types'
import { tiers } from './model'
import { assetUrl } from './assets'

export type ExportMode = 'compact' | 'review'
export interface ExportResult { url: string; name: string; width: number; height: number }
const WIDTH = 1200
const MAX_HEIGHT = 3000
const FONT = '"Microsoft YaHei", "PingFang SC", "Segoe UI", sans-serif'
const font = (size: number, bold = false) => `${bold ? '600' : '400'} ${size}px ${FONT}`

export function wrapText(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    let line = ''
    for (const char of Array.from(paragraph)) {
      if (line && ctx.measureText(line + char).width > width) { lines.push(line); line = char }
      else line += char
    }
    lines.push(line)
  }
  return lines
}
function writeLines(ctx: CanvasRenderingContext2D, lines: string[], x: number, y: number, lineHeight: number) {
  lines.forEach((line, i) => ctx.fillText(line, x, y + i * lineHeight))
}
async function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    const timer = setTimeout(() => reject(new Error(`图片加载超时：${src}`)), 15000)
    img.onload = () => { clearTimeout(timer); resolve(img) }
    img.onerror = () => { clearTimeout(timer); reject(new Error(`图片加载失败：${src}，请检查素材后重试。`)) }
    img.src = assetUrl(src)
  })
}
function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, position: [number, number] = [50, 50]) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight)
  const sw = w / scale, sh = h / scale
  ctx.drawImage(img, (img.naturalWidth - sw) * position[0] / 100, (img.naturalHeight - sh) * position[1] / 100, sw, sh, x, y, w, h)
}
export async function exportRanking(options: { site: Site; places: Place[]; allPlaces: Place[]; mode: ExportMode; scope: string; updatedAt: string | null; websiteUrl: string }) {
  await document.fonts.ready
  const { site, places, allPlaces, mode, scope, updatedAt, websiteUrl } = options
  const images = new Map<string, HTMLImageElement>()
  for (const p of places) if (p.cover && !images.has(p.cover)) images.set(p.cover, await loadImage(p.cover))
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH; canvas.height = MAX_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('浏览器无法创建画布，请使用支持 Canvas 的浏览器重试。')
  const cols = mode === 'compact' ? 3 : 2, gap = 18, cardWidth = (WIDTH - 96 - gap * (cols - 1)) / cols
  const innerWidth = cardWidth - 32
  ctx.font = font(24, true)
  const titleLines = wrapText(ctx, site.title, WIDTH - 96)
  ctx.font = font(20)
  const scopeLines = wrapText(ctx, `范围：${scope} · ${places.length} 个条目`, WIDTH - 96)
  const urlLines = wrapText(ctx, websiteUrl, WIDTH - 96)
  const headerHeight = 120 + titleLines.length * 30 + scopeLines.length * 28
  const footerHeight = 70 + urlLines.length * 25
  type Card = { place: Place; name: string[]; city: string[]; summary: string[]; height: number }
  type Row = { tier: typeof tiers[number]; cards: Card[]; height: number }
  const rows: Row[] = []
  for (const tier of tiers) {
    const matching = places.filter(p => p.tier === tier.id)
    if (!matching.length) rows.push({ tier, cards: [], height: 125 })
    for (let start = 0; start < matching.length; start += cols) {
      const cards = matching.slice(start, start + cols).map(place => {
        ctx.font = font(25, true); const name = wrapText(ctx, place.name, innerWidth)
        ctx.font = font(19); const city = wrapText(ctx, `${place.city}${place.isDemo ? ' · 演示' : ''}${site.rankWithinTier ? ` · #${allPlaces.filter(p => p.tier === tier.id).findIndex(p => p.id === place.id) + 1}` : ''}`, innerWidth)
        ctx.font = font(22); const summary = mode === 'review' ? wrapText(ctx, place.summary, innerWidth) : []
        return { place, name, city, summary, height: 215 + city.length * 25 + name.length * 34 + (summary.length ? 16 + summary.length * 32 : 0) }
      })
      rows.push({ tier, cards, height: 65 + Math.max(...cards.map(c => c.height)) })
    }
  }
  const pages: Row[][] = []
  let current: Row[] = [], height = headerHeight + footerHeight
  for (const row of rows) {
    if (row.height + headerHeight + footerHeight > MAX_HEIGHT) throw new Error('单条内容过长，无法完整放入一张图片。请缩短名称或一句话评价后重试。')
    if (height + row.height > MAX_HEIGHT && current.length) { pages.push(current); current = []; height = headerHeight + footerHeight }
    current.push(row); height += row.height
  }
  if (current.length) pages.push(current)
  const results: ExportResult[] = []
  try {
    for (const [index, page] of pages.entries()) {
      canvas.height = headerHeight + page.reduce((sum, row) => sum + row.height, 0) + footerHeight
      ctx.fillStyle = '#f8f7f3'; ctx.fillRect(0, 0, WIDTH, canvas.height); ctx.textBaseline = 'top'
      ctx.fillStyle = '#b75138'; ctx.font = font(17); ctx.fillText('PLACES & PREFERENCES · 个人体验榜', 48, 28)
      ctx.fillStyle = '#2e382b'; ctx.font = font(24, true); writeLines(ctx, titleLines, 48, 66, 30)
      ctx.fillStyle = '#717967'; ctx.font = font(20)
      const metaY = 76 + titleLines.length * 30
      ctx.fillText(`${site.author} · ${updatedAt ? '内容更新 ' + updatedAt : '暂无内容更新'} · ${site.rankWithinTier ? '同档分先后' : '同档不分先后'}`, 48, metaY)
      writeLines(ctx, scopeLines, 48, metaY + 32, 28)
      let y = headerHeight
      for (const row of page) {
        ctx.fillStyle = row.tier.color; ctx.fillRect(48, y, WIDTH - 96, 43)
        ctx.font = font(24, true); ctx.fillStyle = '#30342d'; ctx.fillText(row.tier.label, 65, y + 7)
        if (!row.cards.length) {
          ctx.fillStyle = row.tier.pale; ctx.fillRect(48, y + 43, WIDTH - 96, 65)
          ctx.fillStyle = '#7e8574'; ctx.font = font(21); ctx.fillText('暂无条目', 76, y + 65)
        }
        row.cards.forEach((card, col) => {
          const x = 48 + col * (cardWidth + gap), top = y + 55
          ctx.fillStyle = '#ffffff'; ctx.fillRect(x, top, cardWidth, row.height - 65)
          if (card.place.cover) cover(ctx, images.get(card.place.cover)!, x + 16, top + 16, innerWidth, 160, card.place.coverPosition)
          else { ctx.fillStyle = '#eeeee5'; ctx.fillRect(x + 16, top + 16, innerWidth, 160); ctx.fillStyle = '#89917d'; ctx.font = font(21); ctx.fillText('暂无图片', x + 34, top + 80) }
          let textY = top + 192
          ctx.fillStyle = '#7b846e'; ctx.font = font(19); writeLines(ctx, card.city, x + 16, textY, 25); textY += card.city.length * 25 + 8
          ctx.fillStyle = '#303c29'; ctx.font = font(25, true); writeLines(ctx, card.name, x + 16, textY, 34); textY += card.name.length * 34 + 12
          ctx.fillStyle = '#6f7963'; ctx.font = font(22); writeLines(ctx, card.summary, x + 16, textY, 32)
        })
        y += row.height
      }
      ctx.fillStyle = '#7b846e'; ctx.font = font(18); ctx.fillText(`个人主观体验 · ${mode === 'compact' ? '简洁排序图' : '短评长图'} · 第 ${index + 1} / ${pages.length} 页`, 48, y + 20)
      ctx.font = font(20); writeLines(ctx, urlLines, 48, y + 48, 25)
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('PNG 生成失败，请重试。')), 'image/png'))
      const date = new Date(); const stamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      results.push({ url: URL.createObjectURL(blob), name: `逛店榜-${stamp}-${mode}-${index + 1}.png`, width: WIDTH, height: canvas.height })
    }
    return results
  } catch (error) { results.forEach(r => URL.revokeObjectURL(r.url)); throw error }
}
