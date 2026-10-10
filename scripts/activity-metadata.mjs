import { readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
export const activityRoot = fileURLToPath(new URL('../content/activities/', import.meta.url))
export const mediaExtensions = new Set(['.jpg','.jpeg','.png','.webp','.mp4','.mov'])
export function activityFiles(folder) {
 return readdirSync(resolve(activityRoot,folder)).filter(file=>statSync(resolve(activityRoot,folder,file)).isFile()&&mediaExtensions.has(extname(file).toLowerCase())).sort((a,b)=>a.localeCompare(b,'zh-CN',{numeric:true}))
}
export function readActivities() {
 const topics=new Set(['acg','sports','art','travel','life']),ids=new Set()
 return readdirSync(activityRoot,{withFileTypes:true}).filter(entry=>entry.isDirectory()).map(entry=>{
  const folder=entry.name
  let event
  try {event=JSON.parse(readFileSync(resolve(activityRoot,folder,'event.json'),'utf8'))} catch(error) {throw new Error(`请维护 ${folder}/event.json：${error.message}`)}
  const fail=message=>{throw new Error(`${folder}/event.json：${message}`)}
  if(!event||Array.isArray(event)||typeof event!=='object')fail('必须为 JSON 对象')
  if(typeof event.id!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(event.id)||ids.has(event.id))fail('ID 必须唯一，使用小写字母、数字和连字符')
  ids.add(event.id)
  if(typeof event.name!=='string'||!event.name.trim())fail('缺少活动名称')
  if(!topics.has(event.topic))fail('唯一 topic 应为 acg、sports、art、travel 或 life')
  if(typeof event.category!=='string'||!event.category.trim())fail('缺少活动类型 category')
  if(event.date!==null&&event.date!==undefined) {
   if(typeof event.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(event.date)||!Number.isFinite(Date.parse(event.date))||new Date(event.date).toISOString().slice(0,10)!==event.date)fail('date 必须为真实的 YYYY-MM-DD 日期；不确定时填 null')
  }
  const date=event.date||null,dateLabel=event.dateLabel||date
  if(typeof dateLabel!=='string'||!/^\d{4}/.test(dateLabel))fail('缺少以年份开头的日期原文 dateLabel')
  if(date&&dateLabel.slice(0,4)!==date.slice(0,4))fail('date 与 dateLabel 年份冲突')
  const files=activityFiles(folder)
  if(!files.length)fail('没有支持的图片或视频')
  if(event.cover!==undefined&&(typeof event.cover!=='string'||!files.includes(event.cover)))fail('cover 应为本场素材的原始文件名')
  if(event.note!==undefined&&typeof event.note!=='string')fail('note 应为感想文字')
  return {...event,folder,date,dateLabel,year:dateLabel.slice(0,4)}
 })
}
