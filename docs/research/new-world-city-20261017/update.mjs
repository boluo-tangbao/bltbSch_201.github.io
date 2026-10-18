// superseded-20261018: historical procedure; do not restore outdated evidence.
throw new Error("此脚本已归档；改用 docs/research/new-world-city-20261018/ 下的本轮脚本，避免恢复过期资料。")
// Run from repository root; idempotent data and image update for this trial.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'
const require = createRequire(path.resolve('rank/package.json'))
const sharp = require('sharp')
const root = 'docs/research/new-world-city-20261017'
const id = 'shanghai-shop-003', date = '2026-10-17'
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'))
const write = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n')
const placesPath = 'rank/src/data/places.json', directoriesPath = 'rank/src/data/shop-directories.json', updatesPath = 'rank/src/data/updates.json'
const places = read(placesPath), directories = read(directoriesPath), updates = read(updatesPath)
const place = places['上海'].find(p => p.id === id)
const beforePath = root + '/before.json'
if (!fs.existsSync(beforePath)) write(beforePath, { place, directory: directories[id] ?? null })
const source = (label, url, date) => ({ label, url, ...(date ? { date } : {}) })
const capcom = source('CAPCOM 官网当前门店目录（上海店）', 'https://www.capcom.co.jp/amusement/brands/capcomstore/')
const mall = source('上海新世界城官方微博（矿也门店上新）', 'https://www.sina.cn/media/2210057511', '2026-10-10')
const nui = source('上海新世界城官方微博（小小谷努咪上新）', 'https://www.sina.cn/news/detail/5354964727628101.html', '2026-10-17')
const guide = source('焦糖小谷包·上海吃谷攻略', 'https://www.sina.cn/news/detail/5308626362172404.html', '2026-06-11')
const commerce = source('上海商务·新世界 Fun 肆街区案例', 'https://sww.sh.gov.cn/swdt/20240830/fd6aa86f3f1e45e4b748726b071c12b3.html', '2024-08-29')
const shindang = source('上海黄浦·新鐺集开业实访', 'https://m.thepaper.cn/newsDetail_forward_26350360', '2024-02-12')
directories[id] = {
  area: '新世界城 · 四楼 Fun肆街区为主', checkedAt: date,
  shops: [
    { name: 'CAPCOM STORE CHINA 喀普康中心', aliases: ['卡普空', 'CAPCOM'], floor: '四层 · B08', kind: '游戏周边（CAPCOM）', status: 'listed', operatingConfirmation: 'official-listing', note: 'CAPCOM 当前官网门店目录仍列上海新世界城四楼 B08；具体到货以本店公告为准。', sources: [capcom, source('CAPCOM 官方开业公告（历史资料）', 'https://www.capcom.co.jp/amusement/capcomstore/2023/06/capcom-store-china628.html', '2023-06-28')] },
    { name: '小小谷努咪', floor: '四层', kind: '毛绒周边（含明日方舟）', status: 'recent', operatingConfirmation: 'official-listing', note: '商场官方 10 月 17 日上新帖明确列出四楼门店；实际角色与库存以门店为准。', sources: [nui] },
    { name: '矿也 MiNE', aliases: ['矿也', 'MiNE'], floor: '四层', kind: '原创 IP 周边、毛绒', status: 'recent', operatingConfirmation: 'official-listing', note: '商场官方 10 月 10 日门店上新及 10 月 1 日合作发售帖均标注四楼矿也；未将首发或限定款写成永久在售。', sources: [mall] },
    { name: '光荣特库摩中心', aliases: ['KOEI TECMO CENTER', 'KT中心'], floor: '四层', kind: '游戏周边（光荣特库摩）', status: 'older', note: '上海商务 2024 年资料列出这家官方品牌店；本轮未取得可独立确认当前营业的门店目录或近期原始公告，作为线索保留。', sources: [commerce] },
    { name: 'SNK 中心', aliases: ['SNK'], kind: '游戏周边（SNK）', status: 'unverified', note: 'SNK 官方 2025 年 7 月文章预告在新世界城开店；预告不是开业完成或当前营业确认，具体楼层与当前状态待补证。', sources: [source('SNK 官方上海门店预告', 'https://www.snkchina.com.cn/general/news/20250728/60112.html', '2025-07-21')] },
    { name: 'IPSTAR 潮玩星球（零售店）', aliases: ['潮玩星球', 'IPSTAR'], floor: '四层', kind: '动漫／游戏周边', status: 'older', note: '上海商务品牌记录及 2026 年 6 月攻略均提到零售门店，已有图集也保留门头；本轮尚未核对到当前零售店官方账号。与轮换主题餐厅分开记录。', sources: [commerce, guide] },
    { name: 'GOODSLOVE 谷乐屋', aliases: ['GOODS LOVE', 'GoodsLove'], floor: '四层', status: 'older', note: '2024 年上海商务品牌记录与 2026 年 6 月攻略均收录；本轮未取得门店当前营业确认，不套用其他分店账号。', sources: [commerce, guide] },
    { name: '漫魂 comic soul', aliases: ['漫魂'], floor: '四层', status: 'older', note: '2026 年 6 月攻略列入新世界城四楼店单；保留该期线索，未据此确认当前营业或猜填主营。', sources: [guide] },
    { name: 'LCH 领潮汇 goods', aliases: ['领潮汇', 'LCH'], floor: '四层', status: 'older', note: '2026 年 6 月攻略列入新世界城四楼店单；当前营业及铺位待进一步核对。', sources: [guide] },
    { name: '谷里谷气', floor: '四层', status: 'older', note: '2026 年 6 月攻略列入新世界城四楼店单；当前营业及主营待进一步核对。', sources: [guide] },
    { name: '芳香屋', floor: '四层', status: 'older', note: '2026 年 6 月攻略列入新世界城四楼店单；当前营业及主营待进一步核对。', sources: [guide] },
    { name: '二次三香', floor: '四层', status: 'older', note: '2026 年 6 月攻略列入新世界城四楼店单；当前营业及主营待进一步核对。', sources: [guide] },
    { name: '新鐺集', aliases: ['新铛集'], floor: '四层', kind: '动漫周边、手办、毛绒、盲盒、一番赏（含哆啦A梦、蜡笔小新）', status: 'older', note: '上海黄浦 2024 年实访记录四楼自营集合店；现有两张来源照片保持原日期，本轮未将旧开业报道升级成当前营业确认。', sources: [shindang, commerce], kindSources: [shindang] },
    { name: '三丽鸥 Sanrio Gift Gate', aliases: ['三丽欧', 'Sanrio'], floor: '四层', kind: '角色周边（三丽鸥）', status: 'older', note: '上海商务历史案例列有三丽鸥品牌；本轮未取得当前门店目录，营业与具体铺位待核。', sources: [commerce] },
    { name: '墟弥 Goods', aliases: ['墟弥', '墟弥goods'], floor: '四层', status: 'older', note: '上海商务 2024 年案例收录品牌；本轮未取得可确认当前营业的门店资料。', sources: [commerce] },
    { name: 'IPSTAR 鸣潮主题店（2026 年夏季限定）', floor: '四层 · A18–19', kind: '联动餐饮、游戏周边（鸣潮）', status: 'closed', note: '品牌 2026 年 7 月 8 日公告明确该期主题店于 7 月 12 日结束。仅指这一期主题活动结束，不代表潮玩星球零售店或其他主题店整体闭店。', sources: [source('IPSTAR 官方鸣潮主题店闭店提醒', 'https://www.sina.cn/news/detail/5318412382245813.html', '2026-07-08')] },
  ],
}
const specs = [
  { file: 'fun-street-original.jpg', filename: 'new-world-exterior-official.webp', alt: '新世界城沿街外观与皮卡丘装置（网图；2024-08-29报道，历史场景）', group: '商圈外部', sourceName: '上海商务（2024-08-29）', sourceUrl: commerce.url, sourceDate: commerce.date, originalImageUrl: 'https://sww.sh.gov.cn/cmsres/6a/6ab61a792fc442bab3bfd0ec93508f9c/c4ca4238a0b923820dcc509a6f75849b.jpg', evidence: '门头可见新世界城及英文标识；来源全文对应本商圈。' },
  { file: 'brand-fronts-original.png', filename: 'new-world-merch-interior-official.webp', alt: '新世界城动漫周边柜台与货架（网图；2025-08-14报道，具体门店未确认）', group: '店铺内景', sourceName: '上海市政府日文网·图片来源上海黄浦（2025-08-14）', sourceUrl: 'https://japanese.shanghai.gov.cn/ja-EditorsPick-ShopinShanghai/20250814/3b04fd3a7cee44088c354845b9b1030c.html', sourceDate: '2025-08-14', originalImageUrl: 'https://japanese.shanghai.gov.cn/cmsres/56/56b838b02db84c13b1a2757b59ad1789/5bc55541b176ff164ba64ee905af97bb.png', evidence: '官方正文图注明确为新世界城内二次元品牌店铺；画面为周边柜台，不强行归给某一品牌。' },
  { file: 'shop-scene-original.jpg', filename: 'new-world-atrium-history.webp', alt: '新世界城中庭攀岩空间与逛展人流（网图；2024-08-29报道，历史场景）', group: '额外活动', sourceName: '上海商务（2024-08-29）', sourceUrl: commerce.url, sourceDate: commerce.date, originalImageUrl: 'https://sww.sh.gov.cn/cmsres/03/0333d4bb23c74358bc4037854f5efb02/eccbc87e4b5ce2fe28308fd9f2a7baf3.jpg', evidence: '来源为新世界 Fun肆街区案例；画面可见中庭攀岩及文豪野犬展板，仅说明当时场景。' },
]
const imageRecords = []
for (const spec of specs) {
  const original = fs.readFileSync(root + '/' + spec.file)
  const src = 'images/places/Shanghai/新世界城补充/' + spec.filename
  const output = 'rank/public/' + src
  fs.mkdirSync(path.dirname(output), { recursive: true })
  await sharp(original).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toFile(output)
  const local = fs.readFileSync(output)
  const metadata = await sharp(original).metadata()
  const sha = buffer => crypto.createHash('sha256').update(buffer).digest('hex')
  if (!place.gallery.some(g => g.src === src)) place.gallery.push({ src, alt: spec.alt, group: spec.group, sourceName: spec.sourceName, sourceUrl: spec.sourceUrl })
  imageRecords.push({ placeId: id, src, ...spec, capturedAt: null, eventDate: null, reviewedAt: date, reviewMethod: '读取原文与图注，并逐张查看原图核对', originalSize: { width: metadata.width, height: metadata.height, bytes: original.length }, originalSha256: sha(original), localSha256: sha(local), localBytes: local.length, processing: '保留完整画面与署名，等比例缩小到最长边不超过1600px，WebP quality=85；未裁切、未放大、未重绘。' })
}
place.updatedAt = date
write(placesPath, places)
write(directoriesPath, directories)
const updateId = 'new-world-directory-trial-20261017'
if (!updates.some(u => u.id === updateId)) updates.unshift({ id: updateId, date, type: 'edited', category: 'content', placeIds: [id], note: '新世界城试行完整商圈流程：补充16条谷店与历史活动记录，区分确认营业、待核实及已结束主题店；保留原图集并增加3张标明出处与年代的实景网图。' })
write(updatesPath, updates)
write(root + '/sources.json', { reviewedAt: date, scope: [id], policy: '仅确认已实际核对的官方门店与近期商场公告；历史图不证明当前营业。作者评价、档位、排名、到访日期与原12张图集均保留。', shopSources: [...new Map(directories[id].shops.flatMap(s => [...s.sources, ...(s.kindSources ?? [])]).map(s => [s.url + (s.date ?? ''), s])).values()], images: imageRecords, excluded: [{ file: 'capcom-store-original.jpg', url: capcom.url, reason: '官网图为店面效果图，未用作现场实景图。' }, { url: 'https://www.gamecity.ne.jp/news/17057.html', reason: '能取得标题与静态骨架，正文依赖加载且本轮未成功读取；未用其摘要作当前营业确认。' }, { url: 'https://www.sina.cn/media/7897848227', reason: '原光荣特库摩账号页显示用户已停用，不能用旧账号备份作当前营业确认，也不能据此推断门店闭店。' }] })
console.log(JSON.stringify({ shops: directories[id].shops.length, confirmed: directories[id].shops.filter(s => s.operatingConfirmation && s.status !== 'closed').length, gallery: place.gallery.length, addedImages: specs.length }))
