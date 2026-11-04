import type { Place, ShopDirectory } from '../types/index.ts'
import { tierLabel } from './model.ts'
import { limitedPhase, shopCalendarDate, shopDirectoryGroups } from './shopDirectory.ts'

export function comparisonFacts(place: Place, directory?: ShopDirectory, today = shopCalendarDate()) {
  const groups = directory ? shopDirectoryGroups(directory.shops, today) : undefined
  const countPhase = (phase: ReturnType<typeof limitedPhase>) => groups?.limited.open.filter(shop => limitedPhase(shop, today) === phase).length ?? 0
  return {
    tier: tierLabel(place.tier),
    summary: place.summary || '暂无短评',
    tags: place.tags.length ? place.tags.map(tag => `#${tag}`).join(' · ') : '标签待补充',
    regular: groups ? `${groups.regular.open.length} 家` : '店单未整理',
    ongoing: groups ? `${countPhase('ongoing')} 项` : '店单未整理',
    upcoming: groups ? `${countPhase('upcoming')} 项` : '店单未整理',
    address: (typeof place.location === 'string' ? place.location : place.location?.address) || '地址待补充',
    checked: directory?.checkedAt || '尚未核对',
    visited: place.visitedAt || '未记录',
  }
}

export const comparisonRows = [
  { key: 'tier', label: '个人推荐档位' },
  { key: 'summary', label: '一句话短评' },
  { key: 'tags', label: '逛什么' },
  { key: 'regular', label: '已确认常规店' },
  { key: 'ongoing', label: '进行中快闪' },
  { key: 'upcoming', label: '即将开始快闪' },
  { key: 'checked', label: '店单核对日' },
  { key: 'visited', label: '作者到访日' },
] as const
