<script setup lang="ts">
import { computed } from 'vue'
import type { DirectoryShop, ShopDirectory } from '../types'

const props = defineProps<{ directory: ShopDirectory }>()
const visible = computed(() => props.directory.shops.filter(shop => !['unverified', 'closed'].includes(shop.status)))
const pending = computed(() => props.directory.shops.filter(shop => ['unverified', 'closed'].includes(shop.status)))
const groups = computed(() => [...new Set(visible.value.map(shop => shop.floor))].map(floor => ({ floor, shops: visible.value.filter(shop => shop.floor === floor) })))
const statusLabel: Record<DirectoryShop['status'], string> = { recent: '近期营业线索', listed: '门店信息在列', older: '较早营业线索', unverified: '营业待核实', closed: '已公布闭店' }
const platformLabel = { xiaohongshu: '小红书', douyin: '抖音' }
</script>

<template>
  <section class="shop-directory detail-body" aria-labelledby="shop-directory-heading">
    <header class="shop-directory-heading">
      <div><p class="section-label">SHOP DIRECTORY</p><h2 id="shop-directory-heading">谷店一览（自整理）</h2></div>
      <span>{{ directory.area }} · 核对 {{ directory.checkedAt }}</span>
    </header>
    <p class="shop-directory-intro">按楼层整理谷店、周边与卡牌店。营业线索以注明的来源时间为准；账号入口仅收录核对过的小红书、抖音店铺号或品牌号。</p>
    <div class="shop-directory-groups">
      <section v-for="group in groups" :key="group.floor" class="shop-floor">
        <h3>{{ directory.area }} · {{ group.floor }}<small>{{ group.shops.length }} 家</small></h3>
        <ul class="shop-list">
          <li v-for="shop in group.shops" :key="shop.name" class="shop-row">
            <div class="shop-row-title"><h4>{{ shop.name }}</h4><span class="shop-status" :class="'is-' + shop.status">{{ statusLabel[shop.status] }}</span></div>
            <p v-if="shop.kind" class="shop-kind">{{ shop.kind }}</p>
            <p class="shop-note">{{ shop.note }}</p>
            <ul v-if="shop.accounts?.length" class="shop-accounts" :aria-label="shop.name + '的官方账号'">
              <li v-for="account in shop.accounts" :key="account.platform + account.url"><a :href="account.url" target="_blank" rel="noopener noreferrer"><b>{{ platformLabel[account.platform] }}</b><span>{{ account.name }}<small v-if="account.handle">号：{{ account.handle }}</small></span><em v-if="account.scope === 'brand'">品牌号</em><span aria-hidden="true">↗</span></a></li>
            </ul>
            <p class="shop-sources">依据：<template v-for="(source, index) in shop.sources" :key="source.url"><span v-if="index" aria-hidden="true"> · </span><a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.label }}<span v-if="source.date">（{{ source.date }}）</span> ↗</a></template></p>
          </li>
        </ul>
      </section>
    </div>
    <details v-if="pending.length" class="shop-pending">
      <summary>待进一步核实的旧店单 · {{ pending.length }} 家</summary>
      <p>以下保留旧攻略中的找店线索，尚不能确认当前营业或位置；未找到新记录不代表已经闭店。</p>
      <ul class="shop-list">
        <li v-for="shop in pending" :key="shop.name" class="shop-row">
          <div class="shop-row-title"><h4>{{ shop.name }}</h4><span class="shop-status" :class="'is-' + shop.status">{{ statusLabel[shop.status] }}</span></div>
          <p class="shop-kind">{{ directory.area }} · {{ shop.floor }}<template v-if="shop.kind"> · {{ shop.kind }}</template></p>
          <p class="shop-note">{{ shop.note }}</p>
          <ul v-if="shop.accounts?.length" class="shop-accounts" :aria-label="shop.name + '的官方账号'">
            <li v-for="account in shop.accounts" :key="account.platform + account.url"><a :href="account.url" target="_blank" rel="noopener noreferrer"><b>{{ platformLabel[account.platform] }}</b><span>{{ account.name }}<small v-if="account.handle">号：{{ account.handle }}</small></span><em v-if="account.scope === 'brand'">品牌号</em><span aria-hidden="true">↗</span></a></li>
          </ul>
          <p class="shop-sources">依据：<template v-for="(source, index) in shop.sources" :key="source.url"><span v-if="index" aria-hidden="true"> · </span><a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.label }}<span v-if="source.date">（{{ source.date }}）</span> ↗</a></template></p>
        </li>
      </ul>
    </details>
  </section>
</template>

<style scoped>
.shop-directory { padding: clamp(20px, 3vw, 32px); border: 2px solid var(--manga-ink, #292830); background: var(--manga-paper, #fffaf1); box-shadow: 5px 5px 0 #efb1bb; }
.shop-directory-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
.shop-directory-heading h2 { margin: 0; font-size: clamp(22px, 3vw, 28px); }
.shop-directory-heading > span { color: #79626b; font-size: 12px; }
.shop-directory-intro,.shop-pending > p { color: #74656c; line-height: 1.8; font-size: 13px; }
.shop-floor { margin-top: 24px; }
.shop-floor h3 { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-left: 4px solid var(--city-color, #e86f86); background: #fce8eb; font-size: 16px; }
.shop-floor h3 small { font-size: 12px; font-weight: normal; color: #80636c; }
.shop-list,.shop-accounts { list-style: none; padding: 0; margin: 0; }
.shop-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.shop-row { min-width: 0; padding: 16px; border: 1px solid #e5c5cc; background: #fffdfa; }
.shop-row-title { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.shop-row h4 { margin: 0; font-size: 16px; }
.shop-status { font-size: 10px; padding: 3px 6px; background: #f3eee7; color: #756253; white-space: nowrap; }
.shop-status.is-recent { background: #e8f3ed; color: #347357; }
.shop-status.is-listed { background: #eaf0f8; color: #45698d; }
.shop-kind { font-size: 12px; color: #896873; margin: 8px 0; }
.shop-note { font-size: 13px; line-height: 1.7; margin: 10px 0; }
.shop-accounts { display: grid; gap: 6px; }
.shop-accounts a { display: flex; align-items: flex-start; gap: 7px; padding: 8px; border: 1px solid #ead2d8; font-size: 12px; text-decoration: none; overflow-wrap: anywhere; }
.shop-accounts a:hover { background: #fff0f3; }
.shop-accounts b { flex-shrink: 0; color: #b94660; }
.shop-accounts small { display: block; color: #79626b; font-size: 11px; }
.shop-accounts em { font-style: normal; font-size: 10px; color: #79626b; white-space: nowrap; }
.shop-sources { color: #8a737b; font-size: 11px; line-height: 1.8; margin: 12px 0 0; overflow-wrap: anywhere; }
.shop-sources a { text-underline-offset: 3px; }
.shop-pending { margin-top: 24px; border-top: 1px dashed #d5b4bd; padding-top: 16px; }
.shop-pending summary { cursor: pointer; font-size: 14px; font-weight: 700; }
.shop-pending .shop-list { margin-top: 14px; }
@media (max-width: 600px) { .shop-list { grid-template-columns: 1fr; } .shop-row { padding: 14px; } }
</style>
