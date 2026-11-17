import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { activityDraft, initializeActivities } from '../../scripts/init-activities.mjs'
import { missingActivityMetadata, readActivities } from '../../scripts/activity-metadata.mjs'

function fixture(t,folders) {
 const root=mkdtempSync(resolve(tmpdir(),'activity-init-'))
 t.after(()=>rmSync(root,{recursive:true,force:true}))
 for(const folder of folders) {
  mkdirSync(resolve(root,folder))
  writeFileSync(resolve(root,folder,'photo.jpg'),'fixture')
 }
 return root
}

test('drafts preserve uncertain dates and brands, normalize precise dates, and reject invalid dates',()=>{
 const event=activityDraft('2026-5-23：上港vs津门虎')
 assert.equal(event.date,'2026-05-23')
 assert.equal(event.name,'上港 vs 津门虎')
 assert.equal(event.id,activityDraft('2026-5-23：上港vs津门虎').id)
 assert.equal(activityDraft('2026下半年：hololive').name,'hololive')
 assert.equal(activityDraft('2026下半年：活动').date,null)
 assert.equal(activityDraft('2026下半年：活动').dateLabel,'2026下半年')
 assert.equal(activityDraft('2026-5-23：音乐live外场').name,'音乐 Live 外场')
 assert.throws(()=>activityDraft('2026-2-30：活动'),/日期无效/)
 assert.throws(()=>activityDraft('无日期活动'),/目录须为/)
})

test('one check lists every missing folder with the setup entry point',t=>{
 const folders=['2026-1-1：活动甲','2026-1-2：活动乙']
 const root=fixture(t,folders)
 assert.throws(()=>readActivities(root),error=>folders.every(folder=>error.message.includes(folder))&&error.message.includes('补齐活动配置.cmd'))
})

test('setup requires explicit valid choices, writes readable metadata, and preserves existing bytes and IDs',async t=>{
 const folders=['2026-1-1：已有活动','2026-1-2：音乐live']
 const root=fixture(t,folders)
 const existing='{"id":"kept-id","name":"保留","date":"2026-01-01","topics":["sports"],"category":"其他"}\n'
 writeFileSync(resolve(root,folders[0],'event.json'),existing)
 const answers=['','1,1','1,3','','3','y']
 const log=[]
 assert.equal(await initializeActivities(root,async()=>{assert.ok(answers.length);return answers.shift()},line=>log.push(line)),1)
 assert.equal(answers.length,0)
 assert.equal(readFileSync(resolve(root,folders[0],'event.json'),'utf8'),existing)
 const events=readActivities(root)
 assert.deepEqual(events.find(event=>event.name==='音乐 Live').topics,['acg','art'])
 assert.equal(events.find(event=>event.name==='音乐 Live').category,'演出')
 assert.equal(await initializeActivities(root,()=>assert.fail('must not ask again'),()=>{}),0)
})

test('quit, skipped confirmation, and invalid folders do not create accidental public records',async t=>{
 const root=fixture(t,['2026-1-1：甲','2026-1-2：乙','没有日期'])
 const answers=['1','2','n','q']
 assert.equal(await initializeActivities(root,async()=>answers.shift(),()=>{}),0)
 assert.equal(missingActivityMetadata(root).length,3)
})

test('setup offers the new screening category',async t=>{
 const root=fixture(t,['2026-1-1：观影会'])
 const answers=['1','5','y']
 assert.equal(await initializeActivities(root,async()=>answers.shift(),()=>{}),1)
 assert.equal(readActivities(root)[0].category,'观影会')
})
