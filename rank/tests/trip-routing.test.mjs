import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {chinaDateTime,parseDeparture,groupTripStops,chooseRoute,evaluateTrip,optimizeTrip,legKey} from '../src/utils/tripRouting.ts'
import {readTripEntries,resolveTripStops,tripPlanHtml} from '../src/utils/tripPlan.ts'
import {parseRouteResult,queryTripOptions} from '../src/utils/baiduTripRoutes.ts'
const group=id=>({id,name:id,city:'上海',address:'公开测试地点',entries:[]})
const choice=(mode,seconds)=>({mode,seconds,meters:100,paths:[],queriedAt:0})
const start=parseDeparture('2026-11-01T12:00:00'),settings={start,completed:0,modes:{},visits:{b:{minutes:30},c:{minutes:30,close:'12:50'}}}
const groups=['a','b','c'].map(group),matrix={}
for(const a of groups)for(const b of groups)if(a!==b)matrix[legKey(a.id,b.id)]=[choice('walk',a.id==='a'&&b.id==='c'?600:300),choice('car',900)]
test('closing windows outrank the shortest unconstrained order; completed prefix and chosen modes are preserved',()=>{
 assert.equal(chooseRoute(matrix,'a','b').mode,'walk')
 assert.equal(chooseRoute(matrix,'a','b','car').seconds,900)
 const optimized=optimizeTrip(groups,matrix,settings)
 assert.deepEqual(optimized.groups.map(g=>g.id),['a','c','b'])
 const completed=evaluateTrip(groups,matrix,{...settings,completed:1})
 assert(completed.legs[0].done);assert.equal(completed.legs[1].departure,start)
 const locked=optimizeTrip(groups,matrix,{...settings,completed:1})
 assert.deepEqual(locked.groups.map(g=>g.id),['a','b','c'])
})
test('missing segments never become zero-minute complete totals or invented arrival times',()=>{
 const result=evaluateTrip(groups,{[legKey('b','c')]:[choice('walk',300)]},settings)
 assert.equal(result.totalSeconds,null);assert.equal(result.knownSeconds,300);assert.equal(result.legs[1].arrival,null)
 assert.equal(optimizeTrip(groups,{},settings).status,'missing')
 const late=evaluateTrip(groups,matrix,{...settings,start:parseDeparture('2026-11-01T23:00:00')})
 assert(late.risks.length)
 assert.equal(chinaDateTime(new Date('2026-10-31T20:00:00Z')),'2026-11-01T04:00:00')
})
test('same-building selections merge, and private entries survive refresh/export without becoming directory confirmation',()=>{
 const place={id:'area',published:true,name:'商圈',city:'上海',location:'公开地址'}
 const entry={placeId:'area',shopName:'<自填>',custom:{id:'one',name:'<自填>',city:'上海',address:'四层',note:'<script>备注</script>'}}
 const parsed=readTripEntries(JSON.stringify([{placeId:'area'},entry]))
 const resolved=resolveTripStops(parsed,[place],{})
 assert.equal(groupTripStops(resolved,[place]).length,1);assert.equal(resolved[1].status,'自填，仅用于本次行程')
 const html=tripPlanHtml(resolved,'https://example.com/guide/','2026-11-01')
 assert(html.includes('&lt;script&gt;备注&lt;/script&gt;'));assert(!html.includes('<script>'))
 assert.equal(readTripEntries(JSON.stringify([{...entry,custom:{name:4}}])).length,0)
})
test('precomputed radius membership never crosses cities and nests 3km inside 5km',()=>{
 const data=JSON.parse(readFileSync(new URL('../src/data/places.json',import.meta.url),'utf8'))
 const byId=new Map(Object.entries(data).flatMap(([city,rows])=>rows.filter(p=>p.published).map(p=>[p.id,{...p,city}])))
 const index=JSON.parse(readFileSync(new URL('../src/data/trip-nearby.json',import.meta.url),'utf8'))
 for(const [id,entry] of Object.entries(index.byPlace)){
  assert(entry.within3km.includes(id));assert(entry.within3km.every(p=>entry.within5km.includes(p)))
  assert(entry.wholeCity.every(p=>byId.get(p).city===entry.city))
  for(const p of entry.within3km)assert(entry.meters[p]<=3000)
  for(const p of entry.within5km)assert(entry.meters[p]<=5000)
 }
 assert(index.byPlace['shanghai-shop-011'].wholeCity.includes('shanghai-shop-022'))
 assert(!index.byPlace['shanghai-shop-011'].within5km.includes('shanghai-shop-022'))
})
test('provider parses numeric seconds, rejects missing duration, and chooses the fastest returned map plan',()=>{
 const plan=seconds=>({getDuration:()=>seconds,getDistance:()=>100,getNumRoutes:()=>1,getRoute:()=>({getPath:()=>[{lng:121,lat:31},{lng:121.1,lat:31.1}]})})
 const result=parseRouteResult({getNumPlans:()=>3,getPlan:i=>[plan(null),plan('900'),plan(600)][i]},'walk')
 assert.equal(result.seconds,600);assert.equal(result.paths[0].length,2)
 assert.throws(()=>parseRouteResult({getNumPlans:()=>1,getPlan:()=>plan(null)},'bus'))
})
test('actual provider adapter caches successes, refreshes on demand and respects cancellations',async()=>{
 let calls=0
 class Point{constructor(lng,lat){this.lng=lng;this.lat=lat}}
 class Route{constructor(city,options){this.options=options}getStatus(){return 0}search(){calls++;queueMicrotask(()=>this.options.onSearchComplete({getNumPlans:()=>1,getPlan:()=>({getDuration:()=>600,getDistance:()=>100,getNumRoutes:()=>0})}))}}
 global.window={BMapGL:{Point,WalkingRoute:Route,TransitRoute:Route,DrivingRoute:Route}}
 const a={...group('provider-a'),place:{location:{lng:121,lat:31}}},b={...group('provider-b'),place:{location:{lng:121.01,lat:31.01}}}
 const first=new AbortController();assert.equal((await queryTripOptions(a,b,first.signal)).length,3);assert.equal(calls,3)
 first.abort();assert.equal((await queryTripOptions(a,b,new AbortController().signal)).length,3);assert.equal(calls,3)
 await queryTripOptions(a,b,new AbortController().signal,true);assert.equal(calls,6)
 const abort=new AbortController();abort.abort();assert.deepEqual(await queryTripOptions(a,b,abort.signal),[])
 delete global.window
})
