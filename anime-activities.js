(() => {
 const section = document.querySelector('.event-preview');
 if (!section) return;
 const count = Math.max(0, Number(section.dataset.previewCount) || 0);
 if (!count) { section.hidden = true; return; }
 const status = document.getElementById('event-preview-status');
 const grid = document.getElementById('event-preview-grid');
 const make = (tag, className, text) => { const element=document.createElement(tag);if(className)element.className=className;if(text!==undefined)element.textContent=text;return element; };
 // 兼容旧分享链接；相册的唯一入口现位于独立活动页。
 if (location.hash.startsWith('#event/')) { location.replace('activities.html?topic=acg'+location.hash); return; }
 fetch('data/activities.json').then(response=>{if(!response.ok)throw new Error('load');return response.json();}).then(events=>{
  const previews=events.filter(event=>event.topic==='acg').slice(0,count);
  if(!previews.length){section.hidden=true;return;}
  for(const event of previews){
   const card=make('a','event-card');card.href='activities.html?topic=acg#event/'+event.id;card.setAttribute('aria-label','查看 '+event.name+'，'+event.dateLabel);
   const image=make('img');image.src=event.cover;image.alt=event.name+'的现场记录';image.loading='lazy';image.decoding='async';card.append(image);
   const copy=make('div','event-card-copy');copy.append(make('span','event-card-category',event.category),make('h3','',event.name));
   const bottom=make('div','event-card-bottom'),date=make('time','',event.dateLabel);if(event.date)date.dateTime=event.date;
   const total=[event.photos?event.photos+' 张照片':'',event.videos?event.videos+' 段视频':''].filter(Boolean).join(' · ');
   bottom.append(date,make('span','',total));copy.append(bottom,make('span','event-open-hint','查看这次记录 ↗'));card.append(copy);grid.append(card);
  }
  status.hidden=true;
 }).catch(()=>{status.textContent='活动预览暂时未能加载，可点击上方入口查看活动记录。';});
})();
