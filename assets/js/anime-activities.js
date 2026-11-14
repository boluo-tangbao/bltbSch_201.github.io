import { activityTopics, activityTopicLabels, hasActivityTopic } from './activity-topics.js';
import { activityCategory } from './activity-categories.js';
(() => {
 const section = document.querySelector('.event-preview');
 const previewTopic = section?.dataset.topic || 'acg';
 // 旧分享链接独立于预览开关。
 function redirectOldEvent() {
  if (!location.hash.startsWith('#event/')) return false;
  location.replace('activities.html?topic='+previewTopic+location.hash);
  return true;
 }
 window.addEventListener('hashchange', redirectOldEvent);
 if (redirectOldEvent()) return;

 if (!section) return;
 const count = Math.max(0, Number(section.dataset.previewCount) || 0);
 if (!count) { section.hidden = true; return; }
 const status = document.getElementById('event-preview-status');
 const grid = document.getElementById('event-preview-grid');
 const make = (tag, className, text) => { const element=document.createElement(tag);if(className)element.className=className;if(text!==undefined)element.textContent=text;return element; };
 fetch('assets/generated/activities/manifest.json').then(response=>{if(!response.ok)throw new Error('load');return response.json();}).then(events=>{
  const previews=events.filter(event=>hasActivityTopic(event,previewTopic)).slice(0,count);
  if(!previews.length){section.hidden=true;return;}
  for(const event of previews){
   const card=make('a','event-card');card.href='activities.html?topic='+previewTopic+'#event/'+event.id;card.setAttribute('aria-label','查看 '+event.name+'，'+event.dateLabel);
   if(event.cover){const image=make('img');image.src=event.cover;image.alt=event.name+'的现场记录';image.loading='lazy';image.decoding='async';card.append(image);}
   else card.append(make('div','event-cover-placeholder','B站视频记录'));
   const copy=make('div','event-card-copy');copy.append(make('span','event-card-category',activityCategory(event)),make('h3','',event.name));
   const tags=make('div','event-topic-tags');for(const topic of activityTopics(event))tags.append(make('span','',activityTopicLabels[topic]));copy.append(tags);
   const bottom=make('div','event-card-bottom'),date=make('time','',event.dateLabel);if(event.date)date.dateTime=event.date;
   const total=[event.photos?event.photos+' 张照片':'',event.videos?event.videos+' 段视频':'',event.bvid?'B站视频':''].filter(Boolean).join(' · ');
   bottom.append(date,make('span','',total));copy.append(bottom,make('span','event-open-hint','查看这次记录 ↗'));card.append(copy);grid.append(card);
  }
  status.hidden=true;
 }).catch(()=>{status.textContent='活动预览暂时未能加载，可点击上方入口查看活动记录。';});
})();
