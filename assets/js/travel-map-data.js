// Geographic helpers shared by the browser and build-time validation.
export const LATITUDE_SCALE = Math.cos(35 * Math.PI / 180);
export const project = ([longitude, latitude]) => [longitude * LATITUDE_SCALE, -latitude];
export function fitBounds(points, aspect = 1.5, minHeight = 0.08) {
  const coordinates = points.map(point => project(point.coordinates));
  if (!coordinates.length) return fitBounds([{coordinates:[122,24]}, {coordinates:[147,46]}], aspect);
  const xs = coordinates.map(p => p[0]), ys = coordinates.map(p => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const height = Math.max(minHeight, (Math.max(...ys)-Math.min(...ys))*1.5, (Math.max(...xs)-Math.min(...xs))*1.5/aspect);
  return {x:cx-height*aspect/2,y:cy-height/2,width:height*aspect,height};
}
export function clusterPoints(points, box, width, height, radius = 46) {
  const screen = points.map(point => {const [x,y]=project(point.coordinates);return {point,x:(x-box.x)/box.width*width,y:(y-box.y)/box.height*height};});
  const groups=[];
  for (const item of screen) {
    // A bounded group avoids chaining all neighboring cities into one marker.
    const group=groups.find(g=>Math.hypot(g.x-item.x,g.y-item.y)<radius);
    if (group) {group.items.push(item.point);group.x=(group.x*(group.items.length-1)+item.x)/group.items.length;group.y=(group.y*(group.items.length-1)+item.y)/group.items.length;}
    else groups.push({x:item.x,y:item.y,items:[item.point]});
  }
  return groups;
}
export function personalPoints(catalog, rows) {
  return catalog.areas.flatMap(area=>{const records=rows.filter(row=>row.cityId===area.cityId);return records.length?[{...area,kind:'personal',records,photos:records.reduce((n,row)=>n+row.photos,0)}]:[];});
}
export function referencePoints(catalog, {q='',city='',work=''} = {}) {
  const query=q.trim().toLocaleLowerCase();
  return catalog.references.filter(point=>(!city||point.cityId===city)&&(!work||point.works.includes(work))&&(!query||[point.name,point.city,...point.works,point.note].join(' ').toLocaleLowerCase().includes(query))).map(point=>({...point,kind:'reference'}));
}
export function validateTravelMap(catalog, cityIds) {
  const fail=message=>{throw new Error('巡礼地图：'+message);};
  const ids=new Set(), cities=new Set(cityIds);
  if(catalog.version!==1||!Array.isArray(catalog.areas)||!Array.isArray(catalog.references))fail('无效的数据格式');
  for(const point of [...catalog.areas,...catalog.references]) {
    if(!point.id||ids.has(point.id))fail('地点 ID 重复或为空');ids.add(point.id);
    const [lng,lat]=point.coordinates||[];
    if(!Number.isFinite(lng)||!Number.isFinite(lat)||lng<122||lng>147||lat<24||lat>46)fail('坐标超出日本范围：'+point.id);
    if(!point.name||!point.note)fail('缺少地点名称或说明');
  }
  for(const area of catalog.areas) {if(!cities.has(area.cityId)||area.precision!=='region'||!area.source?.query)fail('城市区域来源无效');checkUrl(area.source.url);}
  if(new Set(catalog.areas.map(area=>area.cityId)).size!==cities.size)fail('城市入口未完整覆盖');
  const subjects=new Set(catalog.subjects.map(subject=>subject.id));
  for(const point of catalog.references) {
    if(!subjects.has(point.subjectId)||!point.origin||!point.pid||!point.works?.length||!point.coordinateNote)fail('参考地点来源不完整');
    for(const url of [point.originUrl,point.sourceUrl,point.anitabiUrl])checkUrl(url);
    // These snapshots intentionally derive coordinates from a documented source URL, not an absent geo field.
    const pair=new URL(point.originUrl).searchParams.get('ll')?.split(',').map(Number);
    if(!pair||pair[1]!==point.coordinates[0]||pair[0]!==point.coordinates[1])fail('出处坐标不匹配');
  }
  for(const subject of catalog.subjects) {checkUrl(subject.url);if(new URL(subject.url).searchParams.get('bangumiId')!==String(subject.id))fail('作品链接不匹配');}
  if(catalog.referenceLicense?.name!=='CC BY-NC-SA 4.0')fail('缺少参考资料许可');
  checkUrl(catalog.boundary.url);checkUrl(catalog.boundary.licenseUrl);checkUrl(catalog.referenceLicense.documentation);
  return true;
  function checkUrl(value) {let url;try{url=new URL(value);}catch{fail('来源链接无效');}if(url.protocol!=='https:')fail('来源链接必须为 HTTPS');}
}
