<script setup lang="ts">
import {computed,onBeforeUnmount,reactive,ref,watch} from 'vue'
import type {Place,ShopDirectory} from '../types'
import directoriesData from '../data/shop-directories.json'
import nearbyData from '../data/trip-nearby.json'
import community from '../data/community.json'
import {useTripPlan} from '../utils/useTripPlan'
import {useShopToday} from '../utils/shopToday'
import {resolveTripStops,tripEntryKey,tripStopUrl,type TripEntry} from '../utils/tripPlan'
import {shopDisplayStatus,shopStatusLabel} from '../utils/shopDirectory'
import {baiduMapConfigured} from '../utils/baiduMaps'
import {queryTripOptions} from '../utils/baiduTripRoutes'
import {mallHours} from '../utils/mallHours'
import {chinaDateTime,evaluateTrip,formatTripTime,groupTripStops,legKey,modeNames,optimizeTrip,parseDeparture,type ModePreference,type RouteMatrix,type TripGroup,type VisitSetting} from '../utils/tripRouting'
import TripRouteMap from './TripRouteMap.vue'
import CopyButton from './CopyButton.vue'
import { sessionTripPreferences } from '../utils/tripArchive'

const props=defineProps<{places:Place[];guideUrl:string}>()
const emit=defineEmits<{details:[]}>()
const plan=useTripPlan(),today=useShopToday(),directories=directoriesData as Record<string,ShopDirectory>
const resolved=computed(()=>resolveTripStops(plan.entries.value,props.places,directories,today.value))
const groups=computed(()=>groupTripStops(resolved.value,props.places))
const selected=ref(groups.value[0]?.id||'')
const active=computed(()=>groups.value.find(g=>g.id===selected.value)||groups.value[0])
const departure=ref(chinaDateTime()),clockRead=ref(`系统时间 ${departure.value.replace('T',' ')}（上海）`)
const modes=reactive<Record<string,ModePreference>>({}),visits=reactive<Record<string,VisitSetting>>({})
const routeEnabled=ref(false)
function enableRoutes(){routeEnabled.value=true;void analyse(true)}
const completedPrefix=ref<string[]>([]),matrix=ref<RouteMatrix>({}),busy=ref(false),message=ref(''),progress=ref('')
const metadataKey='tangbao-trip-routing-session-v1'
try{
  Object.assign(modes,sessionTripPreferences().modes);Object.assign(visits,sessionTripPreferences().visits)
  const data=JSON.parse(sessionStorage.getItem(metadataKey)||'{}')
  if(Array.isArray(data.prefix)&&data.prefix.length<=120&&data.prefix.every((id:unknown)=>typeof id==='string'))completedPrefix.value=data.prefix
}catch{/* A session without storage still works. */}
function validPrefix(){return completedPrefix.value.length>1&&completedPrefix.value.every((id,i)=>groups.value[i]?.id===id)}
const completed=computed(()=>validPrefix()?completedPrefix.value.length-1:0)
if(validPrefix())selected.value=groups.value[completed.value]?.id||selected.value
function save(){try{sessionStorage.setItem(metadataKey,JSON.stringify({prefix:completedPrefix.value,modes,visits}))}catch{}}
const effectiveVisits=computed(()=>Object.fromEntries(groups.value.map(g=>[g.id,{...visit(g.id),earlyShopClose:!visits[g.id]?.close}])))
const settings=computed(()=>({start:parseDeparture(departure.value),completed:completed.value,modes,visits:effectiveVisits.value}))
const evaluation=computed(()=>evaluateTrip(groups.value,matrix.value,settings.value))
const activeIndex=computed(()=>groups.value.findIndex(g=>g.id===active.value?.id))
const nextLeg=computed(()=>evaluation.value.legs[activeIndex.value])
const riskLabel=(risk:string)=>({unknown:'目标店闭店时间未核对，风险待确认',closed:'预计到达时已超过参考截止',during:'预计逛店期间可能超过参考截止',tight:'距参考截止不足15分钟',ok:'未超过参考截止，目标店营业仍需确认'}[risk]||'')
function visit(id:string){return {minutes:visits[id]?.minutes??30,close:visits[id]?.close??mallHours(id).close}}
function hoursLabel(id:string){return visits[id]?.close?'本次自填截止':mallHours(id).label}
function setVisit(id:string,field:'close'|'minutes',event:Event){const input=event.target as HTMLInputElement;if(!input.reportValidity())return;visits[id]={...visits[id],minutes:visits[id]?.minutes??30,[field]:field==='minutes'?Number(input.value):input.value||undefined};save();void analyse(true)}
function resetClose(id:string){delete visits[id]?.close;save();void analyse(true)}
function readClock(){departure.value=chinaDateTime();clockRead.value=`系统时间 ${departure.value.replace('T',' ')}（上海）`}
function manualTime(){clockRead.value='本次手动出发时间；刷新或完成路段后读取新的系统时间。';void analyse(false)}
function replaceOrder(order:TripGroup[]){const available=new Set(resolved.value.map(tripEntryKey));const unavailable=plan.entries.value.filter(e=>!available.has(tripEntryKey(e)));plan.replace([...order.flatMap(g=>g.entries.map(({placeId,shopName,custom})=>({placeId,...(shopName?{shopName}:{}),...(custom?{custom}:{})}))),...unavailable])}
function move(index:number,offset:number){const target=index+offset;if(target<0||target>=groups.value.length||(completed.value&&(index<=completed.value||target<=completed.value)))return;const next=[...groups.value];[next[index],next[target]]=[next[target]!,next[index]!];replaceOrder(next);void analyse(false)}
function removeGroup(index:number){if(completed.value&&index<=completed.value)return;const id=groups.value[index]!.id;plan.replace(plan.entries.value.filter(e=>e.placeId!==id))}
function setMode(key:string,event:Event){if(evaluation.value.legs.find(l=>l.key===key)?.done)return;modes[key]=(event.target as HTMLSelectElement).value as ModePreference;save();void analyse(false)}
function complete(index:number){if(index<completed.value||index>=groups.value.length-1)return;completedPrefix.value=groups.value.slice(0,index+2).map(g=>g.id);selected.value=groups.value[index+1]!.id;readClock();save();void analyse(false,true)}
function resetProgress(){completedPrefix.value=[];readClock();save();void analyse(true,true)}
let revision=0,controller:AbortController|undefined
async function analyse(optimize=false,force=false){
  if(!routeEnabled.value)return
  controller?.abort();const current=++revision;controller=new AbortController();const signal=controller.signal
  if(!Number.isFinite(settings.value.start)){message.value='请填写有效的出发时间。';busy.value=false;return}
  if(groups.value.length<2){message.value='再加入一站，就可以计算通勤。';busy.value=false;return}
  if(!baiduMapConfigured()){message.value='地图路线服务尚未配置，通勤时间暂不可用。';busy.value=false;return}
  busy.value=true;message.value='';progress.value='正在查询百度地图…'
  if(force)matrix.value={}
  const snapshot=[...groups.value],remaining=snapshot.slice(completed.value)
  const pairs:Array<[TripGroup,TripGroup]>=optimize&&snapshot.length<=8?remaining.flatMap(a=>remaining.filter(b=>b.id!==a.id).map(b=>[a,b] as [TripGroup,TripGroup])):remaining.slice(0,-1).map((a,i)=>[a,remaining[i+1]!] as [TripGroup,TripGroup])
  let failures=0,done=0
  try{
    for(const [a,b] of pairs){
      if(signal.aborted)return
      progress.value=`地图查询 ${++done} / ${pairs.length} 对地点`
      const choices=await queryTripOptions(a,b,signal,force)
      if(current!==revision)return
      matrix.value={...matrix.value,[legKey(a.id,b.id)]:choices};failures=choices.length?0:failures+1
      if(failures>=3){message.value='连续多个路段查询失败，已暂停；可重新计算重试。';break}
    }
    if(current!==revision)return
    if(optimize){
      const result=optimizeTrip(snapshot,matrix.value,settings.value)
      if(result.status==='optimal'||result.status==='risk'){
        replaceOrder(result.groups)
        const incompleteModes=pairs.some(([a,b])=>(matrix.value[legKey(a.id,b.id)]||[]).length<3)
        message.value=result.status==='risk'?'已优先减少超过参考截止的风险，仍有站点可能赶不上。':`已按本次${incompleteModes?'可用的':'地图返回的'}交通方案安排建议顺序，起点保持固定。`
      }else message.value=result.status==='too-many'?'超过8站，保留当前顺序并查询逐段通勤；可手动调整。':'部分路线未知，保留当前顺序，无法确认最优路线。'
    }
    if(!evaluation.value.complete)message.value+=' 有路段尚未查到时间，完整总耗时待补齐。'
    if(groups.value.some(g=>!visits[g.id]?.close&&mallHours(g.id).kind!=='published'))message.value+=' 部分商场时间仍待核，暂用规划参考。'
  }catch{if(current===revision)message.value='地图暂时未返回有效路线，请稍后重新计算；没有使用估造耗时。'}
  finally{if(current===revision){busy.value=false;progress.value=''}}
}
watch(()=>groups.value.map(g=>g.id).sort().join('|'),()=>{if(!groups.value.some(g=>g.id===selected.value))selected.value=groups.value[0]?.id||'';if(completedPrefix.value.length&&!validPrefix())completedPrefix.value=[];void analyse(true)},{immediate:true})
onBeforeUnmount(()=>{revision++;controller?.abort()})

