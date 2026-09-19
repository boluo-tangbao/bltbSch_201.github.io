# 我的逛店体验榜

菠萝汤包scho 的中文个人榜单。首次发布为真实空榜单，不包含演示体验。

2026-09-19 更新：总榜改为纯图片优先、城市颜色边框，新增独立地图与视频介绍子页及完整内容 HTML 导出。字段填写、视频片段和地图坐标要求见 [新版维护说明](docs/v2-guide.md)。

- 榜单：<https://boluo-tangbao.github.io/jimmyGu.github.io/rank/>
- 地图与视频介绍：<https://boluo-tangbao.github.io/jimmyGu.github.io/rank/guide/>
- 原个人主页：<https://boluo-tangbao.github.io/jimmyGu.github.io/>
- 仓库：<https://github.com/boluo-tangbao/jimmyGu.github.io>

根目录的个人主页、学习经历、项目经历与博客保持原样；新应用源代码在 `rank/`。工作流将原站静态文件和榜单构建产物一起发布。

## 下次更新，只需改这些文件

| 想做什么 | 文件 |
| --- | --- |
| 新增店铺、改评价、改档位与顺序 | `rank/src/data/places.json` |
| 记录新增、升档、降档、文案修改与原因 | `rank/src/data/updates.json` |
| 改标题、署名、评价标准、同档规则 | `rank/src/data/site.json` |
| 上传自己的封面和详情照片 | `rank/public/images/places/` |
| 固定各城市的边框和地图颜色 | `rank/src/data/site.json` 的 `cityColors` |
| 地图位置和视频介绍 | `rank/src/data/places.json` 的 `location`、`video` |
| 上传已剪好的视频片段（可选） | `rank/public/videos/places/` |

最简流程：上传图片 → 修改 JSON → 提交到 `main` → 在 Actions 等待绿色成功 → 打开榜单确认。无需改组件代码。也可以直接把条目、评价与图片交给 Agent 更新。

### 新增条目示例

以下是**虚构演示模板**，默认不发布。将其复制进 `places.json` 的数组中（多个对象之间用英文逗号分隔）。填写自己的真实内容、日期、档位与 ID 后，将 `isDemo` 改为 `false`，将 `published` 改为 `true`。不要把下面的演示短评当成真实观点。

```json
[
  {
    "id": "my-place-001",
    "name": "待填写名称（演示）",
    "city": "待填写城市",
    "tier": "top",
    "order": 10,
    "summary": "待填写你自己的一句话结论。",
    "pros": "",
    "cons": "",
    "details": "待填写体验与原因。换段可用 \n。",
    "tags": [],
    "cover": null,
    "coverAlt": "",
    "gallery": [],
    "visitedAt": null,
    "updatedAt": "2026-09-18",
    "published": false,
    "isDemo": true
  }
]
```

五档 ID 顺序固定：`hang`（夯）、`top`（顶级）、`above`（人上人）、`npc`（NPC）、`bad`（拉完了）。初始配置同档分先后，`order` 越小排名越靠前，同档公开条目的 `order` 不能重复。可按 10、20、30 留出插入空间。筛选后保留全榜中的档内编号。

发布新城市前，在 `site.json` 的 `cityColors` 中给该城市配置唯一的 `#RRGGBB` 颜色，供总榜和地图统一使用。总榜默认只展示图片，通过“显示名称与城市”开关查看辅助文字和档内编号；点击图片到独立介绍子页。

`visitedAt` 允许 `2026-09`、`2026-09-18` 或 `null`；不知道日期就留 `null`，页面显示“未记录”。`updatedAt` 必須由内容维护者填写真实更新日，不由构建时间代替。空榜单的站点 `updatedAt` 为 `null`；页面在站点日期、已公开条目日期和公开更新记录中取最新值。

新增后在 `updates.json` 中添加记录，日期与条目的内容日期保持一致：

```json
[
  {
    "id": "my-place-001-added-20260918",
    "placeId": "my-place-001",
    "date": "2026-09-18",
    "type": "added",
    "note": "这里填写实际新增原因。"
  }
]
```

### 改档示例

假设你决定将某条目从“人上人”改到“顶级”：在该条目中修改 `"tier": "top"`，选择该档未使用的 `order`，更新 `updatedAt`，再追加以下更新记录。以下日期与理由需改成真实内容：

```json
{
  "id": "my-place-001-change-20260920",
  "placeId": "my-place-001",
  "date": "2026-09-20",
  "type": "tier-change",
  "fromTier": "above",
  "toTier": "top",
  "note": "这里填写你决定改档的实际原因。"
}
```

只有改文案时使用 `"type": "edited"`，不填前后档位。最近更新展示最多 10 条，新增和升降标记默认保留 30 天，可在 `site.json` 的 `recentDays` 修改。隐藏条目的更新记录也不会展示。`published: false` 只控制展示，公开仓库和前端构建中都不要放私密内容。

### 换图

