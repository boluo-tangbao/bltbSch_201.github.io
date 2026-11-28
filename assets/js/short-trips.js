const root = document.querySelector('[data-short-trips]');
if (root) {
 const make = (tag, className, text) => { const node=document.createElement(tag); if(className)node.className=className; if(text!==undefined)node.textContent=text; return node; };
 const image = (photo, alt, loading='lazy') => { const node=make('img');node.alt=alt;node.loading=loading;node.decoding='async';node.src=photo;return node; };
 const preview = root.dataset.shortTrips === 'preview';
 let trips=[], active=null, expanded=false, index=0, previousFocus=null, previousOverflow='';
 const grid=root.querySelector('[data-trip-grid]'), status=root.querySelector('[data-trip-status]');
 const dialog=document.querySelector('#short-trip-dialog');
 const count=trip=>trip.photos.length+' 张照片';
 const url=trip=>'short-trips.html#trip/'+trip.id;
 function card(trip) {
  const link=make('a','event-card');link.href=url(trip);
  link.append(image(trip.cover,trip.title));
  const copy=make('div','event-card-copy');copy.append(make('span','event-card-category',trip.city+' · 一日随拍'),make('h3','',trip.title));
  copy.append(make('p','short-trip-description',trip.description));
  const tags=make('div','short-trip-tags');trip.tags.forEach(tag=>tags.append(make('span','',tag)));copy.append(tags);
  const bottom=make('div','event-card-bottom'),date=make('time','',trip.date);date.dateTime=trip.date;
  bottom.append(date,make('span','',count(trip)));copy.append(bottom,make('span','event-open-hint','翻开这次小旅行 ↗'));link.append(copy);return link;
 }
 function renderGallery() {
  const gallery=root.querySelector('[data-trip-gallery]');gallery.replaceChildren();
  const photos=expanded?active.photos:active.photos.slice(0,2);
  photos.forEach((photo,i)=>{const button=make('button','short-trip-photo');button.type='button';button.setAttribute('aria-label','放大照片：'+photo.caption);button.setAttribute('aria-haspopup','dialog');button.append(image(photo.preview,photo.caption),make('span','',photo.caption));button.addEventListener('click',()=>openPhoto(i));gallery.append(button);});
  const toggle=root.querySelector('[data-trip-expand]');toggle.hidden=active.photos.length<=2;toggle.textContent=expanded?'收起照片':'展开全部 '+count(active);toggle.setAttribute('aria-expanded',String(expanded));
 }
 function showPhoto(at) {
  index=(at+active.photos.length)%active.photos.length;
  const photo=active.photos[index],large=image(photo.src,photo.caption,'eager');
  const body=dialog.querySelector('[data-trip-viewer]');body.replaceChildren(large);
  large.addEventListener('error',()=>{if(large.src!==new URL(photo.preview,location.href).href)large.src=photo.preview;},{once:true});
  dialog.querySelector('[data-trip-position]').textContent=(index+1)+' / '+active.photos.length+' · '+photo.caption;
  dialog.setAttribute('aria-label',photo.caption);
 }
 function openPhoto(at) { previousFocus=document.activeElement;previousOverflow=document.body.style.overflow;showPhoto(at);dialog.showModal();document.body.style.overflow='hidden';dialog.querySelector('[data-trip-close]').focus(); }
 function route() {
  if(preview)return;
  if(dialog.open)dialog.close();
  const id=location.hash.startsWith('#trip/')?location.hash.slice(6):'';
  active=trips.find(trip=>trip.id===id)||null;expanded=false;
  root.querySelector('[data-trip-index]').hidden=!!active;root.querySelector('[data-trip-album]').hidden=!active;
  root.querySelector('[data-trip-feedback]').textContent='';root.querySelector('[data-trip-share-url]').hidden=true;
  document.title=active?active.title+' | 小旅行集':'小旅行集 | 汤包的生活手记';
  if(!active){if(!grid.childElementCount)grid.replaceChildren(...trips.map(card));status.textContent=id?'没有找到这份小旅行，下面是已有记录。':'共 '+trips.length+' 份小旅行 · 按日期倒序';return;}
  root.querySelector('[data-trip-title]').textContent=active.title;
  root.querySelector('[data-trip-meta]').textContent=active.date+' · '+active.city+' · '+count(active);
  root.querySelector('[data-trip-note]').textContent=active.description;
  renderGallery();
  root.scrollIntoView({block:'start',behavior:'instant'});
  root.querySelector('[data-trip-title]').focus({preventScroll:true});
 }
 async function load() {
  try {
   const response=await fetch('assets/short-trips/manifest.json');if(!response.ok)throw new Error('load');
   trips=await response.json();if(!Array.isArray(trips))throw new Error('format');
   if(preview)grid.replaceChildren(...trips.slice(0,3).map(card));
   status.textContent=trips.length?'':'下一段小旅行，留待下次出发。';
   route();
  } catch {
   status.replaceChildren(make('span','','小旅行暂时没能加载。'));
   const retry=make('button','short-trip-expand','重新加载');retry.type='button';retry.addEventListener('click',load);status.append(retry);
  }
 }
 if(!preview) {
  root.querySelector('[data-trip-expand]').addEventListener('click',()=>{expanded=!expanded;renderGallery();});
  dialog.querySelector('[data-trip-close]').addEventListener('click',()=>dialog.close());
  dialog.querySelector('[data-trip-previous]').addEventListener('click',()=>showPhoto(index-1));
  dialog.querySelector('[data-trip-next]').addEventListener('click',()=>showPhoto(index+1));
  dialog.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();showPhoto(index+(event.key==='ArrowRight'?1:-1));}});
  dialog.addEventListener('click',event=>{if(event.target===dialog){const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();}});
  dialog.addEventListener('close',()=>{dialog.querySelector('[data-trip-viewer]').replaceChildren();document.body.style.overflow=previousOverflow;previousFocus?.focus({preventScroll:true});});
  root.querySelector('[data-trip-share]').addEventListener('click',async()=>{if(!active)return;const href=new URL(url(active),location.href).href;const feedback=root.querySelector('[data-trip-feedback]');try{await navigator.clipboard.writeText(href);feedback.textContent='链接已复制，可以分享这次小旅行。';}catch{const input=root.querySelector('[data-trip-share-url]');input.value=href;input.hidden=false;input.focus();input.select();feedback.textContent='复制下面的链接即可分享。';}});
  window.addEventListener('hashchange',route);
 }
 load();
}
