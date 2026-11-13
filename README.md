# 我的逛店体验榜

菠萝汤包scho 的中文个人榜单。店铺按城市归档，由作者维护真实体验。

2026-09-20 更新：店铺按城市分组，精简字段，详情以图文评价为主。完整填写示例见 [城市归档填写指南](docs/city-data.md)。

- 榜单：<https://boluo-tangbao.github.io/bltbSch_201.github.io/rank/>
- 地图与详细评价：<https://boluo-tangbao.github.io/bltbSch_201.github.io/rank/guide/>
- 站点首页：<https://boluo-tangbao.github.io/bltbSch_201.github.io/>
- 仓库：<https://github.com/boluo-tangbao/bltbSch_201.github.io>

根目录保留主站公开 HTML 页面；共享 CSS/JavaScript 位于 `assets/css/` 和 `assets/js/`，原始活动位于 `content/activities/`。榜单仍使用独立的 `rank/` Vue/Vite 项目，工作流将主站网页素材与榜单构建产物一起发布。

## 本地文件夹清理

预览、验收结束后，在仓库根目录运行 `node scripts/clean-generated.mjs` 查看清单，加 `--apply` 执行清理；默认保留媒体预览、原件、依赖和研究来源。具体范围、可选媒体缓存清理及重新预览说明统一见[本地文件结构](本地文件结构.md#清理本地副本)。

## 文档入口

2026-11-09后续重构方案：原始照片／视频本地归档并另行备份，GitHub 管理缩略图、压缩高清查看图、必要的网页视频和封面；云端构建仅依赖已提交的网页素材。此为目标方案，当前生成与忽略规则尚未切换；具体保存范围、阅读体验要求、迁移步骤及验收见 [素材归档与重构目标](docs/visual-assets.md#素材归档与重构目标2026-11-09)。

2026-11-04商圈对比：总榜与地图／详情页新增“商圈对比”，支持按城市、名称或标签选取最多3个公开地点，并排查看个人档位、短评、标签、常规店铺、进行中／即将开始快闪和日期；可只看不同项。地点固定附在各商圈名称下方，不参与差异筛选；对比面板不展示待核实线索或档期待核项。详情入口在有空位时预选当前商圈，选择在本机记住，可移除或清空。手机表格横向滚动并固定项目列。计数复用原店单规则，闭店和已结束活动不混入，店单未整理明确标示；不以店铺数量判胜负或推断实时库存。

2026-11-03商圈标签玩具：rank交互页面的左右背景留白加入可掉落、碰撞、抓取和点击的柔色胶囊，不增加页头高度，名称取已公开地点，颜色随原榜单档位同步。拖动不会误跳转，轻点进入详情；提供再掉一次与收起；按正文实际边界自适应两侧范围，窄屏空间不足时隐藏且不加载物理模块，保持首屏榜单可见。Matter.js模块按需加载，停稳／隐藏／收起后暂停或清理，系统减少动态效果时使用静态链接。维护位置与验收见[共享视觉规则](docs/visual-rules.md)。

2026-11-02分享与城市入口：地点详情提供带原短评、城市、日期与独立链接的图文分享和PNG；清单内新增“分享公开路线”，仅携带当前可用的公开地点／店名与顺序，排除行程名称、自填信息和出行设置，接收者预览后确认合并。组装时自动生成 `rank/cities/`、各城市及当前公开地点的独立介绍页、分享元信息和 `sitemap.xml`；数量随生产数据变化，不手改生成页面。见[分享与城市入口说明](docs/sharing-and-discovery.md)。

2026-11-02第一轮按需加载：`DeferredExport.vue` 在点击导出后才载入 `ExportPanel.vue`，榜单及行程内的导出共用此入口；`TripPlanner.vue` 保留选店与清单状态，打开行程面板后才载入 `TripJourney.vue`。通用等待界面位于 `DeferredFeature.vue`，可关闭；已关闭或卸载后，迟到的模块不会自动重新打开。浏览器可能缓存失败的模块请求，因此失败时明确提供“刷新页面”入口，刷新后可再次打开，清单继续保存在当前标签页。搜索数据保留完整。验收会断言首页／搜索／选店阶段不请求这两个功能包，并覆盖延迟关闭和失败恢复。首轮首页静态依赖 JavaScript 原始体积由约1086 KiB降至1010 KiB（不是压缩传输量或实测加载时间）。

2026-11-02第二轮按需加载：榜单与商圈指南共用 `DeferredDetail.vue`，选中地点后才加载 `PlaceDetail.vue` 及其店铺、图集等界面；全站搜索数据仍在首屏可用。详情地图通过 `DeferredAddressMap.vue` 延至距可视区域300px以内再加载，点击“周边”“怎么去”或占位区按钮也会立即加载；未浏览地图时不初始化地图服务。占位区按现有电脑／手机地图高度留出空间。详情继续支持链接直达、搜索命中定位、加载失败刷新恢复，指南页可继续调用详情的定位方法。验收覆盖点击与滚动两种加载路径和店铺直达定位。首页静态依赖 JavaScript 原始体积进一步降至约947 KiB，比首轮再减约63 KiB；数据、媒体原件和仓库历史不因此缩小。

视觉维护遵循 [共享视觉规则](docs/visual-rules.md)，颜色与控件变量集中在 `rank/src/design-system.css`。作者日常复核见 [待复核清单](docs/maintenance/review-queue.md)：在 `rank/` 运行 `npm run review:shops` 可按中国时区当天重新生成，也可传 `-- --date YYYY-MM-DD` 固定本轮日期。清单按已有营业确认结果处理：已确认门店不因来源或日期问题重复列为营业待核；来源日期与90天提醒只针对未确认部分。另列楼层补充、明确活动档期与停业待核任务，不更改店单或原核对日；不应把人工唯一笔记写进可重生成的清单。GitHub 发布验收也会将当日清单放入验收报告附件，供作者下载，不进入网站。

| 想了解什么 | 文档 |
| --- | --- |
| 项目目录、原件、生成副本与清理方法 | [本地文件结构](本地文件结构.md) |
| 新增城市的研究、谷店一览、现场图集与网图补充全流程 | [新增城市与商圈的完整工作方法](docs/city-expansion-workflow.md) · [研究工作单](docs/templates/city-research.md) |
| 填写店铺、图集、地图和更新记录 | [城市归档填写指南](docs/city-data.md) |
| 添加活动和维护相册 | [活动记录维护](docs/activities.md) |
| 接入 B 站视频、章节定位与手动加载 | [B 站章节播放器实施说明](docs/bilibili-chapters.md) |
| 店铺营业分类与原始依据保留要求 | [店铺一览固定维护规则](docs/shop-directory-rules.md) · [账号检索流程](docs/shop-account-research.md) |
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

每场原始图片、视频与唯一元数据混放在 `content/activities/日期：活动名称/`，Agent 维护其中的 `event.json`；无需重复配置表。保留稳定 ID 和日期原文，主题支持 acg、sports、art、travel、life、other（其他），每场只有一个主要主题。

全部记录在 `activities.html`；各栏目通过 `?topic=主题` 进入相应列表。`anime.html` 只显示三场可关闭的二次元预览，rank 入口也只看二次元。其他栏目可用普通分享链接引用同场活动，无需复制记录。

- 新增活动、改分类：`content/activities/日期：活动名称/event.json`。
- 改页面内容和栏目入口：根目录 HTML。
- 改主站样式、交互：`assets/css/`、`assets/js/`；rank 继续在自己的项目内修改。
- 自动输出：`assets/generated/activities/manifest.json` 与 `media/`；最终部署目录 `_site/`，两者不提交。

完整结构、模板、预览和验证命令见 [活动记录维护](docs/activities.md)。在 rank 构建后，在根目录执行 `node scripts/assemble-site.mjs`、`node scripts/verify-activities.mjs`、`node scripts/preview-site.mjs`。组装不发布约 1.5 GB 的活动原素材，只使用优化后的网页图片与转码视频，并复用增量缓存。

## 榜单视图与常用标签

地点卡片、地点详情及确认店铺可加入“本次逛店清单”。清单支持上移／下移、移除、复制与下载含地址、楼层、档期的 HTML，也可只导出所选地点的榜单；清单沿用手动顺序，榜单保留原排名。公开地点选择在当前标签页暂存，总榜／地图切换及刷新可继续，关闭标签页后清空。自填地址和备注仅放在当前页面内存，刷新／切换页面前需主动加密保存。

“本机行程”提供口令加密的命名保存、重命名、删除、恢复和加密文件备份／导入，最多20个行程、每个120项；不提供服务器存储或自动解锁。公开路线分享为独立、主动的操作，仅分享网站已收录的选择，不分享保存区或自填内容。恢复前核对当前店单，过期／停业／移除条目保留并提示，不参加路线和当前HTML导出；原存档不自动改写。恢复保留停留时长与出行偏好，重置出发时间、完成进度和通勤估算。行程地图与通勤查询需主动启用，自填地址不进入地图持久缓存。完整存储边界、口令遗失及测试说明见[行程隐私与本机保存](docs/trip-privacy.md)。

快闪按中国时区当前日期自动判断明确的开始／结束日，并同步店单计数、具体店名搜索及本次清单；到期退出当前可用路线，已选项目在“原计划中需调整”保留提示，不改写原始证据或停掉承办常设店。无结构化日期的档期保留原文，不猜年份。

榜单中的商场、商圈及独立店统一称“逛店地点”，按“处”统计；详情中的常规门店仍按“家”、快闪活动按“项”分别计数。搜索结果在图片卡片下方和地图地点目录中显示匹配原因，命中具体店铺时附所在地点及已知楼层；点击仍直达对应介绍／店铺，不改变排名及待核实折叠规则。店铺卡片底部的纠错入口自动带入上下文，详见[社区功能说明](docs/community.md)。

图片总榜标题旁提供始终可见的“紧凑／舒适”切换，默认保留紧凑图榜；舒适视图使用较大图片和图下店名，手机为两列，城市色框、档内排名、筛选和详情入口一致。浏览器会记住所选视图。

舒适视图复用地点详情标题下的 `summary` 短评：桌面和触屏均直接显示，不依赖悬停，键盘仍可聚焦卡片进入详情。紧凑视图仍沿用原布局。地点详情的“出发前留意”改为每个地点首次进入时弹窗展示，确认或Esc收起后在本浏览器记住当前提醒内容；提醒变化后下次进入重新提示。详情只保留小入口，可随时重看。弹窗汇总已确认常规门店及快闪阶段，并提示未来7天内开始／截止的已确认快闪，以及已有的装修停业、迁出旧址和停业待核历史。提醒可展开并定位对应店铺查看原位置及依据；先显示5条，每次再增5条。快闪卡片同步显示近期档期提示，结束日计入档期。提示使用中国时区日期，不从原文猜年份、不升级待核线索、不因核对日期较久降级已确认门店；原实访、核对及来源日期不因此修改。

常用标签按“扭蛋、同人、中古、寄售、手办模型、lolita”顺序显示，其他标签在默认折叠的“更多标签”中；榜单与地图页面共用，原始地点标签不变。常用顺序在 `rank/src/components/BrowseFilters.vue` 的 `preferredTags` 维护，视图样式在 `rank/src/browse.css`。地点标签下不再重复显示地图按钮，底部“怎么去”继续提供导航。

手机图片总榜保留城市和搜索入口，标签、商圈对比、导出、分享筛选与开始选店集中在默认收起的“筛选与工具”中；收起后仍显示已选标签，筛选结果不变。电脑端直接展示这些工具。图片卡片在榜单内打开原有详情，返回按钮及系统返回恢复原卡片位置、筛选与视图；地图仍有独立入口，搜索直达和旧详情链接继续可用。空清单时页尾入口不固定遮挡正文；开始选店或已有选择后再突出底部清单操作。

个人主页首屏提供逛店榜单、最近活动和生活记录三个照片入口；最近活动自动读取活动清单首条记录。角色相册位于旅游栏目之后，默认显示 6 位，可展开全部；入口样式与活动预览分别在 `assets/css/home.css`、`assets/js/home.js`，角色展开逻辑在 `assets/js/script.js`。

## 开发与验证

使用 **Node.js 24 LTS** 和 npm；CI 使用相同主版本。Vue 3 + TypeScript + Vite，无后端、数据库或账号系统。TypeScript 固定为与 Vue 类型检查器兼容的 5.9.3，依赖锁文件已提交。

```sh
cd rank
npm ci
npm run dev
```

开发地址：`http://127.0.0.1:5173/bltbSch_201.github.io/rank/`。

图片总榜和现场图集自动使用 320/640px WebP 预览，进入可视区域才加载。点击照片后先显示预览并请求 1280px 网页大图；加载失败可重试。视频只显示封面，点击后才请求优化后的 MP4。图片榜单与完整内容导出使用网页高清图，HTML 中的视频使用转码版。图片原件保留，“打开原图”在正式构建中打开对应 GitHub 固定版本文件页。视频原件按原路径归档于本地 `.local-media/video-originals/`，仓库中的 MP4 为普通 Git 管理的网页副本，“打开视频文件”提供站内副本。新增视频先运行 `node scripts/compress-local-videos.mjs`，再构建、提交。

`npm run dev` 和 `npm run build` 自动运行 `prepare:media`，为已公开条目的封面、图集和视频生成预览（无封面的视频自动提取首帧）。预览和索引分别位于忽略的 `rank/public/images/previews/` 与 `rank/src/data/media-previews.json`，无需手动提交或填写缩略图路径；构建产物会带上预览。修改素材后重新启动开发服务或构建。生成使用 [Sharp](https://sharp.pixelplumbing.com/api-resize/) 和随 npm 依赖安装的 FFmpeg，无需额外安装系统工具。

```sh
npm run validate:data
npm test
npm run build
npm run preview
```

构建依次运行 JSON/内容校验、Vue/TypeScript 类型检查、Vite 构建。预览地址：`http://127.0.0.1:4173/bltbSch_201.github.io/rank/`。

浏览器检查使用已安装的 Microsoft Edge：`npm run test:browser`。没有 Edge 的环境可安装 Playwright Chromium 并把 `playwright.config.ts` 的 `channel` 配置移除。检查包含空榜单、测试条目、隐藏数据、详情直达/刷新/返回、筛选恢复、375/768/1440px 无溢出、两种 PNG 导出、分页、错误提示和重试。虚构测试数据仅写到忽略的 `.fixture-app/`，不修改正式 JSON、不进入部署产物。截图与实际导出文件在 `rank/test-results/evidence/`。

导出使用独立 Canvas 海报版式：Day 粉白／Night 绿黑双色主题、窄体大标题、斜切档位条和城市色标，宽 1200px、单页高不超过 3000px，按完整卡片行分页。弹窗提供版式示意与生成后的实际分页预览；简洁排序图为三列、短评长图为两列，保留原始档内排名与完整名称／短评。等待字体和同源图片载入后生成 PNG，每页单独下载，手机可长按图片保存。默认导出当前筛选，也可选择全榜。单条名称最长 160 字，城市 80 字，短评 600 字；长篇内容请放 `details`。英文标题使用本地打包的 Barlow Condensed ExtraBold，来自 Google Fonts，许可保存在 `rank/src/assets/fonts/OFL-Barlow-Condensed.txt`，导出不依赖在线字体服务。

## 首次 Pages 部署和以后自动发布

1. 仓库默认分支是 `main`。在 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
2. 推送 `.github/workflows/deploy.yml` 和完整代码、锁文件到 `main`。也可在 Actions 手动运行 **Deploy personal site and ranking to Pages**。
3. 工作流安装 Node 24、执行 `npm ci`、单元测试、内容校验、类型检查和构建，然后运行 `scripts/assemble-site.mjs`。
4. 合并输出到 `_site/`：保留主站页面、assets 和公开 images，新榜单放在 `_site/rank/`。活动原始素材 `content/activities/` 不进入部署目录；组装后执行活动验收。
5. Pages 上传与部署作业完成并显示绿色成功后，再访问实际站点确认。只有部署作业拥有 `pages: write` 与 `id-token: write`。

2026-11-02自动验收：组装 `_site/` 后先执行 `node scripts/verify-published-site.mjs`，检查全部发布页面、HTML/CSS/模块引用、榜单媒体清单、原件固定版本入口、店铺出处与 900 MiB 体积预算。安装浏览器并完成主站／活动验收后，在 `rank/` 执行 `npm run test:acceptance`；只针对 `_site/`，按 1440／390／320px 检查全部公开地点，以及店单展开、图集、视频容器、搜索、行程和导出。任一验收失败则停止本次发布，原线上网站保留；清理临时素材与上传 Pages 均在验收后进行。

结果显示在 GitHub Actions 运行摘要；附件 `site-acceptance-report` 保留 7 天，包含资源报告、浏览器 HTML 报告和失败截图／操作 trace。下载后打开 `html/index.html` 查看测试步骤，详细截图和 trace 位于 `browser/`。诊断报告上传失败不会覆盖验收本身的结果。外部访问在核心浏览器验收中隔离，B 站仅检查本站播放器容器；第三方登录、实际路线、营业状态和外部服务实时可用性不算已验证，也不自动判为本站故障。本地先构建、组装，再运行上述两个命令即可复现；生成报告位于忽略提交的 `test-results/acceptance/`，不进入网站发布包。

上传前的空间维护：主站与活动验收成功后，`scripts/prepare-pages-upload.mjs --apply` 仅在 GitHub 托管运行机器内清理已用完的 `rank/dist`、`rank/public`、`content/activities` 和 `.git/lfs/objects` 临时副本，为上传操作生成的未压缩 tar 预留空间。`_site/` 与活动生成缓存保留，本地和 Git 仓库原件不受影响；本地运行不加参数只预览，`--apply` 会被拒绝。日志输出发布目录大小、释放量与磁盘余量，余量不足会提前报出明确错误。发布目录超过 Pages 文档的 1 GB 时另行提示，不自动压缩或移除公开原图／原视频。

组装时自动按已公开条目、媒体预览和角色清单筛选榜单素材：未引用的照片、旧像素头像、过期预览及系统文件不上传，`output/` 设计稿也不发布。2026-11-02原件分离：`prepare-media.mjs` 同时生成忽略提交的 `original-links.json`，核对原件与 HEAD 中的 Git blob／LFS SHA-256 一致，再生成固定提交版本的 GitHub 文件入口。只有同时有完整网页替代素材和原件入口的店铺媒体，才从 Pages 包中排除；未提交、已修改或缺少替代素材的原件保留站内副本，避免断链。地图备份、角色原画及全部本地原件保持原样。本轮实测发布目录由 1774 MiB 降至约 262 MiB，不需要新增存储账户。新增照片须先加入公开条目，单纯放进 `rank/public/images/places/` 不会出现在正式网站。

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

## Day / Night 访客风格

榜单、地图、QA、更新与行程页共用 Day version／Night version 切换，入口集中在控制台的“页面风格”区；导出弹窗显示当前沿用的风格。默认粉白 Day；绿黑 Night 为深色阅读配色。选择保存在浏览器并在同源页面间同步；禁用本地存储时仍可切换，但不保证刷新记忆。网页、弹窗示意、PNG 海报和 HTML 存档使用同一套主题，保留城市识别色、档位、照片及原排序。切换主题会释放旧导出结果，正在生成的导出会取消，避免当前配色与下载内容不一致。配色维护于 `rank/src/utils/themePalette.ts`，网页与弹窗适配位于 `rank/src/themes.css`。
