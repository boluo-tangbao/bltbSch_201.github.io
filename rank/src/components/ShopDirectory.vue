<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ShopDirectory } from '../types'
import { latestSourceDate, mergeShopSources, shopDisplayStatus, shopStatusLabel, shopDirectoryGroups, sourcePredatesVisit, pendingShopGroups, shopHistorySource } from '../utils/shopDirectory'
import { searchTargetId } from '../utils/search'
import { shopFeedbackUrl } from '../utils/shopFeedback'
import { useShopToday } from '../utils/shopToday'
import TripPlanButton from './TripPlanButton.vue'

const props = defineProps<{ directory: ShopDirectory; visitedAt?: string | null; placeId?: string }>()
const base = import.meta.env.BASE_URL
const today = useShopToday()
const visibleCounts = ref<Record<string, number>>({})
const groupKey = (section: string, more = false, bucket = '') => `${section}-${more ? 'evidence' : 'open'}-${bucket}`
const visibleCount = (section: string, more = false, bucket = '') => visibleCounts.value[groupKey(section, more, bucket)] ?? 5
function expand(section: string, more = false, bucket = '') {
  visibleCounts.value[groupKey(section, more, bucket)] = visibleCount(section, more, bucket) + 5
}
watch(() => props.directory, () => { visibleCounts.value = {} })
const shops = computed(() => props.directory.shops.map(shop => {
  const status = shopDisplayStatus(shop, today.value)
  const sourceTime = shop.sources.find(source => source.dateLabel)?.dateLabel
    ?? latestSourceDate(shop.sources)
  return { ...shop, displayStatus: status, statusText: shopStatusLabel(shop, today.value), historySource: shopHistorySource(shop), sourceTime, authorVisited: sourcePredatesVisit(shop.sources, props.visitedAt), evidenceSources: mergeShopSources(shop) }
}))
const sections = computed(() => {
  const grouped = shopDirectoryGroups(shops.value, today.value)
  return [
    { key: 'regular', title: '常规谷店', ...grouped.regular },
    { key: 'limited', title: '快闪活动', ...grouped.limited },
    { key: 'inactive', title: '停止营业', open: grouped.inactive, evidence: [] },
  ].filter(section => section.open.length || section.evidence.length)
})
const platformLabel = { xiaohongshu: '小红书', douyin: '抖音' }
const sectionUnit = (section: string) => section === 'limited' ? '项' : '家'
function revealShop(name: string) {
  for (const section of sections.value) {
    for (const group of [{ key: '', shops: section.open }, ...pendingShopGroups(section.evidence)]) {
      const more = group.key !== ''
      const index = group.shops.findIndex(shop => shop.name === name)
      if (index >= 0) visibleCounts.value[groupKey(section.key, more, group.key)] = Math.max(visibleCount(section.key, more, group.key), Math.ceil((index + 1) / 5) * 5)
    }
  }
}
defineExpose({ revealShop })
</script>

