<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import site from './data/site.json'
import config from './data/community.json'
import VisitCounter from './components/VisitCounter.vue'
import SiteHeader from './components/SiteHeader.vue'
import MascotMoments from './components/MascotMoments.vue'
import CopyButton from './components/CopyButton.vue'
import placeData from './data/places.json'
import directoryData from './data/shop-directories.json'
import type { PlacesByCity, ShopDirectory } from './types'
import { flattenPlaces } from './utils/model'
import { placeDetailHash } from './utils/search'
import { resolveShopFeedback, shopFeedbackBody, shopFeedbackTypes } from './utils/shopFeedback'
import type { ShopFeedbackType } from './utils/shopFeedback'
import { bilibiliProfileUrl, github, feedbackUrl, issueUrl, readableDate, suggestionUrl } from './utils/community'
type Suggestion = { number: number; title: string; state: string; created_at: string; user: { login: string } | null; pull_request?: unknown }
const feedbackContext = resolveShopFeedback(location.search, flattenPlaces(placeData as PlacesByCity), directoryData as Record<string, ShopDirectory>)
const sourcePage = feedbackContext ? new URL(`${import.meta.env.BASE_URL}guide/${placeDetailHash(feedbackContext.placeId, feedbackContext.shopName)}`, location.origin).href : ''
const feedbackType = ref<ShopFeedbackType>('营业状态')
const feedbackTitle = (type: ShopFeedbackType) => `${type}：${feedbackContext?.shopName ?? ''}`.slice(0, 70)
const main = ref<HTMLElement>(), category = ref(feedbackContext ? '内容纠错' : '功能建议'), title = ref(feedbackContext ? feedbackTitle(feedbackType.value) : ''), body = ref(''), opened = ref(false)
const feedbackPrefix = computed(() => feedbackContext ? shopFeedbackBody(feedbackContext, feedbackType.value, sourcePage) : '')
const bodyLimit = computed(() => Math.max(0, 600 - feedbackPrefix.value.length))
const submissionBody = computed(() => feedbackPrefix.value + body.value.trim())
const copyText = computed(() => `${title.value}\n\n${submissionBody.value}`)
const canSubmit = computed(() => !!title.value.trim() && !!body.value.trim() && submissionBody.value.length <= 600)
watch(feedbackType, (value, previous) => { if (title.value === feedbackTitle(previous)) title.value = feedbackTitle(value) })
const suggestions = ref<Suggestion[]>([]), loading = ref(false), error = ref(''), page = ref(0), hasMore = ref(false)
async function load(reset = false) {
  if (loading.value) return
  loading.value = true; error.value = ''
  try {
    const nextPage = reset ? 1 : page.value + 1
    const items = await github<Suggestion[]>(`/issues?state=all&labels=${encodeURIComponent(config.feedbackLabel)}&sort=created&direction=desc&per_page=20&page=${nextPage}`)
    suggestions.value = reset ? items.filter(i => !i.pull_request) : [...suggestions.value, ...items.filter(i => !i.pull_request)]
    hasMore.value = items.length === 20; page.value = nextPage
  } catch (e) { error.value = e instanceof Error ? e.message : '暂时无法加载建议。' }
  finally { loading.value = false }
}
function submit() {
  if (!canSubmit.value) return
  window.open(suggestionUrl(category.value, title.value, submissionBody.value), '_blank', 'noopener,noreferrer')
  opened.value = true
}
onMounted(() => load(true))
</script>
<template>
  <a href="#qa-main" class="skip-link" @click.prevent="main?.focus()">跳到正文</a>
  <SiteHeader active="qa" />
  <main id="qa-main" ref="main" tabindex="-1" class="page-shell qa-page">
    <div class="guide-hero compact-qa-hero"><div><h1>来，唠两句！</h1><p>安利好店、挑点小毛病，都欢迎～</p></div><a :href="bilibiliProfileUrl" target="_blank" rel="noopener noreferrer" class="button">B 站私信 ↗</a></div>
    <div class="qa-layout">
      <section class="community-panel mascot-host" aria-labelledby="suggest-title">
        <MascotMoments class="mascot-overlay" priority :ids="['deepseek']" label="建议表单角色" />
        <h2 id="suggest-title">{{ feedbackContext ? '店铺信息纠错' : '提个建议' }}</h2>
        <div v-if="feedbackContext" class="feedback-context">
          <strong>{{ feedbackContext.shopName }}</strong>
          <p>{{ feedbackContext.city }} · {{ feedbackContext.placeName }}<template v-if="feedbackContext.floor"> · {{ feedbackContext.floor }}</template></p>
          <a :href="sourcePage">查看所在地点与店单 →</a>
          <p class="community-hint">店名、所在地点、当前记录位置与页面链接会自动带入反馈，请补充变化情况及来源。</p>
        </div>
        <form class="suggestion-form" @submit.prevent="submit">
          <label v-if="!feedbackContext">建议类型<select v-model="category"><option>功能建议</option><option>推荐店铺</option><option>内容纠错</option><option>使用问题</option><option>其他想法</option></select></label>
          <label v-if="feedbackContext">变化类型<select v-model="feedbackType"><option v-for="type in shopFeedbackTypes" :key="type">{{ type }}</option></select></label>
          <label>一句话说明<input v-model="title" required maxlength="70" placeholder="你希望新增什么，或哪里需要修改？" /></label>
          <label>详细描述<textarea v-model="body" required :maxlength="bodyLimit" rows="7" :placeholder="feedbackContext ? '例如：已搬至三层。请附公告链接，或说明实地看到变化的日期。' : '推荐店铺可以写店名和城市；遇到问题可以描述设备、页面和操作步骤。'"></textarea></label>
          <span class="form-count">{{ submissionBody.length }} / 600<template v-if="feedbackContext">（含自动带入信息）</template></span>
          <p class="community-hint">下一步会打开 GitHub，登录后点击提交才会发布。内容公开，请勿填写个人隐私。</p>
          <button class="button dark" type="submit" :disabled="!canSubmit">前往 GitHub 提交 ↗</button>
          <p v-if="opened" role="status" class="community-hint">已打开提交页；请在 GitHub 完成发布。若没有弹出窗口，<a :href="suggestionUrl(category, title, submissionBody)" target="_blank" rel="noopener noreferrer">点击这里继续</a>。</p>
          <div v-if="feedbackContext" class="feedback-private">
            <CopyButton :text="copyText" label="复制纠错内容" />
            <p class="community-hint">也可以复制内容后，<a :href="bilibiliProfileUrl" target="_blank" rel="noopener noreferrer">通过 B 站私信反馈 ↗</a>。</p>
          </div>
        </form>
      </section>
    <section class="community-panel faq" aria-labelledby="faq-title"><p class="eyebrow">Q & A</p><h2 id="faq-title">先回答几个小问题</h2><details open><summary>建议和留言有什么区别？</summary><p>建议会公开提交为 GitHub Issue，方便跟进功能、店铺推荐和内容纠错；日常交流可以到 B 站主页私信。</p></details><details><summary>为什么需要 GitHub 账号？</summary><p>提交建议和参与 Issue 讨论需要 GitHub 账号；日常私信请在 B 站登录后发送。阅读网站内容无需登录。</p></details><details><summary>访问次数怎么计算？</summary><p>打开或刷新榜单、地图或 QA 页面计一次访问，不按 IP 去重。页面内筛选、点击按钮不会重复计数；次数不等于独立访客人数。</p><p>由不蒜子提供统计。网络或拦截器可能影响加载，统计不可用时不会显示虚构数字。</p></details><details><summary>榜单会继续更新吗？</summary><p>会。新增地点、评价、图集和地图信息会逐步补充；最近更新可在图片总榜下方查看。也欢迎推荐想看的地点。</p></details></section></div>
    <section class="community-panel feedback-list" aria-labelledby="feedback-title"><div class="section-heading"><div><h2 id="feedback-title">大家的建议</h2></div><button class="text-button" :disabled="loading" @click="load(true)">刷新建议</button></div><p class="community-hint">按提交时间排列，点击标题查看讨论与回复。<a :href="feedbackUrl" target="_blank" rel="noopener noreferrer">在 GitHub 查看全部 ↗</a></p><p v-if="error" class="community-error" role="alert">{{ error }}</p><p v-if="loading" class="community-empty" role="status">正在加载建议…</p><p v-else-if="!error && !suggestions.length" class="community-empty">还没有建议，欢迎写下第一个想法。</p><ol><li v-for="item in suggestions" :key="item.number"><div><a :href="issueUrl(item.number)" target="_blank" rel="noopener noreferrer">{{ item.title }}</a><small>{{ item.user?.login || '已注销用户' }} · {{ readableDate(item.created_at) }}</small></div><span class="feedback-status" :class="{ closed: item.state === 'closed' }">{{ item.state === 'closed' ? '已关闭' : '讨论中' }}</span></li></ol><button v-if="hasMore" class="button" :disabled="loading" @click="load()">加载更多建议</button></section>
  </main>
  <footer class="site-footer"><span>{{ site.author }} · 谢谢每一份认真反馈</span><VisitCounter /></footer>
</template>

<style scoped>
#suggest-title { scroll-margin-top: 90px; }
.feedback-context { margin-top: 18px; padding: 14px; border-left: 3px solid #a83750; background: #fff0f3; overflow-wrap: anywhere; font-size: 13px; line-height: 1.8; }
.feedback-context > strong { display: block; color: #84394e; font-size: 16px; }
.feedback-context > a { display: inline-flex; align-items: center; min-height: 44px; text-decoration: underline; text-underline-offset: 3px; }
.feedback-context .community-hint { margin: 4px 0 0; }
.feedback-private { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; margin-top: 16px; }
.feedback-private .community-hint { margin: 0; }
</style>