1. 上传 WebP、JPEG、PNG 等图片到 `rank/public/images/places/`，优先压缩到适当大小。
2. 条目中填 `"cover": "images/places/my-shop.webp"` 和准确的 `coverAlt`。不用以 `/` 开头，不写 `public/`，不使用外部图片地址。
3. 可选 `"coverPosition": [50, 30]` 指定水平、垂直焦点百分比，默认均为 50。
4. 详情图写为 `"gallery": [{ "src": "images/places/inside.webp", "alt": "店内陈列" }]`。没有照片保留 `cover: null` 和空数组即可。

## 开发与验证

使用 **Node.js 24 LTS** 和 npm；CI 使用相同主版本。Vue 3 + TypeScript + Vite，无后端、数据库或账号系统。TypeScript 固定为与 Vue 类型检查器兼容的 5.9.3，依赖锁文件已提交。

```sh
cd rank
npm ci
npm run dev
```

开发地址：`http://127.0.0.1:5173/jimmyGu.github.io/rank/`。

```sh
npm run validate:data
npm test
npm run build
npm run preview
```

构建依次运行 JSON/内容校验、Vue/TypeScript 类型检查、Vite 构建。预览地址：`http://127.0.0.1:4173/jimmyGu.github.io/rank/`。

浏览器检查使用已安装的 Microsoft Edge：`npm run test:browser`。没有 Edge 的环境可安装 Playwright Chromium 并把 `playwright.config.ts` 的 `channel` 配置移除。检查包含空榜单、测试条目、隐藏数据、详情直达/刷新/返回、筛选恢复、375/768/1440px 无溢出、两种 PNG 导出、分页、错误提示和重试。虚构测试数据仅写到忽略的 `.fixture-app/`，不修改正式 JSON、不进入部署产物。截图与实际导出文件在 `rank/test-results/evidence/`。

导出使用独立 Canvas 版式，宽 1200px、单页高不超过 3000px，按完整卡片行分页。等待字体和同源图片载入后生成 PNG，每页单独下载，手机可长按图片保存。默认导出当前筛选，也可选择全榜。单条名称最长 160 字，城市 80 字，短评 600 字；长篇内容请放 `details`。

## 首次 Pages 部署和以后自动发布

1. 仓库默认分支是 `main`。在 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
2. 推送 `.github/workflows/deploy.yml` 和完整代码、锁文件到 `main`。也可在 Actions 手动运行 **Deploy personal site and ranking to Pages**。
3. 工作流安装 Node 24、执行 `npm ci`、单元测试、内容校验、类型检查和构建，然后运行 `scripts/assemble-site.mjs`。
4. 合并输出到 `_site/`：保留原站已跟踪的静态页面与素材，新榜单放在 `_site/rank/`。不会上传整个源码目录。
5. Pages 上传与部署作业完成并显示绿色成功后，再访问实际站点确认。只有部署作业拥有 `pages: write` 与 `id-token: write`。

Vite 默认 base 为 `/jimmyGu.github.io/rank/`；CI 从 `configure-pages` 返回的真实 `base_path` 推导路径。图片、脚本、CSS 和详情链接都支持仓库子路径，详情使用 `#/place/稳定ID`，刷新不需要服务端路由。

当前默认域名免费，无需购买 DNS 服务。自定义域名需要先拥有该域名，不能任意修改 GitHub 的 `github.io` 域名。购买后通常使用注册商提供的 DNS 管理，在仓库 Pages 设置里填写域名并按 [GitHub 自定义域名文档](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site) 设置解析、确认 HTTPS，再重新运行工作流。绑定会影响此仓库的**整个个人站点**；榜单仍在 `/rank/`，操作前应确定期望的域名范围。

## 排错与回退

- **Actions 数据校验失败**：日志会显示 JSON 文件、条目 ID 和原因。检查重复 ID、档位 ID、同档 `order`、真实日期、缺图路径、更新记录引用和改档前后档位。修复后正常提交。
- **构建报错**：先确认 Node 24，再运行 `npm ci` 和 `npm run build`。不要跳过数据或类型校验。
- **空白页/素材 404**：核对 Pages Source 为 GitHub Actions、部署已成功，检查实际网址包含 `/rank/`。切域名或改仓库名后重新构建，不能直接移动旧产物。
- **导出失败**：按提示检查图片是否已提交、路径是否正确；只支持仓库内同源素材，修复后重新生成。
- **旧内容仍显示**：查看 Actions 是否有失败或等待审批，等待成功后刷新浏览器。工作流文件存在不代表已上线。
- **回退内容**：在 GitHub 编辑器把错误字段改回并提交，或本地执行 `git revert <需要撤销的提交>` 后正常推送。不要强推或重写历史，下一次成功部署即发布回退版本。
- **增加原站其他文件类型**：`scripts/assemble-site.mjs` 保留已跟踪的静态文件，新增特殊扩展名时在白名单补充；提交后才会被复制。

实现时核对的官方资料：[Vue 快速开始](https://vuejs.org/guide/quick-start.html)、[Vite Pages 部署](https://vite.dev/guide/static-deploy.html#github-pages)、[GitHub 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。
