import type { Place, Site } from '../types'
import { tiers } from './model'
import { assetUrl } from './assets'
import { cityColor } from './cities'
import { exportCheckpoint, waitForExport, type ExportTask } from './exportTask'

export type ExportMode = 'compact' | 'review'
export interface ExportResult { url: string; name: string; width: number; height: number }
const WIDTH = 1200
const MAX_HEIGHT = 3000
const MARGIN = 48
const INK = '#171b1c'
const PAPER = '#f0f0e9'
const ACID = '#d5f34a'
const FONT = '"Microsoft YaHei", "PingFang SC", "Segoe UI", sans-serif'
const font = (size: number, bold = false) => `${bold ? '800' : '400'} ${size}px ${FONT}`
const displayFont = (size: number) => `800 ${size}px "Export Condensed", Impact, sans-serif`
const monoFont = (size: number) => `${size}px Consolas, "Courier New", monospace`

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
async function loadImage(src: string, signal?: AbortSignal) {
  signal?.throwIfAborted()
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    const cleanup = () => { clearTimeout(timer); img.onload = null; img.onerror = null; signal?.removeEventListener('abort', abort) }
    const fail = (reason: unknown) => { cleanup(); img.src = ''; reject(reason) }
    const abort = () => fail(signal?.reason)
    const timer = setTimeout(() => fail(new Error(`图片加载超时：${src}`)), 15000)
    img.onload = () => { cleanup(); resolve(img) }
    img.onerror = () => fail(new Error(`图片加载失败：${src}，请检查素材后重试。`))
    signal?.addEventListener('abort', abort, { once: true })
    img.src = assetUrl(src)
  })
}
function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, position: [number, number] = [50, 50]) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight)
  const sw = w / scale, sh = h / scale
  ctx.drawImage(img, (img.naturalWidth - sw) * position[0] / 100, (img.naturalHeight - sh) * position[1] / 100, sw, sh, x, y, w, h)
}
function polygon(ctx: CanvasRenderingContext2D, points: [number, number][], color: string) {
  ctx.beginPath()
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))
  ctx.closePath(); ctx.fillStyle = color; ctx.fill()
}
function line(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, color: string) {
  ctx.fillStyle = color; ctx.fillRect(x, y, width, 1)
}
export async function exportRanking(options: { site: Site; places: Place[]; allPlaces: Place[]; mode: ExportMode; scope: string; updatedAt: string | null; websiteUrl: string } & ExportTask) {
  options.onProgress?.({ stage: '准备字体', completed: 0, total: 0 })
  await waitForExport(document.fonts.load('800 120px "Export Condensed"'), options.signal)
  await waitForExport(document.fonts.ready, options.signal)
  const { site, places, allPlaces, mode, scope, updatedAt, websiteUrl } = options
  const images = new Map<string, HTMLImageElement>()
  const paths = [...new Set(places.flatMap(p => p.cover ? [p.cover] : []))]
  options.onProgress?.({ stage: '加载封面', completed: 0, total: paths.length })
  for (const path of paths) {
    images.set(path, await loadImage(path, options.signal))
    options.onProgress?.({ stage: '加载封面', completed: images.size, total: paths.length })
    await exportCheckpoint(options)
  }
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH; canvas.height = MAX_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('浏览器无法创建画布，请使用支持 Canvas 的浏览器重试。')
  const cols = mode === 'compact' ? 3 : 2, gap = 20, contentWidth = WIDTH - MARGIN * 2
  const cardWidth = (contentWidth - gap * (cols - 1)) / cols, innerWidth = cardWidth - 36
  const photoHeight = mode === 'compact' ? 196 : 228
  ctx.font = font(52, true)
  const titleLines = wrapText(ctx, site.title, contentWidth)
  ctx.font = font(18)
  const metaLines = wrapText(ctx, `${site.author}  /  ${updatedAt ? '内容更新 ' + updatedAt : '暂无内容更新'}  /  ${site.rankWithinTier ? '同档分先后' : '同档不分先后'}`, contentWidth)
  const scopeLines = wrapText(ctx, `范围：${scope}`, contentWidth)
  ctx.font = monoFont(17)
  const urlLines = wrapText(ctx, websiteUrl, contentWidth - 230)
  const legendCities = [...new Set(places.map(p => p.city))]
  ctx.font = font(17)
  const legendLines = wrapText(ctx, legendCities.length ? `城市色标 / ${legendCities.join(' · ')}` : '城市颜色待收录后显示', contentWidth)
  const titleY = 294, metaY = titleY + titleLines.length * 66 + 12
  const scopeY = metaY + metaLines.length * 27 + 12, legendY = scopeY + scopeLines.length * 27 + 12
  const headerHeight = legendY + legendLines.length * 26 + 36
  const footerHeight = 115 + urlLines.length * 23
  type Card = { place: Place; name: string[]; city: string[]; summary: string[]; height: number }
  type Row = { tier: typeof tiers[number]; cards: Card[]; height: number }
  const rows: Row[] = []
  for (const tier of tiers) {
    const matching = places.filter(p => p.tier === tier.id)
    if (!matching.length) rows.push({ tier, cards: [], height: 132 })
    for (let start = 0; start < matching.length; start += cols) {
      const cards = matching.slice(start, start + cols).map(place => {
        ctx.font = font(27, true); const name = wrapText(ctx, place.name, innerWidth)
        ctx.font = font(18); const city = wrapText(ctx, place.city, innerWidth - 18)
        ctx.font = font(22); const summary = mode === 'review' ? wrapText(ctx, place.summary, innerWidth) : []
        return { place, name, city, summary, height: photoHeight + 48 + city.length * 25 + name.length * 37 + (summary.length ? 18 + summary.length * 33 : 0) }
      })
      rows.push({ tier, cards, height: 88 + Math.max(...cards.map(c => c.height)) })
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
    options.onProgress?.({ stage: '生成图片', completed: 0, total: pages.length })
    for (const [index, page] of pages.entries()) {
      await exportCheckpoint(options)
      canvas.height = headerHeight + page.reduce((sum, row) => sum + row.height, 0) + footerHeight
      ctx.fillStyle = PAPER; ctx.fillRect(0, 0, WIDTH, canvas.height); ctx.textBaseline = 'top'
      // Print marks and a restrained dot grid give the page a physical, editorial feel.
      ctx.fillStyle = '#171b1c12'
      for (let x = 24; x < WIDTH; x += 24) for (let y = headerHeight; y < canvas.height - footerHeight; y += 24) ctx.fillRect(x, y, 1, 1)
      ctx.fillStyle = INK; ctx.fillRect(0, 0, WIDTH, headerHeight - 24)
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, WIDTH, headerHeight - 24); ctx.clip()
      ctx.strokeStyle = '#f0f0e914'; ctx.lineWidth = 1
      for (let x = -500; x < WIDTH + 600; x += 180) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - 360, headerHeight); ctx.stroke() }
      ctx.restore()
      ctx.fillStyle = ACID; ctx.fillRect(MARGIN, 36, 264, 29)
      ctx.fillStyle = INK; ctx.font = monoFont(17); ctx.fillText('TB // FIELD NOTES', MARGIN + 12, 41)
      ctx.fillStyle = '#e5e8de'; ctx.font = monoFont(16); ctx.textAlign = 'right'
      ctx.fillText(`PERSONAL COLLECTION / ${mode === 'compact' ? 'GRID' : 'NOTES'}`, WIDTH - MARGIN, 42); ctx.textAlign = 'left'
      ctx.font = displayFont(116); ctx.fillStyle = PAPER; ctx.fillText('CITY /', MARGIN - 3, 77)
      ctx.fillStyle = ACID; ctx.fillText('FIELD GUIDE', MARGIN - 3, 171)
      ctx.fillStyle = '#2b3230'; ctx.fillRect(930, 96, 222, 161)
      polygon(ctx, [[1122, 96], [1152, 96], [1152, 126]], ACID)
      ctx.fillStyle = PAPER; ctx.font = displayFont(102); ctx.fillText(String(places.length).padStart(2, '0'), 947, 95)
      ctx.fillStyle = '#b8c1b0'; ctx.font = monoFont(16); ctx.fillText(`PLACES / ${String(legendCities.length).padStart(2, '0')} CITIES`, 947, 222)
      ctx.fillStyle = PAPER; ctx.font = font(52, true); writeLines(ctx, titleLines, MARGIN, titleY, 66)
      ctx.fillStyle = '#c7cec1'; ctx.font = font(18); writeLines(ctx, metaLines, MARGIN, metaY, 27)
      writeLines(ctx, scopeLines, MARGIN, scopeY, 27)
      ctx.fillStyle = '#93a384'; ctx.font = font(17); writeLines(ctx, legendLines, MARGIN, legendY, 26)
      ctx.fillStyle = ACID; ctx.fillRect(0, headerHeight - 24, WIDTH, 5)
      let y = headerHeight
      for (const row of page) {
        const tierIndex = tiers.findIndex(tier => tier.id === row.tier.id) + 1
        const matchingCount = places.filter(place => place.tier === row.tier.id).length
        ctx.fillStyle = INK; ctx.fillRect(MARGIN, y, contentWidth, 52)
        polygon(ctx, [[MARGIN, y], [MARGIN + 70, y], [MARGIN + 88, y + 52], [MARGIN, y + 52]], row.tier.color)
        ctx.fillStyle = INK; ctx.font = displayFont(37); ctx.fillText(String(tierIndex).padStart(2, '0'), MARGIN + 17, y + 3)
        ctx.fillStyle = PAPER; ctx.font = font(30, true); ctx.fillText(row.tier.label, MARGIN + 108, y + 5)
        ctx.font = monoFont(16); ctx.fillStyle = '#bac4af'; ctx.textAlign = 'right'
        ctx.fillText(`${matchingCount} PLACES  /  TIER ${String(tierIndex).padStart(2, '0')}`, WIDTH - MARGIN - 18, y + 17); ctx.textAlign = 'left'
        if (!row.cards.length) {
          ctx.fillStyle = '#e4e6dc'; ctx.fillRect(MARGIN, y + 52, contentWidth, 58)
          ctx.fillStyle = '#727c67'; ctx.font = font(19); ctx.fillText('暂无条目 / 下一站，待发现。', MARGIN + 20, y + 69)
        }
        row.cards.forEach((card, col) => {
          const x = MARGIN + col * (cardWidth + gap), top = y + 65, cardHeight = row.height - 88
          ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 4, top + 4, cardWidth, cardHeight)
          ctx.fillStyle = '#fafaf6'; ctx.fillRect(x, top, cardWidth, cardHeight)
          ctx.strokeStyle = '#bcc2b2'; ctx.lineWidth = 1; ctx.strokeRect(x + .5, top + .5, cardWidth - 1, cardHeight - 1)
          if (card.place.cover) cover(ctx, images.get(card.place.cover)!, x, top, cardWidth, photoHeight, card.place.coverPosition)
          else {
            ctx.fillStyle = '#dce0d3'; ctx.fillRect(x, top, cardWidth, photoHeight)
            ctx.strokeStyle = '#bcc5af'; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + cardWidth, top + photoHeight); ctx.moveTo(x + cardWidth, top); ctx.lineTo(x, top + photoHeight); ctx.stroke()
            ctx.fillStyle = '#526047'; ctx.font = displayFont(29); ctx.fillText('NO IMAGE /', x + 20, top + photoHeight / 2 - 17)
            ctx.font = font(16); ctx.fillText('暂无图片', x + 20, top + photoHeight / 2 + 19)
          }
          const rank = allPlaces.filter(place => place.tier === row.tier.id).findIndex(place => place.id === card.place.id) + 1
          ctx.fillStyle = INK; ctx.fillRect(x + 12, top + 12, 116, 33)
          ctx.fillStyle = ACID; ctx.font = monoFont(17); ctx.fillText(site.rankWithinTier ? `RANK / ${String(rank).padStart(2, '0')}` : 'FIELD NOTE', x + 20, top + 19)
          polygon(ctx, [[x + cardWidth - 24, top + photoHeight], [x + cardWidth, top + photoHeight - 24], [x + cardWidth, top + photoHeight]], ACID)
          ctx.fillStyle = cityColor(card.place.city, site.cityColors); ctx.fillRect(x, top + photoHeight, 5, cardHeight - photoHeight)
          let textY = top + photoHeight + 16
          ctx.fillRect(x + 18, textY + 6, 8, 8)
          ctx.fillStyle = '#68765b'; ctx.font = font(18); writeLines(ctx, card.city, x + 34, textY, 25); textY += card.city.length * 25 + 9
          ctx.fillStyle = INK; ctx.font = font(27, true); writeLines(ctx, card.name, x + 18, textY, 37); textY += card.name.length * 37
          if (card.summary.length) {
            line(ctx, x + 18, textY + 7, innerWidth, '#d0d5c6'); textY += 18
            ctx.fillStyle = '#515b49'; ctx.font = font(22); writeLines(ctx, card.summary, x + 18, textY, 33)
          }
        })
        y += row.height
      }
      ctx.fillStyle = INK; ctx.fillRect(0, y, WIDTH, footerHeight)
      ctx.fillStyle = ACID; ctx.fillRect(MARGIN, y + 23, 48, 48)
      ctx.fillStyle = INK; ctx.font = displayFont(30); ctx.fillText('TB', MARGIN + 10, y + 29)
      ctx.fillStyle = PAPER; ctx.font = font(18, true); ctx.fillText('个人主观体验 / 仅供出发前参考', MARGIN + 64, y + 23)
      ctx.fillStyle = '#a9b59c'; ctx.font = monoFont(15); ctx.fillText(`PLACES & PREFERENCES  /  ${mode === 'compact' ? 'GRID EDITION' : 'NOTES EDITION'}`, MARGIN + 64, y + 53)
      ctx.font = monoFont(17); writeLines(ctx, urlLines, MARGIN, y + 88, 23)
      ctx.textAlign = 'right'; ctx.font = displayFont(62); ctx.fillStyle = PAPER
      ctx.fillText(`${String(index + 1).padStart(2, '0')} / ${String(pages.length).padStart(2, '0')}`, WIDTH - MARGIN, y + 19)
      ctx.font = monoFont(13); ctx.fillStyle = ACID; ctx.fillText('KEEP EXPLORING ↗', WIDTH - MARGIN, y + 88); ctx.textAlign = 'left'
      const blob = await waitForExport(new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('PNG 生成失败，请重试。')), 'image/png')), options.signal)
      options.signal?.throwIfAborted()
      const date = new Date(); const stamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      results.push({ url: URL.createObjectURL(blob), name: `逛店榜-${stamp}-${mode}-${index + 1}.png`, width: WIDTH, height: canvas.height })
      options.onProgress?.({ stage: '生成图片', completed: index + 1, total: pages.length })
    }
    options.signal?.throwIfAborted()
    return results
  } catch (error) { results.forEach(r => URL.revokeObjectURL(r.url)); throw error }
}
