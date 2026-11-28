import { journalCoverSizes, journalCoverSrc, journalCoverSrcset } from '../assets/js/photo-journal.js'

const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])

export function guangzhouDayCovers(trip) {
  return trip.days.map((day, index) => {
    const cover = day.groups.flatMap(group => group.media).find(media => media.file === day.cover)
    const src = journalCoverSrc(cover)
    const widths = [800, 1200].filter(width => width < cover.width && /-1600\.webp$/.test(src))
    return { day, cover, src, sizes: journalCoverSizes(index === 0), srcset: journalCoverSrcset(cover, widths) }
  })
}

export function fillGuangzhouOverview(html, trip, days) {
  const cards = days.map(({ day, cover, src, sizes, srcset }, index) => {
    const selected = index === 0
    const title = escape(day.title), date = escape(day.date)
    const responsive = srcset ? ` srcset="${escape(srcset)}" sizes="${escape(sizes)}"` : ''
    return `<article class="day-card" data-selected="${selected}">
      <img src="${escape(src)}"${responsive} width="${cover.width}" height="${cover.height}" alt="${title}" loading="${selected ? 'eager' : 'lazy'}" fetchpriority="${selected ? 'high' : 'low'}" decoding="async">
      <div class="day-card-copy">
        <button type="button" aria-label="选择 ${date} ${title}" aria-pressed="${selected}"><small>${date.slice(5).replace('-', '.')}</small><strong>${title}</strong></button>
        <a href="guangzhou-travel.html?day=${encodeURIComponent(day.id)}"${selected ? '' : ' hidden'}>翻开当天手记 →</a>
      </div>
    </article>`
  }).join('\n')
  const media = trip.days.flatMap(day => day.groups.flatMap(group => group.media))
  const photos = media.filter(item => item.type === 'image').length
  return html.replace('<!-- journal-overview-cards -->', () => cards)
    .replace('<!-- journal-overview-count -->', () => `四天的照片与现场 · ${photos} 张照片 · ${media.length - photos} 段视频`)
}