<template>
  <section class="shop-directory detail-body" aria-labelledby="shop-directory-heading">
    <header class="shop-directory-heading">
      <div><p class="section-label">SHOP DIRECTORY</p><h2 id="shop-directory-heading">谷店一览（自整理）</h2></div>
      <span>核对 {{ directory.checkedAt }}</span>
    </header>
    <p v-if="directory.notice" class="shop-directory-notice">{{ directory.notice }}</p>
    <p class="shop-directory-intro">每栏及待核实子组先展示5条，每次展开再增加5条；待核实区默认收起，历史探店记录不代表当前营业。</p>
    <div v-for="section in sections" :key="section.key" class="shop-directory-section" :class="'shop-directory-' + section.key">
    <header class="shop-section-heading"><h3>{{ section.title }}</h3><div class="shop-section-actions"><span><template v-if="section.key === 'inactive'">记录 {{ section.open.length }} 家</template><template v-else>确认 {{ section.open.length }} {{ sectionUnit(section.key) }}</template><template v-if="section.evidence.length"> · 待核实 {{ section.evidence.length }} {{ sectionUnit(section.key) }}</template></span></div></header>
    <p v-if="section.key === 'limited'" class="shop-limited-intro">快闪店、慢闪店与店内限时主题统一归入快闪活动，按项计数，不计入常规门店家数。活动结束不代表所在常设店关闭。</p>
    <p v-if="section.key === 'inactive'" class="shop-inactive-intro">“已停止营业”指彻底关店或迁往其他地点的旧店；装修暂停另行标注，同一商场换楼层的店铺继续按新位置展示。</p>
    <p v-if="!section.open.length" class="shop-directory-empty">暂没有已确认营业的店铺，可展开更多查看已有线索。</p>
    <template v-for="group in [{ more: false, shops: section.open }, { more: true, shops: section.evidence }]" :key="String(group.more)">
    <component :is="group.more ? 'details' : 'div'" v-if="group.shops.length" :class="group.more ? 'shop-directory-more' : 'shop-directory-confirmed'">
    <summary v-if="group.more">展开更多（{{ group.shops.length }} {{ sectionUnit(section.key) }}）<span>{{ section.key === 'limited' ? '限时活动待核实' : '营业待核实' }}</span></summary>
    <div v-for="bucket in group.more ? pendingShopGroups(group.shops) : [{ key: '', title: '', shops: group.shops }]" :key="bucket.key" :class="group.more ? 'shop-pending-group' : undefined" :data-pending-category="group.more ? bucket.key : undefined">
    <p v-if="group.more" class="shop-pending-heading">{{ bucket.title }}<span>{{ bucket.shops.length }} {{ sectionUnit(section.key) }}</span></p>
    <p v-if="group.more && bucket.key === 'history'" class="shop-history-intro">保留曾被探店、攻略或实访收录的记录，当前营业尚未确认。</p>
    <ul class="shop-list">
      <li v-for="(shop, index) in bucket.shops" v-show="index < visibleCount(section.key, group.more, bucket.key)" :id="placeId ? searchTargetId(placeId, { kind: 'shop', name: shop.name }) : undefined" :key="shop.name" class="shop-row" tabindex="-1">
        <div class="shop-row-title"><div class="shop-name-location"><h4>{{ shop.name }}</h4><span v-if="shop.floor" class="shop-location"><template v-if="shop.inactive">原位置：</template>{{ shop.floor }}</span></div><span class="shop-status" :class="'is-' + shop.displayStatus">{{ shop.statusText }}</span></div>
        <p v-if="shop.description" class="shop-description">{{ shop.description }}</p>
        <dl v-if="shop.kind || shop.limited || shop.inactive" class="shop-facts">
          <template v-if="shop.inactive"><dt>营业历史</dt><dd class="shop-history">{{ shop.inactive.history }}</dd></template>
          <template v-if="shop.kind"><dt>主营</dt><dd class="shop-kind">{{ shop.kind }}</dd></template>
          <template v-if="shop.hostShop"><dt>所在店铺</dt><dd class="shop-host">{{ shop.hostShop }}</dd></template>
          <template v-if="shop.limited"><dt>{{ shop.limited.scope === 'theme' ? '主题期' : '开放期' }}</dt><dd class="shop-period">{{ shop.limited.period }}</dd></template>
        </dl>
        <p v-if="group.more && shop.historySource" class="shop-history-source">攻略／实访出处：<a :href="shop.historySource.url" target="_blank" rel="noopener noreferrer">{{ shop.historySource.label }}</a> · {{ shop.historySource.time }}</p>
        <p v-else-if="shop.displayStatus === 'evidence'" class="shop-time"><template v-if="shop.sourceTime">线索更新：{{ shop.sourceTime }}</template><template v-else>来源核对：<time :datetime="directory.checkedAt">{{ directory.checkedAt }}</time></template></p>
        <p v-if="shop.limited && shop.authorVisited" class="shop-author-visit">作者到访记录<time v-if="visitedAt" :datetime="visitedAt">（{{ visitedAt }}）</time></p>
        <p v-if="shop.note && (shop.inactive || shop.limited || !shop.accounts?.length)" class="shop-evidence-note"><b>依据说明</b>{{ shop.note }}</p>
        <template v-if="shop.inactive || (shop.limited ? shop.displayStatus !== 'open' : !shop.accounts?.length)">
        <p class="shop-source-label">依据出处</p>
        <ul class="shop-sources" :aria-label="shop.name + '的来源依据'">
          <li v-for="source in shop.evidenceSources" :key="source.url ?? JSON.stringify([source.labels, source.dates])"><a v-if="source.url" :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.labels.join('／') }} ↗</a><span v-else>{{ source.labels.join('／') }}</span><small class="shop-source-role">{{ source.roles.join('、') }}<template v-if="!source.roles.includes('营业／位置')">（不作为当前营业确认）</template></small><span v-if="source.dates.length"> · {{ source.dates.join('；') }}</span></li>
        </ul>
        </template>
        <p v-if="shop.accounts?.length" class="shop-source-label">{{ shop.inactive ? '原账号' : '官方账号' }}</p>
        <ul v-if="shop.accounts?.length" class="shop-accounts" :aria-label="shop.name + (shop.inactive ? '的原账号' : '的官方账号')">
          <li v-for="account in shop.accounts" :key="account.platform + account.url"><a :href="account.url" target="_blank" rel="noopener noreferrer"><b>{{ platformLabel[account.platform] }}</b><span>{{ account.name }}<small v-if="account.handle">号：{{ account.handle }}</small></span><em v-if="account.scope === 'brand'">品牌号</em><span aria-hidden="true">↗</span></a></li>
        </ul>
        <div v-if="placeId" class="shop-feedback"><TripPlanButton v-if="shop.displayStatus === 'open'" :place-id="placeId" :name="shop.name" :shop-name="shop.name" /><a :href="shopFeedbackUrl(base, placeId, shop.name)" :aria-label="`${shop.name}：信息有变化`">信息有变化？反馈纠错 →</a></div>
      </li>
    </ul>
    <div v-if="bucket.shops.length > visibleCount(section.key, group.more, bucket.key)" class="shop-expand-actions">
      <button class="shop-expand" type="button" :aria-label="section.title + bucket.title + '展开更多，每次增加5' + sectionUnit(section.key)" @click="expand(section.key, group.more, bucket.key)">展开更多 <small>+{{ Math.min(5, bucket.shops.length - visibleCount(section.key, group.more, bucket.key)) }}{{ sectionUnit(section.key) }}</small></button>
    </div>
    </div>
    </component>
    </template>
    </div>
  </section>
