<script setup lang="ts">
import { onMounted, ref } from 'vue'
import site from './data/site.json'
import config from './data/community.json'
import VisitCounter from './components/VisitCounter.vue'
import { github, feedbackUrl, issueUrl, readableDate, suggestionUrl } from './utils/community'
type Suggestion = { number: number; title: string; state: string; created_at: string; user: { login: string } | null; pull_request?: unknown }
const base = import.meta.env.BASE_URL
const main = ref<HTMLElement>(), category = ref('功能建议'), title = ref(''), body = ref(''), opened = ref(false)
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
  if (!title.value.trim() || !body.value.trim()) return
  window.open(suggestionUrl(category.value, title.value, body.value), '_blank', 'noopener,noreferrer')
  opened.value = true
}
onMounted(() => load(true))
</script>
<template>
  <a href="#qa-main" class="skip-link" @click.prevent="main?.focus()">跳到正文</a>
  <header class="site-header"><div class="header-inner"><a :href="base" class="brand"><span class="brand-mark" aria-hidden="true">排</span><span>汤包的逛店手记<small>PLACES & PREFERENCES</small></span></a><nav aria-label="主导航"><a :href="base">图片总榜</a><a :href="`${base}guide/`">地图与介绍</a><a :href="`${base}qa/`" aria-current="page">QA 与建议</a></nav></div></header>
  <main id="qa-main" ref="main" tabindex="-1" class="page-shell qa-page">
    <div class="guide-hero"><div><p class="eyebrow">一起把这份手记补完整</p><h1>你的想法，我想听听。</h1><p>推荐一家店、纠正一处信息，或告诉我哪里可以更好用。</p></div><a :href="`${base}#guestbook`" class="button">只是想聊聊？去留言 ↗</a></div>
    <div class="qa-layout"><section class="community-panel" aria-labelledby="suggest-title"><h2 id="suggest-title">提个建议</h2><form class="suggestion-form" @submit.prevent="submit"><label>建议类型<select v-model="category"><option>功能建议</option><option>推荐店铺</option><option>内容纠错</option><option>使用问题</option><option>其他想法</option></select></label><label>一句话说明<input v-model="title" required maxlength="70" placeholder="你希望新增什么，或哪里需要修改？" /></label><label>详细描述<textarea v-model="body" required maxlength="600" rows="7" placeholder="推荐店铺可以写店名和城市；遇到问题可以描述设备、页面和操作步骤。"></textarea></label><span class="form-count">{{ body.length }} / 600</span><p class="community-hint">下一步会打开 GitHub，登录后点击提交才会发布。内容公开，请勿填写个人隐私。</p><button class="button dark" type="submit" :disabled="!title.trim() || !body.trim()">前往 GitHub 提交 ↗</button><p v-if="opened" role="status" class="community-hint">已打开提交页；请在 GitHub 完成发布。若没有弹出窗口，<a :href="suggestionUrl(category, title, body)" target="_blank" rel="noopener noreferrer">点击这里继续</a>。</p></form></section>
    <section class="community-panel faq" aria-labelledby="faq-title"><p class="eyebrow">Q & A</p><h2 id="faq-title">先回答几个小问题</h2><details open><summary>建议和留言有什么区别？</summary><p>建议单独成条，方便跟进功能、店铺推荐和内容纠错；留言用于日常交流。</p></details><details><summary>为什么需要 GitHub 账号？</summary><p>建议与留言保存在 GitHub，便于你查看、编辑和跟进回复。阅读无需登录。</p></details><details><summary>访问次数怎么计算？</summary><p>打开或刷新榜单、地图或 QA 页面计一次访问，不按 IP 去重。页面内筛选、点击按钮不会重复计数；次数不等于独立访客人数。</p><p>由不蒜子提供统计。网络或拦截器可能影响加载，统计不可用时不会显示虚构数字。</p></details><details><summary>现在为什么没有店铺？</summary><p>网站已准备好，真实体验会由作者逐步补充。可以先把想推荐的店铺和城市写进建议。</p></details></section></div>
    <section class="community-panel feedback-list" aria-labelledby="feedback-title"><div class="section-heading"><div><h2 id="feedback-title">大家的建议</h2></div><button class="text-button" :disabled="loading" @click="load(true)">刷新建议</button></div><p class="community-hint">按提交时间排列，点击标题查看讨论与回复。<a :href="feedbackUrl" target="_blank" rel="noopener noreferrer">在 GitHub 查看全部 ↗</a></p><p v-if="error" class="community-error" role="alert">{{ error }}</p><p v-if="loading" class="community-empty" role="status">正在加载建议…</p><p v-else-if="!error && !suggestions.length" class="community-empty">还没有建议，欢迎写下第一个想法。</p><ol><li v-for="item in suggestions" :key="item.number"><div><a :href="issueUrl(item.number)" target="_blank" rel="noopener noreferrer">{{ item.title }}</a><small>{{ item.user?.login || '已注销用户' }} · {{ readableDate(item.created_at) }}</small></div><span class="feedback-status" :class="{ closed: item.state === 'closed' }">{{ item.state === 'closed' ? '已关闭' : '讨论中' }}</span></li></ol><button v-if="hasMore" class="button" :disabled="loading" @click="load()">加载更多建议</button></section>
  </main>
  <footer class="site-footer"><span>{{ site.author }} · 谢谢每一份认真反馈</span><VisitCounter /></footer>
</template>