type NearbyEntry={city:string;within3km:string[];within5km:string[];wholeCity:string[];meters:Record<string,number>}
const nearby=(nearbyData as {byPlace:Record<string,NearbyEntry>}).byPlace
const catalog=ref<HTMLDialogElement>(),customDialog=ref<HTMLDialogElement>(),scope=ref<'within3km'|'within5km'|'wholeCity'>('within3km'),catalogAnchor=ref(''),catalogCity=ref(''),term=ref(''),focused=ref(''),placeLimit=ref(5),regularLimit=ref(5),activityLimit=ref(5)
const available=computed(()=>props.places.filter(p=>p.published&&p.city===catalogCity.value))
function shops(place:Place){return(directories[place.id]?.shops||[]).filter(s=>shopDisplayStatus(s,today.value)==='open')}
const candidates=computed(()=>{
  const entry=nearby[catalogAnchor.value],ids=scope.value==='wholeCity'?available.value.map(p=>p.id):entry?.[scope.value]||[]
  const found=new Map(available.value.map(p=>[p.id,p]))
  const query=term.value.trim().toLocaleLowerCase()
  return ids.flatMap(id=>{const p=found.get(id);return p&&(!query||(p.name+' '+p.aliases?.join(' ')+' '+shops(p).flatMap(s=>[s.name,...s.aliases||[]]).join(' ')).toLocaleLowerCase().includes(query))?[p]:[]})
})
const focusedPlace=computed(()=>available.value.find(p=>p.id===focused.value))
const focusedShops=computed(()=>focusedPlace.value?shops(focusedPlace.value):[])
function openCatalog(){const center=active.value?.place||[...groups.value].reverse().find(g=>g.place&&g.city===active.value?.city)?.place;catalogAnchor.value=center?.id||'';catalogCity.value=active.value?.city||center?.city||'';scope.value='within3km';term.value='';focused.value='';placeLimit.value=5;catalog.value?.showModal()}
function expand(){scope.value=scope.value==='within3km'?'within5km':'wholeCity';placeLimit.value=5}
function focus(place:Place){focused.value=place.id;regularLimit.value=5;activityLimit.value=5}
function add(place:Place,shopName?:string){const entry={placeId:place.id,...(shopName?{shopName}:{})};if(!plan.contains(entry))plan.replace([...plan.entries.value,entry]);selected.value=place.id}
function has(place:Place,shopName?:string){return plan.contains({placeId:place.id,...(shopName?{shopName}:{})})}
const form=reactive({name:'',parent:'',city:'',address:'',note:'',notify:false,message:'',edited:false,submitted:false})
const locked=ref(false),formError=ref('')
function updateDraft(){if(!form.edited)form.message=['汤包你好，想补充一条逛店线索：',`店名：${form.name||'待填写'}`,`城市：${form.city}`,`商圈：${props.places.find(p=>p.id===form.parent)?.name||'其他位置'}`,`位置：${form.address||'待补充'}`,`备注：${form.note||'无'}`,'营业信息 / 来源链接：'].join('\n')}
watch(()=>[form.name,form.parent,form.city,form.address,form.note],updateDraft)
function openCustom(group?:TripGroup){locked.value=!!group?.place;Object.assign(form,{name:'',parent:group?.place?.id||active.value?.place?.id||'other',city:group?.city||active.value?.city||props.places[0]?.city||'',address:'',note:'',notify:false,message:'',edited:false,submitted:false});formError.value='';updateDraft();customDialog.value?.showModal()}
function submitCustom(){
  if(form.submitted)return
  if(!form.name.trim()||!form.city||(form.parent==='other'&&!form.address.trim())){formError.value='请填写店名、城市及具体地址。';return}
  const parent=props.places.find(p=>p.published&&p.id===form.parent&&p.city===form.city)
  if(form.parent!=='other'&&!parent){formError.value='所属商圈不可用，请重新选择。';return}
  const id=`personal-${crypto.randomUUID()}`,placeId=parent?.id||id
  const entry:TripEntry={placeId,shopName:form.name.trim(),custom:{id,name:form.name.trim(),city:form.city,address:form.address.trim(),note:form.note.trim()}}
  plan.replace([...plan.entries.value,entry]);selected.value=placeId
  if(form.notify){updateDraft();form.submitted=true}else customDialog.value?.close()
}
const cities=computed(()=>[...new Set(props.places.filter(p=>p.published).map(p=>p.city))])
function onCityChange(){if(!locked.value)form.parent='other'}
const nextPreference=computed(()=>nextLeg.value?(modes[nextLeg.value.key]||'auto'):'auto')
const nextOptions=computed(()=>nextLeg.value?matrix.value[nextLeg.value.key]||[]:[])
</script>

