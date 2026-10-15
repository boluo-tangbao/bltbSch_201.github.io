import { prepareActivities } from './prepare-activities.mjs'
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { resolve, dirname, extname, relative } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { publishedRankAssets, shouldPublishRankAsset } from '../rank/scripts/published-assets.mjs'
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
cpSync(resolve(root,'assets'),resolve(out,'assets'),{recursive:true})
if(existsSync(resolve(root,'images')))cpSync(resolve(root,'images'),resolve(out,'images'),{recursive:true,filter:source=>!['images/anime/events','images/anime/event-web'].some(dir=>source===resolve(root,dir))})
cpSync(rankDist,resolve(out,'rank'),{recursive:true,filter:source=>{
 const info = statSync(source)
 if (info.isDirectory()) return true
 const include = shouldPublishRankAsset(relative(rankDist, source).split('\\').join('/'), usedRankAssets)
 if (!include) { skippedFiles++; skippedBytes += info.size }
 return include
}})
writeFileSync(resolve(out,'.nojekyll'),'')
console.log('Pages 构建完成：主站与活动网页素材位于 _site/，榜单位于 _site/rank/；未复制活动原素材。')
console.log(`发布包精简：排除 ${skippedFiles} 个未使用素材／系统文件，减少 ${(skippedBytes / 1024 ** 2).toFixed(2)} MiB；本地原件保持不变，output/ 设计稿不发布。`)
