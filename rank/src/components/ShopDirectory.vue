<script setup lang="ts">
import { computed } from 'vue'
import type { ShopDirectory } from '../types'
import { latestSourceDate, shopDisplayStatus, sourcePredatesVisit } from '../utils/shopDirectory'

const props = defineProps<{ directory: ShopDirectory; visitedAt?: string | null }>()
const statusLabel = { open: '营业中', evidence: '有营业线索', closed: '已公布闭店' }
const shops = computed(() => props.directory.shops.map(shop => {
  const status = shopDisplayStatus(shop)
  const sourceTime = shop.sources.find(source => source.dateLabel)?.dateLabel
    ?? latestSourceDate(shop.sources)
  return { ...shop, displayStatus: status, sourceTime, authorVisited: sourcePredatesVisit(shop.sources, props.visitedAt) }
}))
const groups = computed(() => [
  { more: false, shops: shops.value.filter(shop => shop.displayStatus === 'open') },
  { more: true, shops: shops.value.filter(shop => shop.displayStatus !== 'open') },
])
const platformLabel = { xiaohongshu: '小红书', douyin: '抖音' }
</script>

<template>
  <section class="shop-directory detail-body" aria-labelledby="shop-directory-heading">
    <header class="shop-directory-heading">
      <div><p class="section-label">SHOP DIRECTORY</p><h2 id="shop-directory-heading">谷店一览（自整理）</h2></div>
      <span>{{ directory.area }} · 核对 {{ directory.checkedAt }}</span>
    </header>
    <p class="shop-directory-intro">收录谷店、周边与卡牌店。已核对官方账号，或官方店单／官网明确列出的门店，标为「营业中」并默认展示；状态不确定和已公布闭店的记录放在「展开更多」，附依据说明与来源链接。</p>
    <p v-if="!groups[0].shops.length" class="shop-directory-empty">暂没有已确认营业中的店铺，可展开更多查看已有线索。</p>
    <template v-for="group in groups" :key="String(group.more)">
    <component :is="group.more ? 'details' : 'div'" v-if="group.shops.length" :class="group.more ? 'shop-directory-more' : 'shop-directory-confirmed'">
    <summary v-if="group.more">展开更多（{{ group.shops.length }} 家）<span>营业待核实与历史记录</span></summary>
    <ul class="shop-list">
      <li v-for="shop in group.shops" :key="shop.name" class="shop-row">
        <div class="shop-row-title"><h3>{{ shop.name }}</h3><span class="shop-status" :class="'is-' + shop.displayStatus">{{ statusLabel[shop.displayStatus] }}</span></div>
        <dl class="shop-facts">
          <template v-if="shop.floor"><dt>位置</dt><dd class="shop-location">{{ shop.floor }}</dd></template>
          <template v-if="shop.kind"><dt>主营</dt><dd class="shop-kind">{{ shop.kind }}</dd></template>
        </dl>
        <p v-if="shop.displayStatus === 'evidence'" class="shop-time"><template v-if="shop.sourceTime">线索更新：{{ shop.sourceTime }}</template><template v-else>来源核对：<time :datetime="directory.checkedAt">{{ directory.checkedAt }}</time></template></p>
        <p v-if="shop.authorVisited" class="shop-author-visit">依据：作者亲自探店<time v-if="visitedAt" :datetime="visitedAt">（{{ visitedAt }}）</time></p>
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
  </section>
</template>

<style scoped>
.shop-directory { padding: clamp(20px, 3vw, 32px); border: 2px solid var(--manga-ink, #292830); background: var(--manga-paper, #fffaf1); box-shadow: 5px 5px 0 #efb1bb; }
.shop-directory-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
.shop-directory-heading h2 { margin: 0; font-size: clamp(22px, 3vw, 28px); }
.shop-directory-heading > span { color: #79626b; font-size: 12px; }
.shop-directory-intro { color: #74656c; line-height: 1.8; font-size: 13px; margin-bottom: 20px; }
.shop-list,.shop-accounts { list-style: none; padding: 0; margin: 0; }
.shop-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.shop-row { min-width: 0; padding: 16px; border: 1px solid #e5c5cc; background: #fffdfa; }
.shop-row-title { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.shop-row h3 { margin: 0; font-size: 16px; }
.shop-status { font-size: 11px; padding: 3px 7px; background: #f3eee7; color: #756253; white-space: nowrap; }
.shop-status.is-open { background: #e8f3ed; color: #347357; }
.shop-status.is-evidence { background: #eaf0f8; color: #45698d; }
.shop-status.is-closed { background: #f9e4e8; color: #983b52; }
.shop-facts { display: grid; grid-template-columns: 2em minmax(0, 1fr); gap: 5px 12px; margin: 12px 0; font-size: 13px; line-height: 1.8; }
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
