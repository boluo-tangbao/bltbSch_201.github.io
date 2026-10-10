# 我的逛店体验榜

菠萝汤包scho 的中文个人榜单。店铺按城市归档，由作者维护真实体验。

2026-09-20 更新：店铺按城市分组，精简字段，详情以图文评价为主。完整填写示例见 [城市归档填写指南](docs/city-data.md)。

- 榜单：<https://boluo-tangbao.github.io/bltbSch_201.github.io/rank/>
- 地图与详细评价：<https://boluo-tangbao.github.io/bltbSch_201.github.io/rank/guide/>
- 站点首页：<https://boluo-tangbao.github.io/bltbSch_201.github.io/>
- 仓库：<https://github.com/boluo-tangbao/bltbSch_201.github.io>

根目录保留主站公开 HTML 页面；共享 CSS/JavaScript 位于 `assets/css/` 和 `assets/js/`，原始活动位于 `content/activities/`。榜单仍使用独立的 `rank/` Vue/Vite 项目，工作流将主站网页素材与榜单构建产物一起发布。

## 本地文件夹清理

预览、验收结束后，可在仓库根目录运行 `node scripts/clean-generated.mjs` 查看可清理空间，运行 `node scripts/clean-generated.mjs --apply` 删除本地部署副本、榜单构建产物、测试临时目录、报告与工具缓存。先结束依赖这些目录的本地预览或测试；下次预览前重新构建即可，已发布的网站不受影响。

默认保留正在使用的媒体预览，避免下次重新转码；加 `--cache` 可同时清理媒体生成产物，下次开发或构建会自动生成。清理入口仅处理固定目录，遇到受版本管理的文件或链接目录会停止；原始照片、视频、内容数据、研究来源、依赖和 Git 历史均保留。目录用途与本地副本说明见 [本地文件结构](本地文件结构.md)。

## 文档入口

| 想了解什么 | 文档 |
| --- | --- |
| 项目目录、原件、生成副本与清理方法 | [本地文件结构](本地文件结构.md) |
| 填写店铺、图集、地图和更新记录 | [城市归档填写指南](docs/city-data.md) |
| 添加活动和维护相册 | [活动记录维护](docs/activities.md) |
| 店铺营业分类与原始依据保留要求 | [店铺一览固定维护规则](docs/shop-directory-rules.md) |
| 地图配置与 AK 使用 | [百度地图接入](docs/baidu-map-security.md) |
| 访问统计、建议和留言管理 | [社区功能说明](docs/community.md) |
| 角色、封面图片的来源与处理规范 | [页面素材说明](docs/visual-assets.md) |
| 查店铺、坐标与图集的原始来源 | [店铺与素材来源](docs/research-sources.md) |
| 兰州网页文稿与视频口播稿 | [兰州内容草稿](docs/lanzhou-drafts.md) |

历史验收与已完成的工作记录不单独维护，已提交过的旧版本可在 Git 历史中查看。

## 下次更新，只需改这些文件

| 想做什么 | 文件 |
| --- | --- |
| 新增店铺、改评价、改档位与顺序 | `rank/src/data/places.json` |
| 记录新增、排名、内容、图集和地图更新及原因 | `rank/src/data/updates.json` |
| 改标题、署名、评价标准、同档规则 | `rank/src/data/site.json` |
| 上传自己的封面和详情照片 | `rank/public/images/places/` |
| 固定各城市的边框和地图颜色 | `rank/src/data/site.json` 的 `cityColors` |
| 地址与地图位置 | `rank/src/data/places.json` 的 `location` |
| 商圈店铺一览、营业与主营依据 | `rank/src/data/shop-directories.json`；遵循 [固定维护规则](docs/shop-directory-rules.md) |

最简流程：上传图片 → 修改 JSON → 推送到 `main` → Actions 自动记录档内顺序调整并部署 → 打开榜单确认。无需手动生成排名更新记录或改组件代码。也可以直接把条目、评价与图片交给 Agent 更新。

