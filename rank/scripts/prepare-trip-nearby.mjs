import {readFileSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
const source=JSON.parse(readFileSync(new URL('../src/data/places.json',import.meta.url),'utf8'))
const places=Object.entries(source).flatMap(([city,rows])=>rows.filter(p=>p.published).map(p=>({id:p.id,city,location:p.location})))
const located=p=>p.location&&typeof p.location==='object'&&Number.isFinite(p.location.lat)&&Number.isFinite(p.location.lng)
function distance(a,b){const r=Math.PI/180,dy=(b.lat-a.lat)*r,dx=(b.lng-a.lng)*r,h=Math.sin(dy/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dx/2)**2;return 6371008.8*2*Math.asin(Math.sqrt(Math.min(1,h)))}
const byPlace={}
for(const a of places.filter(located)){
  const rows=places.filter(b=>b.city===a.city).map(b=>({id:b.id,exact:located(b)?distance(a.location,b.location):null})).sort((a,b)=>(a.exact??Infinity)-(b.exact??Infinity)||a.id.localeCompare(b.id))
  byPlace[a.id]={city:a.city,within3km:rows.filter(b=>b.exact!==null&&b.exact<=3000).map(b=>b.id),within5km:rows.filter(b=>b.exact!==null&&b.exact<=5000).map(b=>b.id),wholeCity:rows.map(b=>b.id),meters:Object.fromEntries(rows.filter(b=>b.exact!==null).map(b=>[b.id,Math.round(b.exact)]))}
}
const output=JSON.stringify({version:1,inputHash:createHash('sha256').update(JSON.stringify(places)).digest('hex'),byPlace})+'\n'
const target=new URL('../src/data/trip-nearby.json',import.meta.url)
let previous='';try{previous=readFileSync(target,'utf8')}catch{}
if(previous!==output)writeFileSync(target,output)
console.log(`附近范围已预计算：${Object.keys(byPlace).length} 个地点，3公里 / 5公里 / 全城。`)
