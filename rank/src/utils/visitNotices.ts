import type { DirectoryShop, ShopDirectory } from '../types/index.ts'
import { limitedPhase, shopCalendarDate, shopDirectoryGroups, shopDisplayStatus, shopStatusLabel } from './shopDirectory.ts'

const dayNumber = (date: string) => Date.parse(`${date}T00:00:00Z`) / 86400000

/** Calendar-day reminders only; never infer dates from prose or change operation status. */
export function limitedCountdown(shop: DirectoryShop, today = shopCalendarDate()) {
  if (!shop.limited || shopDisplayStatus(shop, today) !== 'open') return undefined
  const phase = limitedPhase(shop, today)
  const endingIn = shop.limited.endsOn ? dayNumber(shop.limited.endsOn) - dayNumber(today) : Infinity
  const starting = phase === 'upcoming' || (shop.limited.startsOn === today && endingIn > 7)
  const date = starting ? shop.limited.startsOn : shop.limited.endsOn
  if (!date) return undefined
  const days = dayNumber(date) - dayNumber(today)
  if (!Number.isInteger(days) || days < 0 || days > 7) return undefined
  return {
    date,
    days,
    label: starting ? days === 0 ? '今天开始' : `${days}天后开始` : days === 0 ? '今天最后一天' : `还剩${days + 1}天（含今天）`,
    kind: starting ? 'upcoming' : 'ending',
  }
}

export function visitNotices(directory: ShopDirectory, today = shopCalendarDate()) {
  const groups = shopDirectoryGroups(directory.shops, today)
  const events = groups.limited.open.flatMap(shop => {
    const countdown = limitedCountdown(shop, today)
    return countdown ? [{ name: shop.name, label: countdown.label, detail: `${countdown.kind === 'upcoming' ? '开始' : '截止'} ${countdown.date}`, sortDate: countdown.date }] : []
  }).sort((a, b) => a.sortDate.localeCompare(b.sortDate))
  const inactive = groups.inactive.filter(shop => shop.inactive?.reason !== 'closed').map(shop => ({
    name: shop.name,
    label: shop.inactive?.reason === 'relocated' ? '已迁出原址' : shopStatusLabel(shop, today),
    detail: '历史记录，查看原位置与依据',
    sortDate: '',
  }))
  return {
    regular: groups.regular.open.length,
    ongoing: groups.limited.open.filter(shop => limitedPhase(shop, today) === 'ongoing').length,
    upcoming: groups.limited.open.filter(shop => limitedPhase(shop, today) === 'upcoming').length,
    unknown: groups.limited.open.filter(shop => limitedPhase(shop, today) === 'unknown').length,
    notices: [...events, ...inactive],
  }
}
