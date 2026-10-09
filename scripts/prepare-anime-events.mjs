import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync, unlinkSync } from 'node:fs'
import { resolve, extname, relative, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { events } from './anime-events.config.mjs'
const require = createRequire(new URL('../rank/package.json', import.meta.url))
const sharp = require('sharp'), ffmpeg = require('@ffmpeg-installer/ffmpeg').path
const root = fileURLToPath(new URL('../', import.meta.url))
const sourceRoot = resolve(root, 'images/anime/events')
const output = resolve(root, 'images/anime/event-web')
const topics = new Set(['acg', 'life'])
export async function prepareAnimeEvents() {
 mkdirSync(output, { recursive: true })
 mkdirSync(resolve(root, 'data'), { recursive: true })
 const configured = new Set(events.map(event => event.folder))
 for (const entry of readdirSync(sourceRoot, { withFileTypes: true })) {
  if (entry.isDirectory() && !configured.has(entry.name)) throw new Error('请先为新活动填写网站分类：' + entry.name)
 }
 const ids = new Set(), records = []
 let originals = 0, webBytes = 0
 for (const event of events) {
  if (ids.has(event.id) || !topics.has(event.topic) || typeof event.category !== 'string' || !event.category.trim()) throw new Error('活动 ID 重复或分类无效')
  ids.add(event.id)
  const dir = resolve(sourceRoot, event.folder), rel = relative(sourceRoot, dir)
  if (rel.startsWith('..') || isAbsolute(rel)) throw new Error('素材目录越界')
  const [dateLabel, ...nameParts] = event.folder.split('：')
  const name = nameParts.join('：').trim(), parts = dateLabel.match(/^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})$/)
  const date = parts ? parts[1] + '-' + parts[2].padStart(2,'0') + '-' + parts[3].padStart(2,'0') : null
  if (!name || !/^\d{4}/.test(dateLabel)) throw new Error('活动名称或日期缺失：' + event.folder)
  const media = []
  for (const file of readdirSync(dir).sort((a,b)=>a.localeCompare(b,'zh-CN',{numeric:true}))) {
   const input = resolve(dir, file), stat = statSync(input), ext = extname(file).toLowerCase()
   if (!stat.isFile() || !['.jpg','.jpeg','.png','.webp','.mp4','.mov'].includes(ext)) continue
   originals += stat.size
   const hash = createHash('sha256').update(event.folder+'/'+file+':'+stat.size+':'+stat.mtimeMs+':v1').digest('hex').slice(0,20)
   const small = hash+'-480.webp', full = hash+'-1600.webp', video = hash+'.mp4'
   const isVideo = ['.mp4','.mov'].includes(ext)
   if (isVideo && !existsSync(resolve(output, video))) {
    console.log('转码视频：' + event.folder + '/' + file)
    execFileSync(ffmpeg, ['-hide_banner','-loglevel','error','-y','-i',input,'-map','0:v:0','-map','0:a?','-vf',"scale='min(1280,iw)':-2",'-c:v','libx264','-preset','fast','-crf','27','-threads','2','-pix_fmt','yuv420p','-c:a','aac','-b:a','96k','-movflags','+faststart',resolve(output,video)], {stdio:'inherit'})
   }
   if (!existsSync(resolve(output,small)) || !existsSync(resolve(output,full))) {
    let image = input
    if (isVideo) {
     image = resolve(output,hash+'-poster.jpg')
     execFileSync(ffmpeg,['-hide_banner','-loglevel','error','-y','-i',input,'-frames:v','1',image],{stdio:'inherit'})
    }
    await sharp(image).rotate().resize({width:480,height:480,fit:'inside',withoutEnlargement:true}).webp({quality:78}).toFile(resolve(output,small))
    await sharp(image).rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toFile(resolve(output,full))
    if (isVideo) unlinkSync(image)
   }
   const url = 'images/anime/event-web/'
   media.push({ type:isVideo?'video':'image', preview:url+small, src:url+(isVideo?video:full), poster:isVideo?url+full:undefined })
   webBytes += statSync(resolve(output,small)).size+statSync(resolve(output,full)).size+(isVideo?statSync(resolve(output,video)).size:0)
  }
  if (!media.length) throw new Error('活动没有可展示的素材：'+event.folder)
  const photos=media.filter(item=>item.type==='image').length
  records.push({id:event.id,name,date,dateLabel:date||dateLabel,year:dateLabel.slice(0,4),category:event.category,topic:event.topic,photos,videos:media.length-photos,cover:media[0].preview,media})
  console.log('活动相册：'+name+' · '+media.length+' 个素材')
 }
 // 模糊日期只参与粗略排序，页面仍显示原始时间范围。
 records.sort((a,b)=>(b.date||b.year+'-07-01').localeCompare(a.date||a.year+'-07-01'))
 writeFileSync(resolve(root,'data/activities.json'), JSON.stringify(records,null,2)+'\n')
 console.log('活动素材：'+(originals/1e6).toFixed(1)+' MB → 网页版 '+(webBytes/1e6).toFixed(1)+' MB')
 return records
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await prepareAnimeEvents()
