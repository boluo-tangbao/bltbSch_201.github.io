import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { spawn, execFileSync } from 'node:child_process'
import { createReadStream, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const defaultRoot=fileURLToPath(new URL('../',import.meta.url))
const require=createRequire(new URL('../rank/package.json',import.meta.url))
const sharp=require('sharp'),ffmpeg=require('@ffmpeg-installer/ffmpeg').path
const digest=async file=>{const hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk);return hash.digest('hex')}
const run=args=>new Promise((accept,reject)=>{const child=spawn(ffmpeg,args,{windowsHide:true});let error='';child.stderr.on('data',part=>{error=(error+part).slice(-5000)});child.on('error',reject);child.on('close',code=>code===0?accept():reject(new Error(error)))})
const frame=file=>new Promise((accept,reject)=>{const child=spawn(ffmpeg,['-nostdin','-v','error','-ss','1','-i',file,'-frames:v','1','-f','image2pipe','-vcodec','mjpeg','pipe:1'],{windowsHide:true});const chunks=[];let error='';child.stdout.on('data',c=>chunks.push(c));child.stderr.on('data',c=>error+=c);child.on('error',reject);child.on('close',code=>code===0?accept(Buffer.concat(chunks)):reject(new Error(error)))})

export function guangzhouVideoSettings(config,file) {
 const profile=config.videoProfile||'source',segments=config.videoSegments?.[file]||null
 if(!['source','720p'].includes(profile))throw Error('广州视频分辨率配置无效')
 if(segments&&(!Array.isArray(segments)||!segments.length||segments.some(pair=>!Array.isArray(pair)||pair.length!==2||!pair.every(Number.isFinite)||pair[0]<0||pair[1]<=pair[0])))throw Error('广州视频剪辑区间无效')
 return {profile,segments}
}

function probe(file) {
 let text=''
 try{execFileSync(ffmpeg,['-hide_banner','-i',file],{stdio:'pipe',windowsHide:true})}catch(error){text=String(error.stderr)}
 const duration=text.match(/Duration: (\d+):(\d+):([\d.]+)/),size=text.match(/Video:[^\n]*? (\d{2,5})x(\d{2,5})/)
 if(!duration||!size)throw Error('视频规格无法读取：'+file)
 return {duration:+duration[1]*3600+ +duration[2]*60+ +duration[3],width:+size[1],height:+size[2],audio:/Audio:/.test(text)}
}

async function encodeVideo(input,destination,settings) {
 const original=probe(input),segments=settings.segments
 if(segments?.some(pair=>pair[1]>original.duration+0.05))throw Error('剪辑区间超出视频时长')
 const scale=settings.profile==='720p'?"scale='min(1280,iw)':'min(1280,ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2,setsar=1":'setsar=1'
 let filters=[],mapping=['-map','0:v:0','-map','0:a:0?']
 if(segments){
  const n=segments.length
  if(n>1){filters.push(`[0:v:0]split=${n}`+segments.map((_,i)=>`[v${i}]`).join(''));if(original.audio)filters.push(`[0:a:0]asplit=${n}`+segments.map((_,i)=>`[a${i}]`).join(''))}
  segments.forEach(([start,end],i)=>{filters.push(`${n>1?'[v'+i+']':'[0:v:0]'}trim=start=${start}:end=${end},setpts=PTS-STARTPTS,${scale}[vout${i}]`);if(original.audio)filters.push(`${n>1?'[a'+i+']':'[0:a:0]'}atrim=start=${start}:end=${end},asetpts=PTS-STARTPTS[aout${i}]`)})
  if(n>1){filters.push(segments.map((_,i)=>`[vout${i}]`+(original.audio?`[aout${i}]`:'')).join('')+`concat=n=${n}:v=1:a=${original.audio?1:0}[video]`+(original.audio?'[audio]':''));mapping=['-map','[video]',...(original.audio?['-map','[audio]']:[])]}
  else mapping=['-map','[vout0]',...(original.audio?['-map','[aout0]']:[])]
 }
 const temporary=destination.replace(/\.mp4$/,'.tmp.mp4')
 try{
  await run(['-nostdin','-v','error','-y','-threads','4','-i',input,...(filters.length?['-filter_complex',filters.join(';')]:['-vf',scale]),...mapping,'-map_metadata','-1','-vsync','2','-c:v','libx264','-preset','medium','-crf',settings.profile==='720p'?'27':'28','-maxrate',settings.profile==='720p'?'1600k':'2200k','-bufsize','4400k','-threads','4','-pix_fmt','yuv420p','-c:a','aac','-b:a','96k','-movflags','+faststart',temporary])
  const output=probe(temporary),expected=segments?segments.reduce((sum,[start,end])=>sum+end-start,0):original.duration
  if(Math.abs(output.duration-expected)>0.2||settings.profile==='720p'&&Math.max(output.width,output.height)>1280)throw Error('剪辑后视频时长或分辨率不符')
  await run(['-nostdin','-v','error','-threads','2','-i',temporary,'-f','null','-'])
  renameSync(temporary,destination)
 }finally{if(existsSync(temporary))unlinkSync(temporary)}
}

