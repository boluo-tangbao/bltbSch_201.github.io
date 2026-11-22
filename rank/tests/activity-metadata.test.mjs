import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { activityFiles, readActivities } from '../../scripts/activity-metadata.mjs'
import { activityBilibiliVideos, activityBilibiliUrl } from '../../assets/js/activity-videos.js'

test('activity albums include nested media and exclude dedicated covers and hidden files', t => {
 const root=mkdtempSync(resolve(tmpdir(),'activity-files-'))
 t.after(()=>rmSync(root,{recursive:true,force:true}))
 for(const file of ['event/photo-2.jpg','event/photo-10.jpg','event/黑魂2快闪/photo.JPG','event/晚上 音乐only/video.mp4','event/preview/cover.jpg','event/.archive/old.jpg','event/.hidden.jpg','event/event.json']) {
  mkdirSync(resolve(root,file,'..'),{recursive:true})
  writeFileSync(resolve(root,file),'fixture')
 }
 const files=activityFiles('event',root)
 assert.equal(files.length,4)
 for(const file of ['photo-2.jpg','photo-10.jpg','黑魂2快闪/photo.JPG','晚上 音乐only/video.mp4'])assert.ok(files.includes(file),file)
 assert.ok(files.indexOf('photo-2.jpg')<files.indexOf('photo-10.jpg'))
})

test('every activity source folder has valid metadata and displayable media', () => {
 const events=readActivities()
 assert.ok(events.length>0)
 assert.equal(new Set(events.map(event=>event.id)).size,events.length)
 for(const event of events)assert.ok(activityFiles(event.folder).length||activityBilibiliVideos(event).length,event.folder)
})

test('multiple Bilibili clips preserve legacy links and target the correct parts', t => {
 const root=mkdtempSync(resolve(tmpdir(),'activity-multi-parts-'))
 t.after(()=>rmSync(root,{recursive:true,force:true}))
 mkdirSync(resolve(root,'event'))
 writeFileSync(resolve(root,'event/photo.jpg'),'fixture')
 const clip={bvid:'BV1teyGzCEij',page:2,title:'2025 冬日祭'}
 const event={id:'clips-test',name:'分段视频',date:'2026-11-22',topic:'acg',category:'演出',bvid:'BV1ubfqBNE3K',bvidPage:4,bilibiliVideos:[clip]}
 const save=value=>writeFileSync(resolve(root,'event/event.json'),JSON.stringify(value))
 save(event)
 const clips=activityBilibiliVideos(readActivities(root)[0])
 assert.equal(clips.length,2)
 assert.equal(activityBilibiliUrl(clips[0]),'https://www.bilibili.com/video/BV1ubfqBNE3K/?p=4')
 assert.equal(activityBilibiliUrl(clips[1],true),'https://player.bilibili.com/player.html?bvid=BV1teyGzCEij&page=2&autoplay=0')
 for(const value of [[],null,[{...clip,page:0}],[{...clip,bvid:'bad'}],[{...clip,title:''}],[clip,clip],[{...clip,bvid:event.bvid,page:4}]]) {
  save({...event,bilibiliVideos:value})
  assert.throws(()=>readActivities(root),/bilibiliVideos/)
 }
})

test('Bilibili part selection requires a video and a positive integer', t => {
 const root=mkdtempSync(resolve(tmpdir(),'activity-parts-'))
 t.after(()=>rmSync(root,{recursive:true,force:true}))
 mkdirSync(resolve(root,'event'))
 writeFileSync(resolve(root,'event/photo.jpg'),'fixture')
 const event={id:'part-test',name:'分 P 测试',date:'2026-11-22',topic:'acg',category:'演出',bvid:'BV1ubfqBNE3K',bvidPage:4}
 const save=value=>writeFileSync(resolve(root,'event/event.json'),JSON.stringify(value))
 save(event)
 assert.equal(readActivities(root)[0].bvidPage,4)
 for(const bvidPage of [0,-1,1.5,'4',null]) {
  save({...event,bvidPage})
  assert.throws(()=>readActivities(root),/bvidPage/)
 }
 save({...event,bvid:undefined})
 assert.throws(()=>readActivities(root),/bvidPage/)
})
