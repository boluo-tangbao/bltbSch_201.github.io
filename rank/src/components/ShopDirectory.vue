<script setup lang="ts">
import { computed } from 'vue'
import type { ShopDirectory } from '../types'
import { latestSourceDate, sourcePredatesVisit } from '../utils/shopDirectory'

const props = defineProps<{ directory: ShopDirectory; visitedAt?: string | null }>()
const statusLabel = { open: '营业中', evidence: '有营业线索', closed: '已公布闭店' }
const shops = computed(() => props.directory.shops.map(shop => {
  const status: keyof typeof statusLabel = shop.status === 'closed' ? 'closed' : shop.accounts?.length ? 'open' : 'evidence'
  const sourceTime = shop.sources.find(source => source.dateLabel)?.dateLabel
    ?? latestSourceDate(shop.sources)
  return { ...shop, displayStatus: status, sourceTime, authorVisited: sourcePredatesVisit(shop.sources, props.visitedAt) }
}))
const platformLabel = { xiaohongshu: '小红书', douyin: '抖音' }
</script>

<template>
  <section class="shop-directory detail-body" aria-labelledby="shop-directory-heading">
    <header class="shop-directory-heading">
      <div><p class="section-label">SHOP DIRECTORY</p><h2 id="shop-directory-heading">谷店一览（自整理）</h2></div>
      <span>{{ directory.area }} · 核对 {{ directory.checkedAt }}</span>
    </header>
    <p class="shop-directory-intro">收录谷店、周边与卡牌店。找到并核对过小红书或抖音官方账号的标为「营业中」，其余标为「有营业线索」，注明来源时间；有明确闭店公告的保留闭店标注。</p>
    <ul class="shop-list">
      <li v-for="shop in shops" :key="shop.name" class="shop-row">
        <div class="shop-row-title"><h3>{{ shop.name }}</h3><span class="shop-status" :class="'is-' + shop.displayStatus">{{ statusLabel[shop.displayStatus] }}</span></div>
        <p v-if="shop.floor" class="shop-location">位置：{{ shop.floor }}</p>
        <p v-if="shop.kind" class="shop-kind">主营：{{ shop.kind }}</p>
        <p v-if="shop.displayStatus === 'evidence'" class="shop-time"><template v-if="shop.sourceTime">线索更新：{{ shop.sourceTime }}</template><template v-else>来源核对：<time :datetime="directory.checkedAt">{{ directory.checkedAt }}</time></template></p>
        <p v-if="shop.authorVisited" class="shop-author-visit">依据：作者亲自探店<time v-if="visitedAt" :datetime="visitedAt">（{{ visitedAt }}）</time></p>
        <ul v-if="shop.accounts?.length" class="shop-accounts" :aria-label="shop.name + '的官方账号'">
          <li v-for="account in shop.accounts" :key="account.platform + account.url"><a :href="account.url" target="_blank" rel="noopener noreferrer"><b>{{ platformLabel[account.platform] }}</b><span>{{ account.name }}<small v-if="account.handle">号：{{ account.handle }}</small></span><em v-if="account.scope === 'brand'">品牌号</em><span aria-hidden="true">↗</span></a></li>
        </ul>
      </li>
    </ul>
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
.shop-location,.shop-kind { font-size: 12px; color: #896873; margin: 8px 0; line-height: 1.7; }
.shop-time { font-size: 12px; color: #45698d; margin: 8px 0; }
.shop-author-visit { font-size: 12px; color: #347357; margin: 10px 0; line-height: 1.7; }
.shop-accounts { display: grid; gap: 6px; }
.shop-accounts a { display: flex; align-items: flex-start; gap: 7px; padding: 8px; border: 1px solid #ead2d8; font-size: 12px; text-decoration: none; overflow-wrap: anywhere; }
.shop-accounts a:hover { background: #fff0f3; }
.shop-accounts b { flex-shrink: 0; color: #b94660; }
.shop-accounts small { display: block; color: #79626b; font-size: 11px; }
.shop-accounts em { font-style: normal; font-size: 10px; color: #79626b; white-space: nowrap; }
@media (max-width: 600px) { .shop-list { grid-template-columns: 1fr; } .shop-row { padding: 14px; } }
</style>
