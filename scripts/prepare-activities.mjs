import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync, unlinkSync, createReadStream, renameSync } from 'node:fs'
import { resolve, extname, relative, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { readActivities } from './activity-metadata.mjs'
const require = createRequire(new URL('../rank/package.json', import.meta.url))
const sharp = require('sharp'), ffmpeg = require('@ffmpeg-installer/ffmpeg').path
const root = fileURLToPath(new URL('../', import.meta.url))
const sourceRoot = resolve(root, 'content/activities')
const output = resolve(root, 'assets/generated/activities/media')

export async function prepareActivities() {
 mkdirSync(output, { recursive: true })
 const events = readActivities(), records = [], used = new Set()
 let originals = 0, webBytes = 0
 for (const event of events) {
  const dir = resolve(sourceRoot, event.folder), rel = relative(sourceRoot, dir)
  if (rel.startsWith('..') || isAbsolute(rel)) throw new Error('素材目录越界')
  const {date, dateLabel, name} = event
  const media = []
  for (const file of readdirSync(dir).sort((a,b)=>a.localeCompare(b,'zh-CN',{numeric:true}))) {
   const input = resolve(dir, file), stat = statSync(input), ext = extname(file).toLowerCase()
   if (!stat.isFile() || !['.jpg','.jpeg','.png','.webp','.mp4','.mov'].includes(ext)) continue
   originals += stat.size
   // 内容指纹跨目录迁移与 CI checkout 保持稳定，元数据变更不重新转码。
   const fingerprint = createHash('sha256').update('activity-media-v1:'+ext+':')
   for await (const chunk of createReadStream(input)) fingerprint.update(chunk)
   const hash = fingerprint.digest('hex').slice(0,20)
   // 复用改版前已经生成的网页素材，避免本次迁移重新压缩或转码。
   const legacy = createHash('sha256').update(event.folder+'/'+file+':'+stat.size+':'+stat.mtimeMs+':v1').digest('hex').slice(0,20)
   for (const suffix of ['-480.webp','-1600.webp','.mp4']) {
    if (!existsSync(resolve(output,hash+suffix)) && existsSync(resolve(output,legacy+suffix))) renameSync(resolve(output,legacy+suffix),resolve(output,hash+suffix))
   }
   const small = hash+'-480.webp', full = hash+'-1600.webp', video = hash+'.mp4'
   const isVideo = ['.mp4','.mov'].includes(ext)
   for (const file of [small,full,...(isVideo?[video]:[])]) used.add(file)
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
   const url = 'assets/generated/activities/media/'
   media.push({ file, type:isVideo?'video':'image', preview:url+small, src:url+(isVideo?video:full), poster:isVideo?url+full:undefined })
   webBytes += statSync(resolve(output,small)).size+statSync(resolve(output,full)).size+(isVideo?statSync(resolve(output,video)).size:0)
  }
  if (!media.length) throw new Error('活动没有可展示的素材：'+event.folder)
  const photos=media.filter(item=>item.type==='image').length
  records.push({id:event.id,name,date,dateLabel:date||dateLabel,year:dateLabel.slice(0,4),category:event.category,topic:event.topic,photos,videos:media.length-photos,cover:(event.cover ? media.find(item=>item.file===event.cover) : media[0]).preview,...(event.note?{note:event.note}:{}),media})
  console.log('活动相册：'+name+' · '+media.length+' 个素材')
 }
 // 仅在全部活动生成成功后清理失效缓存，旧素材不会继续被打包。
 for (const file of readdirSync(output)) if (!used.has(file) && statSync(resolve(output,file)).isFile()) unlinkSync(resolve(output,file))
 // 模糊日期只参与粗略排序，页面仍显示原始时间范围。
 records.sort((a,b)=>(b.date||b.year+'-07-01').localeCompare(a.date||a.year+'-07-01'))
 writeFileSync(resolve(root,'assets/generated/activities/manifest.json'), JSON.stringify(records,null,2)+'\n')
 console.log('活动素材：'+(originals/1e6).toFixed(1)+' MB → 网页版 '+(webBytes/1e6).toFixed(1)+' MB')
 return records
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await prepareActivities()
