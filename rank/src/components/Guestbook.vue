<script setup lang="ts">
import { onMounted, ref } from 'vue'
import config from '../data/community.json'
import { github, guestbookUrl, issueUrl, readableDate } from '../utils/community'
type Comment = { id: number; body_text?: string; body?: string; created_at: string; user: { login: string } | null }
const comments = ref<Comment[]>([]), loading = ref(false), error = ref(''), page = ref(0), total = ref(0)
async function load(reset = false) {
  if (loading.value) return
  loading.value = true; error.value = ''
  try {
    let nextPage = page.value - 1
    if (reset) {
      const issue = await github<{ comments: number }>(`/issues/${config.guestbookIssue}`)
      total.value = issue.comments; nextPage = Math.max(1, Math.ceil(total.value / 30))
    }
    const items = await github<Comment[]>(`/issues/${config.guestbookIssue}/comments?per_page=30&page=${nextPage}`)
    comments.value = reset ? items.reverse() : [...comments.value, ...items.reverse()]
    page.value = nextPage
  } catch (e) { error.value = e instanceof Error ? e.message : '暂时无法加载留言。' }
  finally { loading.value = false }
}
onMounted(() => load(true))
</script>
<template>
  <section id="guestbook" class="community-panel guestbook" aria-labelledby="guestbook-title">
    <div class="section-heading"><div><span class="section-number">04</span><h2 id="guestbook-title">路过，留句话</h2></div><button class="text-button" :disabled="loading" @click="load(true)">刷新留言</button></div>
    <p class="community-intro">有想推荐的店，或想分享的逛店感受？在这里聊聊。</p>
    <div class="community-actions"><a class="button dark" :href="guestbookUrl" target="_blank" rel="noopener noreferrer">使用 GitHub 留言 ↗</a><a :href="`${issueUrl(config.guestbookIssue)}`" target="_blank" rel="noopener noreferrer">查看全部留言<span v-if="total"> · {{ total }}</span></a></div>
    <p class="community-hint">留言会公开展示。点击后在 GitHub 登录并提交，回来刷新即可查看。请勿留下个人隐私。</p>
    <p v-if="error" class="community-error" role="alert">{{ error }}</p>
    <p v-if="loading" class="community-empty" role="status">正在加载留言…</p>
    <p v-else-if="!error && !comments.length" class="community-empty">还没有留言，第一句话留给你。</p>
    <ol v-if="comments.length" class="comment-list"><li v-for="comment in comments" :key="comment.id"><div class="comment-meta"><strong>{{ comment.user?.login || '已注销用户' }}</strong><a :href="`${issueUrl(config.guestbookIssue)}#issuecomment-${comment.id}`" target="_blank" rel="noopener noreferrer"><time :datetime="comment.created_at">{{ readableDate(comment.created_at) }}</time> ↗</a></div><p>{{ comment.body_text ?? comment.body ?? '' }}</p></li></ol>
    <button v-if="page > 1" class="button" :disabled="loading" @click="load()">加载更早的留言</button>
  </section>
</template>
