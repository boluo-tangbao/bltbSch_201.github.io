const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

export function pageMetadata(html, { url, description, image }) {
  const title = html.match(/<title>(.*?)<\/title>/s)?.[1] || 'Life Gallery'
  const tags = []
  if (!/<meta\s[^>]*name=["']description["']/i.test(html)) tags.push(`<meta name="description" content="${escape(description)}">`)
  if (!/<link\s[^>]*rel=["']canonical["']/i.test(html)) tags.push(`<link rel="canonical" href="${escape(url)}">`)
  const values = { 'og:type': 'website', 'og:title': title, 'og:description': description, 'og:url': url, 'og:image': image, 'og:locale': 'zh_CN', 'twitter:card': 'summary_large_image' }
  for (const [name, value] of Object.entries(values)) {
    if (!new RegExp(`<meta\\s[^>]*(?:name|property)=["']${name}["']`, 'i').test(html)) tags.push(`<meta ${name.startsWith('og:') ? 'property' : 'name'}="${name}" content="${escape(value)}">`)
  }
  return tags.length ? html.replace('</head>', `${tags.join('\n')}\n</head>`) : html
}
