const escape = text => String(text).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])

// City shortcuts reuse the existing photo board and its stored view preference.
export function fillHomeCityLinks(html, groups, rankBase) {
  const cities = Object.entries(groups).filter(([, places]) => places.some(place => place.published)).map(([city]) => city)
  const links = cities.slice(0, 6).map(city => `<a href="${escape(`${rankBase}?filters=1&city=${encodeURIComponent(city)}`)}">${escape(city)}</a>`).join('')
  return html.replace(/<!-- home-city-links:start -->[\s\S]*?<!-- home-city-links:end -->/, `<!-- home-city-links:start -->${links}<!-- home-city-links:end -->`)
}

export function fillHomeLatestEvent(html, event) {
  if (!event) return html
  return html.replace(/<a\b[^>]*\bid="home-latest-event"[^>]*>[\s\S]*?<\/a>/, entry => entry
    .replace('href="activities.html"', () => `href="activities.html#event/${encodeURIComponent(event.id)}"`)
    .replace(/<img\b[^>]*>/, () => `<img src="${escape(event.cover)}" alt="${escape(event.name)}的现场记录" width="132" height="132" decoding="async" />`)
    .replace(/(<span id="home-latest-event-caption">)[^<]*/, (_, opening) => `${opening}${escape(event.dateLabel)} · ${escape(event.name)}`))
}
