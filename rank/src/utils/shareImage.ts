import type { Place } from '../types'

export async function placeShareImage(place: Place, author: string, url: string, checkedAt?: string): Promise<Blob> {
  await document.fonts.ready
  const canvas = document.createElement('canvas')
  canvas.width = 1200
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建分享图片')
  const family = '"Microsoft YaHei", "PingFang SC", system-ui, sans-serif'
  const wrap = (text: string, size: number, bold = false) => {
    ctx.font = `${bold ? 700 : 400} ${size}px ${family}`
    const lines: string[] = []
    for (const paragraph of text.split('\n')) {
      let line = ''
      for (const character of paragraph) {
        if (line && ctx.measureText(line + character).width > 1040) { lines.push(line); line = character } else line += character
      }
      lines.push(line)
    }
    return lines
  }
  const title = wrap(place.name, 58, true), summary = wrap(place.summary, 32), link = wrap(url, 22)
  canvas.height = 360 + title.length * 76 + summary.length * 50 + link.length * 34 + (checkedAt ? 36 : 0)
  ctx.fillStyle = '#fffaf1'; ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#a83750'; ctx.fillRect(0, 0, 16, canvas.height)
  let y = 82
  const draw = (lines: string[], size: number, lineHeight: number, color: string, bold = false) => {
    ctx.font = `${bold ? 700 : 400} ${size}px ${family}`; ctx.fillStyle = color
    for (const line of lines) { ctx.fillText(line, 80, y); y += lineHeight }
  }
  draw(wrap(`${place.city} · ${author}的逛店手记`, 26), 26, 42, '#a83750')
  y += 16; draw(title, 58, 76, '#292830', true)
  y += 20; draw(summary, 32, 50, '#292830')
  y += 30; draw([`体验到访：${place.visitedAt || '未记录'} · 内容更新：${place.updatedAt}`, ...(checkedAt ? [`店单核对：${checkedAt}（不代表当天逐店实访）`] : [])], 24, 36, '#79626b')
  y += 24; draw(['完整介绍与当前店单：'], 24, 36, '#a83750'); draw(link, 22, 34, '#a83750')
  draw(['个人评价供参考，实时营业及库存以店铺为准。'], 22, 34, '#79626b')
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('生成失败')), 'image/png'))
}