### 按城市填写

`places.json` 现在使用 `{ "上海": [店铺对象], "广州": [] }`，店铺内部不填写 `city`。全站同档仍共用 `order` 排序，不同城市也不能出现同档重复顺序。

已移除 `pros`、`cons`、`coverAlt`、`isDemo`、`video`。优点不足直接写在 `details`；封面说明自动从城市和店名生成；`location` 可先填文字地址。

完整可复制模板、图片路径、坐标和更新记录说明见 [城市归档填写指南](docs/city-data.md)。JSON 请保存为 UTF-8。

## 活动相册与主站文件结构

每场原始图片、视频与唯一元数据混放在 `content/activities/日期：活动名称/`，Agent 维护其中的 `event.json`；无需重复配置表。保留稳定 ID 和日期原文，主题支持 acg、sports、art、travel、life，每场只有一个主要主题。

全部记录在 `activities.html`；各栏目通过 `?topic=主题` 进入相应列表。`anime.html` 只显示三场可关闭的二次元预览，rank 入口也只看二次元。其他栏目可用普通分享链接引用同场活动，无需复制记录。

- 新增活动、改分类：`content/activities/日期：活动名称/event.json`。
- 改页面内容和栏目入口：根目录 HTML。
- 改主站样式、交互：`assets/css/`、`assets/js/`；rank 继续在自己的项目内修改。
- 自动输出：`assets/generated/activities/manifest.json` 与 `media/`；最终部署目录 `_site/`，两者不提交。

完整结构、模板、预览和验证命令见 [活动记录维护](docs/activities.md)。在 rank 构建后，在根目录执行 `node scripts/assemble-site.mjs`、`node scripts/verify-activities.mjs`、`node scripts/preview-site.mjs`。组装不发布约 1.5 GB 的活动原素材，只使用优化后的网页图片与转码视频，并复用增量缓存。

## 开发与验证

使用 **Node.js 24 LTS** 和 npm；CI 使用相同主版本。Vue 3 + TypeScript + Vite，无后端、数据库或账号系统。TypeScript 固定为与 Vue 类型检查器兼容的 5.9.3，依赖锁文件已提交。

```sh
cd rank
npm ci
npm run dev
```

开发地址：`http://127.0.0.1:5173/bltbSch_201.github.io/rank/`。

图片总榜和现场图集自动使用 320/640px WebP 预览，进入可视区域才加载。点击照片后先显示预览并请求 1280px 网页大图，原图可通过单独入口打开；加载失败可重试。视频只显示封面，点击后才创建播放器并请求优化后的 MP4，原视频也有单独入口。原始图片和视频保持不变，完整内容导出仍使用原图。

