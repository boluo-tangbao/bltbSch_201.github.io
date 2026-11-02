import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { shopCalendarDate, shopDisplayStatus, limitedPhase } from '../rank/src/utils/shopDirectory.ts'

export function shopReviewItems({ places, directories, today }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today) || new Date(today).toISOString().slice(0, 10) !== today) throw new Error('复核日期必须为有效 YYYY-MM-DD')
  const result = [], day = 86400000
  for (const [id, directory] of Object.entries(directories)) {
    const place = places.find(p => p.id === id && p.published)
    if (!place) continue
    const age = Math.floor((Date.parse(today) - Date.parse(directory.checkedAt)) / day)
    const hasPending = directory.shops.some(shop => !shop.inactive && shopDisplayStatus(shop, today) === 'evidence')
    const add = (shop, priority, reasons) => result.push({ placeId: id, place: `${place.city} · ${place.name}`, shop, priority, reasons, checkedAt: directory.checkedAt })
    if (age >= 90 && hasPending) add('目录待核部分', 3, [`目录距上次核对 ${age} 天，仅跟进尚未确认的条目；已确认营业门店不重复核查`])
    if (age < 0) add('目录整体', 1, ['核对日晚于本轮日期，请检查日期填写'])
    if (directory.notice?.includes('阶段性') && hasPending) add('目录待核部分', 2, ['按原研究报告补齐尚未确认条目与发现缺口，不重复核查已确认营业门店'])
    for (const shop of directory.shops) {
      if (shop.inactive) {
        if (['unconfirmed', 'renovation'].includes(shop.inactive.reason)) add(shop.name, 1, [shop.inactive.reason === 'renovation' ? '装修停业：核实是否已恢复，保留原历史依据' : '停业待核实：补齐本址状态与依据'])
        continue
      }
      if (shop.status === 'closed' || limitedPhase(shop, today) === 'ended') continue
      const reasons = [], pending = shopDisplayStatus(shop, today) === 'evidence'
      if (pending) reasons.push(shop.pendingReview?.category === 'history' ? '仅有探店历史，核实当前本址经营' : '现为待验证，核对本店身份、位置与有效经营依据')
      if (!shop.floor) reasons.push('楼层／铺位未记录，找到可靠依据后补充')
      if (pending && !shop.sources?.length) reasons.push('缺少来源记录，补充依据及原读取时间')
      if (pending && shop.sources?.some(s => !s.date && !s.dateLabel)) reasons.push('部分来源缺少日期说明，补记原发表／读取信息，不猜填日期')
      if (shop.limited) {
        if (pending && !shop.limited.startsOn && !shop.limited.endsOn) reasons.push('档期未结构化，依据原文核实年份与起止日期；无法确定时保留未知')
        const remaining = Math.floor((Date.parse(shop.limited.endsOn) - Date.parse(today)) / day)
        if (remaining >= 0 && remaining <= 14) reasons.push(`档期将在 ${remaining} 天后结束，留意延期／新主题公告；不推断常设店闭店`)
      }
      if (reasons.length) add(shop.name, pending ? 1 : 2, reasons)
    }
  }
  return result.sort((a, b) => a.priority - b.priority || a.place.localeCompare(b.place, 'zh-CN') || a.shop.localeCompare(b.shop, 'zh-CN'))
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('../', import.meta.url))
  const args = process.argv.slice(2), options = {}
  for (let i = 0; i < args.length; i += 2) {
    if (!['--date', '--output'].includes(args[i]) || !args[i + 1]) throw new Error('支持 --date YYYY-MM-DD 与 --output 文件路径')
    options[args[i]] = args[i + 1]
  }
  const today = options['--date'] || shopCalendarDate()
  const json = path => JSON.parse(readFileSync(resolve(root, path), 'utf8'))
  const places = Object.entries(json('rank/src/data/places.json')).flatMap(([city, list]) => list.map(place => ({ ...place, city })))
  const items = shopReviewItems({ places, directories: json('rank/src/data/shop-directories.json'), today })
  const clean = text => text.replaceAll('|', '／').replaceAll('\n', ' ').replaceAll('[', '（').replaceAll(']', '）')
  const lines = ['# 作者待复核清单', '', `本轮日期：${today}。这是维护任务，不是最新营业结论；未做本轮外部站内搜索或链接存活检测。`, '',
    '只读取生产数据，不修改营业状态、核对日期、来源或前台计数。不作为网站页面发布；本仓库公开，清单并非私密资料。', '',
    '已确认营业门店按现有确认结果处理，不因来源日期缺失、来源较旧或目录核对时间较久要求重新确认。阶段性与90天提醒仅针对目录中尚未确认的部分。楼层补充与明确活动档期待办是资料维护，不代表否定营业结论。', '',
    '处理方式：打开对应地点及原研究报告，复用已有依据，只核实明确缺口。取得新证据后修改原店单／研究报告，再重新生成清单。不要在本生成文件里保存唯一的人工笔记。普通促销、账号停更、未知日期不自动判闭店。', '']
  for (const [priority, title] of [[1, '优先核实状态'], [2, '补齐信息与档期'], [3, '安排周期复核']]) {
    lines.push(`## ${title}`, '', '| 地点／店铺 | 原核对日 | 待办事项 |', '| --- | --- | --- |')
    for (const item of items.filter(i => i.priority === priority)) {
      const link = `https://boluo-tangbao.github.io/bltbSch_201.github.io/rank/guide/#/place/${item.placeId}?find=${encodeURIComponent(item.shop.startsWith('目录') ? '' : item.shop)}`
      lines.push(`| [${clean(item.place)} · ${clean(item.shop)}](${link}) | ${item.checkedAt} | ${item.reasons.map(clean).join('；')} |`)
    }
    lines.push('')
  }
  const output = resolve(root, options['--output'] || 'docs/maintenance/review-queue.md')
  mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, lines.join('\n') + '\n')
  console.log(`已生成作者复核清单：${items.length} 项；未改动生产数据。`)
}