export async function prepareGuangzhouJournal({root=defaultRoot}={}) {
 root=resolve(root)
 const config=JSON.parse(readFileSync(resolve(root,'content/photo-journals/guangzhou.json'),'utf8'))
 const output=resolve(root,'assets/guangzhou'),manifest=resolve(output,'manifest.json')
 const previous=existsSync(manifest)?JSON.parse(readFileSync(manifest,'utf8')):null
 const cached=new Map(previous?.days.flatMap(d=>d.groups.flatMap(g=>g.media.map(m=>[m.file,m])))||[])
 const originalRoot=resolve(root,config.sourceFolder),sourceRel=relative(resolve(root,'content/pilgrimage'),originalRoot)
 if(!sourceRel||sourceRel.startsWith('..')||isAbsolute(sourceRel))throw Error('广州原件目录越界')
 mkdirSync(resolve(output,'media'),{recursive:true})
 const sourceRecords={},seen=new Set(),used=new Set(),days=[]
 for(const day of config.days){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day.date)||!Number.isFinite(Date.parse(day.date))||new Date(day.date).toISOString().slice(0,10)!==day.date)throw Error('广州日期无效')
  const groups=[]
  for(const group of day.groups){
   const media=[]
   for(const file of group.files){
    const input=resolve(originalRoot,file),rel=relative(originalRoot,input)
    if(!rel||rel.startsWith('..')||isAbsolute(rel)||seen.has(file)||!/^1\.(18|19|20|21)\/.+\.(jpg|png|mp4)$/i.test(file))throw Error('广州素材重复或路径无效：'+file)
    seen.add(file)
    let item
    if(existsSync(input)){
     const originalSha256=await digest(input),video=/\.mp4$/i.test(file)
     const settings=video?guangzhouVideoSettings(config,file):null
     const signature=video?':guangzhou-video-v2:'+JSON.stringify(settings):':guangzhou-web-v1-h264-crf28-medium-vfr'
     const hash=createHash('sha256').update(originalSha256+signature).digest('hex').slice(0,20)
     const base='assets/guangzhou/media/'+hash
     let bytes,trimBottom=0
     if(video){
      if(!existsSync(resolve(root,base+'.mp4'))){
       console.log('广州视频转码／剪辑（'+settings.profile+'）：'+file)
       await encodeVideo(input,resolve(root,base+'.mp4'),settings)
      }
      if(!existsSync(resolve(root,base+'-480.webp'))||!existsSync(resolve(root,base+'-1600.webp')))bytes=await frame(resolve(root,base+'.mp4'))
     }else{
      bytes=readFileSync(input)
      const info=await sharp(bytes).metadata()
      if(info.width===3072&&info.height>=4600&&info.height<=4700)trimBottom=info.height-4096
      else if(info.width===4096&&info.height>=3600&&info.height<=3700)trimBottom=info.height-3072
     }
     for(const size of [480,1600])if(!existsSync(resolve(root,base+'-'+size+'.webp'))){
      let image=sharp(bytes).rotate()
      if(trimBottom){const info=await sharp(bytes).metadata();image=image.extract({left:0,top:0,width:info.width,height:info.height-trimBottom})}
      await image.resize({width:size,height:size,fit:'inside',withoutEnlargement:true}).webp({quality:size===480?78:85}).toFile(resolve(root,base+'-'+size+'.webp'))
     }
     const info=await sharp(resolve(root,base+'-1600.webp')).metadata()
     item={id:createHash('sha256').update(file).digest('hex').slice(0,16),file,type:video?'video':'image',preview:base+'-480.webp',src:base+(video?'.mp4':'-1600.webp'),...(video?{poster:base+'-1600.webp',videoSettings:settings}:{}),width:info.width,height:info.height}
     sourceRecords[file]={sha256:originalSha256,trimBottom,...(video?{videoSettings:settings}:{})}
    }else{
     item=cached.get(file)
     if(!item)throw Error('缺少广州素材原件和网页副本：'+file)
     if(item.type==='video'&&JSON.stringify(item.videoSettings)!==JSON.stringify(guangzhouVideoSettings(config,file)))throw Error('广州视频编辑参数已更改，需要原件重新生成：'+file)
    }
    for(const url of [item.src,item.preview,item.poster].filter(Boolean)){
     if(!/^assets\/guangzhou\/media\/[a-f0-9]{20}(?:-(?:480|1600)\.webp|\.mp4)$/.test(url)||!existsSync(resolve(root,url)))throw Error('广州网页副本缺失或路径无效：'+url)
     used.add(url.split('/').at(-1))
    }
    const pick=group.picks.find(p=>p.file===file)
    media.push({...item,caption:pick?.title||group.label+' · '+(item.type==='video'?'现场片段':'照片')+' '+(media.length+1)})
   }
   for(const pick of group.picks)if(!media.some(m=>m.file===pick.file&&m.type==='image'))throw Error('广州精选照片不在本组：'+pick.file)
   groups.push({...group,files:undefined,media})
  }
  if(!groups.some(g=>g.media.some(m=>m.file===day.cover)))throw Error('广州每日封面缺失')
  days.push({...day,groups})
 }
 const result={id:config.id,title:config.title,subtitle:config.subtitle,days}
 for(const file of Object.keys(config.videoSegments||{}))if(!seen.has(file))throw Error('视频剪辑配置指向未收录素材：'+file)
 writeFileSync(manifest,JSON.stringify(result,null,2)+'\n')
 const audit=resolve(root,'data/guangzhou-source-hashes.json')
 mkdirSync(resolve(root,'data'),{recursive:true})
 const prior=existsSync(audit)?JSON.parse(readFileSync(audit,'utf8')):{}
 writeFileSync(audit,JSON.stringify({...prior,...sourceRecords},null,2)+'\n')
 let removed=0
 for(const file of readdirSync(resolve(output,'media'))){
  const target=resolve(output,'media',file)
  if(/^[a-f0-9]{20}(?:-(?:480|1600)\.webp|\.mp4)$/.test(file)&&!used.has(file)){
   if(!lstatSync(target).isFile()||lstatSync(target).isSymbolicLink())throw Error('拒绝清理非普通广州衍生文件')
   unlinkSync(target);removed++
  }
 }
 let bytes=0;for(const file of readdirSync(resolve(output,'media')))bytes+=readFileSync(resolve(output,'media',file)).length
 if(removed)console.log('已清理 '+removed+' 个失效广州网页副本。')
 console.log(`广州手记：${days.length} 天、${seen.size} 份素材，网页素材 ${(bytes/1e6).toFixed(2)} MB；原件未覆盖。`)
 return result
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await prepareGuangzhouJournal()
