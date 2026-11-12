import { prepareActivities } from './prepare-activities.mjs'
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { resolve, dirname, extname, relative } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { publishedRankAssets, shouldPublishRankAsset } from '../rank/scripts/published-assets.mjs'
import { generateDiscoveryPages } from './generate-discovery-pages.mjs'
import { pageMetadata } from './page-metadata.mjs'
import { fillHomeCityLinks } from './home-city-links.mjs'
import './prepare-home-images.mjs'
const root = resolve(fileURLToPath(new URL('../', import.meta.url)))
const out = resolve(root, '_site')
await prepareActivities()
if (!existsSync(resolve(root,'rank/dist/index.html'))) throw new Error('请先在 rank/ 运行 npm run build')
const json = path => JSON.parse(readFileSync(resolve(root, path), 'utf8'))
const usedRankAssets = publishedRankAssets({
 places: json('rank/src/data/places.json'),
 mediaPreviews: json('rank/src/data/media-previews.json'),
 portraitPreviews: json('rank/src/data/portrait-previews.json'),
 characters: json('rank/public/characters.json'),
 originalLinks: json('rank/src/data/original-links.json'),
})
const rankDist = resolve(root, 'rank/dist')
for (const asset of usedRankAssets) {
 if (!existsSync(resolve(rankDist, asset))) throw new Error(`构建产物缺少正在使用的素材，请重新构建榜单：${asset}`)
}
let skippedFiles = 0, skippedBytes = 0
// Normalize the Windows path before Git's ownership check; check inputs before clearing the preview.
const tracked=execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),'ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean)
// 每次组装清空旧产物，防止遗留素材或删除的页面继续发布。
if(out !== resolve(root,'_site')) throw new Error('部署目录越界')
rmSync(out, { recursive:true, force:true })
mkdirSync(out,{recursive:true})
const extensions = new Set(['.html','.css','.js','.png','.jpg','.jpeg','.svg','.webp','.avif','.gif','.pdf','.ico','.woff','.woff2','.txt','.xml'])
for(const file of tracked) {
 if(/^(rank|scripts|docs|content|data|assets|images|output|test-results|_site|\.github)\//.test(file)||file.startsWith('.')||(!extensions.has(extname(file))&&file!=='CNAME')||!existsSync(resolve(root,file)))continue
 const target=resolve(out,file);mkdirSync(dirname(target),{recursive:true});cpSync(resolve(root,file),target)
}
// 同时包含尚未提交的新页面和资源，本地验收不依赖 Git 暂存状态。
for(const entry of readdirSync(root,{withFileTypes:true}))if(entry.isFile()&&extname(entry.name)==='.html')cpSync(resolve(root,entry.name),resolve(out,entry.name))
const musicDir = resolve(root, 'assets/music')
const kugouDir = resolve(musicDir, 'KugouMusic')
cpSync(resolve(root,'assets'),resolve(out,'assets'),{recursive:true,filter:source=>
 source !== kugouDir && !(dirname(source) === musicDir && extname(source).toLowerCase() === '.flac')
})
if(existsSync(resolve(root,'images')))cpSync(resolve(root,'images'),resolve(out,'images'),{recursive:true,filter:source=>!['images/anime/events','images/anime/event-web'].some(dir=>source===resolve(root,dir))})
cpSync(rankDist,resolve(out,'rank'),{recursive:true,filter:source=>{
 const info = statSync(source)
 if (info.isDirectory()) return true
 const include = shouldPublishRankAsset(relative(rankDist, source).split('\\').join('/'), usedRankAssets)
 if (!include) { skippedFiles++; skippedBytes += info.size }
 return include
}})
writeFileSync(resolve(out,'.nojekyll'),'')
const rankBase = readFileSync(resolve(out, 'rank/index.html'), 'utf8').match(/src="([^"]*\/)assets\/[^"/]+\.js"/)?.[1]
if (!rankBase) throw new Error('无法读取榜单构建路径，停止生成城市指南')
const origin = process.env.SITE_ORIGIN || 'https://boluo-tangbao.github.io'
const homeBase = rankBase.replace(/rank\/$/, '')
const homePage = resolve(out, 'index.html')
writeFileSync(homePage, fillHomeCityLinks(readFileSync(homePage, 'utf8'), json('rank/src/data/places.json'), rankBase))
const descriptions = {
 'index.html': '菠萝汤包scho的生活手记：亲自逛过的店、到过的活动，以及运动、艺术、二次元与旅行记录。',
 'activities.html': '菠萝汤包scho参加过的活动，按主题与年份浏览现场照片和视频。',
 'sports.html': '菠萝汤包scho的运动兴趣与体育活动记录。',
 'art.html': '菠萝汤包scho的艺术兴趣、音乐与现场活动记录。',
 'anime.html': '菠萝汤包scho的二次元生活：城市逛店、活动记录与喜欢的作品。',
 'travel.html': '菠萝汤包scho的旅行与城市体验记录。',
 'rank/index.html': '菠萝汤包scho的个人逛店体验榜，按城市、地点与标签查找真实体验和店铺资料。',
 'rank/guide/index.html': '按地图查找城市逛店地点，阅读个人短评、店铺资料与照片，规划逛店清单。',
 'rank/qa/index.html': '关于汤包逛店体验榜的评价标准、资料与使用说明。',
 'rank/updates/index.html': '汤包逛店体验榜的地点、评价、图片及地图更新记录。',
 'rank/route/index.html': '预览朋友分享的公开逛店路线，确认后加入自己的逛店清单。',
}
for (const [file, description] of Object.entries(descriptions)) {
 const target = resolve(out, file)
 if (!existsSync(target)) continue
 const url = new URL(homeBase + (file.endsWith('index.html') ? file.slice(0, -10) : file), origin).href
 const image = new URL(homeBase + 'images/anime.webp', origin).href
 writeFileSync(target, pageMetadata(readFileSync(target, 'utf8'), { url, description, image }))
}
const discovery = generateDiscoveryPages({ siteRoot: out, rankBase, origin: process.env.SITE_ORIGIN || 'https://boluo-tangbao.github.io', groups: json('rank/src/data/places.json'), site: json('rank/src/data/site.json'), previews: json('rank/src/data/media-previews.json') })
console.log(`城市指南：${discovery.cities}座城、${discovery.places}处地点，已生成独立介绍、分享元信息和 sitemap.xml。`)
console.log('Pages 构建完成：主站与活动网页素材位于 _site/，榜单位于 _site/rank/；未复制活动原素材。')
console.log(`发布包精简：排除 ${skippedFiles} 个已分离原件／未使用素材／系统文件，减少 ${(skippedBytes / 1024 ** 2).toFixed(2)} MiB；本地原件保持不变，output/ 设计稿不发布。`)
