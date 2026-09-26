export interface RichTextPart {
  text: string
  strong: boolean
  red: boolean
  size: 'normal' | 'large' | 'huge'
}

// Only these authoring markers are supported; raw HTML remains plain text.
export function parseRichText(text: string, style: Omit<RichTextPart, 'text'> = { strong: false, red: false, size: 'normal' }): RichTextPart[] {
  const parts: RichTextPart[] = []
  const marker = /\*\*(.+?)\*\*|\[(red|large|huge)\]([\s\S]+?)\[\/\2\]/g
  let cursor = 0
  for (const match of text.matchAll(marker)) {
    const start = match.index ?? 0
    if (start > cursor) parts.push({ text: text.slice(cursor, start), ...style })
    const next = { ...style }
    if (match[1] !== undefined) next.strong = true
    else if (match[2] === 'red') next.red = true
    else next.size = match[2] as 'large' | 'huge'
    parts.push(...parseRichText(match[1] ?? match[3], next))
    cursor = start + match[0].length
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), ...style })
  return parts
}

export function richTextClasses(part: RichTextPart) {
  return [part.red ? 'text-red' : '', part.size !== 'normal' ? `text-${part.size}` : ''].filter(Boolean).join(' ')
}

export function richTextHtml(text: string) {
  return parseRichText(text).map(part => {
    const escaped = part.text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
    const tag = part.strong ? 'strong' : 'span'
    return `<${tag} class="${richTextClasses(part)}">${escaped}</${tag}>`
  }).join('')
}

export const richTextStyles = '.text-red.text-red{color:#c62828;background:none}.text-large{font-size:1.25em;font-weight:800;line-height:1.6}.text-huge{font-size:2.8em;font-weight:900;line-height:1.3}'
