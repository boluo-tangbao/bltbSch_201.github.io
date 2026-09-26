<script setup lang="ts">
import { bilibiliProfileUrl } from '../utils/community'
</script>
<template>
  <section id="guestbook" class="community-panel guestbook" aria-labelledby="guestbook-title">
    <div class="section-heading"><div><span class="section-number">04</span><h2 id="guestbook-title">路过，留句话</h2></div></div>
    <p class="community-intro">想推荐店铺或分享逛店感受？欢迎来 B 站主页私信我。</p>
    <div class="community-actions"><a class="button dark" :href="bilibiliProfileUrl" target="_blank" rel="noopener noreferrer">前往 B 站主页私信 ↗</a></div>
    <p class="community-hint">私信需要在 B 站登录后发送，不会公开展示。建议和纠错请前往 QA 与建议页提交 GitHub Issue。</p>
  </section>
</template>
