import type { Place } from '../types/index.ts'
import type { TripStop } from './tripPlan.ts'
import { hasCoordinates } from './cities.ts'

export type TravelMode = 'walk'|'bus'|'car'
export type ModePreference = TravelMode|'auto'
export interface RouteChoice {mode:TravelMode;seconds:number;meters:number;paths:Array<Array<{lng:number;lat:number}>>;queriedAt:number}
export interface TripGroup {id:string;name:string;city:string;address:string;place?:Place;entries:TripStop[]}
export interface VisitSetting {close?:string;minutes:number;earlyShopClose?:boolean}
export type RouteMatrix = Record<string,RouteChoice[]>
export const legKey=(a:string,b:string)=>JSON.stringify([a,b])
export const modeNames:Record<ModePreference,string>={auto:'最快方式',walk:'步行',bus:'公共交通',car:'驾车'}
export function groupTripStops(stops:TripStop[],places:Place[]):TripGroup[]{
  const groups:TripGroup[]=[]
  for(const stop of stops){let group=groups.find(g=>g.id===stop.placeId);if(!group){const place=places.find(p=>p.id===stop.placeId);group={id:stop.placeId,name:place?.name??stop.name,city:stop.city,address:stop.address,place,entries:[]};groups.push(group)}group.entries.push(stop)}
  return groups
}
export function chooseRoute(matrix:RouteMatrix,a:string,b:string,preference:ModePreference='auto'){
  const choices=matrix[legKey(a,b)]||[]
  return preference==='auto'?[...choices].sort((a,b)=>a.seconds-b.seconds)[0]:choices.find(c=>c.mode===preference)
}
export function chinaDateTime(now=new Date()){
  const p=Object.fromEntries(new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]))
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`
}
export function parseDeparture(value:string){return new Date(`${value}+08:00`).getTime()}
export function formatTripTime(value:number|null){return value===null?'时间待定':chinaDateTime(new Date(value)).slice(5).replace('T',' ')}
export interface RoutingSettings {start:number;completed:number;modes:Record<string,ModePreference>;visits:Record<string,VisitSetting>}
export interface TripLeg {key:string;index:number;from:TripGroup;to:TripGroup;done:boolean;choice?:RouteChoice;departure:number|null;arrival:number|null;close:number|null;earlyShopWarning?:boolean;risk:'unknown'|'ok'|'closed'|'during'|'tight'}
export function evaluateTrip(groups:TripGroup[],matrix:RouteMatrix,settings:RoutingSettings){
  let clock=settings.start,uncertain=!Number.isFinite(clock),seconds=0;const legs:TripLeg[]=[]
  const date=Number.isFinite(clock)?chinaDateTime(new Date(clock)).slice(0,10):''
  for(let i=0;i<groups.length-1;i++){
    const from=groups[i]!,to=groups[i+1]!,key=legKey(from.id,to.id),done=i<settings.completed
    const choice=chooseRoute(matrix,from.id,to.id,settings.modes[key]||'auto')
    const leg:TripLeg={key,index:i,from,to,done,choice,departure:null,arrival:null,close:null,risk:'unknown'}
    if(done){legs.push(leg);continue}
    if(!choice||uncertain){if(choice)seconds+=choice.seconds;uncertain=true;legs.push(leg);continue}
    seconds+=choice.seconds;leg.departure=clock;leg.arrival=clock+choice.seconds*1000
    const visit=settings.visits[to.id],stay=(visit?.minutes??30)*60000
    if(visit?.close&&/^([01]\d|2[0-3]):[0-5]\d$/.test(visit.close))leg.close=new Date(`${date}T${visit.close}:00+08:00`).getTime()
    clock=leg.arrival+stay
    const earlyClose=new Date(`${date}T20:00:00+08:00`).getTime()
    leg.earlyShopWarning=!!visit?.earlyShopClose&&(leg.arrival>=earlyClose||clock>earlyClose)
    if(leg.close!==null)leg.risk=leg.arrival>=leg.close?'closed':clock>leg.close?'during':leg.close-clock<900000?'tight':'ok'
    legs.push(leg)
  }
  const remaining=legs.filter(l=>!l.done),risks=remaining.filter(l=>l.risk==='closed'||l.risk==='during')
  const missing=remaining.filter(l=>!l.choice).length
  return {legs,risks,complete:!missing&&Number.isFinite(settings.start),totalSeconds:missing?null:seconds,knownSeconds:seconds,
    score:[missing,risks.length,risks.reduce((sum,l)=>sum+Math.max(0,(l.arrival!+(settings.visits[l.to.id]?.minutes??30)*60000)-l.close!),0),remaining.filter(l=>l.earlyShopWarning).length,seconds]}
}
export function optimizeTrip(groups:TripGroup[],matrix:RouteMatrix,settings:RoutingSettings){
  const fixed=groups.slice(0,settings.completed+1),remaining=groups.slice(settings.completed+1)
  // Exact search is bounded; larger plans retain the visitor's order, with honest labeling.
  if(groups.length>8)return {groups,status:'too-many' as const}
  const nodes=groups.slice(settings.completed)
  if(nodes.some(a=>nodes.some(b=>a!==b&&!chooseRoute(matrix,a.id,b.id,settings.modes[legKey(a.id,b.id)]||'auto'))))return {groups,status:'missing' as const}
  let best=groups,bestScore:number[]|undefined
  const less=(a:number[],b:number[])=>{for(let i=0;i<a.length;i++){if(a[i]!==b[i])return a[i]!<b[i]!}return false}
  function search(path:TripGroup[],left:TripGroup[]){if(!left.length){const candidate=[...fixed,...path],score=evaluateTrip(candidate,matrix,settings).score;if(!bestScore||less(score,bestScore)){best=candidate;bestScore=score}return}left.forEach((node,i)=>search([...path,node],left.filter((_,j)=>i!==j)))}
  search([],remaining);return {groups:best,status:bestScore?.[1]?'risk' as const:'optimal' as const}
}
export function storedCoordinate(group:TripGroup){return group.place&&hasCoordinates(group.place)?group.place.location:null}
