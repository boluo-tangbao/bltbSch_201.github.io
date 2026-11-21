import assert from 'node:assert/strict';import {createServer} from 'node:http';import {readFileSync,existsSync,statSync,mkdirSync} from 'node:fs';import {resolve,extname,sep} from 'node:path';import {createHash} from 'node:crypto';import {createRequire} from 'node:module';
const root=process.argv.includes('--published')?resolve('_site'):process.cwd(),require=createRequire(new URL('../rank/package.json',import.meta.url)),{chromium,expect}=require('@playwright/test'),data=JSON.parse(readFileSync(resolve(root,'assets/generated/japan-travel/manifest.json'),'utf8'));
const images=data.records.flatMap(row=>row.sections.flatMap(section=>section.images));assert.equal(images.length,data.photos);for(const image of images){const file=resolve(root,image.src);assert.ok(existsSync(file),image.src);assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'),image.sha256);}
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png'};const server=createServer((req,res)=>{const file=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+sep)||!existsSync(file)||!statSync(file).isFile()){res.writeHead(404).end();return;}res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');res.end(readFileSync(file));});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port+'/';let browser;
try{browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'msedge',headless:true});mkdirSync('test-results/pilgrimage',{recursive:true});for(const width of [390,768,1440]){const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage(),errors=[],missing=[],requests=[];page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});page.on('request',r=>requests.push(r.url()));await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
await page.goto(base+'japan-travel.html');await page.locator('.jm-marker').first().waitFor();
assert.equal(await page.locator('[data-view="map"]').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('.jm-place').count(),7);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
assert.ok((await page.locator('.jm-caption').innerText()).includes('并非精确拍摄点'));assert.ok((await page.locator('.jm-total').innerText()).includes('3 个参考地点'));
await page.getByLabel('参考地点',{exact:true}).uncheck();assert.equal(await page.locator('.jm-place').count(),4);await page.getByLabel('参考地点',{exact:true}).check();
await page.mouse.move(1,1);await page.waitForTimeout(900);if(width===390||width===1440)await page.screenshot({path:'test-results/pilgrimage/japan-map-'+width+'.png',fullPage:true});
await page.locator('#j-work').selectOption('吹响吧！上低音号');assert.equal(await page.locator('.jm-place').count(),3);assert.ok((await page.locator('#j-count').innerText()).includes('0 组个人记录'));
await page.locator('.jm-place').first().click();assert.ok((await page.locator('.jm-selection').innerText()).includes('本站暂无此地点的个人到访记录'));assert.ok((await page.locator('.jm-selection').innerText()).includes('Google Maps'));
assert.ok((await page.locator('.jm-selection a').first().getAttribute('href')).startsWith('https://anitabi.cn/map?bangumiId=115908'));
await page.mouse.move(1,1);await page.waitForTimeout(900);if(width===390)await page.screenshot({path:'test-results/pilgrimage/japan-map-reference-mobile.png',fullPage:true});
const beforeZoom=await page.locator('.jm-land').getAttribute('transform');await page.getByRole('button',{name:'放大地图',exact:true}).click();assert.notEqual(await page.locator('.jm-land').getAttribute('transform'),beforeZoom);
await page.locator('.jm-canvas').scrollIntoViewIfNeeded();const rect=await page.locator('.jm-canvas').boundingBox(),beforeDrag=await page.locator('.jm-land').getAttribute('transform');await page.mouse.move(rect.x+rect.width/2,rect.y+80);await page.mouse.down();await page.mouse.move(rect.x+rect.width/2+35,rect.y+100,{steps:5});await page.mouse.up();assert.notEqual(await page.locator('.jm-land').getAttribute('transform'),beforeDrag);
if(width===390){const cdp=await context.newCDPSession(page),beforePinch=await page.locator('.jm-land').getAttribute('transform'),cx=rect.x+rect.width/2,cy=rect.y+rect.height/2;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cx-20,y:cy},{x:cx+20,y:cy}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx-65,y:cy},{x:cx+65,y:cy}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.notEqual(await page.locator('.jm-land').getAttribute('transform'),beforePinch);await cdp.detach();}
await page.locator('.jm-canvas').focus();const beforePan=await page.locator('.jm-land').getAttribute('transform');await page.keyboard.press('ArrowRight');assert.notEqual(await page.locator('.jm-land').getAttribute('transform'),beforePan);await page.keyboard.press('Home');
const fullTransform=await page.locator('.jm-land').getAttribute('transform');await page.locator('.jm-cluster').first().click();assert.notEqual(await page.locator('.jm-land').getAttribute('transform'),fullTransform);
await page.locator('.jm-reference').first().click();assert.ok((await page.locator('.jm-selection h3').innerText()).length>0);
await page.locator('#j-work').selectOption('');await page.locator('.jm-place[data-point="area-chiba"]').click();assert.ok((await page.locator('.jm-selection').innerText()).includes('2 组记录'));
await page.locator('.jm-primary').click();await page.locator('#j-detail .j-card').first().waitFor();assert.equal(await page.locator('#j-detail .j-card').count(),2);await page.goBack();await page.locator('.jm-canvas').waitFor();
await page.locator('[data-view="cities"]').click();await page.locator('.j-card').first().waitFor();assert.equal(await page.locator('.j-card').count(),data.cities.length);assert.ok((await page.locator('#j-count').innerText()).includes(data.photos+' 张'));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok(requests.filter(url=>url.includes('/media/')).length<images.length);
if(width===390){
  assert.ok(await page.locator('.j-tabs').evaluate(tabs=>tabs.getBoundingClientRect().top>=0));
  assert.ok(await page.locator('#j-grid h3').first().evaluate(heading=>heading.getBoundingClientRect().bottom<=innerHeight));
}
await expect(page.locator('#j-grid img')).toHaveCount(0);
if(width===390)await page.screenshot({path:'test-results/pilgrimage/japan-cities-mobile.png',fullPage:true});if(width===1440)await page.screenshot({path:'test-results/pilgrimage/japan-cities-desktop.png',fullPage:true});
await page.locator('[data-view="records"]').click();
const records=page.locator('#j-grid .j-card'),more=page.getByRole('button',{name:'查看全部',exact:true});
const initialCount=Math.min(5,data.records.length);
await expect(records).toHaveCount(initialCount);
assert.ok(await page.locator('#j-grid .j-cover').first().evaluate(img=>{
  const box=img.getBoundingClientRect(),frame=img.parentElement.getBoundingClientRect();
  return Math.abs(frame.width/frame.height-16/9)<.002&&Math.abs(box.height/frame.height-2)<.002&&Math.abs(box.bottom-frame.bottom)<.1;
}));
let shown=initialCount;
while(shown<data.records.length){
  const previousCount=shown;
  await more.click();
  shown=Math.min(shown+5,data.records.length);
  await expect(records).toHaveCount(shown);
  await expect(records.nth(previousCount)).toBeFocused();
  assert.deepEqual(await records.evaluateAll(cards=>cards.map(card=>card.hash)),data.records.slice(0,shown).map(record=>'#record/'+record.id));
}
await expect(more).toBeHidden();
await records.last().click();
await page.locator('#j-detail .j-title').waitFor();
await page.goBack();
await expect(records).toHaveCount(data.records.length);
await page.locator('#j-search').fill('305');assert.equal(await records.count(),1);await expect(more).toBeHidden();await page.locator('#j-search').fill('オーベル');assert.equal(await records.count(),1);await page.locator('#j-search').fill('');await expect(records).toHaveCount(initialCount);await page.locator('#j-work').selectOption('Ave Mujica');assert.equal(await records.count(),1);await page.locator('#j-work').selectOption('MyGO');assert.equal(await records.count(),1);await page.locator('#j-work').selectOption('');await page.locator('#j-city').selectOption('chiba');assert.equal(await records.count(),2);await page.reload();await records.first().waitFor();assert.equal(await page.locator('#j-city').inputValue(),'chiba');assert.equal(await records.count(),2);await page.locator('#j-search').fill('不存在的记录');await page.locator('#j-clear').click();await expect(records).toHaveCount(initialCount);
await page.locator('[data-view="cities"]').click();await page.locator('.j-card[href="#city/tokyo"]').click();await page.locator('#j-detail .j-card').first().waitFor();assert.equal(await page.locator('#j-detail .j-card').count(),data.records.filter(row=>row.cityId==='tokyo').length);await page.locator('.j-card[href="#record/tokyo-mygo-mujica"]').click();await page.locator('.j-photo').first().waitFor();const combined=data.records.find(row=>row.id==='tokyo-mygo-mujica');assert.equal(await page.locator('.j-photo').count(),combined.photos);assert.equal(await page.locator('.j-section').count(),combined.sections.length);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('.j-photo button').first().click();await page.locator('#j-viewer-body img').evaluate(image=>image.decode());assert.ok(await page.locator('#j-viewer-body img').evaluate(image=>image.naturalWidth>0));await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#j-position').innerText(),'2 / '+combined.photos);await page.keyboard.press('Escape');assert.equal(await page.locator('#j-viewer').evaluate(dialog=>dialog.open),false);
await page.goBack();await page.locator('#j-detail .j-card').first().waitFor();await page.goForward();await page.locator('.j-photo').first().waitFor();await page.reload();await page.locator('.j-photo').first().waitFor();assert.equal(await page.locator('.j-photo').count(),combined.photos);if(width===390){await page.locator('.j-photo img').evaluateAll(images=>Promise.all(images.filter(image=>image.getBoundingClientRect().top<innerHeight+200&&image.getBoundingClientRect().bottom>0).map(image=>{if(!image.src)image.src=image.dataset.src;return image.decode();})));await page.screenshot({path:'test-results/pilgrimage/japan-record-mobile.png'});}
await page.goto(base+'japan-travel.html#record/chiba-oregairu');await page.locator('.j-photo').first().waitFor();assert.equal(await page.locator('.j-large-placeholder').count(),2);await page.getByRole('button',{name:'查看 八雪桥1',exact:true}).click();assert.equal(await page.locator('#j-viewer-body img').count(),0);assert.ok(await page.locator('#j-viewer-body a').getAttribute('href'));await page.keyboard.press('Escape');
await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw Error('test')}}}));await page.getByRole('button',{name:'复制记录链接'}).click();assert.equal(await page.locator('.j-share-url').inputValue(),base+'japan-travel.html#record/chiba-oregairu');assert.ok((await page.locator('#j-sources').innerText()).includes('作者本人拍摄'));assert.ok((await page.locator('#j-trip').innerText()).includes('2026-08-13'));
await page.goto(base+'japan-travel.html#record/unknown');await page.getByRole('heading',{name:'没有找到这条旅行记录'}).waitFor();await page.goto(base+'pilgrimage.html');await page.waitForURL('**/japan-travel.html?view=records');await expect(records).toHaveCount(initialCount);assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);await context.close();}
const listing=await browser.newPage({viewport:{width:390,height:844}});
const listingRequests=[];
listing.on('request',request=>listingRequests.push(request.url()));
const firstRecordCover=data.records[0].cover;
let releaseCover;
const coverGate=new Promise(resolve=>{releaseCover=resolve;});
await listing.route(base+firstRecordCover,async route=>{await coverGate;await route.abort();});
try{
  await listing.goto(base+'japan-travel.html?view=cities');
  await expect(listing.locator('#j-grid h3').first()).toHaveText(data.cities[0].name);
  await expect(listing.locator('#j-grid img')).toHaveCount(0);
  assert.deepEqual(listingRequests.filter(url=>url.includes('/media/')),[]);
  await listing.locator('[data-view="records"]').click();
  await expect(listing.locator('#j-grid .j-card')).toHaveCount(Math.min(5,data.records.length));
  await expect.poll(()=>listingRequests.filter(url=>url.includes('/media/'))).toEqual([base+firstRecordCover]);
  assert.equal(listingRequests.some(url=>url.endsWith('/japan-boundary.geojson')),false);
  releaseCover();
  await expect(listing.locator('#j-grid .j-cover').nth(1)).toHaveAttribute('src',/\/media\//);
  await listing.locator('[data-view="map"]').click();
  await listing.locator('.jm-marker').first().waitFor();
  assert.equal(listingRequests.filter(url=>url.endsWith('/japan-boundary.geojson')).length,1);
}finally{releaseCover();await listing.close();}
const fallback=await browser.newPage();await fallback.route('**/assets/data/pilgrimage-map.json',route=>route.abort());await fallback.goto(base+'japan-travel.html');await fallback.locator('#j-map').getByText('地图暂时未能加载，可以切换到「按城市」或「全部记录」继续浏览。').waitFor();await fallback.locator('[data-view="cities"]').click();await fallback.locator('.j-card').first().waitFor();assert.equal(await fallback.locator('.j-card').count(),data.cities.length);await fallback.close();
console.log('PASS: all '+images.length+' published original hashes; 390/768/1440 layouts; cities, combined works, filename/notes search, filters/reload, native back/forward, offline Japan map, reference attribution, map filters, clustering, pointer/keyboard controls, map-to-city navigation, full composite viewer, lazy loading, large-photo links, source credits, share fallback and legacy redirect.');}finally{if(browser)await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
