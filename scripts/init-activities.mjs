import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline/promises'
import { activityRoot, missingActivityMetadata } from './activity-metadata.mjs'
import { activityTopicLabels, validateActivityTopics } from '../assets/js/activity-topics.js'
import { activityCategories } from '../assets/js/activity-categories.js'

export function activityDraft(folder) {
 const match=folder.match(/^(\d{4}[^：:]*?)[：:]\s*(.+)$/u)
 if(!match)throw new Error('目录须为“日期：活动名称”，例如 2026-11-17：活动名称')
 const [,dateLabel,rawName]=match
 const exact=dateLabel.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
 let date=null
 if(exact) {
  date=`${exact[1]}-${exact[2].padStart(2,'0')}-${exact[3].padStart(2,'0')}`
  if(!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw new Error('目录中的日期无效，请先修正目录日期')
 }
 const name=rawName.trim().replace(/(?<![A-Za-z])(?:live|fes|only)(?![A-Za-z])/gi,word=>({live:'Live',fes:'FES',only:'Only'})[word.toLowerCase()]).replace(/([\u3400-\u9fff])([A-Za-z])|([A-Za-z!])([\u3400-\u9fff])/g,'$1$3 $2$4')
 if(!name)throw new Error('目录缺少活动名称')
 return {
  id:'event-'+createHash('sha256').update(folder).digest('hex').slice(0,16),
  name,date,dateLabel:date||dateLabel,
 }
}

// Only explicit choices become published metadata. Existing files are never replaced.
export async function initializeActivities(root,ask,log=console.log) {
 const missing=missingActivityMetadata(root)
 if(!missing.length) {log('所有活动已有 event.json，无需补齐。');return 0}
 log(`发现 ${missing.length} 个活动缺少配置。输入 q 可退出；已经完成的配置会保留。`)
 const topics=Object.keys(activityTopicLabels)
 let created=0
 for(const folder of missing) {
  log('\n活动：'+folder)
  let draft
  try {draft=activityDraft(folder)} catch(error) {log('暂未处理：'+error.message);continue}
  log(`名称：${draft.name}；日期：${draft.dateLabel}`)
  let selectedTopics,category
  while(!selectedTopics) {
   const answer=(await ask(`选择主题（可多选，用逗号分隔）：${topics.map((key,i)=>`${i+1}=${activityTopicLabels[key]}`).join('，')}：`)).trim()
   if(answer.toLowerCase()==='q')return created
   const choices=answer.split(/[,，、\s]+/)
   if(choices.every(value=>/^[1-6]$/.test(value))&&new Set(choices).size===choices.length)selectedTopics=choices.map(value=>topics[Number(value)-1])
   else log('请输入有效且不重复的主题编号，例如 1,3；不确定时输入 q，核对后再继续。')
  }
  while(!category) {
   const answer=(await ask(`选择类型：${activityCategories.map((value,i)=>`${i+1}=${value}`).join('，')}：`)).trim()
   if(answer.toLowerCase()==='q')return created
   if(/^[1-4]$/.test(answer))category=activityCategories[Number(answer)-1]
   else log('请输入 1—4 的类型编号。')
  }
  if(category==='快闪'&&!draft.name.endsWith('快闪'))draft.name+='快闪'
  const event={...draft,topics:selectedTopics,category}
  validateActivityTopics(event)
  const answer=(await ask(`将保存“${event.name}”／${selectedTopics.map(key=>activityTopicLabels[key]).join('、')}／${category}，确认？[y=保存，n=跳过，q=退出]：`)).trim().toLowerCase()
  if(answer==='q')return created
  if(answer!=='y') {log('已跳过，下次运行可继续补齐。');continue}
  writeFileSync(resolve(root,folder,'event.json'),JSON.stringify(event,null,2)+'\n',{flag:'wx'})
  created++
  log('已保存 event.json。')
 }
 return created
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const readline=createInterface({input:process.stdin,output:process.stdout})
 try {
  await initializeActivities(activityRoot,question=>readline.question(question))
  const remaining=missingActivityMetadata()
  console.log(remaining.length?`还有 ${remaining.length} 个活动待补齐，完成前请暂缓提交新素材。`:'配置已齐全。请让 Agent 生成预览并检查，再将配置与素材一起提交。')
  if(remaining.length)process.exitCode=1
 } catch(error) {console.error(error.message);process.exitCode=1}
 finally {readline.close()}
}
