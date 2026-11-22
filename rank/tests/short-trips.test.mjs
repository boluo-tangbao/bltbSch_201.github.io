import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { prepareShortTrips } from '../../scripts/prepare-short-trips.mjs'

const project = fileURLToPath(new URL('../../', import.meta.url))

test('short trip web assets build without the archived original photos', async t => {
 const root=mkdtempSync(resolve(tmpdir(),'short-trips-'))
 t.after(()=>rmSync(root,{recursive:true,force:true}))
 mkdirSync(resolve(root,'content/short-trips'),{recursive:true})
 cpSync(resolve(project,'content/short-trips/records.json'),resolve(root,'content/short-trips/records.json'))
 cpSync(resolve(project,'assets/short-trips'),resolve(root,'assets/short-trips'),{recursive:true})
 assert.equal(existsSync(resolve(root,'content/pilgrimage')),false)
 const before=JSON.parse(readFileSync(resolve(root,'assets/short-trips/manifest.json'),'utf8'))
 const after=await prepareShortTrips({root})
 assert.deepEqual(after,before)
 assert.equal(after[0].photos.length,9)
 assert.equal(after[0].id,'cixi-20251005')
 for(const photo of after[0].photos)assert.ok(Math.max(photo.width,photo.height)<=1600)
 unlinkSync(resolve(root,after[0].photos[0].src))
 await assert.rejects(prepareShortTrips({root}),/网页副本缺失/)
})
