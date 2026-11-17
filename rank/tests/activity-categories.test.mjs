import {test} from 'node:test'
import assert from 'node:assert/strict'
import {activityCategory,activityCategoryLabel,hasActivityCategory,validateActivityCategories} from '../../assets/js/activity-categories.js'
import {readActivities} from '../../scripts/activity-metadata.mjs'

test('single and legacy categories retain compatible filters while explicit categories overlap',()=>{
 assert.equal(activityCategory({category:'演出与聚会'}),'演出')
 assert.ok(hasActivityCategory({category:'展会'},'展览'))
 const event={category:'其他',categories:['其他','演出'],categoryDetail:'聚会与饭后音乐 Only'}
 assert.ok(hasActivityCategory(event,'其他'))
 assert.ok(hasActivityCategory(event,'演出'))
 assert.equal(hasActivityCategory(event,'观影会'),false)
 assert.equal(activityCategoryLabel(event),'其他 / 演出 · 聚会与饭后音乐 Only')
 for(const categories of [null,[],['演出'],['其他','其他'],['其他','无效']])assert.throws(()=>validateActivityCategories({...event,categories}),/categories/)
})

test('confirmed gatherings and screenings appear in the chosen categories without duplicating events',()=>{
 const events=readActivities()
 const gathering=events.find(event=>event.id==='euphonium-2025')
 assert.equal(activityCategoryLabel(gathering),'其他 · 线下聚会')
 assert.equal(hasActivityCategory(gathering,'演出'),false)
 const only=events.find(event=>event.id==='hypergryph-fes-magroni-gathering-only-2026')
 for(const category of ['其他','演出'])assert.ok(hasActivityCategory(only,category))
 const screening=events.find(event=>event.id==='euphonium-screening-2026')
 assert.equal(screening.category,'观影会')
 for(const category of ['观影会','演出'])assert.ok(hasActivityCategory(screening,category))
 assert.equal(hasActivityCategory(screening,'其他'),false)
 assert.equal(new Set(events.map(event=>event.id)).size,events.length)
})
