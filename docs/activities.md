# 活动记录维护

## 目录与入口

```text
/
├── index.html / sports.html / art.html / anime.html / travel.html
├── activities.html
├── content/activities/日期：活动名称/
│   ├── event.json
│   ├── 原始照片.jpg
│   └── 原始视频.mp4
├── assets/
│   ├── css/                 主站样式
│   ├── js/                  主站交互与活动展示
│   └── generated/activities/ 自动生成，忽略提交
│       ├── manifest.json
│       └── media/
├── images/                  原有主站封面等公开图片
├── scripts/                 扫描、生成、组装、预览和验收
├── docs/
├── rank/                    独立 Vue/Vite 项目
└── _site/                   自动生成的部署产物，忽略提交
```

公开页面地址保持不变。`activities.html` 查看全部活动；`activities.html?topic=acg`、`?topic=sports`、`?topic=art`、`?topic=travel`、`?topic=life` 分别只查看二次元、体育、艺术、旅行、生活主题；`?topic=other` 查看其他主题（如校招宣讲）。每个主题视图的统计、类型、年份和相册均限制在该主题。

`activities.html#event/稳定ID` 可直接分享、刷新；加上 `?topic=acg` 等查询参数也可分享。跨主题相册共用同一稳定 ID；例如《京吹》演奏记录可同时带二次元与艺术标签，从两个栏目进入同一相册，也可使用不带 topic 的普通分享链接。禁止复制记录或素材来实现交叉展示。旧 `anime.html#event/稳定ID` 自动跳到相应二次元相册，包括关闭预览时。

`anime.html` 默认只展示最近三场二次元预览，把 `.event-preview` 的 `data-preview-count="3"` 改成 `0` 即可关闭预览。二次元列表入口继续保留。体育、艺术、旅行页各有对应主题入口；rank 的活动入口仍指向二次元。

## 分享与继续浏览

活动总页以“全部活动／展览／快闪／演出／其他”的紧凑按钮作为主导航，下方独立筛选主题标签和年份。每场活动可带多个主题，总页按唯一 ID 计一次；二次元、艺术等栏目按标签引用同一场相册，日期、照片、视频与分享链接共用。旧 category 细分类和 topic 地址保持兼容。观影会、普通聚会、聚餐和宣讲归其他，卡片保留已有具体形式说明。

旅行页增加 japan-travel.html 日本旅行专题，包含旅程手记与 #pilgrimage 圣地巡礼分区；二次元页直接链接同一巡礼分区。不重复登记活动或复制照片。当前尚无整理后的日本旅行与巡礼内容，页面明确显示待整理状态。

每场相册的“复制活动链接”复制稳定 ID 地址，分享链接不带个人筛选条件；不能自动复制时显示可选择的链接文本。主题内类型、年份和全部页的主题筛选写入 URL，刷新后保留；从列表进入相册后，返回列表、浏览器后退和刷新可恢复筛选、浏览位置与卡片焦点。直接打开分享链接仍进入同一活动。

## 活动名称规范（2026-11-14）

新增和整理活动时由 Agent 一并规范标题，不要求用户先手改。统一显示名称与通用大小写，保留活动事实、日期原文、作者到场方式和稳定 ID。已登记活动优先修改 event.json 的 name，不为显示名称重命名原素材；新建且无引用的文件夹可同步规范。

- 快闪统一用“主体＋快闪”，例如“××快闪”，不混用“××的快闪”。地点作为必要前缀；合并记录的多个主体用“与”连接，不删减任何一项活动。
- 通用活动形式统一写 Live、FES、Only；中英文之间留一个空格。ChinaJoy、MyGO!、BUGSYSTEM 等已知专名保留其既有大小写。通用写法与明确的官方标题原文有冲突时保留原文，不凭风格猜改品牌或作品名称。
- 精确日期文件夹使用 YYYY-MM-DD：活动名称；不确定日期仍保留原文，不补造年月日。
- “散场凑热闹”“外场”“聚会”“饭后 Only”等保留真实到场方式，不能统一成正式入场看演出。人物、店名、作品名的疑似错字须有依据后再修正。