<template>
 <section class="trip-journey">
  <div class="journey-toolbar"><strong>{{groups.length}} 站 · {{resolved.filter(e=>e.shopName&&!e.period).length}} 家选店<template v-if="resolved.some(e=>e.period)"> · {{resolved.filter(e=>e.period).length}} 项活动</template></strong><div class="journey-actions"><button type="button" @click="openCatalog">＋ 从榜单添加</button><button type="button" class="primary" @click="openCustom()">＋ 自己补一站</button></div></div>
  <div class="journey-layout">
   <section class="journey-plan" aria-label="想逛清单"><h3>想逛清单</h3><ol class="journey-stops">
    <li v-for="(group,index) in groups" :key="group.id" :class="{'is-active':active?.id===group.id}">
     <button type="button" class="stop-selector" :aria-expanded="active?.id===group.id" @click="selected=group.id"><span>{{index+1}}</span><strong>{{group.name}}</strong></button>
     <div v-if="active?.id===group.id" class="stop-expanded">
      <p class="muted">{{group.city}} · {{group.address||'地址待补充'}}</p>
      <ul class="selected-shops"><li v-for="entry in group.entries.filter(e=>e.shopName||e.custom)" :key="tripEntryKey(entry)"><div>{{entry.name}} <span v-if="entry.custom" class="tag">自填</span><small>{{entry.floor}}<template v-if="entry.period"> · {{entry.status}} · {{entry.period}}</template><template v-if="entry.custom?.note"> · {{entry.custom.note}}</template></small></div><button type="button" :aria-label="`移除店铺：${entry.name}`" @click="plan.remove(entry)">×</button></li></ul>
      <p v-if="!group.entries.some(e=>e.shopName)" class="muted">先逛整个商圈</p>
      <div class="journey-actions"><button type="button" class="link-button" @click="openCustom(group)">＋ 补一间店</button><a v-if="group.place" :href="tripStopUrl({placeId:group.id},guideUrl)" @click="emit('details')">地点详情 ↗</a><a v-if="group.entries[0]?.navigation" :href="group.entries[0].navigation!" target="_blank" rel="noopener noreferrer">外部导航 ↗</a></div>
      <div class="visit-settings"><label>本次截止（可改）<input type="time" :value="visit(group.id).close||''" @change="setVisit(group.id,'close',$event)"></label><label>逛店（分钟）<input type="number" min="0" max="240" :value="visit(group.id).minutes" @change="setVisit(group.id,'minutes',$event)"></label></div><p class="muted">{{hoursLabel(group.id)}}<template v-if="visit(group.id).close"> · {{visit(group.id).close}}</template>。商场时间不代表每家店；部分店可能20:00提前收店。</p><p v-if="mallHours(group.id).source" class="muted"><a :href="mallHours(group.id).source!.url" target="_blank" rel="noopener noreferrer">{{mallHours(group.id).source!.label}} ↗</a> · 读取 {{mallHours(group.id).checkedAt}}</p><button v-if="visits[group.id]?.close" type="button" class="link-button" @click="resetClose(group.id)">恢复商场参考</button>
      <div class="journey-actions stop-order"><button type="button" :aria-label="`上移：${group.name}`" :disabled="index===0||(completed>0&&index<=completed+1)" @click="move(index,-1)">↑ 上移</button><button type="button" :aria-label="`下移：${group.name}`" :disabled="index===groups.length-1||(completed>0&&index<=completed)" @click="move(index,1)">↓ 下移</button><button type="button" :disabled="completed>0&&index<=completed" @click="removeGroup(index)">移除此站</button></div>
     </div>
    </li>
   </ol></section>
   <section class="journey-map-panel" aria-label="行程地图"><h3>这些店，分别在哪？</h3><TripRouteMap v-if="routeEnabled" :groups="groups" :selected="active?.id||''" :route="nextLeg?.done?undefined:nextLeg?.choice" @select="selected=$event" /><div v-else class="route-permission"><p class="muted">启用后会向百度地图发送所选地点及自填地址，用于定位和查询通勤；备注不发送。</p><button type="button" class="primary" @click="enableRoutes">启用地图与通勤查询</button></div>
    <div v-if="nextLeg&&!nextLeg.done" class="next-leg"><p>下一段：{{nextLeg.from.name}} → {{nextLeg.to.name}}</p><label>交通方式<select aria-label="下一段出行方式" :value="nextPreference" @change="setMode(nextLeg.key,$event)"><option v-for="(name,key) in modeNames" :key="key" :value="key">{{name}}</option></select></label><p v-if="nextLeg.choice" class="muted">当前方案：{{modeNames[nextLeg.choice.mode]}} · 约 {{Math.ceil(nextLeg.choice.seconds/60)}} 分钟</p><p v-else class="muted">{{busy?'正在查询交通方案…':'此段尚未查到时间'}}</p><small v-if="nextOptions.length&&nextOptions.length<3" class="muted">部分交通方式暂无可用方案，最快取当前可用结果。</small></div>
    <p v-else-if="nextLeg?.done" class="muted">此段已完成，继续查看后面的行程。</p><p v-else class="muted">这是最后一站。</p>
   </section>
  </div>
  <section class="journey-commute" aria-label="完整通勤时间"><h3>这一路，要花多久？</h3><div class="journey-actions departure-controls"><label>出发时间（上海时间）<input v-model="departure" type="datetime-local" step="1" required aria-label="出发时间（上海时间）" @change="manualTime"></label><button type="button" :disabled="busy||!routeEnabled" @click="analyse(false,true)">重新计算时间</button><button type="button" :disabled="busy||!routeEnabled" @click="analyse(true)">重新优化顺序</button><button v-if="completed" type="button" class="link-button" @click="resetProgress">重置完成进度</button></div>
   <p class="muted">{{clockRead}}</p><p class="journey-status" role="status">{{busy?progress:message}}</p>
   <div v-for="leg in evaluation.legs" :key="leg.key" class="journey-leg" :class="{'is-done':leg.done}"><div><p>{{leg.index+1}}. {{leg.from.name}} → {{leg.to.name}}</p><p v-if="leg.done" class="muted">已结束这段旅途</p><template v-else><p v-if="leg.choice" class="muted">地图估时 {{Math.ceil(leg.choice.seconds/60)}} 分钟 · {{formatTripTime(leg.departure)}} 出发 → {{formatTripTime(leg.arrival)}} 到达</p><p v-else class="muted">{{busy?'正在查询…':'此段暂未查到时间，请在地图确认。'}}</p><p :class="['closed','during','tight'].includes(leg.risk)?'journey-warning':'muted'">{{leg.arrival===null?'前段时间待补齐，闭店风险尚不能确定':riskLabel(leg.risk)}}<template v-if="leg.close"> · {{hoursLabel(leg.to.id)}} {{formatTripTime(leg.close)}}</template></p><p v-if="leg.earlyShopWarning" class="journey-warning">预计逛店跨过20:00，部分店可能提前收店，请先确认目标店。</p></template></div><div class="leg-controls"><select :aria-label="`第${leg.index+1}段交通方式`" :value="modes[leg.key]||'auto'" :disabled="leg.done" @change="setMode(leg.key,$event)"><option v-for="(name,key) in modeNames" :key="key" :value="key">{{name}}</option></select><button type="button" :disabled="leg.done" @click="complete(leg.index)">{{leg.done?'✓ 已完成':'已完成'}}</button></div></div>
   <div class="journey-total" aria-live="polite"><strong v-if="evaluation.legs.length&&completed===evaluation.legs.length">本次行程已完成</strong><template v-else><span>剩余通勤</span><strong>{{evaluation.complete&&Number.isFinite(settings.start)?`约 ${Math.ceil(evaluation.knownSeconds/60)} 分钟`:'全程尚未算完整'}}</strong><span v-if="!evaluation.complete">已知部分 {{Math.ceil(evaluation.knownSeconds/60)}} 分钟</span></template><small>已完成 {{completed}} / {{evaluation.legs.length}} 段<template v-if="evaluation.risks.length"> · {{evaluation.risks.length}} 站存在闭店风险</template></small></div>
   <p class="muted">总通勤不含逛店停留；后续到达时间包含预计停留。地图返回当前估时，不代表预约时刻的公交预测。点击“已完成”表示准备从该段终点继续，之前各段一并完成。8站以内基于本次可用地图方案比较顺序；先减少超过参考截止的风险，再减少20:00提前收店提醒，最后比较通勤。商场公开时间及临时参考均不是逐店营业保证。</p>
  </section>
  <dialog ref="catalog" class="journey-dialog" aria-labelledby="journey-catalog-title"><header><h3 id="journey-catalog-title">从榜单添加 · {{catalogCity}}</h3><button type="button" @click="catalog?.close()">关闭</button></header>
   <template v-if="!focusedPlace"><p class="muted">以 {{props.places.find(p=>p.id===catalogAnchor)?.name||'当前站（未定位）'}} 为中心 · 仅限同城</p><div class="journey-actions"><strong>{{scope==='within3km'?'周围3公里':scope==='within5km'?'周围5公里':'全城'}}</strong><button type="button" :disabled="scope==='wholeCity'" @click="expand">{{scope==='within3km'?'扩大到5公里':scope==='within5km'?'扩大到全城':'已显示全城'}}</button></div><label>搜索同城店铺或商圈<input v-model="term" type="search" maxlength="80" @input="placeLimit=5"></label><p class="muted">{{candidates.length}} 处匹配地点 · 附近范围按预存直线距离筛选</p><p v-if="!nearby[catalogAnchor]&&scope!=='wholeCity'" class="muted">当前站缺少预存坐标，请扩大到全城。</p><div class="catalog-grid"><article v-for="place in candidates.slice(0,placeLimit)" :key="place.id"><h4>{{place.name}}</h4><p class="muted">{{place.city}}<template v-if="nearby[catalogAnchor]?.meters[place.id]!==undefined"> · 直线约 {{(nearby[catalogAnchor]!.meters[place.id]!/1000).toFixed(1)}} 公里</template></p><div class="journey-actions"><button type="button" :disabled="has(place)" @click="add(place)">{{has(place)?'已加入':'逛此商圈'}}</button><button v-if="shops(place).length" type="button" @click="focus(place)">选具体店铺（{{shops(place).length}}）</button></div></article></div><p v-if="!candidates.length" class="muted">当前范围无匹配内容，可扩大范围或自己补一站。</p><button v-if="candidates.length>placeLimit" type="button" @click="placeLimit+=5">再看5处</button></template>
   <template v-else><button type="button" class="link-button" @click="focused=''">← 返回商圈列表</button><h4>{{focusedPlace.name}}</h4><template v-for="limited in [false,true]" :key="String(limited)"><h4 v-if="focusedShops.some(s=>!!s.limited===limited)">{{limited?'快闪活动':'常规店铺'}}</h4><div class="catalog-grid"><article v-for="shop in focusedShops.filter(s=>!!s.limited===limited).slice(0,limited?activityLimit:regularLimit)" :key="shop.name"><strong>{{shop.name}}</strong><p class="muted">{{shop.floor}}</p><p v-if="shop.limited" class="muted">{{shopStatusLabel(shop,today)}} · {{shop.limited.period}}</p><button type="button" :disabled="has(focusedPlace,shop.name)" @click="add(focusedPlace,shop.name)">{{has(focusedPlace,shop.name)?'已加入':'＋ 加店'}}</button></article></div><button v-if="focusedShops.filter(s=>!!s.limited===limited).length>(limited?activityLimit:regularLimit)" type="button" @click="limited?activityLimit+=5:regularLimit+=5">再看5{{limited?'项':'家'}}</button></template></template>
  </dialog>
  <dialog ref="customDialog" class="journey-dialog" aria-labelledby="journey-custom-title"><header><h3 id="journey-custom-title">自己补一间店</h3><button type="button" @click="customDialog?.close()">{{form.submitted?'完成':'取消'}}</button></header><form @submit.prevent="submitCustom"><div v-if="!form.submitted" class="custom-fields"><label>店名<input v-model="form.name" maxlength="80" required></label><label>城市<select v-model="form.city" :disabled="locked" @change="onCityChange"><option v-for="city in cities" :key="city">{{city}}</option></select></label><label>放在哪里<select v-model="form.parent" :disabled="locked"><option v-for="place in props.places.filter(p=>p.published&&p.city===form.city)" :key="place.id" :value="place.id">{{place.name}}</option><option value="other">其他位置 · 独立一站</option></select><small v-if="locked">所属商圈已固定</small></label><label>{{form.parent==='other'?'具体地址':'楼层 / 店铺位置'}}<input v-model="form.address" maxlength="200" :required="form.parent==='other'"></label><label class="wide">备注<input v-model="form.note" maxlength="400"></label></div><label class="notify-checkbox"><input v-model="form.notify" type="checkbox" :disabled="form.submitted">准备私信通知汤包补充收录</label><div v-if="form.notify" class="notify-box"><p class="muted">复制草稿后到 B站主页私信，由你粘贴发送。</p><label>私信草稿<textarea v-model="form.message" maxlength="2000" rows="5" @input="form.edited=true"></textarea></label><div class="journey-actions"><CopyButton :text="form.message" label="复制草稿" /><a :href="community.bilibiliProfile" target="_blank" rel="noopener noreferrer">去 B站主页私信 ↗</a></div></div><p class="journey-warning" role="alert">{{formError}}</p><button v-if="!form.submitted" type="submit" class="primary">加入我的路线</button><p v-else role="status">已加入自己的路线，私信尚未发送。</p><p class="muted">自填内容只进入本次行程，不会自动成为网站收录或营业确认。</p></form></dialog>
 </section>