</template>

<style scoped>
.shop-directory { padding: clamp(20px, 3vw, 32px); border: 2px solid var(--manga-ink, #292830); background: var(--manga-paper, #fffaf1); box-shadow: 5px 5px 0 #efb1bb; }
.shop-directory-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
.shop-directory-heading h2 { margin: 0; font-size: clamp(22px, 3vw, 28px); }
.shop-directory-heading > span { color: #79626b; font-size: 12px; }
.shop-directory-intro { color: #74656c; line-height: 1.8; font-size: 13px; margin-bottom: 20px; }
.shop-directory-notice { margin: 14px 0; padding: 10px 12px; border-left: 3px solid #d9aab6; background: #fff0f3; color: #74656c; font-size: 13px; line-height: 1.8; overflow-wrap: anywhere; }
.shop-directory-section + .shop-directory-section { margin-top: 28px; padding-top: 22px; border-top: 2px dashed #d9aab6; }
.shop-section-heading { display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
.shop-section-heading h3 { margin: 0; font-size: 19px; color: #a83750; }
.shop-section-actions { font-size: 12px; line-height: 1.8; color: #79626b; }
.shop-pending-heading { margin: 0 0 8px; font-weight: 800; color: #45698d; font-size: 15px; }
.shop-pending-heading span { margin-left: 10px; font-size: 12px; font-weight: 400; }
.shop-pending-group + .shop-pending-group { margin-top: 22px; padding-top: 18px; border-top: 1px dashed #d9aab6; }
.shop-history-intro,.shop-history-source { margin: 8px 0 12px; font-size: 12px; line-height: 1.8; color: #79626b; overflow-wrap: anywhere; }
.shop-history-source a { color: #a83750; text-decoration: underline; text-underline-offset: 3px; }
.shop-expand-actions { display: flex; justify-content: center; margin-top: 14px; }
.shop-expand { min-height: 36px; padding: 5px 10px; border: 1px solid #d9aab6; background: #fff0f3; color: #a83750; font-size: 12px; font-weight: 700; }
.shop-expand small { margin-left: 5px; font-weight: 400; }
.shop-limited-intro,.shop-inactive-intro { font-size: 12px; line-height: 1.8; color: #79626b; }
.shop-limited-intro { margin: -4px 0 16px; }
.shop-period { font-weight: 700; }
.shop-description { margin: 10px 0; font-size: 13px; line-height: 1.8; color: #534a52; overflow-wrap: anywhere; }
.shop-list,.shop-accounts { list-style: none; padding: 0; margin: 0; }
.shop-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); gap: 12px; }
.shop-row { min-width: 0; padding: 16px; border: 1px solid #e5c5cc; background: #fffdfa; }
.shop-feedback { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 12px; border-top: 1px dashed #e5c5cc; padding-top: 6px; }
.shop-feedback a { display: inline-flex; align-items: center; min-height: 44px; max-width: 100%; color: #84394e; font-size: 12px; text-decoration: underline; text-underline-offset: 3px; overflow-wrap: anywhere; }
.shop-row { scroll-margin-top: 80px; }
.shop-row:focus { outline: 2px solid #a83750; outline-offset: 3px; }
.shop-row-title { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.shop-name-location { min-width: 0; flex: 1; line-height: 1.7; overflow-wrap: anywhere; }
.shop-row h4 { display: inline; margin: 0; font-size: 16px; }
.shop-location { display: inline-block; max-width: 100%; margin-left: 8px; color: #79626b; font-size: 12px; font-weight: 400; vertical-align: baseline; }
.shop-source-role { margin-left: 6px; color: #79626b; font-size: 10px; }
.shop-status { font-size: 11px; padding: 3px 7px; background: #f3eee7; color: #756253; white-space: nowrap; }
.shop-status.is-open { background: #e8f3ed; color: #347357; }
.shop-status.is-evidence { background: #eaf0f8; color: #45698d; }
.shop-status.is-closed { background: #f9e4e8; color: #983b52; }
.shop-facts { display: grid; grid-template-columns: 4em minmax(0, 1fr); gap: 5px 12px; margin: 12px 0; font-size: 13px; line-height: 1.8; }
.shop-facts dt { color: #79626b; font-weight: 700; }
.shop-facts dd { margin: 0; color: #534a52; overflow-wrap: anywhere; }
.shop-time { font-size: 12px; color: #45698d; margin: 8px 0; }
.shop-author-visit { font-size: 12px; color: #347357; margin: 10px 0; line-height: 1.7; }
.shop-directory-empty { font-size: 13px; line-height: 1.8; color: #79626b; }
.shop-directory-more { margin-top: 20px; border-top: 1px dashed #d9aab6; padding-top: 14px; }
.shop-directory-more > summary { cursor: pointer; font-size: 16px; font-weight: 800; color: #a83750; line-height: 1.8; }
.shop-directory-more > summary span { margin-left: 12px; font-size: 12px; font-weight: 400; color: #79626b; }
.shop-directory-more[open] > summary { margin-bottom: 14px; }
.shop-evidence-note,.shop-kind-evidence { margin: 10px 0; color: #79626b; font-size: 12px; line-height: 1.8; }
.shop-evidence-note b { display: block; font-weight: 700; }
.shop-source-label { margin-top: 12px; font-size: 12px; font-weight: 700; color: #79626b; }
.shop-sources { padding-left: 18px; margin: 8px 0 12px; color: #79626b; font-size: 12px; line-height: 1.8; overflow-wrap: anywhere; }
.shop-sources a { color: #a83750; text-decoration: underline; text-underline-offset: 3px; }
.shop-accounts { display: grid; gap: 6px; }
.shop-accounts a { display: flex; align-items: flex-start; gap: 7px; padding: 8px; border: 1px solid #ead2d8; font-size: 12px; text-decoration: none; overflow-wrap: anywhere; }
.shop-accounts a:hover { background: #fff0f3; }
.shop-accounts b { flex-shrink: 0; color: #b94660; }
.shop-accounts small { display: block; color: #79626b; font-size: 11px; }
.shop-accounts em { font-style: normal; font-size: 10px; color: #79626b; white-space: nowrap; }
@media (max-width: 600px) { .shop-list { grid-template-columns: 1fr; } .shop-row { padding: 14px; } .shop-expand { min-height: 44px; } }
</style>
