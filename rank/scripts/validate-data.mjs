import { readFileSync, existsSync, statSync } from 'node:fs'
import { resolve, relative, isAbsolute, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const TIERS = ['hang', 'top', 'above', 'npc', 'bad']
export function validDate(value, month = false) {
  if (typeof value !== 'string' || !(month ? /^\d{4}-\d{2}(-\d{2})?$/ : /^\d{4}-\d{2}-\d{2}$/).test(value)) return false
  const full = value.length === 7 ? value + '-01' : value
  const parsed = new Date(full + 'T00:00:00Z')
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === full
}
export function validateData(site, groups, updates, imageExists = () => true) {
  const errors = [], fail = (file, id, message) => errors.push(`${file} [${id ?? '?'}] ${message}`)
  if (!site || typeof site !== 'object') return ['site.json 必须是对象']
  for (const key of ['title', 'description', 'criteria']) if (typeof site[key] !== 'string' || !site[key].trim()) fail('site.json', key, '必须填写文字')
  if (typeof site.author !== 'string') fail('site.json', 'author', '必须是字符串')
  if (site.updatedAt !== null && !validDate(site.updatedAt)) fail('site.json', 'updatedAt', '必须为真实 YYYY-MM-DD 或 null')
  if (typeof site.rankWithinTier !== 'boolean') fail('site.json', 'rankWithinTier', '必须是布尔值')
  if (!Number.isInteger(site.recentDays) || site.recentDays < 0) fail('site.json', 'recentDays', '必须是非负整数')
  for (const tier of TIERS) if (typeof site.tierDescriptions?.[tier] !== 'string' || !site.tierDescriptions[tier].trim()) fail('site.json', tier, '缺少档位说明')
  const colors = site.cityColors || {}, usedColors = new Set()
  if (typeof colors !== 'object' || Array.isArray(colors)) fail('site.json', 'cityColors', '必须是城市到颜色的对象')
  else for (const [city, color] of Object.entries(colors)) {
    if (!city.trim() || typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color)) fail('site.json', city, '城市颜色必须是 #RRGGBB')
    else if (usedColors.has(color.toLowerCase())) fail('site.json', city, '不同城市不能使用相同颜色')
    if (typeof color === 'string') usedColors.add(color.toLowerCase())
  }
  if (!groups || typeof groups !== 'object' || Array.isArray(groups)) return [...errors, 'places.json 必须是城市名称到店铺数组的对象']
  if (!Array.isArray(updates)) return [...errors, 'updates.json 必须是数组']
  const places = []
  for (const [city, entries] of Object.entries(groups)) {
    if (!city.trim() || city !== city.trim() || city.length > 80) fail('places.json', city, '城市名称须为 1–80 字且不能有首尾空格')
    if (!Array.isArray(entries)) { fail('places.json', city, '城市下必须是店铺数组'); continue }
    for (const entry of entries) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) { fail('places.json', city, '条目必须是对象'); continue }
      for (const key of ['city', 'pros', 'cons', 'coverAlt', 'isDemo', 'video']) if (Object.hasOwn(entry, key)) fail('places.json', entry.id, key === 'city' ? 'city 已移到城市分组，请删除店铺内的 city' : key + ' 已移除，请删除此字段')
      places.push({ ...entry, city })
    }
  }
  const ids = new Set(), updateIds = new Set(), orders = new Set()
  const image = (path, file, id) => {
    if (typeof path !== 'string' || !/^images\/places\//.test(path) || path.split('/').some(s => !s || s === '..' || s === '.') || /[\\?#%]/.test(path) || !/\.(webp|png|jpe?g|avif|gif|svg)$/i.test(path)) fail(file, id, `图片必须使用 images/places/ 下的相对图片路径：${path}`)
    else if (!imageExists(path)) fail(file, id, `图片文件不存在：${path}`)
  }
  for (const p of places) {
    if (!p || typeof p !== 'object') { fail('places.json', '?', '条目必须是对象'); continue }
    if (typeof p.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.id)) fail('places.json', p.id, 'ID 只能使用小写字母、数字和连字符')
    if (ids.has(p.id)) fail('places.json', p.id, '重复 ID'); ids.add(p.id)
    if (!TIERS.includes(p.tier)) fail('places.json', p.id, '非法档位')
    if (!Number.isFinite(p.order)) fail('places.json', p.id, 'order 必须是有限数字')
    if (p.published && site.rankWithinTier) {
      const orderKey = `${p.tier}:${p.order}`
      if (orders.has(orderKey)) fail('places.json', p.id, '同档排名的 order 不得重复')
      orders.add(orderKey)
    }
    for (const key of ['name', 'city', 'summary']) if (typeof p[key] !== 'string' || !p[key].trim()) fail('places.json', p.id, `${key} 必填`)
    if (p.published && !Object.hasOwn(colors, p.city)) fail('places.json', p.id, `请在 site.json 的 cityColors 中固定 ${p.city} 的城市颜色`)
    for (const [key, limit] of [['name', 160], ['city', 80], ['summary', 600]]) if (typeof p[key] === 'string' && p[key].length > limit) fail('places.json', p.id, `${key} 超过 ${limit} 字，无法保证导出排版`)
    for (const key of ['details']) if (typeof p[key] !== 'string') fail('places.json', p.id, `${key} 必须是字符串（可留空）`)
    for (const key of ['published']) if (typeof p[key] !== 'boolean') fail('places.json', p.id, `${key} 必须是布尔值`)
    if (!Array.isArray(p.tags) || p.tags.some(t => typeof t !== 'string')) fail('places.json', p.id, 'tags 必须是文字数组')
    if (p.visitedAt !== null && !validDate(p.visitedAt, true)) fail('places.json', p.id, 'visitedAt 必须为真实年月、日期或 null')
    if (!validDate(p.updatedAt)) fail('places.json', p.id, 'updatedAt 必须为真实 YYYY-MM-DD 日期')
    if (p.cover !== null) image(p.cover, 'places.json', p.id)
    if (p.coverPosition !== undefined && (!Array.isArray(p.coverPosition) || p.coverPosition.length !== 2 || p.coverPosition.some(v => !Number.isFinite(v) || v < 0 || v > 100))) fail('places.json', p.id, 'coverPosition 必须为两个 0–100 数字')
    if (!Array.isArray(p.gallery)) fail('places.json', p.id, 'gallery 必须为数组')
    else for (const g of p.gallery) { image(g?.src, 'places.json', p.id); if (typeof g?.alt !== 'string' || !g.alt.trim()) fail('places.json', p.id, 'gallery 图片需要 alt') }
    if (typeof p.location === 'string') {
      if (!p.location.trim()) fail('places.json', p.id, '地址不能为空文字，未知请填 null')
    } else if (p.location != null) {
      const l = p.location
      if (typeof l !== 'object' || !Number.isFinite(l.lat) || Math.abs(l.lat) > 85.05112878 || !Number.isFinite(l.lng) || Math.abs(l.lng) > 180 || l.coordinateSystem !== 'wgs84' || typeof l.address !== 'string') fail('places.json', p.id, 'location 需要有效的 WGS84 经纬度和 address 字符串（纬度须在地图显示范围内）')
    }
  }
  for (const u of updates) {
    if (!u || typeof u !== 'object') { fail('updates.json', '?', '更新必须为对象'); continue }
    if (typeof u.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(u.id)) fail('updates.json', u.id, '无效 ID')
    if (updateIds.has(u.id)) fail('updates.json', u.id, '重复 ID'); updateIds.add(u.id)
    if (!validDate(u.date)) fail('updates.json', u.id, 'date 必须为真实 YYYY-MM-DD 日期')
    if (!['added', 'tier-change', 'ranking-change', 'edited'].includes(u.type)) fail('updates.json', u.id, '无效更新类型')
    if (typeof u.note !== 'string' || !u.note.trim()) fail('updates.json', u.id, '必须填写更新原因 note')
    let targets = []
    if (u.type === 'tier-change') {
      if (u.placeIds !== undefined) fail('updates.json', u.id, '批量调档请使用 changes，而不是 placeIds')
      const hasLegacy = typeof u.placeId === 'string'
      if (u.changes !== undefined && !Array.isArray(u.changes)) fail('updates.json', u.id, 'changes 必须是调档数组')
      if (Array.isArray(u.changes) && hasLegacy) fail('updates.json', u.id, 'placeId 与 changes 只能填写一种')
      if (Array.isArray(u.changes)) {
        if (!u.changes.length) fail('updates.json', u.id, 'changes 至少需要一个地点')
        targets = u.changes
      } else if (hasLegacy) targets = [{ placeId: u.placeId, fromTier: u.fromTier, toTier: u.toTier }]
      else fail('updates.json', u.id, '调档记录需要 placeId 或 changes')
      for (const target of targets) {
        if (!target || typeof target !== 'object' || !TIERS.includes(target.fromTier) || !TIERS.includes(target.toTier) || target.fromTier === target.toTier) fail('updates.json', u.id, '每个调档地点都必须提供合法且不同的 fromTier/toTier')
      }
    } else {
      if (u.changes !== undefined) fail('updates.json', u.id, '新增、文案修改或调序请使用 placeIds，而不是 changes')
      if (u.fromTier !== undefined || u.toTier !== undefined) fail('updates.json', u.id, '只有调档记录可以填写 fromTier/toTier')
      const hasLegacy = typeof u.placeId === 'string'
      if (u.placeIds !== undefined && !Array.isArray(u.placeIds)) fail('updates.json', u.id, 'placeIds 必须是地点 ID 数组')
      if (Array.isArray(u.placeIds) && hasLegacy) fail('updates.json', u.id, 'placeId 与 placeIds 只能填写一种')
      if (Array.isArray(u.placeIds)) {
        if (!u.placeIds.length) fail('updates.json', u.id, 'placeIds 至少需要一个地点')
        targets = u.placeIds.map(placeId => ({ placeId }))
      } else if (hasLegacy) targets = [{ placeId: u.placeId }]
      else fail('updates.json', u.id, '更新记录需要 placeId 或 placeIds')
    }
    const targetIds = new Set()
    for (const target of targets) {
      const placeId = target?.placeId
      if (typeof placeId !== 'string' || !ids.has(placeId)) fail('updates.json', u.id, `引用了不存在的条目：${String(placeId)}`)
      if (targetIds.has(placeId)) fail('updates.json', u.id, `同一批次重复引用条目：${placeId}`)
      targetIds.add(placeId)
      const p = places.find(p => p?.id === placeId)
      if (p && validDate(p.updatedAt) && validDate(u.date) && u.date > p.updatedAt) fail('updates.json', u.id, `更新记录晚于 ${placeId} 的 updatedAt，请同步内容日期`)
    }
  }
  return errors
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('../', import.meta.url)), data = {}
  try {
    for (const name of ['site', 'places', 'updates']) {
      try { data[name] = JSON.parse(readFileSync(resolve(root, `src/data/${name}.json`), 'utf8')) }
      catch (error) { throw new Error(`${name}.json 无法解析：${error.message}`) }
    }
    const publicRoot = resolve(root, 'public')
    const errors = validateData(data.site, data.places, data.updates, path => {
      const target = resolve(publicRoot, path), rel = relative(publicRoot, target)
      return !rel.startsWith('..') && !isAbsolute(rel) && existsSync(target) && statSync(target).isFile() && !!extname(target)
    })
    if (errors.length) throw new Error(errors.join('\n'))
    console.log(`数据校验通过：${Object.values(data.places).reduce((n, entries) => n + entries.length, 0)} 个条目，${data.updates.length} 条更新。`)
  } catch (error) { console.error(error.message); process.exitCode = 1 }
}
