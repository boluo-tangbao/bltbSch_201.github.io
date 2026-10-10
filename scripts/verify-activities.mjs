import { createHash } from 'node:crypto'
import { activityRoot, activityFiles, readActivities } from './activity-metadata.mjs'
import { createRequire } from 'node:module'
import { readFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, extname } from 'node:path'
import assert from 'node:assert/strict'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { previewServer, previewBase } from './preview-site.mjs'
const require=createRequire(new URL('../rank/package.json',import.meta.url))
const {chromium}=require('playwright')
const data=JSON.parse(readFileSync(new URL('../assets/generated/activities/manifest.json',import.meta.url),'utf8'))
const source=readActivities(), acg=data.filter(e=>e.topic==='acg')
const photoEvent=data.find(e=>e.media.filter(m=>m.type==='image').length>=2), videoEvent=data.find(e=>e.media.some(m=>m.type==='video'))
assert.ok(photoEvent);assert.ok(videoEvent)
assert.equal(data.length,source.length)
assert.deepEqual(new Set(data.map(e=>e.id)),new Set(source.map(e=>e.id)))
for(const event of source) {
 const record=data.find(e=>e.id===event.id),files=activityFiles(event.folder)
 assert.equal(record.topic,event.topic);assert.equal(record.category,event.category);assert.equal(record.date,event.date);assert.equal(record.dateLabel,event.date||event.dateLabel)
 assert.equal(record.photos,files.filter(f=>!['.mp4','.mov'].includes(extname(f).toLowerCase())).length)
 assert.equal(record.videos,files.filter(f=>['.mp4','.mov'].includes(extname(f).toLowerCase())).length)
 assert.deepEqual(record.media.map(m=>m.file),files)
 for(const media of record.media)for(const path of [media.src,media.preview,media.poster].filter(Boolean))assert.ok(existsSync(new URL('../_site/'+path,import.meta.url)))
}
for(const path of ['content','images/anime/events','images/anime/event-web','scripts','docs'])assert.equal(existsSync(new URL('../_site/'+path,import.meta.url)),false)
const baseline=new URL('../test-results/activity-migration-before.json',import.meta.url)
if(process.argv.includes('--migration')&&existsSync(baseline)) {
 const before=JSON.parse(readFileSync(baseline,'utf8'))
 const current=source.flatMap(e=>activityFiles(e.folder).map(file=>({folder:e.folder,file})))
 assert.equal(current.length,before.length)
 for(const file of before)assert.equal(createHash('sha256').update(readFileSync(resolve(activityRoot,file.folder,file.file))).digest('hex'),file.sha256)
 console.log('迁移核验：全部 '+before.length+' 个原始媒体文件 SHA-256 一致。')
}
if(process.argv.includes('--static')) {console.log('活动元数据、源素材数量、网页素材及部署原素材排除验证通过。');process.exit(0)}
const server=await previewServer(4181),browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'msedge',headless:true})
const page=await browser.newPage(),errors=[],failed=[];page.on('pageerror',error=>errors.push(error.message));page.on('response',response=>{if(response.status()>=400)failed.push(response.url())})
const base='http://127.0.0.1:4181'+previewBase
mkdirSync(new URL('../test-results/activities/',import.meta.url),{recursive:true})
let devServer
try{
 for(const width of [1440,768,390]){
  await page.setViewportSize({width,height:1000});await page.goto(base+'activities.html?viewport='+width+'#event-records');await page.locator('.event-card').first().waitFor();
  assert.equal(await page.locator('.event-card').count(),data.length);assert.equal(await page.locator('video').count(),0)
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
  await page.screenshot({path:resolve('test-results/activities/index-'+width+'.png')})
  await page.locator('[data-category="'+photoEvent.category+'"]').click();assert.equal(await page.locator('.event-card').count(),data.filter(e=>e.category===photoEvent.category).length)
  await page.locator('#event-year').selectOption(photoEvent.year);assert.equal(await page.locator('.event-card').count(),data.filter(e=>e.category===photoEvent.category&&e.year===photoEvent.year).length)
  await page.getByRole('link',{name:'查看 '+photoEvent.name+'，'+photoEvent.dateLabel,exact:true}).click();await page.locator('#event-album').waitFor({state:'visible'});assert.equal(await page.locator('.event-media').count(),photoEvent.media.length)
  await page.locator('.event-media').nth(photoEvent.media.findIndex(m=>m.type==='image')).click();await page.locator('#event-dialog[open] img').waitFor();await page.locator('#event-dialog img').evaluate(image=>image.decode());assert.equal(await page.locator('#event-dialog img').evaluate(image=>image.naturalWidth>0),true)
  await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#event-position').innerText(),(photoEvent.media.findIndex(m=>m.type==='image')+2)+' / '+photoEvent.media.length);await page.keyboard.press('Escape');assert.equal(await page.locator('#event-dialog').evaluate(dialog=>dialog.open),false)
  await page.screenshot({path:resolve('test-results/activities/album-'+width+'.png')});await page.locator('.event-back').click();assert.equal(await page.locator('.event-card').count(),data.filter(e=>e.category===photoEvent.category&&e.year===photoEvent.year).length)
 }
 // 每个分享链接都可直接打开，包含模糊日期与纯视频相册。
 for(const event of data){await page.goto(base+'activities.html#event/'+event.id);await page.locator('#event-album').waitFor({state:'visible'});assert.equal(await page.locator('.event-media').count(),event.media.length)}
 await page.goto(base+'activities.html#event/'+videoEvent.id);await page.locator('.event-media').nth(videoEvent.media.findIndex(m=>m.type==='video')).click();await page.waitForFunction(()=>document.querySelector('#event-dialog video')?.readyState>=1);assert.ok(await page.locator('video').evaluate(v=>v.duration>0));await page.locator('video').evaluate(v=>v.play());await page.waitForFunction(()=>document.querySelector('video')?.currentTime>.25);await page.locator('#event-close').click();await page.locator('video').waitFor({state:'detached'});assert.equal(await page.locator('video').count(),0)
 await page.goto(base+'activities.html#event/not-found');await page.locator('.event-card').first().waitFor();assert.equal(await page.locator('.event-card').count(),data.length)
 await page.goto(base+'rank/');const link=page.getByRole('link',{name:'活动记录',exact:true});await link.waitFor();await link.click();await page.locator('.event-card').first().waitFor();assert.equal(await page.locator('.event-card').count(),acg.length)
 
 // 模拟未来生活活动，只在测试响应中加入，不写入真实网站数据。
 const life={...data[0],id:'life-fixture',name:'测试生活记录',topic:'life',category:'生活日常'};
 await page.route('**/assets/generated/activities/manifest.json',route=>route.fulfill({json:[life,...data]}));
 await page.goto(base+'anime.html');await page.locator('#event-preview-grid .event-card').first().waitFor();
 assert.equal(await page.locator('.event-card').count(),Math.min(3,acg.length));assert.equal(await page.locator('#event-album').count(),0);
 assert.equal(await page.getByText('测试生活记录',{exact:true}).count(),0);
 const previewLink=page.locator('.event-card').first();assert.ok((await previewLink.getAttribute('href')).startsWith('activities.html?topic=acg#event/'));
 await previewLink.click();await page.locator('#event-album').waitFor({state:'visible'});assert.ok(page.url().includes('activities.html?topic=acg'));
 await page.goto(base+'activities.html?topic=acg#event-records');await page.locator('.event-card').first().waitFor();assert.equal(await page.locator('.event-card').count(),acg.length);assert.equal(await page.getByText('测试生活记录',{exact:true}).count(),0);assert.equal(await page.locator('#event-topic-control').isVisible(),false);assert.equal(await page.locator('#event-total').innerText(),String(acg.length));
 await page.goto(base+'activities.html?topic=acg#event/life-fixture');await page.locator('.event-card').first().waitFor();assert.equal(await page.locator('#event-album').isVisible(),false);assert.equal(await page.getByText('测试生活记录',{exact:true}).count(),0);
 await page.goto(base+'activities.html#event-records');await page.locator('.event-card').first().waitFor();assert.equal(await page.locator('.event-card').count(),data.length+1);await page.locator('#event-topic').selectOption('life');assert.equal(await page.locator('.event-card').count(),data.filter(e=>e.topic==='life').length+1);await page.getByRole('link',{name:'查看 '+life.name+'，'+life.dateLabel,exact:true}).click();await page.locator('#event-album').waitFor({state:'visible'});assert.equal(await page.locator('#event-album-title').innerText(),'测试生活记录');
 await page.goto(base+'anime.html#event/'+acg[0].id);await page.waitForURL('**/activities.html?topic=acg#event/'+acg[0].id);await page.locator('#event-album').waitFor({state:'visible'});
 await page.unroute('**/assets/generated/activities/manifest.json');
 // 全部五个主题、主题内类型和年份；只拦截响应，不写入真实数据。
 const fixtures=['sports','art','travel','life'].map(topic=>({...data[0],id:topic+'-fixture',name:'测试'+topic,topic,category:'测试分类'}));
 await page.route('**/assets/generated/activities/manifest.json',route=>route.fulfill({json:[...fixtures,...data]}));
 for(const topic of ['acg','sports','art','travel','life']) {
  const expected=[...fixtures,...data].filter(e=>e.topic===topic);
  await page.goto(base+'activities.html?topic='+topic+'#event-records');await page.locator('.event-card').first().waitFor();
  assert.equal(await page.locator('.event-card').count(),expected.length);
  assert.equal(await page.locator('#event-topic-control').isVisible(),false);
  const target=expected[0];await page.locator('#event-year').selectOption(target.year);
  await page.locator('[data-category="'+target.category+'"]').click();
  assert.equal(await page.locator('.event-card').count(),expected.filter(e=>e.year===target.year&&e.category===target.category).length);
  await page.locator('.event-card').first().click();await page.locator('#event-album').waitFor({state:'visible'});
  await page.locator('.event-back').click();await page.locator('#event-album').waitFor({state:'hidden'});
  await page.goto(base+'activities.html#event-records');await page.locator('.event-card').first().waitFor();await page.locator('#event-topic').selectOption(topic);assert.equal(await page.locator('.event-card').count(),expected.length);
 }
 await page.unroute('**/assets/generated/activities/manifest.json');
 // 预览关闭仍有二次元列表入口，旧相册链接仍跳转。
 await page.route('**/anime.html',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('data-preview-count="3"','data-preview-count="0"')})});
 await page.goto(base+'anime.html');await page.waitForLoadState('networkidle');assert.equal(await page.locator('.event-preview').isVisible(),false);assert.ok(await page.locator('a[href="activities.html?topic=acg#event-records"]').count());
 await page.goto(base+'anime.html#event/'+acg[0].id);await page.waitForURL('**/activities.html?topic=acg#event/'+acg[0].id);await page.locator('#event-album').waitFor({state:'visible'});
 await page.unroute('**/anime.html');
 // 所有主站页面、导航与 CSS/JS/图片引用可以访问。
 for(const file of ['index.html','sports.html','art.html','anime.html','travel.html','activities.html']) {
  await page.goto(base+file);await page.waitForLoadState('networkidle');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  const refs=await page.locator('[src],link[rel="stylesheet"],a[href]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('src')||n.getAttribute('href')).filter(Boolean));
  for(const ref of new Set(refs))if(!/^(https?:|#|mailto:)/.test(ref)){const response=await page.request.get(new URL(ref,base+file).href);assert.ok(response.ok(),file+': '+ref);}
 }
 // 验证 rank 开发环境也能实际读取迁移后的主站页面、清单及媒体。
 const {createServer}=await import(pathToFileURL(require.resolve('vite')).href);
 const previousBase=process.env.SITE_BASE;
 try {
  process.env.SITE_BASE=previewBase+'rank/';
  devServer=await createServer({root:fileURLToPath(new URL('../rank/',import.meta.url)),configFile:fileURLToPath(new URL('../rank/vite.config.ts',import.meta.url)),server:{host:'127.0.0.1',port:4182,strictPort:true}});
 } finally {if(previousBase===undefined)delete process.env.SITE_BASE;else process.env.SITE_BASE=previousBase;}
 await devServer.listen();
 const devBase='http://127.0.0.1:4182'+previewBase;
 for(const file of ['index.html','sports.html','art.html','anime.html','travel.html','activities.html','assets/css/style.css','assets/js/activities.js','assets/generated/activities/manifest.json',videoEvent.media.find(m=>m.type==='video').src])assert.ok((await page.request.get(devBase+file)).ok(),file);
 await page.goto(devBase+'rank/');const devLink=page.getByRole('link',{name:'活动记录',exact:true});await devLink.waitFor();await devLink.click();await page.locator('.event-card').first().waitFor();assert.equal(await page.locator('.event-card').count(),acg.length);
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[])

 console.log('验证通过：原素材完整、页面资源、五主题筛选、预览开关与旧链接、三种屏宽、照片视频、分享与 rank 入口。')
}finally{if(devServer)await devServer.close();await browser.close();await new Promise(done=>server.close(done))}
