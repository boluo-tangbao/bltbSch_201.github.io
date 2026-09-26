# 访问统计、QA 与留言

## 已接入的位置

- 图片总榜与页底留言：`/bltbSch_201.github.io/rank/`，留言锚点 `#guestbook`。
- QA 与建议：`/bltbSch_201.github.io/rank/qa/`。与原有 `guide/` 一样是独立 HTML 入口，可直接访问和刷新。
- 三个页面的页脚都显示累计访问次数。

## 访问统计

使用 [不蒜子官方服务](https://busuanzi.ibruce.info/)，无需额外账号或自建后端。使用 `site_pv`，不是独立访客数。每个完整页面打开/刷新请求一次；页面内筛选、导出、切换店铺不会再次计数。按用户最新要求不做 IP 或浏览器去重。

这是服务按域名聚合的访问次数。目前仅榜单、地图和 QA 引入统计，原个人站未引入。如果未来在同一域名其他页面引入同一服务，数字会合并，不是按 `/rank/` 独立命名空间。初始数字包含接口上线验证的访问，不修改、伪造或重置服务数据。

仅 `boluo-tangbao.github.io` 正式域名加载服务，localhost 预览和普通浏览器测试不会污染计数。改域名时应同步修改 `src/components/VisitCounter.vue` 的域名条件。12 秒超时或请求失败显示“访问统计暂不可用”，不把失败当成 0；不自动重试计数请求以免多计。第三方不可用或被浏览器拦截时可能漏计，不能当作精确人数或审计数据。

## 建议与留言

配置在 `rank/src/data/community.json`，其中存放仓库和作者 B 站主页链接。QA 建议列表读取公开 GitHub API，不需要登录，不在前端使用令牌。

- 新留言入口跳转到作者的 [B 站主页](https://space.bilibili.com/251080996)，访客登录后可在 B 站私信；私信不在网站公开展示。历史 GitHub 留言仍保留在 Issue #1，但不再显示在网站。
- QA 表单打开 GitHub 新 Issue 页面并预填标题/正文，**必须在 GitHub 完成最终提交**。标题限 70 字、说明限 600 字，避免 URL 超过服务器长度限制。需要更多信息可在 GitHub 编辑提交内容。
- 使用 `.github/ISSUE_TEMPLATE/rank-feedback.md` 自动附加 `rank-feedback` 标签；不能使用需要仓库写权限的 `labels` URL 参数，否则普通访客可能无法提交。网站读取该标签下全部状态的 Issue，排除 PR，每页 20 条。
- QA 建议列表从 GitHub Issues 加载；打开页面或点击刷新时获取最新内容。API 限流/网络失败会保留已加载内容并提示直接去 GitHub 查看；没有离线假数据。
- GitHub 建议按纯文本呈现，不执行提交者的 HTML；建议公开展示。B 站私信仅在 B 站对话中可见。

## 作者日常管理

日常私信在 B 站处理。QA 建议在带 `rank-feedback` 标签的 Issues 中回复和跟进；关闭后网站显示“已关闭”，不等同于已经完成。添加/移除该标签可以收录/移出建议列表。

建议表单采用 **GitHub 登录后提交**，不是匿名投稿，也没有内嵌 OAuth 登录窗口；日常交流使用 B 站私信。未来需要匿名或站内直接提交建议，应接入带服务端校验、存储和管理能力的后端，不能把管理令牌放到网页。

## 验证

2026-09-19：生产构建与 8 项数据测试通过；10 项 Edge 浏览器场景覆盖既有功能和新增 QA、页底留言、分页、错误重试、纯文本显示、375/768/1440px 布局、生产域名下每页仅加载一次计数脚本、计数服务被阻止的降级提示。浏览器社区数据与计数脚本使用拦截响应；没有向公开留言板写入测试留言。额外实际调用官方统计接口两次，确认真实计数连续递增。提交跳转验证到 GitHub 新 Issue URL 和预填参数，没有冒充访客发布建议。

GitHub 官方参考：[从 URL 创建 Issue 与参数权限](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-an-issue#creating-an-issue-from-a-url-query)、[公开评论 API](https://docs.github.com/en/rest/issues/comments)。
