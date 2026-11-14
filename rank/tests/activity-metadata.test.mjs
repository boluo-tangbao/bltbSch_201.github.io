import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { activityFiles, readActivities } from '../../scripts/activity-metadata.mjs'

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
 for(const event of events)assert.ok(activityFiles(event.folder).length||event.bvid,event.folder)
})
