<script setup lang="ts">
import { computed } from 'vue'
import type { ShopDirectory } from '../types'
import { latestSourceDate, shopDisplayStatus, shopDirectoryGroups, sourcePredatesVisit } from '../utils/shopDirectory'
import { searchTargetId } from '../utils/search'

const props = defineProps<{ directory: ShopDirectory; visitedAt?: string | null; placeId?: string }>()
const statusLabel = { open: '营业中', evidence: '有营业线索', closed: '已公布闭店' }
const shops = computed(() => props.directory.shops.filter(shop => shop.status !== 'closed').map(shop => {
  const status = shopDisplayStatus(shop)
  const sourceTime = shop.sources.find(source => source.dateLabel)?.dateLabel
    ?? latestSourceDate(shop.sources)
  return { ...shop, displayStatus: status, sourceTime, authorVisited: sourcePredatesVisit(shop.sources, props.visitedAt) }
}))
const sections = computed(() => {
  const grouped = shopDirectoryGroups(shops.value)
  return [
    { key: 'regular', title: '常规谷店', ...grouped.regular },
    { key: 'limited', title: '限时谷店／快闪', ...grouped.limited },
  ].filter(section => section.open.length || section.evidence.length)
})
const platformLabel = { xiaohongshu: '小红书', douyin: '抖音' }
</script>

<template>
  <section class="shop-directory detail-body" aria-labelledby="shop-directory-heading">
    <header class="shop-directory-heading">
      <div><p class="section-label">SHOP DIRECTORY</p><h2 id="shop-directory-heading">谷店一览（自整理）</h2></div>
      <span>{{ directory.area }} · 核对 {{ directory.checkedAt }}</span>
    </header>
    <p class="shop-directory-intro">收录谷店、周边与主题餐饮。确认营业的店铺默认展示，待核实线索收在各栏「展开更多」。快闪、限时开放与本期限时主题单列，并注明档期；已结束的条目不展示。</p>
    <div v-for="section in sections" :key="section.key" class="shop-directory-section" :class="'shop-directory-' + section.key">
    <header class="shop-section-heading"><h3>{{ section.title }}</h3><span>确认 {{ section.open.length }} 家<template v-if="section.evidence.length"> · 待核实 {{ section.evidence.length }} 家</template></span></header>
    <p v-if="section.key === 'limited'" class="shop-limited-intro">按已核对档期整理；「主题期」仅指这一期主题，不代表整家店的营业期限。</p>
    <p v-if="!section.open.length" class="shop-directory-empty">暂没有已确认营业的店铺，可展开更多查看已有线索。</p>
    <template v-for="group in [{ more: false, shops: section.open }, { more: true, shops: section.evidence }]" :key="String(group.more)">
    <component :is="group.more ? 'details' : 'div'" v-if="group.shops.length" :class="group.more ? 'shop-directory-more' : 'shop-directory-confirmed'">
    <summary v-if="group.more">展开更多（{{ group.shops.length }} 家）<span>{{ section.key === 'limited' ? '限时店铺待核实' : '营业待核实' }}</span></summary>
    <ul class="shop-list">
      <li v-for="shop in group.shops" :id="placeId ? searchTargetId(placeId, { kind: 'shop', name: shop.name }) : undefined" :key="shop.name" class="shop-row" tabindex="-1">
        <div class="shop-row-title"><h4>{{ shop.name }}</h4><span class="shop-status" :class="'is-' + shop.displayStatus">{{ statusLabel[shop.displayStatus] }}</span></div>
        <dl class="shop-facts">
          <template v-if="shop.floor"><dt>位置</dt><dd class="shop-location">{{ shop.floor }}</dd></template>
          <template v-if="shop.kind"><dt>主营</dt><dd class="shop-kind">{{ shop.kind }}</dd></template>
          <template v-if="shop.limited"><dt>{{ shop.limited.scope === 'theme' ? '主题期' : '开放期' }}</dt><dd class="shop-period">{{ shop.limited.period }}</dd></template>
        </dl>
        <p v-if="shop.displayStatus === 'evidence'" class="shop-time"><template v-if="shop.sourceTime">线索更新：{{ shop.sourceTime }}</template><template v-else>来源核对：<time :datetime="directory.checkedAt">{{ directory.checkedAt }}</time></template></p>
        <p v-if="shop.authorVisited" class="shop-author-visit">作者到访记录<time v-if="visitedAt" :datetime="visitedAt">（{{ visitedAt }}）</time></p>
        <p v-if="shop.note" class="shop-evidence-note"><b>依据说明</b>{{ shop.note }}</p>
        <template v-if="shop.displayStatus !== 'open'">
        <p class="shop-source-label">营业／位置来源</p>
        <ul class="shop-sources" :aria-label="shop.name + '的营业与位置依据'">
          <li v-for="source in shop.sources" :key="source.url + source.label"><a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.label }} ↗</a><span v-if="source.date || source.dateLabel"> · {{ source.dateLabel || source.date }}</span></li>
        </ul>
        <div v-if="shop.kindSources?.length" class="shop-kind-evidence"><p>主营依据（不作为当前营业确认）：</p><ul class="shop-sources"><li v-for="source in shop.kindSources" :key="source.url + source.label"><a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.label }} ↗</a><span v-if="source.date || source.dateLabel"> · {{ source.dateLabel || source.date }}</span></li></ul></div>
        </template>
        <p v-if="shop.accounts?.length" class="shop-source-label">官方账号</p>
        <ul v-if="shop.accounts?.length" class="shop-accounts" :aria-label="shop.name + '的官方账号'">
          <li v-for="account in shop.accounts" :key="account.platform + account.url"><a :href="account.url" target="_blank" rel="noopener noreferrer"><b>{{ platformLabel[account.platform] }}</b><span>{{ account.name }}<small v-if="account.handle">号：{{ account.handle }}</small></span><em v-if="account.scope === 'brand'">品牌号</em><span aria-hidden="true">↗</span></a></li>
        </ul>
      </li>
    </ul>
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
.shop-directory-section + .shop-directory-section { margin-top: 28px; padding-top: 22px; border-top: 2px dashed #d9aab6; }
.shop-section-heading { display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
.shop-section-heading h3 { margin: 0; font-size: 19px; color: #a83750; }
.shop-section-heading > span,.shop-limited-intro { font-size: 12px; line-height: 1.8; color: #79626b; }
.shop-limited-intro { margin: -4px 0 16px; }
.shop-period { font-weight: 700; }
.shop-list,.shop-accounts { list-style: none; padding: 0; margin: 0; }
.shop-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.shop-row { min-width: 0; padding: 16px; border: 1px solid #e5c5cc; background: #fffdfa; }
.shop-row { scroll-margin-top: 80px; }
.shop-row:focus { outline: 2px solid #a83750; outline-offset: 3px; }
.shop-row-title { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.shop-row h4 { margin: 0; font-size: 16px; }
.shop-status { font-size: 11px; padding: 3px 7px; background: #f3eee7; color: #756253; white-space: nowrap; }
.shop-status.is-open { background: #e8f3ed; color: #347357; }
.shop-status.is-evidence { background: #eaf0f8; color: #45698d; }
.shop-status.is-closed { background: #f9e4e8; color: #983b52; }
.shop-facts { display: grid; grid-template-columns: 3em minmax(0, 1fr); gap: 5px 12px; margin: 12px 0; font-size: 13px; line-height: 1.8; }
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
@media (max-width: 600px) { .shop-list { grid-template-columns: 1fr; } .shop-row { padding: 14px; } }
</style>
