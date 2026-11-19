const originalRevision = "ca61150e32a74358836c9dac065a74cd5cc1e494";
const originalPhotos = {
  "5e94ca6866bc6282": "content/pilgrimage/2026-4：清明兰州武威/4.1 武威/雷台汉文化馆/1795062235588.jpg",
  "27c6453c6cb24b75": "content/pilgrimage/2026-4：清明兰州武威/4.1 武威/雷台汉文化馆/1795062235722.jpg",
  "fcd6047d9dfca44b": "content/pilgrimage/2026-4：清明兰州武威/4.1 武威/武威市博物馆/1795062235317.jpg",
  "dd9596c282997ad2": "content/pilgrimage/2026-4：清明兰州武威/4.1 武威/武威市博物馆/1795062235447.jpg",
  "3300cb10f926d636": "content/pilgrimage/2026-4：清明兰州武威/4.2 武威+兰州/武威/武威古南城门楼+五凉文化博物馆/1795062236098.jpg",
  "a73c4ba9dfbbd7e2": "content/pilgrimage/2026-4：清明兰州武威/4.2 武威+兰州/武威/武威古南城门楼+五凉文化博物馆/1795061081641.jpg",
  "fe096ca9c66e7bb7": "content/pilgrimage/2026-4：清明兰州武威/4.2 武威+兰州/武威/武威文庙/1795061081729.jpg",
  "3b4a7875e32e8bef": "content/pilgrimage/2026-4：清明兰州武威/4.2 武威+兰州/武威/鸠摩罗什寺/1795061080941.jpg",
  "40a3f266c13e8d5a": "content/pilgrimage/2026-4：清明兰州武威/4.2 武威+兰州/兰州/敦煌艺术馆/1795061080621.jpg",
  "14066b374c33a8ca": "content/pilgrimage/2026-4：清明兰州武威/4.2 武威+兰州/兰州/水车博览园/1795061079571.jpg",
  "536a6b9be58f34ac": "content/pilgrimage/2026-4：清明兰州武威/4.3 兰州/兰州水墨丹霞/1795060604471.jpg",
  "698d3d46d6fa6178": "content/pilgrimage/2026-4：清明兰州武威/4.3 兰州/兰州水墨丹霞/1795060602726.jpg",
  "029a6a8f442d8ade": "content/pilgrimage/2026-4：清明兰州武威/4.3 兰州/兰州水墨丹霞/1795060603568.jpg",
  "316a5fb9bd4ac6f2": "content/pilgrimage/2026-4：清明兰州武威/4.3 兰州/兰州水墨丹霞/1795060606539.jpg",
  "68e9b82a11f86a1a": "content/pilgrimage/2026-4：清明兰州武威/4.3 兰州/兰州黄河最短段/1795060519089.jpg",
  "2d0e19c1f25d8dcd": "content/pilgrimage/2026-4：清明兰州武威/4.3 兰州/中山桥深夜夜市/1795060519619.jpg",
  "6402e36d5c4e3784": "content/pilgrimage/2026-4：清明兰州武威/4.4 兰州/甘肃博物馆/1795060548770.jpg",
  "02357d584a4197cf": "content/pilgrimage/2026-4：清明兰州武威/4.4 兰州/甘肃博物馆/1795060549380.jpg",
  "d15c86f4a3267f41": "content/pilgrimage/2026-4：清明兰州武威/4.4 兰州/甘肃博物馆/1795060549795.jpg",
  "3c35ebe37d9da93a": "content/pilgrimage/2026-4：清明兰州武威/4.5 兰州/1795059657042.jpg"
};
const originalPhotoUrl = path => 'https://github.com/boluo-tangbao/bltbSch_201.github.io/blob/' + originalRevision + '/' + path.split('/').map(encodeURIComponent).join('/');
const $=id=>document.getElementById(id);
const days=window.tripDays;
const titles=['初到武威','两座城之间','大地的褶皱','从小西湖到机场','从空中回望'];
const covers=['1795062235498','1795062236098','1795060604471','1795060549134','1795059656686'];
const aprilSecondPhotos=new Set(days.find(d=>d.date==='4.2').groups.flatMap(g=>g.media.filter(m=>!m.video).map(m=>m.id)));
const src=(m,thumb=false)=>'assets/lanzhou/'+m.id+(aprilSecondPhotos.has(m.id)?'-story':'')+(thumb?'-s.webp':m.video?'.mp4':'.webp');
function el(tag,text){const node=document.createElement(tag);if(text)node.textContent=text;return node}
let selected=2,day,filter=-1,sequence=[],index=0;
const expanded=new Set();
const periods=['上午','午间','下午','晚上'];
const periodLabels=['上','中','下','晚'];
function selectFrame(i){selected=i;Array.from($('reel').children).forEach((frame,j)=>{frame.classList.toggle('active',j===i);frame.querySelector('button').setAttribute('aria-pressed',String(j===i))})}
days.forEach((d,i)=>{
 const frame=el('div');frame.className='frame';
 const cover=d.groups.flatMap(g=>g.media).find(m=>m.name===covers[i]+'.jpg');
 const img=el('img');img.src=src(cover);img.alt='';
 const btn=el('button','04.0'+(i+1));btn.append(el('strong',titles[i]));btn.onclick=()=>selectFrame(i);
 const link=el('a','进入这一天 →');link.href='lanzhou-day-story.html?day='+d.date;
 frame.append(img,btn,link);$('reel').append(frame);
 $('dates').add(new Option(d.date+'　'+d.city,d.date));
});
selectFrame(selected);
function paintViewer(){
 const m=sequence[index],item=el(m.video?'video':'img');item.src=src(m);
 if(m.video)item.controls=true;else item.alt=$('viewer').dataset.label+' · '+(index+1);
 const original=$('original-photo'),url=originalPhotos[m.id];
 original.hidden=!url;
 if(url)original.href=originalPhotoUrl(url);else original.removeAttribute('href');
 $('stage').replaceChildren(item);$('count').textContent=($('viewer').dataset.label+(m.caption?' · '+m.caption:''))+'　'+(index+1)+' / '+sequence.length;
 $('prev').disabled=index===0;$('next').disabled=index===sequence.length-1
}
function step(n){if(index+n>=0&&index+n<sequence.length){index+=n;paintViewer()}}
$('prev').onclick=()=>step(-1);$('next').onclick=()=>step(1);$('closeView').onclick=()=>$('viewer').close();
$('viewer').onclose=()=>$('stage').replaceChildren();
$('viewer').onkeydown=e=>{if(e.key==='ArrowLeft')step(-1);if(e.key==='ArrowRight')step(1)};
let startX;
$('stage').ontouchstart=e=>startX=e.touches[0].clientX;
$('stage').ontouchend=e=>{const delta=e.changedTouches[0].clientX-startX;if(Math.abs(delta)>60)step(delta<0?1:-1)};
function renderGroups(){
 $('groups').replaceChildren();
 let lastPeriod;
 day.groups.forEach((g,j)=>{
 const key=g.period ? periods.indexOf(g.period) : j;
 if(filter!==-1 && filter!==key)return;
 if(g.period && g.period!==lastPeriod){
   const heading=el('h2',g.period);
   heading.className='period-heading';
   $('groups').append(heading);
   lastPeriod=g.period;
 }
 const section=el('section');section.className='group';const head=el('header'),name=el('div'),videos=g.media.filter(m=>m.video).length;
 name.append(el(g.period?'h3':'h2',g.label),el('small',(g.media.length-videos)+' 张照片'+(videos?' · '+videos+' 段视频':'')));head.append(name);
 const all=expanded.has(j)||filter!==-1||day.groups.length===1;
 if(filter===-1&&g.media.length>3&&day.groups.length>1){const toggle=el('button',all?'收起':'查看全部');toggle.onclick=()=>{all?expanded.delete(j):expanded.add(j);renderGroups();$('groups').querySelector('[data-group="'+j+'"]').scrollIntoView({block:'start'})};head.append(toggle)}
 section.dataset.group=j;
 const grid=el('div');grid.className='tiles';
 const picks=g.label.includes('水墨丹霞')?['1795060604471','1795060602726','1795060602530'].map(n=>g.media.find(m=>m.name===n+'.jpg')).filter(Boolean):g.media.slice(0,3);
 for(const m of all?g.media:picks){const b=el('button'),img=el('img');img.src=src(m,true);img.loading='lazy';img.alt=g.label+' · '+(m.caption || m.name);b.append(img);if(m.video)b.append(el('b','▶ 视频'));b.onclick=()=>{sequence=g.media;index=sequence.indexOf(m);$('viewer').dataset.label=g.label;paintViewer();$('viewer').showModal()};grid.append(b)}
 section.append(head,grid);$('groups').append(section)
 })
}
function route(){
 day=days.find(d=>d.date===location.hash.slice(1));$('home').hidden=!!day;$('album').hidden=!day;
 $('dayStory').hidden=!day;
 if(day) $('dayStory').href='lanzhou-day-story.html?day='+day.date;
 if(day){selectFrame(days.indexOf(day));$('dates').value=day.date;$('title').textContent=day.date+'　'+day.city;filter=-1;expanded.clear();$('filters').replaceChildren();
 const byPeriod=day.groups.every(g=>g.period);
 $('filters').classList.toggle('period-filters',byPeriod);
 const options=byPeriod?periodLabels:day.groups.map(g=>g.label);
 if(day.groups.length>1)['全部',...options].forEach((name,i)=>{const b=el('button',name);if(byPeriod&&i>0){b.setAttribute('aria-label',periods[i-1]);b.disabled=!day.groups.some(g=>g.period===periods[i-1])}b.setAttribute('aria-pressed',String(i===0));b.onclick=()=>{filter=i-1;for(const x of $('filters').children)x.setAttribute('aria-pressed',String(x===b));renderGroups()};$('filters').append(b)});renderGroups()}
 window.scrollTo(0,0)
}
$('dates').onchange=e=>location.hash=e.target.value;
window.addEventListener('hashchange',route);route();
