<script setup lang="ts">
import {nextTick,onBeforeUnmount,ref,watch} from 'vue'
import type {RouteChoice,TripGroup} from '../utils/tripRouting'
import {baiduMapConfigured,escapeMapHtml,geocodeWithBaidu,loadBaiduMaps,pointForPlace} from '../utils/baiduMaps'
const props=defineProps<{groups:TripGroup[];selected:string;route?:RouteChoice}>()
const emit=defineEmits<{select:[id:string]}>()
const canvas=ref<HTMLElement>(),message=ref('正在加载地点地图…'),failed=ref(false)
let api:any,map:any,revision=0
async function draw(){
  const current=++revision
  if(!baiduMapConfigured()){failed.value=true;message.value='地图尚未配置，仍可使用名单和外部导航。';return}
  await nextTick();if(!canvas.value)return
  try{
    api=await loadBaiduMaps();if(current!==revision)return
    if(!map){map=new api.Map(canvas.value,{enableMapClick:false});map.enableScrollWheelZoom(true);map.addControl(new api.ScaleControl({anchor:2}));map.addControl(new api.ZoomControl({anchor:3}))}
    map.clearOverlays();const points=[]
    for(let i=0;i<props.groups.length;i++){
      const group=props.groups[i]!,point=group.place?await pointForPlace(api,group.place):group.address?await geocodeWithBaidu(api,group.address,group.city,false):null
      if(current!==revision)return;if(!point)continue;points.push(point)
      const selected=props.selected===group.id
      const label=new api.Label(`<button style="font:13px sans-serif;padding:6px 9px;border:2px solid #a83750;border-radius:5px;color:${selected?'#fffaf1':'#84394e'};background:${selected?'#a83750':'#fffaf1'}">${i+1}. ${escapeMapHtml(group.name)}${group.entries.filter(e=>e.shopName||e.custom).length?' · '+group.entries.filter(e=>e.shopName||e.custom).length+'店':''}</button>`,{position:point,offset:new api.Size(-15,-16)})
      label.setStyle({border:'0',background:'transparent',padding:'0'});label.addEventListener('click',()=>emit('select',group.id));map.addOverlay(label)
    }
    for(const path of props.route?.paths||[]){if(path.length>1){const line=path.map(p=>new api.Point(p.lng,p.lat));map.addOverlay(new api.Polyline(line,{strokeColor:'#a83750',strokeWeight:5,strokeOpacity:.8}));points.push(...line)}}
    if(points.length>1)map.setViewport(points,{margins:[45,45,45,45]});else if(points[0])map.centerAndZoom(points[0],16)
    message.value=points.length?'':'这些地址暂未定位，请在地图软件确认。'
  }catch{if(current===revision){failed.value=true;message.value='地图暂不可用，请使用清单中的外部导航。'}}
}
watch(()=>[props.groups.map(g=>[g.id,g.entries.length]),props.selected,props.route],draw,{immediate:true,deep:true})
onBeforeUnmount(()=>{revision++;map?.destroy?.()})
</script>
<template><div class="trip-map" :class="{'map-failed':failed}"><div v-show="!failed" ref="canvas" class="trip-map-canvas" aria-label="所选商圈与真实交通路线地图"></div><p v-if="message" role="status">{{message}}</p></div></template>
<style scoped>.trip-map{position:relative;background:#f4efe6;border:1px solid #dec5cb;min-height:300px}.trip-map.map-failed{min-height:0}.trip-map-canvas{height:330px;width:100%}.trip-map>p{padding:12px;margin:0;color:#79626b;font-size:12px}@media(max-width:620px){.trip-map-canvas{height:280px}}</style>
