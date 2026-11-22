import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { prepareGuangzhouJournal, guangzhouVideoSettings } from '../../scripts/prepare-guangzhou-journal.mjs'

const root=fileURLToPath(new URL('../../',import.meta.url))
const read=file=>JSON.parse(readFileSync(resolve(root,file),'utf8'))

test('Guangzhou preserves the selected four days, 97 photos, five videos and valid story selections',()=>{
 const config=read('content/photo-journals/guangzhou.json'),trip=read('assets/guangzhou/manifest.json')
 assert.deepEqual(trip.days.map(d=>d.date),['2026-01-18','2026-01-19','2026-01-20','2026-01-21'])
 const media=trip.days.flatMap(d=>d.groups.flatMap(g=>g.media))
 assert.equal(media.filter(m=>m.type==='image').length,97)
 assert.equal(media.filter(m=>m.type==='video').length,5)
 assert.equal(new Set(media.map(m=>m.id)).size,media.length)
 assert.deepEqual(media.map(m=>m.file),config.days.flatMap(d=>d.groups.flatMap(g=>g.files)))
 for(const day of trip.days){
  assert.ok(day.groups.some(g=>g.media.some(m=>m.file===day.cover)))
  for(const g of day.groups){
   assert.ok(g.media.length||g.note||g.link)
   for(const p of g.picks)assert.ok(g.media.some(m=>m.file===p.file&&m.type==='image'))
   for(const m of g.media)for(const file of [m.src,m.preview,m.poster].filter(Boolean))assert.ok(existsSync(resolve(root,file)))
  }
 }
 const links=trip.days.flatMap(d=>d.groups.flatMap(g=>g.link?[g.link.href]:[]))
 for(const id of ['guangzhou-shop-001','guangzhou-shop-002','guangzhou-shop-004'])assert.ok(links.includes('rank/guide/#/place/'+id))
 assert.equal(trip.days.at(-1).groups.at(-1).period,'返程')
 assert.equal(trip.days[0].groups.at(-1).media.length,0)
 for(const m of media.filter(m=>m.type==='video'))assert.deepEqual(m.videoSettings,guangzhouVideoSettings(config,m.file))
})

test('video edit settings preserve ordered disjoint segments and reject invalid ranges',()=>{
 const file='clip.mp4',segments=[[0,5],[35,70]]
 assert.deepEqual(guangzhouVideoSettings({videoProfile:'720p',videoSegments:{[file]:segments}},file),{profile:'720p',segments})
 for(const value of [[],[[70,35]],[[-1,5]],[[0,0]],[[0,Infinity]],[[0]],'bad'])assert.throws(()=>guangzhouVideoSettings({videoSegments:{[file]:value}},file),/剪辑区间/)
 assert.throws(()=>guangzhouVideoSettings({videoProfile:'360p'},file),/分辨率/)
})

test('Guangzhou builds from committed web assets without any local original archive',async t=>{
 const fixture=mkdtempSync(resolve(tmpdir(),'guangzhou-journal-'))
 t.after(()=>rmSync(fixture,{recursive:true,force:true}))
 mkdirSync(resolve(fixture,'content/photo-journals'),{recursive:true})
 cpSync(resolve(root,'content/photo-journals/guangzhou.json'),resolve(fixture,'content/photo-journals/guangzhou.json'))
 cpSync(resolve(root,'assets/guangzhou'),resolve(fixture,'assets/guangzhou'),{recursive:true})
 const unused=resolve(fixture,'assets/guangzhou/media/00000000000000000000.mp4')
 writeFileSync(unused,'unused old derived video')
 assert.equal(existsSync(resolve(fixture,'content/pilgrimage')),false)
 const output=await prepareGuangzhouJournal({root:fixture})
 assert.equal(existsSync(unused),false)
 assert.deepEqual(JSON.parse(JSON.stringify(output)),read('assets/guangzhou/manifest.json'))
 const settingsFile=resolve(fixture,'content/photo-journals/guangzhou.json'),config=JSON.parse(readFileSync(settingsFile,'utf8'))
 const originalProfile=config.videoProfile
 config.videoProfile='source'
 writeFileSync(settingsFile,JSON.stringify(config))
 await assert.rejects(prepareGuangzhouJournal({root:fixture}),/编辑参数已更改/)
 config.videoProfile=originalProfile;writeFileSync(settingsFile,JSON.stringify(config))
 unlinkSync(resolve(fixture,output.days[0].groups[0].media[0].src))
 await assert.rejects(prepareGuangzhouJournal({root:fixture}),/网页副本缺失/)
})
