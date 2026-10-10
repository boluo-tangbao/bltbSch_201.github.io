(() => {
 const section = document.getElementById('event-records');
 if (!section) return;
 const $ = id => document.getElementById(id);
 const dialog = $('event-dialog'), viewer = $('event-dialog-body');
 let events = [], activeEvent = null, activeIndex = 0, category = '', year = '', previousFocus = null, previousOverflow = '';
 const scope = new URLSearchParams(location.search).get('topic');
 const topicLabels = {acg:'二次元',sports:'体育',art:'艺术',travel:'旅行',life:'生活'};
 const scopedTopic = Object.hasOwn(topicLabels, scope) ? scope : '';
 const topicLabel = topicLabels[scopedTopic] || '';
 let selectedTopic = '';
 const baseTitle = topicLabel ? topicLabel + '活动记录 | Life Gallery' : document.title;
 document.title = baseTitle;
 if (scopedTopic) {
  $('activities-title').textContent = topicLabel + '活动记录';
  $('activities-description').textContent = '属于' + topicLabel + '的活动回忆，照片与视频一起收藏。';
  $('event-section-title').textContent = topicLabel + '的到场记录';
  section.querySelector('.event-section-header p').textContent = '这里展示我的' + topicLabel + '相关活动。';
  $('event-topic-control').hidden = true;
  section.querySelector('.event-back').textContent = '← 返回' + topicLabel + '活动记录';
 }
 const make = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; };
 const counts = event => [event.photos ? event.photos+' 张照片' : '', event.videos ? event.videos+' 段视频' : ''].filter(Boolean).join(' · ');
 function thumbnail(src, alt) { const image = make('img'); image.src=src; image.alt=alt; image.loading='lazy'; image.decoding='async'; return image; }
 function renderIndex() {
  const filtered=events.filter(event=>(!selectedTopic||event.topic===selectedTopic)&&(!category||event.category===category)&&(!year||event.year===year));
  $('event-grid').replaceChildren();
  filtered.forEach(event=>{
   const card=make('a','event-card'); card.href='#event/'+event.id; card.setAttribute('aria-label','查看 '+event.name+'，'+event.dateLabel);
   card.append(thumbnail(event.cover,event.name+'的现场记录'));
   const copy=make('div','event-card-copy');copy.append(make('span','event-card-category',event.category),make('h3','',event.name));
   const bottom=make('div','event-card-bottom'), date=make('time','',event.dateLabel); if(event.date)date.dateTime=event.date;
   bottom.append(date,make('span','',counts(event)));copy.append(bottom,make('span','event-open-hint','翻开这次记录 ↗'));card.append(copy);$('event-grid').append(card);
  });
  $('event-result').textContent=filtered.length ? '共 '+filtered.length+' 场记录 · 按参加时间倒序' : '这个分类暂时没有活动记录，试试其他筛选。';
 }
 function route() {
  if(dialog.open)dialog.close();
  const id=location.hash.startsWith('#event/')?location.hash.slice(7):null;
  const event=events.find(item=>item.id===id);
  activeEvent=event||null;
  $('event-index').hidden=!!event; $('event-album').hidden=!event;
  document.title=event?event.name+' | 活动记录':baseTitle;
  if(!event){renderIndex();if(id)$('event-result').textContent='没有找到这场活动，下面是已有记录。';return;}
  $('event-album-title').textContent=event.name;
  $('event-album-category').textContent=event.category;
  $('event-album-meta').textContent=event.dateLabel+' · '+counts(event)+' · 个人参加记录';
  $('event-album-note').textContent=event.note || '';
  $('event-album-note').hidden=!event.note;
  $('event-media-grid').replaceChildren();
  event.media.forEach((item,index)=>{
   const label=(item.type==='video'?'视频':'照片')+' '+String(index+1).padStart(2,'0');
   const button=make('button','event-media'+(item.type==='video'?' is-video':''));button.type='button';button.setAttribute('aria-label',(item.type==='video'?'播放':'放大')+' '+event.name+' · '+label);button.setAttribute('aria-haspopup','dialog');
   button.append(thumbnail(item.preview,event.name+' · '+label),make('span','',label));
   if(item.type==='video')button.append(make('span','event-play','▶'));
   button.addEventListener('click',()=>openMedia(index));$('event-media-grid').append(button);
  });
 }
 function clearViewer() {
  const video=viewer.querySelector('video');if(video){video.pause();video.removeAttribute('src');video.load();}viewer.replaceChildren();
 }
 function showMedia(index) {
  clearViewer();activeIndex=(index+activeEvent.media.length)%activeEvent.media.length;
  const item=activeEvent.media[activeIndex], label=activeEvent.name+' · '+(item.type==='video'?'视频':'照片')+' '+(activeIndex+1);
  const media=make(item.type==='video'?'video':'img');media.src=item.src;
  if(item.type==='video'){media.controls=true;media.playsInline=true;media.preload='metadata';media.poster=item.poster;media.setAttribute('aria-label',label);}else{media.alt=label;media.decoding='async';}
  media.addEventListener('error',()=>{clearViewer();const box=make('div','event-status','这个素材暂时未能加载。');const retry=make('button','','重新加载');retry.type='button';retry.addEventListener('click',()=>showMedia(activeIndex));box.append(retry);viewer.append(box);},{once:true});
  viewer.append(media);$('event-position').textContent=(activeIndex+1)+' / '+activeEvent.media.length;
  dialog.setAttribute('aria-label',label);
 }
 function openMedia(index) {previousFocus=document.activeElement;previousOverflow=document.body.style.overflow;showMedia(index);dialog.showModal();document.body.style.overflow='hidden';$('event-close').focus();}
 $('event-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{clearViewer();document.body.style.overflow=previousOverflow;previousFocus?.focus({preventScroll:true});});
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
 $('event-previous').addEventListener('click',()=>showMedia(activeIndex-1));$('event-next').addEventListener('click',()=>showMedia(activeIndex+1));
 dialog.addEventListener('keydown',event=>{if(event.target.tagName==='VIDEO')return;if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();showMedia(activeIndex+(event.key==='ArrowLeft'?-1:1));}});
 window.addEventListener('hashchange',()=>{route();section.scrollIntoView({behavior:'instant',block:'start'});if(activeEvent)$('event-album-title').focus({preventScroll:true});});
 $('event-filters').addEventListener('click',event=>{const button=event.target.closest('button[data-category]');if(!button)return;category=button.dataset.category;for(const item of $('event-filters').querySelectorAll('button'))item.setAttribute('aria-pressed',String(item===button));renderIndex();});
 $('event-year').addEventListener('change',event=>{year=event.target.value;renderIndex();});
 function updateCategories() {
  const available = events.filter(event => !selectedTopic || event.topic === selectedTopic);
  const values = ['', ...new Set(available.map(event => event.category))];
  if (!values.includes(category)) category = '';
  $('event-filters').replaceChildren();
  for (const value of values) { const button = make('button', '', value || '全部分类'); button.type='button';button.dataset.category=value;button.setAttribute('aria-pressed',String(value===category));$('event-filters').append(button); }
 }
 $('event-topic').addEventListener('change',event=>{selectedTopic=event.target.value;updateCategories();renderIndex();});
 async function load(){
  try{
   const response=await fetch('assets/generated/activities/manifest.json');if(!response.ok)throw new Error('load');events=await response.json();if(!Array.isArray(events))throw new Error('invalid');if(scopedTopic)events=events.filter(event=>event.topic===scopedTopic);updateCategories();
   $('event-total').textContent=events.length;$('event-photos').textContent=events.reduce((n,e)=>n+e.photos,0);$('event-videos').textContent=events.reduce((n,e)=>n+e.videos,0);
   for(const value of [...new Set(events.map(event=>event.year))].sort().reverse()){const option=make('option','',value+' 年');option.value=value;$('event-year').append(option);}
   $('event-loading').hidden=true;$('event-index').hidden=false;route();if(location.hash)section.scrollIntoView({behavior:'instant',block:'start'});
  }catch{ $('event-loading').textContent='活动记录暂时没有加载成功。';const retry=make('button','','重试');retry.type='button';retry.addEventListener('click',load);$('event-loading').append(retry); }
 }
 load();
})();