</template>

<style scoped>
.trip-journey{color:#302b35;font-size:14px;line-height:1.65}.trip-journey *{box-sizing:border-box;min-width:0}.trip-journey h3,.trip-journey h4,.trip-journey p{margin:0 0 8px}.trip-journey h3{font-size:16px}.trip-journey h4{font-size:14px}.trip-journey button,.trip-journey input,.trip-journey select,.trip-journey textarea{font:inherit;color:#302b35;border:1px solid #d8bdc5;border-radius:4px;background:#fffdf9;padding:7px 9px;max-width:100%}.trip-journey button{min-height:38px;cursor:pointer}.trip-journey button:disabled{opacity:.45;cursor:default}.trip-journey .primary{background:#a83750;color:#fffaf1;border-color:#a83750}.trip-journey a,.trip-journey .link-button{color:#84394e;text-decoration:underline;text-underline-offset:3px}.trip-journey .link-button{border:0;background:transparent;padding:0}.muted{font-size:12px;color:#79626b;overflow-wrap:anywhere}.tag{font-size:11px;padding:0 4px;background:#ffe4e9;color:#a33353}.journey-toolbar,.journey-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.journey-toolbar{justify-content:space-between;padding:12px 0;border-bottom:1px solid #dec5cb}.journey-layout{display:grid;grid-template-columns:minmax(260px,42%) minmax(0,1fr)}.journey-plan{padding:16px 16px 16px 0;border-right:1px solid #dec5cb}.journey-map-panel{padding:16px 0 16px 16px}.journey-stops{list-style:none;padding:0;margin:0;display:grid;gap:7px}.journey-stops>li{padding:5px 8px;border:1px solid transparent;border-radius:4px}.journey-stops>li.is-active{border-color:#a83750;background:#fffdf9;box-shadow:inset 3px 0 #a83750;padding:10px}.stop-selector{border:0!important;background:transparent!important;display:flex;align-items:center;gap:8px;width:100%;text-align:left;padding:0!important}.stop-selector>span{width:25px;height:25px;display:inline-flex;align-items:center;justify-content:center;flex:none}.is-active .stop-selector>span{background:#a83750;color:#fffaf1;border-radius:50%}.stop-expanded{padding-left:5px;margin-top:7px}.selected-shops{list-style:none;padding:0;margin:9px 0;display:grid;gap:7px;font-size:12px}.selected-shops li{display:flex;gap:6px;justify-content:space-between;align-items:start;overflow-wrap:anywhere}.selected-shops small{display:block;color:#79626b}.selected-shops button{border:0;padding:0 6px;min-height:28px}.visit-settings,.custom-fields{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0}.trip-journey label{display:flex;flex-direction:column;gap:4px;font-size:12px}.trip-journey input,.trip-journey select,.trip-journey textarea{width:100%}.visit-settings input{padding:5px;font-size:12px}.stop-order button{font-size:12px;padding:4px 7px}.next-leg{border-top:1px solid #dec5cb;margin-top:12px;padding-top:12px}.journey-commute{border-top:2px solid #302b35;padding:16px 0}.departure-controls{align-items:end;margin:12px 0}.departure-controls label{max-width:250px}.journey-status,.journey-warning{font-size:12px;color:#a33353;overflow-wrap:anywhere}.journey-leg{display:grid;grid-template-columns:minmax(0,1fr) 115px;gap:10px;padding:12px 0;border-bottom:1px solid #dec5cb}.journey-leg p{font-size:12px;overflow-wrap:anywhere}.leg-controls{display:grid;gap:6px;align-content:start}.leg-controls select,.leg-controls button{font-size:12px}.is-done{opacity:.6}.journey-total{margin:12px 0;padding:12px;background:#ffe4e9;display:grid}.journey-total strong{font-size:22px}.journey-dialog{width:min(620px,calc(100% - 24px));max-height:88dvh;margin:auto;padding:18px;border:2px solid #302b35;border-radius:6px;background:#fffaf1;color:#302b35;overflow:auto;box-shadow:5px 5px #efb1bb}.journey-dialog::backdrop{background:#302b3566}.journey-dialog header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}.journey-dialog label{margin:10px 0}.catalog-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0}.catalog-grid article{padding:10px;background:#fffdf9;border:1px solid #dec5cb;border-radius:4px;overflow-wrap:anywhere;display:flex;flex-direction:column;align-items:start;gap:6px}.catalog-grid article .journey-actions{margin-top:auto}.catalog-grid button{font-size:12px;padding:5px 8px}.custom-fields .wide{grid-column:1/-1}.trip-journey .notify-checkbox{flex-direction:row;align-items:center;gap:7px}.notify-checkbox input{width:16px;height:16px;flex:none;accent-color:#a83750}.notify-box{padding:10px 0;border-top:1px solid #dec5cb}.trip-journey select:disabled{background:#ffe4e9;opacity:1}.journey-dialog small{color:#79626b}
@media(max-width:700px){.journey-layout{grid-template-columns:1fr}.journey-plan{padding:14px 0;border:0}.journey-map-panel{padding:14px 0;border-top:1px solid #dec5cb}.custom-fields{grid-template-columns:1fr}.trip-journey button{min-height:44px}.trip-journey input,.trip-journey textarea,.trip-journey select{font-size:16px}.leg-controls select{font-size:12px}.journey-dialog{padding:14px}.catalog-grid article{padding:8px}.catalog-grid button{font-size:12px}}
</style>
