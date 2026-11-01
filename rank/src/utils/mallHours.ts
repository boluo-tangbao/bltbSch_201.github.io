import data from '../data/mall-hours.json' with { type: 'json' }

interface HoursSource {close:string;label:string;url:string;publishedAt:string;quote:string;note:string}
export function mallHours(placeId:string){
  const source=(data.references as Record<string,HoursSource>)[placeId]
  if(source)return {close:source.close,kind:'published' as const,label:'商场公开参考',source,checkedAt:data.checkedAt}
  if(data.mallPlaceIds.includes(placeId))return {close:data.bailianFallbackIds.includes(placeId)?data.fallback.bailianClose:data.fallback.close,kind:'fallback' as const,label:'商场时间待核 · 暂用规划参考',source:undefined,checkedAt:data.checkedAt}
  return {close:undefined,kind:'unknown' as const,label:'无统一商场时间，需确认目标店',source:undefined,checkedAt:data.checkedAt}
}
