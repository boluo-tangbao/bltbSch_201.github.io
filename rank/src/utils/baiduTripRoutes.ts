import { geocodeWithBaidu, loadBaiduMaps, pointForPlace } from './baiduMaps.ts'
import type { RouteChoice, TravelMode, TripGroup } from './tripRouting.ts'

const cache=new Map<string,{expires:number;value:Promise<RouteChoice>;signal:AbortSignal;pending:boolean}>()
let running=0
const queue:Array<()=>void>=[]
function pump(){while(running<2&&queue.length){running++;queue.shift()!()}}
async function limited<T>(job:()=>Promise<T>):Promise<T>{
  await new Promise<void>(resolve=>{queue.push(resolve);pump()})
  try{return await job()}finally{running--;pump()}
}
export function routePaths(plan:any){
  const paths:Array<Array<{lng:number;lat:number}>>=[]
  for(const [count,get] of [['getNumRoutes','getRoute'],['getNumLines','getLine']]){
    const length=Number(plan[count!]?.()||0)
    for(let i=0;i<length;i++){
      const points=plan[get!]?.(i)?.getPath?.()
      if(Array.isArray(points)){const valid=points.filter(p=>Number.isFinite(p.lng)&&Number.isFinite(p.lat)).map(p=>({lng:p.lng,lat:p.lat}));if(valid.length>1)paths.push(valid)}
    }
  }
  return paths
}
/** Uses provider seconds, never a straight-line distance / assumed speed. */
export function parseRouteResult(result:any,mode:TravelMode):RouteChoice{
  const plans=Array.from({length:Math.max(0,Number(result?.getNumPlans?.()||0))},(_,i)=>result.getPlan(i))
    .flatMap(plan=>{const value=plan?.getDuration?.(false);if((typeof value!=='number'&&typeof value!=='string')||String(value).trim()===''||!Number.isFinite(Number(value))||Number(value)<0)return []
      return [{mode,seconds:Number(value),meters:Number(plan.getDistance?.(false))||0,paths:routePaths(plan),queriedAt:Date.now()}]})
    .sort((a,b)=>a.seconds-b.seconds)
  if(!plans[0])throw new Error('未找到可用路线')
  return plans[0]
}
async function query(api:any,from:TripGroup,to:TripGroup,a:any,b:any,mode:TravelMode,signal:AbortSignal):Promise<RouteChoice>{
  return limited(()=>new Promise((resolve,reject)=>{
    if(signal.aborted){reject(new Error('查询已取消'));return}
    let settled=false,service:any
    const timer=setTimeout(()=>finish(undefined,new Error('路线查询超时')),12000)
    const onAbort=()=>finish(undefined,new Error('查询已取消'))
    const finish=(value?:RouteChoice,error?:Error)=>{if(settled)return;settled=true;clearTimeout(timer);signal.removeEventListener('abort',onAbort);error?reject(error):resolve(value!)}
    signal.addEventListener('abort',onAbort,{once:true})
    try{
      const Constructor=mode==='walk'?api.WalkingRoute:mode==='bus'?api.TransitRoute:api.DrivingRoute
      if(!Constructor)throw new Error('当前地图版本不支持此路线查询')
      service=new Constructor(from.city,{policy:0,onSearchComplete:(result:any)=>{
        if(service.getStatus()!==0){finish(undefined,new Error('地图未返回可用路线'));return}
        try{finish(parseRouteResult(result,mode))}catch{finish(undefined,new Error('地图未返回有效耗时'))}
      }})
      service.search(a,b)
    }catch{finish(undefined,new Error('地图路线查询失败'))}
  }))
}
export async function queryTripOptions(from:TripGroup,to:TripGroup,signal:AbortSignal,force=false):Promise<RouteChoice[]>{
  if(from.city!==to.city)return []
  const api=await loadBaiduMaps()
  const locate=(group:TripGroup)=>group.place?pointForPlace(api,group.place):group.address?geocodeWithBaidu(api,group.address,group.city,false):Promise.resolve(null)
  const [a,b]=await Promise.all([locate(from),locate(to)])
  if(!a||!b||signal.aborted)return []
  const values=await Promise.allSettled((['walk','bus','car'] as const).map(async mode=>{
    const key=JSON.stringify([a.lng,a.lat,b.lng,b.lat,mode]),old=cache.get(key)
    if(!force&&old&&(!old.pending||!old.signal.aborted)&&old.expires>Date.now())return old.value
    const value=query(api,from,to,a,b,mode,signal)
    cache.set(key,{expires:Date.now()+180000,value,signal,pending:true})
    try{const result=await value;const entry=cache.get(key);if(entry?.value===value)entry.pending=false;return result}catch(error){if(cache.get(key)?.value===value)cache.delete(key);throw error}
  }))
  return values.flatMap(value=>value.status==='fulfilled'?[value.value]:[])
}
