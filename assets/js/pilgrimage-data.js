export function validatePilgrimage(data) {
 const fail=message=>{throw new Error('巡礼资料：'+message);};
 if(!data||data.version!==1)fail('不支持的版本');
 const groups=['works','places','scenes','visits'],maps={};
 const image=image=>{if(!image||typeof image.preview!=='string'||typeof image.full!=='string')fail('图片须提供 preview 和 full');for(const path of [image.preview,image.full])if(!path.startsWith('assets/')||path.includes('..')||/[?#\\]/.test(path))fail('图片须使用站内网页素材路径');};
 for(const group of groups){if(!Array.isArray(data[group]))fail(group+' 应为数组');maps[group]=new Map();for(const row of data[group]){if(!row||!/^[-a-z0-9]+$/.test(row.id||'')||maps[group].has(row.id))fail(group+' ID 无效或重复');maps[group].set(row.id,row);if(group==='works'&&!row.title)fail('缺少作品名');if(group==='places'&&!row.name)fail('缺少地点名');if(row.cover)image(row.cover);}}
 for(const place of data.places)if(place.coordinates&&(!Number.isFinite(place.coordinates.lat)||!Number.isFinite(place.coordinates.lng)||Math.abs(place.coordinates.lat)>90||Math.abs(place.coordinates.lng)>180))fail('坐标无效');
 for(const visit of data.visits){if(!maps.places.has(visit.placeId)||!Array.isArray(visit.photos)||!visit.dateLabel)fail('到访记录缺少地点、日期原文或照片数组');if(visit.date&&(typeof visit.date!=='string'||visit.date.length!==10||!Number.isFinite(Date.parse(visit.date))||new Date(visit.date).toISOString().slice(0,10)!==visit.date))fail('到访日期无效');const ids=new Set();for(const photo of visit.photos){if(!photo.id||ids.has(photo.id))fail('到访照片 ID 缺失或重复');ids.add(photo.id);image(photo);}}
 for(const scene of data.scenes){if(!maps.works.has(scene.workId)||!maps.places.has(scene.placeId))fail('场景关联的作品或地点不存在');if(scene.reference)image(scene.reference);for(const match of scene.matches||[]){const visit=maps.visits.get(match.visitId);if(!visit||visit.placeId!==scene.placeId||!visit.photos.some(photo=>photo.id===match.photoId))fail('场景实拍关联无效');}}
 return data;
}
export const placeWorkIds=(data,id)=>[...new Set(data.scenes.filter(scene=>scene.placeId===id).map(scene=>scene.workId))];
export const workPlaceIds=(data,id)=>[...new Set(data.scenes.filter(scene=>scene.workId===id).map(scene=>scene.placeId))];
export const placeVisits=(data,id)=>data.visits.filter(visit=>visit.placeId===id).sort((a,b)=>(b.date||b.dateLabel).localeCompare(a.date||a.dateLabel));
export function placeCover(data,place){return place.cover||placeVisits(data,place.id).flatMap(visit=>visit.photos)[0]||data.scenes.find(scene=>scene.placeId===place.id&&scene.reference)?.reference;}