本轮五场待登记素材采用以下规范名称；原素材目录保留原名，登记 event.json 时使用对应规范标题（日期单独登记）：

| 原素材文件夹 | 规范日期与名称 |
| --- | --- |
| 2026-10-30：新国展上海乐器展 | 2026-10-30：新国展上海乐器展 |
| 2026-11-12：环球港黑魂2和BUGSYSTEM快闪 | 2026-11-12：环球港黑魂2与 BUGSYSTEM 快闪 |
| 2026-7-17：东体鸣潮live散场凑热闹 | 2026-07-17：东体鸣潮 Live 散场凑热闹 |
| 2026-7-31：鹰角fes期间的四平路玛格萝妮聚会+饭后only | 2026-07-31：鹰角 FES 期间四平路玛格萝妮聚会与饭后 Only |
| 2026-8-1：ChinaJoy | 2026-08-01：ChinaJoy |

## 下次新增活动

以下步骤描述当前仍在使用的流程。以后重构将按 [素材归档与重构目标](visual-assets.md#素材归档与重构目标2026-11-09) 改为原件本地归档、网页素材提交仓库；完成脚本、引用与云端构建迁移前，不提前忽略活动原素材目录。

1. 用户在 `content/activities/` 新建“日期：活动名称”文件夹，直接放入图片和视频；两者混放，不改原文件名，不压缩原文件。
2. 视频放入活动目录后，在仓库根目录运行 `node scripts/compress-local-videos.mjs`。脚本将原件按原路径备份到忽略提交的 `.local-media/video-originals/`，校验后用 H.264/AAC 网页副本替换活动目录内的视频，压缩清单保存在 `data/video-copies.json`。单个副本需小于 100 MiB，已登记副本再次构建时直接使用。商圈视频也由同一脚本处理。
3. Agent 核对活动名称、日期原文、适用的主题标签与活动类型，在该目录维护 `event.json`。主题不清楚时先询问，不根据照片内容猜分类。无需再填写第二份配置表。
4. Agent 生成、构建和验收；用户通过 GitHub Desktop 查看变更并提交，正常发布流程负责生成网页素材。

精确日期模板：

```json
{
  "id": "example-event-2026",
  "name": "活动名称",
  "date": "2026-10-09",
  "dateLabel": "2026-10-09",
  "topics": ["acg", "art"],
  "category": "演出"
}
```

日期不确定时，`date` 填 `null`，`dateLabel` 保留以年份开头的原文（例如 `2025下半年`），不要补造具体日期。文件夹仍可使用这个原文。修改活动名称或移动活动文件夹时保持 `id` 不变，已有链接靠 ID 识别。

- `topics`：非空主题标签数组，可同时含 acg（二次元）、art（艺术）等，允许交叉，无重复；完整取值为 acg、sports、art、travel、life、other。动漫主题演奏会可标 ["acg", "art"]。旧单值 topic 继续兼容，若同时填写须属于 topics；生成清单的 topic 仅供旧版本兼容，不再用于互斥分类。
- `category`：活动形式使用“展览”“快闪”“演出”“其他”，独立于主题标签；观影、普通聚会、聚餐、宣讲归其他。既有细分类按共享规则兼容读取；难以判断的旧混合分类在核对具体活动后调整。
- 可选 `cover`：本场图片或视频的原始文件名，不填则采用按文件名排序的第一个素材，视频会自动提取封面。
- 可选 `note`：个人感想，显示在相册标题下，纯文本。
- 可选 `previewImage`：活动内 `preview/` 子目录中的图片路径，如 `preview/bilibili-cover.jpg`。仅有 B 站链接时必填；其他活动可用来指定独立列表封面。自动生成 480px／1600px WebP，不作为相册照片计数；真实封面出处记在 `docs/visual-assets.md`。构建不联网取封面。
- 可选 `bvid`：B 站视频号，例如 `BV1h64z6YEmH`，在活动相册内嵌入播放器。只有 B 站视频的活动也可登记，列表使用 `previewImage` 生成的封面，进入相册后加载播放器。用户明确以 B 站替代本地视频时移除对应网页视频副本，照片保持原样。

支持 `.jpg`、`.jpeg`、`.png`、`.webp`、`.mp4`、`.mov`。活动目录自动扫描，缺失或错误的 `event.json`、重复 ID、无效日期、无效／重复主题标签或封面找不到都会报错。每场元数据、照片和压缩视频副本需要提交。视频原件保存在本地归档目录。

## 修改页面与样式

页面文案、栏目链接和预览数量在根目录 HTML 修改。共享主站样式在 `assets/css/style.css`，活动样式在 `assets/css/activities.css`；交互在 `assets/js/script.js`、`activities.js`、`anime-activities.js`；主题标签和形式规则由 `activity-topics.js`、`activity-categories.js` 共用。二次元与艺术页使用同一预览组件，分别指定 data-topic="acg" 和 data-topic="art"。原有封面继续在 `images/`。rank 的组件和样式继续由 `rank/` 自己管理。

## 生成、构建与验收

使用 Node.js 24 LTS。依赖继续由 `rank/package.json` 管理，不引入框架或重复安装：

```sh
cd rank
npm ci
npm run build
cd ..
node scripts/assemble-site.mjs
node scripts/verify-activities.mjs
node scripts/preview-site.mjs
```

单独更新活动可运行 `node scripts/prepare-activities.mjs`。生成清单位于 `assets/generated/activities/manifest.json`；480px 缩略图、1600px 大图、视频封面和 H.264 MP4 位于同目录的 `media/`。原素材保持字节不变。哈希使用原文件内容、格式和处理版本，未变素材跨目录迁移与 CI checkout 复用缓存；修改分类、名称或感想无需重新转码。改版前缓存自动复用，全部生成成功后清理失效缓存。

`assemble-site.mjs` 自动先生成活动，再清空并组装 `_site/`；只发布网页素材，不复制 `content/` 或旧活动原素材目录。主站本地新增尚未提交的资源也参与组装。不要直接编辑 `assets/generated/` 或 `_site/`。

`npm run dev` 在 rank 启动前也会生成活动，Vite 可访问主站页面、assets 与公开图片。完整部署预览默认为 `http://127.0.0.1:4180/bltbSch_201.github.io/`；使用 `SITE_BASE=/` 等环境变量可更改主站前缀。浏览器验收默认使用已安装的 Edge；Linux/CI 设置 `PLAYWRIGHT_CHANNEL=chromium` 并先安装 Playwright Chromium。

`verify-activities.mjs --static` 只执行元数据、逐场素材数量和部署排除检查。完整验收还覆盖全部活动、六主题隔离（额外主题使用测试响应，不写真实记录）、类型与年份、直接分享、旧链接、预览开关、图片放大、视频实际播放及关闭、返回列表、rank 入口、页面与资源访问和 390/768/1440px 布局。截图保存在忽略的 `test-results/activities/`。日常验收按当前元数据和原始素材动态检查。长期迁移基线保存于 [activity-migration-baseline.json](activity-migration-baseline.json)，不放临时测试目录；必要时追加 `--migration` 校验149个迁移原件的SHA-256，普通新增活动不更新或套用这份历史基线。2026-10-19整理前已存在差异：历史基线中的4张ChinaJoy照片不在现目录，现存145项哈希一致；保留原基线，不将完整迁移核验记为通过。

GitHub Pages 工作流继续从 main 部署，使用通用脚本组装和验收；活动生成缓存可复用。用户只提交源码、元数据和原始素材，生成产物自动处理。店铺维护另遵守 [固定维护规则](shop-directory-rules.md)。