`npm run dev` 和 `npm run build` 自动运行 `prepare:media`，为已公开条目的封面、图集和视频生成预览（无封面的视频自动提取首帧）。预览和索引分别位于忽略的 `rank/public/images/previews/` 与 `rank/src/data/media-previews.json`，无需手动提交或填写缩略图路径；构建产物会带上预览。修改素材后重新启动开发服务或构建。生成使用 [Sharp](https://sharp.pixelplumbing.com/api-resize/) 和随 npm 依赖安装的 FFmpeg，无需额外安装系统工具。

```sh
npm run validate:data
npm test
npm run build
npm run preview
```

构建依次运行 JSON/内容校验、Vue/TypeScript 类型检查、Vite 构建。预览地址：`http://127.0.0.1:4173/bltbSch_201.github.io/rank/`。

浏览器检查使用已安装的 Microsoft Edge：`npm run test:browser`。没有 Edge 的环境可安装 Playwright Chromium 并把 `playwright.config.ts` 的 `channel` 配置移除。检查包含空榜单、测试条目、隐藏数据、详情直达/刷新/返回、筛选恢复、375/768/1440px 无溢出、两种 PNG 导出、分页、错误提示和重试。虚构测试数据仅写到忽略的 `.fixture-app/`，不修改正式 JSON、不进入部署产物。截图与实际导出文件在 `rank/test-results/evidence/`。

导出使用独立 Canvas 版式，宽 1200px、单页高不超过 3000px，按完整卡片行分页。等待字体和同源图片载入后生成 PNG，每页单独下载，手机可长按图片保存。默认导出当前筛选，也可选择全榜。单条名称最长 160 字，城市 80 字，短评 600 字；长篇内容请放 `details`。

## 首次 Pages 部署和以后自动发布

1. 仓库默认分支是 `main`。在 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
2. 推送 `.github/workflows/deploy.yml` 和完整代码、锁文件到 `main`。也可在 Actions 手动运行 **Deploy personal site and ranking to Pages**。
3. 工作流安装 Node 24、执行 `npm ci`、单元测试、内容校验、类型检查和构建，然后运行 `scripts/assemble-site.mjs`。
4. 合并输出到 `_site/`：保留主站页面、assets 和公开 images，新榜单放在 `_site/rank/`。活动原始素材 `content/activities/` 不进入部署目录；组装后执行活动验收。
5. Pages 上传与部署作业完成并显示绿色成功后，再访问实际站点确认。只有部署作业拥有 `pages: write` 与 `id-token: write`。

Vite 默认 base 为 `/bltbSch_201.github.io/rank/`；CI 从 `configure-pages` 返回的真实 `base_path` 推导路径。图片、脚本、CSS 和详情链接都支持仓库子路径，详情使用 `#/place/稳定ID`，刷新不需要服务端路由。

当前默认域名免费，无需购买 DNS 服务。自定义域名需要先拥有该域名，不能任意修改 GitHub 的 `github.io` 域名。购买后通常使用注册商提供的 DNS 管理，在仓库 Pages 设置里填写域名并按 [GitHub 自定义域名文档](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site) 设置解析、确认 HTTPS，再重新运行工作流。绑定会影响此仓库的**整个个人站点**；榜单仍在 `/rank/`，操作前应确定期望的域名范围。

## 访问统计、QA 和留言

新增 `/rank/qa/` 收集建议，`/rank/#guestbook` 是榜单页底留言入口，跳转作者 B 站主页私信；建议仍通过 GitHub Issues 提交并跟进。三个榜单页面的页脚接入不蒜子访问次数，打开或刷新计一次，不做 IP 去重。

配置、计数范围、管理方式和验证说明见 [社区功能说明](docs/community.md)。

## 排错与回退

- **Actions 数据校验失败**：日志会显示 JSON 文件、条目 ID 和原因。检查重复 ID、档位 ID、同档 `order`、真实日期、缺图路径、更新记录引用和改档前后档位。修复后正常提交。
- **构建报错**：先确认 Node 24，再运行 `npm ci` 和 `npm run build`。不要跳过数据或类型校验。
- **空白页/素材 404**：核对 Pages Source 为 GitHub Actions、部署已成功，检查实际网址包含 `/rank/`。切域名或改仓库名后重新构建，不能直接移动旧产物。
- **导出失败**：按提示检查图片是否已提交、路径是否正确；只支持仓库内同源素材，修复后重新生成。
- **旧内容仍显示**：查看 Actions 是否有失败或等待审批，等待成功后刷新浏览器。工作流文件存在不代表已上线。
- **回退内容**：在 GitHub 编辑器把错误字段改回并提交，或本地执行 `git revert <需要撤销的提交>` 后正常推送。不要强推或重写历史，下一次成功部署即发布回退版本。
- **增加原站其他文件类型**：`scripts/assemble-site.mjs` 保留已跟踪的静态文件，新增特殊扩展名时在白名单补充；assets、images 与根目录 HTML 在本地预览中也包含尚未提交的文件。

实现时核对的官方资料：[Vue 快速开始](https://vuejs.org/guide/quick-start.html)、[Vite Pages 部署](https://vite.dev/guide/static-deploy.html#github-pages)、[GitHub 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。
