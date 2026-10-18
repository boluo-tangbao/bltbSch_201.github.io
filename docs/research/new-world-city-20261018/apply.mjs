// Run from the repository root. Applies only this dated New World City correction.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'
const sharp = createRequire(path.resolve('rank/package.json'))('sharp')
const root = 'docs/research/new-world-city-20261018'
const id = 'shanghai-shop-003', date = '2026-10-18'
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'))
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n')
const placesPath = 'rank/src/data/places.json', directoriesPath = 'rank/src/data/shop-directories.json'
const places = read(placesPath), directories = read(directoriesPath)
const place = places['上海'].find(p => p.id === id), directory = directories[id]
if (!fs.existsSync(root + '/before.json')) write(root + '/before.json', { place, directory })
const before = read(root + '/before.json')
const old = name => structuredClone(before.directory.shops.find(s => s.name === name))
const source = (label, url, date) => ({ label, url, ...(date ? { date } : {}) })
const guide = source('焦糖小谷包·上海吃谷攻略', 'https://www.sina.cn/news/detail/5308626362172404.html', '2026-06-11')
const report = source('赢商网·新世界城业态报道（熊舒苗）', 'https://m.winshang.com/news737942.html', '2025-12-26')
const rename = source('新世界公司管理层·2025年度业绩说明会问答10', 'https://roadshow.cnstock.com/fbh/xsj2025', '2026-05-27')
const capcom = old('CAPCOM STORE CHINA 喀普康中心')
capcom.sources = capcom.sources.filter(s => !s.date || s.date >= '2025-01-01')
capcom.accounts = [{ platform: 'xiaohongshu', name: 'CAPCOM卡普空中心', handle: '9685517887', url: 'https://www.xiaohongshu.com/user/profile/6481e8f2000000001001fb99', scope: 'store' }]
capcom.note = 'CAPCOM 当前官网门店目录列出上海新世界城四楼 B08；小红书门店号发布上海中心上新与2025新年活动。具体到货以本店公告为准。'
const snk = old('SNK 中心')
snk.floor = '四层'
snk.status = 'recent'
snk.accounts = [{ platform: 'xiaohongshu', name: 'SNK中心-官方授权店', handle: '18951356220', url: 'https://www.xiaohongshu.com/user/profile/683d176c000000001d017a7d', scope: 'store' }]
snk.sources = [source('SNK 中心官方授权店·国庆新品上架与门店地址', 'https://www.xiaohongshu.com/explore/68db55be000000000402244c', '2025-09-29'), ...snk.sources]
snk.note = '已核对小红书官方授权店账号；2025年9月29日实际上新帖写明新世界城四楼 SNK 中心，补足此前只有开店预告的证据。'
const sanrio = old('三丽鸥 Sanrio Gift Gate')
sanrio.status = 'listed'
sanrio.operatingConfirmation = 'official-listing'
sanrio.sources = [source('三丽鸥官网当前线下门店目录·上海新世界商场', 'https://www.sanrio.com.cn/store.html')]
sanrio.note = '三丽鸥当前官网门店目录列出“上海新世界商场”，地址为南京西路2—68号4F；以官方目录确认本分店营业。'
const xinmanjie = {
  name: '新漫界', aliases: ['新铛集', '新鐺集'], floor: '四层', kind: '动漫周边', status: 'listed', operatingConfirmation: 'official-listing',
  note: '新世界公司管理层2026年5月27日明确：新铛集新世界店已更名为自有品牌“新漫界”，继续自主组织货源、丰富IP组合；旧名作为别名保留，未重复列店。', sources: [rename],
}
const mine = old('矿也 MiNE')
mine.accounts = [{ platform: 'xiaohongshu', name: '矿也MiNE', handle: 'KuangYeMiNE', url: 'https://www.xiaohongshu.com/user/profile/65315a79000000002a034608', scope: 'brand' }]
mine.sources.push({ label: '矿也MiNE品牌号·绵绵玛咻线下首发与门店地址', url: 'https://www.xiaohongshu.com/explore/6aca0e1f000000000a020a9f', dateLabel: '页面显示“编辑于7天前”（2026-10-18核对，未换算具体发帖日期）' })
mine.note = '商场官方2026年10月10日公告列出新世界城四楼门店；另核对矿也MiNE品牌号，近期绵绵玛咻上新帖明确列本店四层地址。首发及库存以当日门店为准。'
const guli = old('谷里谷气')
guli.status = 'closed'
guli.sources.push(source('新闻晨报·记者王丽芳报道新世界城谷里谷气闭店公告', 'https://ep.shxwcb.com/2025/11/19/20251119-02-2_20251118234808.html', '2025-11-19'))
guli.note = '新闻晨报2025年11月19日报道本店已发布闭店公告、11月15日起闭店清仓。2026年攻略仍列旧店名，不能覆盖明确闭店信息；本轮未取得重新营业公告，前台隐藏，最终撤店日期未独立核实。'
const uncertainNames = ['IPSTAR 潮玩星球（零售店）', 'GOODSLOVE 谷乐屋', '漫魂 comic soul', 'LCH 领潮汇 goods', '芳香屋', '二次三香', '墟弥 Goods']
const uncertain = uncertainNames.map(name => {
  const shop = old(name)
  shop.status = 'unverified'
  shop.sources = name === '墟弥 Goods' ? [report] : [guide]
  shop.note = name === '墟弥 Goods'
    ? '2025年12月26日新世界城业态报道收录该店；尚未核对到本店官方账号或当前官网门店目录，保留为营业线索。'
    : name === 'IPSTAR 潮玩星球（零售店）'
      ? '2026年6月攻略列入新世界城四楼店单；本轮未确认零售门店官方账号，保留为营业线索。与轮换主题餐厅分别记录，已结束的主题不展示。'
      : '2026年6月攻略列入新世界城四楼店单；本轮未核对到本店官方账号或当前官方目录，保留为营业线索，未借用其他分店账号。'
  return shop
})
directory.checkedAt = date
directory.shops = [capcom, old('小小谷努咪'), mine, snk, xinmanjie, sanrio, ...uncertain, guli, old('IPSTAR 鸣潮主题店（2026 年夏季限定）')]
const expiredGallery = before.place.gallery.filter(g => /2024/.test(g.sourceName ?? ''))
place.gallery = before.place.gallery.filter(g => !expiredGallery.some(old => old.src === g.src))
// Prefer the directly identifiable Sanrio facade; the other downloaded candidate is redundant with the existing IPSTAR facade.
const src = 'images/places/Shanghai/新世界城补充/new-world-sanrio-2025.webp'
const originalPath = root + '/winshang-2.png', outputPath = 'rank/public/' + src
await sharp(originalPath).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toFile(outputPath)
const media = { src, alt: '新世界城三丽鸥门店外景（网图；2025-12-26报道，拍摄日期未标明）', group: '店铺外景', sourceName: '赢商网·熊舒苗／图片来源项目官方渠道（2025-12-26）', sourceUrl: report.url }
place.gallery.push(media)
place.updatedAt = date
write(placesPath, places)
write(directoriesPath, directories)
const updatesPath = 'rank/src/data/updates.json', updates = read(updatesPath), updateId = 'new-world-recent-evidence-20261018'
const update = { id: updateId, date, type: 'edited', category: 'content', placeIds: [id], note: '新世界城按2025—2026年资料复核：补入卡普空、SNK门店号及矿也品牌号，核对三丽鸥官网店单，新铛集合并更名为新漫界；隐藏已公布闭店的谷里谷气和已结束主题，冲突／过期资料归档。图集移出4张2024年网图，补入1张2025年报道三丽鸥门店图。' }
if (!updates.some(u => u.id === updateId)) updates.unshift(update)
else Object.assign(updates.find(u => u.id === updateId), update)
write(updatesPath, updates)
write(root + '/archive.json', {
  reviewedAt: date, beforeSnapshot: 'before.json',
  hiddenClosed: directory.shops.filter(s => s.status === 'closed'),
  removedShops: [{ shop: old('光荣特库摩中心'), reason: '旧店单只用2024年资料；新检索出现8月31日闭店线索及原账号停用，但未取得可核对的原始闭店公告。2025年报道是过往阵容，未用于抵消关闭线索。先撤出生产店单，暂不把未核实线索写成确定闭店。' }],
  removedGallery: expiredGallery,
  removedSources: before.directory.shops.flatMap(shop => [...shop.sources, ...(shop.kindSources ?? [])].filter(s => s.date && s.date < '2025-01-01').map(s => ({ shop: shop.name, ...s }))),
  policy: '仅移出页面引用；原文件、原始来源和完整旧店单快照保留。不删除或改写旧研究记录。',
})
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
write(root + '/images.json', [{ placeId: id, ...media, sourceDate: report.date, capturedAt: null, eventDate: null, reviewedAt: date, originalImageUrl: 'https://img1.winshang.com/newsimg/2025/12/image_b413b7cadfe0455cb4efe749476c9021.png', originalFile: originalPath, originalSha256: sha(originalPath), localSha256: sha(outputPath), evidence: '正文讲述新世界城四楼Fun肆街区并列出Sanrio Gift Gate；相邻配图门头清楚可见SANRIO GIFT GATE。未据照片推断实时营业、库存或拍摄日期。', reviewMethod: '读取正文与图片来源说明，逐张查看原图；与既有图集比较后仅选非重复三丽鸥角度。', processing: '保留完整画面，等比例缩放，最长边不超过1600px，WebP质量85；无裁切、无重绘。' }])
console.log(JSON.stringify({ confirmed: directory.shops.filter(s => s.status !== 'closed' && (s.accounts?.length || s.operatingConfirmation)).length, uncertain: uncertain.length, hiddenClosed: directory.shops.filter(s => s.status === 'closed').length, archivedShops: 1, accounts: 3, removedImages: expiredGallery.length, gallery: place.gallery.length }))
