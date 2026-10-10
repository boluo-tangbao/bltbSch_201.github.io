import { prepareActivities } from './prepare-activities.mjs'
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve, dirname, extname } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../', import.meta.url))
const out = resolve(root, '_site')
await prepareActivities()
if (!existsSync(resolve(root,'rank/dist/index.html'))) throw new Error('请先在 rank/ 运行 npm run build')
// 每次组装清空旧产物，防止遗留素材或删除的页面继续发布。
if(out !== resolve(root,'_site')) throw new Error('部署目录越界')
rmSync(out, { recursive:true, force:true })
mkdirSync(out,{recursive:true})
const extensions = new Set(['.html','.css','.js','.png','.jpg','.jpeg','.svg','.webp','.avif','.gif','.pdf','.ico','.woff','.woff2','.txt','.xml'])
const tracked=execFileSync('git',['-c','safe.directory='+root,'ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean)
for(const file of tracked) {
 if(/^(rank|scripts|docs|content|data|assets|images|test-results|_site|\.github)\//.test(file)||file.startsWith('.')||(!extensions.has(extname(file))&&file!=='CNAME')||!existsSync(resolve(root,file)))continue
 const target=resolve(out,file);mkdirSync(dirname(target),{recursive:true});cpSync(resolve(root,file),target)
}
// 同时包含尚未提交的新页面和资源，本地验收不依赖 Git 暂存状态。
for(const entry of readdirSync(root,{withFileTypes:true}))if(entry.isFile()&&extname(entry.name)==='.html')cpSync(resolve(root,entry.name),resolve(out,entry.name))
cpSync(resolve(root,'assets'),resolve(out,'assets'),{recursive:true})
if(existsSync(resolve(root,'images')))cpSync(resolve(root,'images'),resolve(out,'images'),{recursive:true,filter:source=>!['images/anime/events','images/anime/event-web'].some(dir=>source===resolve(root,dir))})
cpSync(resolve(root,'rank/dist'),resolve(out,'rank'),{recursive:true})
writeFileSync(resolve(out,'.nojekyll'),'')
console.log('Pages 构建完成：主站与活动网页素材位于 _site/，榜单位于 _site/rank/；未复制活动原素材。')
