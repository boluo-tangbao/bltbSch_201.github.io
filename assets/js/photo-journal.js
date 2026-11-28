export const journalCoverSizes = selected => '(max-width:700px) calc(100vw - clamp(36px, 9.6vw, 144px)), ' +
  (selected ? '(max-width:1320px) 38vw, 482px' : '(max-width:1320px) 17.5vw, 224px');
export const journalCoverSrc = cover => cover.poster || cover.src;
export function journalCoverSrcset(cover, mediumWidths = []) {
  const src = journalCoverSrc(cover);
  const previewWidth = Math.round(cover.width * Math.min(1, 480 / Math.max(cover.width, cover.height)));
  if (previewWidth >= cover.width) return undefined;
  return [`${cover.preview} ${previewWidth}w`, ...mediumWidths.map(width => `${src.replace(/-1600\.webp$/, `-${width}.webp`)} ${width}w`),
    `${src} ${cover.width}w`].join(', ');
}
const get=id=>document.getElementById(id);
const make=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
const photo=(src,alt,priority='auto')=>{const node=make('img');node.alt=alt;node.loading='lazy';node.decoding='async';node.fetchPriority=priority;if(src)node.src=src;return node;};
const dayUrl=day=>'guangzhou-travel.html?day='+day.id;
const totals=groups=>{const media=groups.flatMap(g=>g.media);return [media.filter(m=>m.type==='image').length+' 张照片',media.filter(m=>m.type==='video').length+' 段视频'].join(' · ');};
function activateOverview(){
 const cards=[...get('day-strip').children];
 const select=selected=>cards.forEach((card,index)=>{
  const active=index===selected;
  card.dataset.selected=String(active);
  card.querySelector('img').sizes=journalCoverSizes(active);
  card.querySelector('button').setAttribute('aria-pressed',String(active));
  card.querySelector('a').hidden=!active;
 });
 cards.forEach((card,index)=>card.querySelector('button').addEventListener('click',()=>select(index)));
 select(0);
}
async function loadJournal(){
 try{
  const requested=new URLSearchParams(location.search).get('day');
  if(!requested&&get('day-strip').childElementCount){
   get('day-journal').hidden=true;
   activateOverview();
   document.body.classList.remove('journal-loading');
   return;
  }
  const response=await fetch('assets/guangzhou/manifest.json');if(!response.ok)throw Error('load');
  const trip=await response.json();
  const day=trip.days.find(day=>day.id===requested);
  get('journal-status').hidden=true;
  get('trip-overview').hidden=!!day;
  get('day-journal').hidden=!day;
  if(!day){
   if(requested){get('journal-status').hidden=false;get('journal-status').textContent='没有找到这一天，先翻翻四日行程。';}
   get('trip-count').textContent='四天的照片与现场 · '+totals(trip.days.flatMap(d=>d.groups));
   trip.days.forEach((day,index)=>{
    const cover=day.groups.flatMap(g=>g.media).find(m=>m.file===day.cover),card=make('article');card.className='day-card';
    const image=photo(null,day.title,index===0?'high':'low');
    const srcset=journalCoverSrcset(cover);
    if(index===0)image.loading='eager';
    image.sizes=journalCoverSizes(index===0);image.width=cover.width;image.height=cover.height;
    if(srcset)image.srcset=srcset;
    image.src=journalCoverSrc(cover);card.append(image);
    const copy=make('div');copy.className='day-card-copy';const button=make('button');button.type='button';button.setAttribute('aria-label','选择 '+day.date+' '+day.title);button.append(make('small',day.date.slice(5).replace('-','.')),make('strong',day.title));
    const link=make('a','翻开当天手记 →');link.href=dayUrl(day);copy.append(button,link);card.append(copy);get('day-strip').append(card);
   });activateOverview();document.body.classList.remove('journal-loading');return;
  }
  document.title=day.title+' · '+day.date+' | 广州四日';
  const dayIndex=trip.days.indexOf(day);get('day-date').textContent=day.date+'　／　第 '+(dayIndex+1)+' 天';get('day-title').append(document.createTextNode(day.title),make('span','。'));get('day-route').textContent=day.route;
  get('album-date').textContent=day.date+' · 广州';get('album-count').textContent=totals(day.groups);
  const pages=day.groups.flatMap(group=>group.picks.map(pick=>({group,pick,item:group.media.find(m=>m.file===pick.file)})));
  const periods=[...new Set(pages.map(p=>p.group.period))];get('periods').style.setProperty('--period-count',periods.length);
  const viewer=get('viewer'),stage=get('stage');let at=0,viewerItems=[],viewerIndex=0,trigger,previousOverflow='';
  const playback=createTravelStoryPlayback(pages.map(p=>[[p.item.src,p.item.preview]]),draw,(playing,end)=>{get('play').textContent=playing?'暂停播放':end?'从头播放':'播放手记';get('play').setAttribute('aria-pressed',String(playing));});
  const sectionButtons=[];for(const group of day.groups.filter(g=>g.picks.length)){
   const first=pages.findIndex(p=>p.group===group),button=make('button',group.label);button.type='button';button.prepend(photo(pages[first].item.preview,'','low'));button.addEventListener('click',()=>playback.go(first));get('contents').append(button);sectionButtons.push({group,button});
  }
  const periodButtons=periods.map(period=>{const button=make('button',period);button.type='button';button.addEventListener('click',()=>playback.go(pages.findIndex(p=>p.group.period===period)));get('periods').append(button);return {period,button};});
  function draw(index,[image]){
   const page=pages[index];if(image)image.alt=page.pick.title;
   get('story-photo').replaceChildren(image||make('span','照片暂时无法加载'));
   drawCopy(index);
  }
  function drawCopy(index){
   at=index;const page=pages[index];
   get('counter').textContent=String(index+1).padStart(2,'0')+' / '+String(pages.length).padStart(2,'0');get('place').textContent=page.group.label;get('scene-title').textContent=page.pick.title;get('prose').textContent=page.pick.text;
   get('progress').style.width=(index+1)/pages.length*100+'%';get('back').disabled=index===0;get('next').disabled=index===pages.length-1;
   const videos=page.group.media.filter(m=>m.type==='video');get('story-clip').hidden=!videos.length;get('story-clip').textContent=videos.length>1?'看这一站的 '+videos.length+' 段现场片段':'看现场片段';
   const link=get('scene-link');link.hidden=!page.group.link;if(page.group.link){link.href=page.group.link.href;link.textContent=page.group.link.label;}
   sectionButtons.forEach(({group,button})=>button.setAttribute('aria-current',String(group===page.group)));periodButtons.forEach(({period,button})=>button.setAttribute('aria-current',String(period===page.group.period)));
  }
  function clearViewer(){const video=stage.querySelector('video');if(video){video.pause();video.removeAttribute('src');video.load();}stage.replaceChildren();}
  function showMedia(index){
   clearViewer();viewerIndex=Math.max(0,Math.min(index,viewerItems.length-1));const item=viewerItems[viewerIndex];
   const media=make(item.type==='video'?'video':'img');media.src=item.src;
   if(item.type==='video'){media.controls=true;media.playsInline=true;media.preload='metadata';media.poster=item.poster;media.setAttribute('aria-label',item.caption);}else{media.alt=item.caption;media.decoding='async';media.addEventListener('error',()=>{media.src=item.preview;},{once:true});}
   stage.append(media);get('media-title').textContent=item.caption;get('media-count').textContent=(viewerIndex+1)+' / '+viewerItems.length;get('previous-media').disabled=viewerIndex===0;get('next-media').disabled=viewerIndex===viewerItems.length-1;
  }
  function openMedia(items,index,origin){playback.stop();viewerItems=items;trigger=origin;previousOverflow=document.body.style.overflow;showMedia(index);viewer.showModal();document.body.style.overflow='hidden';get('close-viewer').focus();}
  get('story-clip').addEventListener('click',event=>{const media=pages[at].group.media;openMedia(media,media.findIndex(m=>m.type==='video'),event.currentTarget);});
  get('close-viewer').addEventListener('click',()=>viewer.close());get('previous-media').addEventListener('click',()=>showMedia(viewerIndex-1));get('next-media').addEventListener('click',()=>showMedia(viewerIndex+1));
  viewer.addEventListener('close',()=>{clearViewer();document.body.style.overflow=previousOverflow;trigger?.focus({preventScroll:true});});viewer.addEventListener('keydown',event=>{if(event.target.tagName!=='VIDEO'&&['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();showMedia(viewerIndex+(event.key==='ArrowRight'?1:-1));}});
  get('play').addEventListener('click',playback.toggle);get('back').addEventListener('click',()=>playback.step(-1));get('next').addEventListener('click',()=>playback.step(1));
  get('story').addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)&&!viewer.open){event.preventDefault();playback.step(event.key==='ArrowRight'?1:-1);}});
  let swipe;get('visual').addEventListener('touchstart',e=>{swipe=e.touches[0];},{passive:true});get('visual').addEventListener('touchend',e=>{if(!swipe)return;const dx=e.changedTouches[0].clientX-swipe.clientX,dy=e.changedTouches[0].clientY-swipe.clientY;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy))playback.step(dx<0?1:-1);swipe=null;},{passive:true});document.addEventListener('visibilitychange',()=>{if(document.hidden)playback.stop();});
  const available=[...new Set(day.groups.map(g=>g.period))],sections=[];
  for(const period of available){
   const section=make('section');section.className='album-period';section.append(make('h3',period));
   for(const group of day.groups.filter(g=>g.period===period)){
    const layout=make('div');layout.className='album-group';layout.dataset.group=group.id;const heading=make('div');heading.className='album-group-heading';heading.append(make('h4',group.label));if(group.media.length)heading.append(make('span',totals([group])));layout.append(heading);
    if(group.note){const note=make('p',group.note);note.className='itinerary-note';layout.append(note);}
    if(group.media.length){
     const tiles=make('div');tiles.className='album-grid';let expanded=false;const photos=group.media.filter(m=>m.type==='image');const shown=()=>expanded?group.media:(photos.length?photos:group.media).slice(0,2);
     const toggle=make('button');toggle.type='button';toggle.className='album-toggle';
     const update=()=>{tiles.replaceChildren();for(const item of shown()){const button=make('button');button.type='button';button.setAttribute('aria-label',(item.type==='video'?'播放':'放大')+item.caption);button.setAttribute('aria-haspopup','dialog');button.append(photo(item.preview,item.caption));if(item.type==='video')button.append(make('span','▶ 视频'));button.addEventListener('click',event=>openMedia(group.media,group.media.indexOf(item),event.currentTarget));tiles.append(button);}toggle.hidden=group.media.length<=2;toggle.textContent=expanded?'收起这组':'展开全部 '+group.media.length+' 项';toggle.setAttribute('aria-expanded',String(expanded));};
     toggle.addEventListener('click',()=>{expanded=!expanded;update();});layout.append(tiles,toggle);update();
    }
    if(group.link){const link=make('a',group.link.label);link.className='group-rank-link';link.href=group.link.href;layout.append(link);}section.append(layout);
   }get('album-groups').append(section);sections.push({period,section});
  }
  const filterButtons=[];for(const [label,period]of [['全部',''],['上','上午'],['中','午间'],['下','下午'],['晚','晚上'],...(available.includes('返程')?[['返程','返程']]:[])]){
   const button=make('button',label);button.type='button';button.setAttribute('aria-label',period||'全部时段');button.disabled=!!period&&!available.includes(period);button.setAttribute('aria-pressed',String(!period));button.addEventListener('click',()=>{filterButtons.forEach(item=>item.setAttribute('aria-pressed',String(item===button)));sections.forEach(item=>{item.section.hidden=!!period&&item.period!==period;});});filterButtons.push(button);get('filters').append(button);
  }
  for(const other of trip.days){const link=make('a',other.date.slice(5).replace('-','.')+' · '+other.title);link.href=dayUrl(other);if(other===day)link.setAttribute('aria-current','page');get('day-links').append(link);}
  get('share-day').addEventListener('click',async()=>{const url=new URL(dayUrl(day),location.href).href;try{await navigator.clipboard.writeText(url);get('share-status').textContent='当天手记链接已复制。';}catch{get('share-url').value=url;get('share-url').hidden=false;get('share-url').focus();get('share-url').select();get('share-status').textContent='复制下面的链接即可分享。';}});
  drawCopy(0);
  document.body.classList.remove('journal-loading');
  if(location.hash==='#album')get('album').scrollIntoView();
  await playback.go(0);
 }catch(error){document.body.classList.remove('journal-loading');get('day-journal').hidden=true;get('trip-overview').hidden=true;get('journal-status').hidden=false;get('journal-status').textContent='广州手记暂时没能打开，请刷新重试。';console.error(error);}
}
if (typeof document !== 'undefined') loadJournal();
