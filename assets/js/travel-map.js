import {project,fitBounds,clusterPoints,personalPoints,referencePoints} from './travel-map-data.js';
const NS='http://www.w3.org/2000/svg';
const node=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
const svgNode=(tag,attrs={})=>{const el=document.createElementNS(NS,tag);for(const [key,value] of Object.entries(attrs))el.setAttribute(key,value);return el;};
const external=(text,url)=>{const a=node('a','jm-link',text+' ↗');a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;};
const button=(text,action,cls='')=>{const el=node('button',cls,text);el.type='button';el.onclick=action;return el;};
function geometryPath(geometry){const polygons=geometry.type==='MultiPolygon'?geometry.coordinates:[geometry.coordinates];return polygons.map(polygon=>polygon.map(ring=>ring.map((coordinate,i)=>{const [x,y]=project(coordinate);return (i?'L':'M')+x.toFixed(5)+','+y.toFixed(5);}).join('')+'Z').join('')).join('');}
export function mountTravelMap(host,{catalog,boundary,city}) {
  let rows=[],filters={},points=[],selectedId='',box,size={width:800,height:540},drag=null,moved=false;
  const shell=node('div','jm-shell'),intro=node('div','jm-intro');
  intro.append(node('p','jm-kicker','PILGRIMAGE ATLAS'),node('h2','','作品里的风景，旅行中的城市'),node('p','jm-muted','从日本地图出发，翻开我的照片，也看看下一次想去的地方。'));
  const toolbar=node('div','jm-toolbar'),layers=node('div','jm-layers');
  const ownInput=node('input'),referenceInput=node('input');
  ownInput.type=referenceInput.type='checkbox';ownInput.checked=referenceInput.checked=true;
  for(const [input,text,cls] of [[ownInput,'我的记录区域','jm-own'],[referenceInput,'参考地点','jm-ref']]){const label=node('label',cls);label.append(input,node('span','jm-dot'),document.createTextNode(text));layers.append(label);}
  const total=node('span','jm-total');total.setAttribute('role','status');toolbar.append(layers,total);
  const body=node('div','jm-body'),frame=node('div','jm-frame'),svg=svgNode('svg',{'class':'jm-canvas',tabindex:'0',role:'group','aria-label':'日本巡礼地图。方向键平移，加减号缩放，Home 返回日本全图。'});
  const title=svgNode('title');title.textContent='日本旅行与作品巡礼地图';svg.append(title);
  const land=svgNode('g',{'class':'jm-land'}),labels=svgNode('g',{'class':'jm-labels','aria-hidden':'true'}),markers=svgNode('g',{'class':'jm-markers'});
  for(const feature of boundary.features)land.append(svgNode('path',{d:geometryPath(feature.geometry)}));svg.append(land,labels,markers);
  const controls=node('div','jm-controls');controls.append(button('+',()=>zoom(0.6),'jm-zoom-in'),button('−',()=>zoom(1/0.6),'jm-zoom-out'),button('日本全图',()=>overview()),button('当前地点',()=>fit(points)));
  controls.children[0].setAttribute('aria-label','放大地图');controls.children[1].setAttribute('aria-label','缩小地图');
  const scale=node('div','jm-scale'),hint=node('p','jm-hint','可拖动、双指缩放 · 轮廓底图无街道信息');
  frame.append(svg,controls,node('span','jm-north','N ↑'),scale,hint);
  const sidebar=node('aside','jm-sidebar'),selection=node('div','jm-selection'),listHeading=node('h3','jm-list-heading','地图上的地点'),list=node('div','jm-list');sidebar.setAttribute('aria-label','巡礼地点与记录');sidebar.append(selection,listHeading,list);body.append(frame,sidebar);
  const caption=node('p','jm-caption','圆点是我的城市／旅行区域入口，并非精确拍摄点；菱形是有出处的参考地点，不计入到访记录。'),credits=node('details','jm-credits');credits.append(node('summary','','底图与地点资料来源'));
  const sourceCopy=node('div');sourceCopy.append(node('p','','底图：Natural Earth 1:50m 日本轮廓（Public domain）。城市入口：日本国土地理院地名检索。底图与地点数据均读取本站文件，不连接在线地图服务。'),external('Natural Earth',catalog.boundary.url),document.createTextNode(' · '),external('国土地理院地理院地图','https://maps.gsi.go.jp/'),node('p','','参考地点：Anitabi Map，读取于 '+catalog.readAt+'；原始出处随地点展示。改编参考地点数据依 CC BY-NC-SA 4.0 共享；该许可不代替作者照片与作品画面的权利归属。'),external('Anitabi 数据说明',catalog.referenceLicense.documentation),document.createTextNode(' · '),external('参考数据许可',catalog.referenceLicense.url));credits.append(sourceCopy);
  shell.append(intro,toolbar,body,caption,credits);host.replaceChildren(shell);
  function overview(){box=fitBounds([{coordinates:[122,24]},{coordinates:[147,46]}],size.width/size.height,22);zoom(0.8);}
  function fit(items){box=fitBounds(items,size.width/size.height,0.008);draw();}
  function zoom(factor,anchor={x:size.width/2,y:size.height/2}){const height=Math.max(0.002,Math.min(42,box.height*factor)),ratio=height/box.height;box={x:box.x+box.width*anchor.x/size.width*(1-ratio),y:box.y+box.height*anchor.y/size.height*(1-ratio),width:box.width*ratio,height};draw();}
  function choose(point,focusMap=false){selectedId=point.id;if(focusMap){box=fitBounds([point],size.width/size.height,point.kind==='personal'?0.9:0.025);draw();}else paintSelection();renderSelection(point);}
  function paintSelection(){for(const el of markers.querySelectorAll('[data-point]')){const selected=el.dataset.point===selectedId;el.classList.toggle('is-selected',selected);el.setAttribute('aria-pressed',String(selected));}for(const el of list.querySelectorAll('button'))el.setAttribute('aria-pressed',String(el.dataset.point===selectedId));}
  function renderSelection(point){selection.replaceChildren();if(!point){selection.append(node('p','jm-selected-kicker','先选一座城市'),node('h3','','下一站，会是哪部作品？'),node('p','jm-muted','点地图标记或下方地点，查看照片记录和参考资料。相邻标记会合并，点数字即可展开。'));return;}
    const own=point.kind==='personal';selection.append(node('p','jm-selected-kicker',own?'MY TRAVEL / 我的记录':'REFERENCE / 参考地点'),node('h3','',point.name));
    if(own){const image=node('img','jm-selected-image');image.alt=point.name+'旅行记录封面';image.loading='lazy';image.decoding='async';image.src=point.records[0].cover;selection.append(image,node('p','jm-muted',point.records.length+' 组记录 · '+point.photos+' 张照片'),node('p','jm-muted',point.note));const a=node('a','jm-primary','翻开'+city(point.cityId).name+'的记录 →');a.href='#city/'+point.cityId;selection.append(a);for(const row of point.records){const recordLink=node('a','jm-record-link',row.title+' · '+row.photos+' 张');recordLink.href='#record/'+row.id;selection.append(recordLink);for(const subject of catalog.subjects.filter(s=>row.works.includes(s.title)))selection.append(external('在 Anitabi 查看 '+subject.title,subject.url));}selection.append(external('区域坐标出处 · '+point.source.result,point.source.url));}
    else{selection.append(node('p','jm-work',point.works.join(' / ')+' · '+point.city),node('p','jm-muted',point.note),node('p','jm-reference-note','本站暂无此地点的个人到访记录。'),external('在 Anitabi 查看此地点',point.anitabiUrl),external('原始出处 · '+point.origin,point.originUrl),external('Anitabi 条目数据',point.sourceUrl),node('p','jm-source-note',point.coordinateNote+' 资料读取：'+catalog.readAt+' · '+catalog.referenceLicense.name));}
  }
  function draw(){if(!box)return;svg.setAttribute('viewBox','0 0 '+size.width+' '+size.height);const s=size.width/box.width;land.setAttribute('transform','translate('+(-box.x*s)+' '+(-box.y*s)+') scale('+s+')');labels.replaceChildren();
    for(const [name,coordinates]of [['北海道',[142.5,43.6]],['本州',[137,38.5]],['四国',[133.6,33.7]],['九州',[130.7,32.6]],['冲绳',[127.7,26.5]],['太 平 洋',[142,31]]]){const [x,y]=project(coordinates),text=svgNode('text',{x:(x-box.x)*s,y:(y-box.y)*s});text.textContent=name;labels.append(text);}
    markers.replaceChildren();for(const group of clusterPoints(points,box,size.width,size.height)){if(group.x < -35 || group.y < -35 || group.x > size.width+35 || group.y > size.height+35)continue;const clustered=group.items.length>1,p=group.items[0],g=svgNode('g',{transform:'translate('+group.x+' '+group.y+')',role:'button',tabindex:'0','class':'jm-marker '+(clustered?'jm-cluster':p.kind==='personal'?'jm-personal':'jm-reference'),'aria-label':clustered?'展开 '+group.items.length+' 个地点：'+group.items.map(p=>p.name).join('、'):p.name+' · '+(p.kind==='personal'?'我的记录区域':'参考地点')});
      if(clustered)g.append(svgNode('circle',{r:24}));else if(p.kind==='personal')g.append(svgNode('circle',{r:19}));else g.append(svgNode('path',{d:'M0,-17L17,0L0,17L-17,0Z'}));
      const text=svgNode('text',{'text-anchor':'middle',y:5,'class':'jm-marker-count'});text.textContent=clustered?group.items.length:p.kind==='personal'?p.records.length:'◇';g.append(text);
      const label=svgNode('text',{'text-anchor':'middle',y:clustered?43:38,'class':'jm-marker-label'});label.textContent=clustered?(group.items.every(p=>p.kind==='reference')?'宇治 · 参考地点':group.items.every(p=>p.kind==='personal')?'关东 · 我的记录':'记录与参考地点'):p.name;g.append(label);
      g.dataset.mapX=group.x;g.dataset.mapY=group.y;if(!clustered){g.dataset.point=p.id;g.setAttribute('aria-pressed',String(p.id===selectedId));}
      const activate=()=>{if(clustered)fit(group.items);else choose(p);};g.addEventListener('click',event=>{event.stopPropagation();if(!moved)activate();});g.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();activate();if(clustered)svg.focus();}});markers.append(g);
    }paintSelection();placeLabels();const km=box.width/size.width/Math.cos(35*Math.PI/180)*Math.abs(Math.cos((box.y+box.height/2)*Math.PI/180))*111.32*80;scale.textContent='80 px ≈ '+(km<1?Math.round(km*1000)+' m':Math.round(km)+' km')+' · 示意';}

  function placeLabels(){
    const elements=[...markers.children],used=[];
    elements.sort((a,b)=>Number(b.dataset.point===selectedId)-Number(a.dataset.point===selectedId));
    for(const element of elements){
      const label=element.querySelector('.jm-marker-label'),width=label.getComputedTextLength(),x=Number(element.dataset.mapX),y=Number(element.dataset.mapY);
      const dx=Math.max(width/2+8,Math.min(size.width-width/2-8,x))-x;
      label.setAttribute('x',dx);let placed=false;
      for(const dy of [43,-32,62,-50]){
        const area={left:x+dx-width/2-3,right:x+dx+width/2+3,top:y+dy-13,bottom:y+dy+4};
        const overlaps=other=>area.left<other.right&&area.right>other.left&&area.top<other.bottom&&area.bottom>other.top;
        if(area.top<65||area.bottom>size.height-57||used.some(overlaps)||elements.some(other=>other!==element&&overlaps({left:Number(other.dataset.mapX)-26,right:Number(other.dataset.mapX)+26,top:Number(other.dataset.mapY)-26,bottom:Number(other.dataset.mapY)+26})))continue;
        label.setAttribute('y',dy);label.style.display='';used.push(area);placed=true;break;
      }
      if(!placed)label.style.display='none';
    }
  }
  function update(nextRows,nextFilters){rows=nextRows;filters=nextFilters;points=[...(ownInput.checked?personalPoints(catalog,rows):[]),...(referenceInput.checked?referencePoints(catalog,filters):[])];total.textContent=points.filter(p=>p.kind==='personal').length+' 个记录区域 · '+points.filter(p=>p.kind==='reference').length+' 个参考地点';
    list.replaceChildren();for(const point of points){const el=button('',()=>choose(point,true),'jm-place '+(point.kind==='personal'?'jm-own':'jm-ref'));el.dataset.point=point.id;el.append(node('span','jm-dot'),node('span','jm-place-title',point.name),node('small','',point.kind==='personal'?point.records.length+' 组记录 · '+point.photos+' 张':point.works.join(' / ')));list.append(el);}if(!points.length){list.append(node('p','jm-muted','地图上没有匹配地点。可调整上方筛选或开启图层。'));}
    const selected=points.find(p=>p.id===selectedId);if(!selected)selectedId='';renderSelection(selected);draw();return points.length;
  }
  ownInput.onchange=referenceInput.onchange=()=>update(rows,filters);
  const pointers=new Map();let pinchDistance=0;
  svg.addEventListener('pointerdown',event=>{if(event.button&&event.button!==0)return;moved=false;if(event.target.closest('.jm-marker'))return;svg.setPointerCapture(event.pointerId);pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});drag={x:event.clientX,y:event.clientY};if(pointers.size===2){const p=[...pointers.values()];pinchDistance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);}});
  svg.addEventListener('pointermove',event=>{if(!pointers.has(event.pointerId))return;const previous=pointers.get(event.pointerId);pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});const dx=event.clientX-previous.x,dy=event.clientY-previous.y;if(Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>4)moved=true;if(pointers.size===2){const p=[...pointers.values()],distance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),rect=svg.getBoundingClientRect();if(pinchDistance>0&&distance>0)zoom(pinchDistance/distance,{x:(p[0].x+p[1].x)/2-rect.left,y:(p[0].y+p[1].y)/2-rect.top});pinchDistance=distance;}else{box.x-=dx/size.width*box.width;box.y-=dy/size.height*box.height;draw();}});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])svg.addEventListener(name,event=>{pointers.delete(event.pointerId);if(pointers.size<2)pinchDistance=0;if(name==='pointercancel')moved=true;});
  svg.addEventListener('wheel',event=>{if(!event.ctrlKey&&!event.metaKey&&document.activeElement!==svg)return;event.preventDefault();const rect=svg.getBoundingClientRect();zoom(Math.exp(Math.max(-100,Math.min(100,event.deltaY))*0.006),{x:event.clientX-rect.left,y:event.clientY-rect.top});},{passive:false});
  svg.addEventListener('keydown',event=>{if(event.target!==svg)return;const shifts={ArrowLeft:[-0.2,0],ArrowRight:[0.2,0],ArrowUp:[0,-0.2],ArrowDown:[0,0.2]};if(shifts[event.key]){event.preventDefault();const [x,y]=shifts[event.key];box.x+=x*box.width;box.y+=y*box.height;draw();}else if(['+','=','-','Home'].includes(event.key)){event.preventDefault();if(event.key==='Home')overview();else zoom(event.key==='-'?1/0.6:0.6);}});
  new ResizeObserver(entries=>{const rect=entries[0].contentRect;if(!rect.width||!rect.height)return;const aspect=rect.width/rect.height;if(box){const cx=box.x+box.width/2;box.width=box.height*aspect;box.x=cx-box.width/2;}size={width:rect.width,height:rect.height};if(!box)overview();else draw();}).observe(svg);
  overview();renderSelection();
  return {update};
}
