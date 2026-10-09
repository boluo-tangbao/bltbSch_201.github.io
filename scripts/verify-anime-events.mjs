import { createRequire } from 'node:module'
import { readFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
import { previewServer } from './preview-site.mjs'
const require=createRequire(new URL('../rank/package.json',import.meta.url))
const {chromium}=require('playwright')
const data=JSON.parse(readFileSync(new URL('../data/activities.json',import.meta.url),'utf8'))
assert.equal(data.length,18)
assert.equal(data.filter(e=>e.date).length,17)
assert.equal(data[0].date,'2026-08-29')
assert.equal(data.reduce((n,e)=>n+e.photos,0),142)
assert.equal(data.reduce((n,e)=>n+e.videos,0),7)
assert.equal(data.find(e=>e.id==='arknights-cafe-2025').date,null)
for(const event of data)for(const media of event.media)for(const path of [media.src,media.preview,media.poster].filter(Boolean))assert.ok(existsSync(new URL('../_site/'+path,import.meta.url)))
assert.equal(existsSync(new URL('../_site/images/anime/events',import.meta.url)),false)
const server=await previewServer(4181),browser=await chromium.launch({channel:'msedge',headless:true})
const page=await browser.newPage(),errors=[],failed=[];page.on('pageerror',error=>errors.push(error.message));page.on('response',response=>{if(response.status()>=400)failed.push(response.url())})
const base='http://127.0.0.1:4181/bltbSch_201.github.io/'
mkdirSync(new URL('../test-results/anime-events/',import.meta.url),{recursive:true})
try{
 for(const width of [1440,768,390]){
  await page.setViewportSize({width,height:1000});await page.goto(base+'activities.html?viewport='+width+'#event-records');await page.locator('.event-card').first().waitFor();
  assert.equal(await page.locator('.event-card').count(),18);assert.equal(await page.locator('video').count(),0)
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
  await page.screenshot({path:resolve('test-results/anime-events/index-'+width+'.png')})
  await page.locator('[data-category="快闪与联动"]').click();assert.equal(await page.locator('.event-card').count(),data.filter(e=>e.category==='快闪与联动').length)
  await page.locator('#event-year').selectOption('2026');assert.equal(await page.locator('.event-card').count(),data.filter(e=>e.category==='快闪与联动'&&e.year==='2026').length)
  await page.getByRole('link',{name:'查看 百联推子+MyGO! 快闪，2026-08-29',exact:true}).click();await page.locator('#event-album').waitFor({state:'visible'});assert.equal(await page.locator('.event-media').count(),5)
  await page.locator('.event-media').first().click();await page.locator('#event-dialog[open] img').waitFor();await page.locator('#event-dialog img').evaluate(image=>image.decode());assert.equal(await page.locator('#event-dialog img').evaluate(image=>image.naturalWidth>0),true)
  await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#event-position').innerText(),'2 / 5');await page.keyboard.press('Escape');assert.equal(await page.locator('#event-dialog').evaluate(dialog=>dialog.open),false)
  await page.screenshot({path:resolve('test-results/anime-events/album-'+width+'.png')});await page.locator('.event-back').click();assert.equal(await page.locator('.event-card').count(),data.filter(e=>e.category==='快闪与联动'&&e.year==='2026').length)
 }
 // 每个分享链接都可直接打开，包含模糊日期与纯视频相册。
 for(const event of data){await page.goto(base+'activities.html#event/'+event.id);await page.locator('#event-album').waitFor({state:'visible'});assert.equal(await page.locator('.event-media').count(),event.media.length)}
 await page.goto(base+'activities.html#event/summer-live-2026');await page.locator('.event-media').click();await page.waitForFunction(()=>document.querySelector('#event-dialog video')?.readyState>=1);assert.ok(await page.locator('video').evaluate(v=>v.duration>0));await page.locator('video').evaluate(v=>v.play());await page.waitForFunction(()=>document.querySelector('video')?.currentTime>.25);await page.locator('#event-close').click();await page.locator('video').waitFor({state:'detached'});assert.equal(await page.locator('video').count(),0)
 await page.goto(base+'activities.html#event/not-found');await page.locator('.event-card').first().waitFor();assert.equal(await page.locator('.event-card').count(),18)
 await page.goto(base+'rank/');const link=page.getByRole('link',{name:'活动记录',exact:true});await link.waitFor();await link.click();await page.locator('.event-card').first().waitFor();assert.equal(await page.locator('.event-card').count(),18)
 
 // 模拟未来生活活动，只在测试响应中加入，不写入真实网站数据。
 const life={...data[0],id:'life-fixture',name:'测试生活记录',topic:'life',category:'生活日常'};
 await page.route('**/data/activities.json',route=>route.fulfill({json:[life,...data]}));
 await page.goto(base+'anime.html');await page.locator('#event-preview-grid .event-card').first().waitFor();
 assert.equal(await page.locator('.event-card').count(),3);assert.equal(await page.locator('#event-album').count(),0);
 assert.equal(await page.getByText('测试生活记录',{exact:true}).count(),0);
 const previewLink=page.locator('.event-card').first();assert.ok((await previewLink.getAttribute('href')).startsWith('activities.html?topic=acg#event/'));
 await previewLink.click();await page.locator('#event-album').waitFor({state:'visible'});assert.ok(page.url().includes('activities.html?topic=acg'));
 await page.goto(base+'activities.html?topic=acg#event-records');await page.locator('.event-card').first().waitFor();assert.equal(await page.locator('.event-card').count(),18);assert.equal(await page.getByText('测试生活记录',{exact:true}).count(),0);assert.equal(await page.locator('#event-topic-control').isVisible(),false);assert.equal(await page.locator('#event-total').innerText(),'18');
 await page.goto(base+'activities.html?topic=acg#event/life-fixture');await page.locator('.event-card').first().waitFor();assert.equal(await page.locator('#event-album').isVisible(),false);assert.equal(await page.getByText('测试生活记录',{exact:true}).count(),0);
 await page.goto(base+'activities.html#event-records');await page.locator('.event-card').first().waitFor();assert.equal(await page.locator('.event-card').count(),19);await page.locator('#event-topic').selectOption('life');assert.equal(await page.locator('.event-card').count(),1);await page.locator('.event-card').click();await page.locator('#event-album').waitFor({state:'visible'});assert.equal(await page.locator('#event-album-title').innerText(),'测试生活记录');
 await page.goto(base+'anime.html#event/bailian-mygo-2026');await page.waitForURL('**/activities.html?topic=acg#event/bailian-mygo-2026');await page.locator('#event-album').waitFor({state:'visible'});
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[])

 console.log('验证通过：独立活动页、anime 三场预览、二次元主题隔离、未来生活记录、三种屏宽、筛选、照片视频、分享与 rank 入口。')
}finally{await browser.close();await new Promise(done=>server.close(done))}
