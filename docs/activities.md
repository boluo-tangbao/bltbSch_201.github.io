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

公开页面地址保持不变。`activities.html` 查看全部活动；`activities.html?topic=acg`、`?topic=sports`、`?topic=art`、`?topic=travel`、`?topic=life` 分别只查看二次元、体育、艺术、旅行、生活主题。每个主题视图的统计、类型、年份和相册均限制在该主题。

`activities.html#event/稳定ID` 可直接分享、刷新；加上 `?topic=acg` 等查询参数也可分享。跨主题引用使用不带 topic 的普通链接，例如艺术页可链接 `activities.html#event/euphonium-2025`；活动仍属于二次元。禁止复制记录或素材来实现交叉展示。旧 `anime.html#event/稳定ID` 自动跳到相应二次元相册，包括关闭预览时。

`anime.html` 默认只展示最近三场二次元预览，把 `.event-preview` 的 `data-preview-count="3"` 改成 `0` 即可关闭预览。二次元列表入口继续保留。体育、艺术、旅行页各有对应主题入口；rank 的活动入口仍指向二次元。

## 下次新增活动

1. 用户在 `content/activities/` 新建“日期：活动名称”文件夹，直接放入图片和视频；两者混放，不改原文件名，不压缩原文件。
2. Agent 核对活动名称、日期原文、唯一主要主题与活动类型，在该目录维护 `event.json`。主题不清楚时先询问，不根据照片内容猜分类。无需再填写第二份配置表。
3. Agent 生成、构建和验收；用户通过 GitHub Desktop 查看变更并提交，正常发布流程负责生成网页素材。

精确日期模板：

```json
{
  "id": "example-event-2026",
  "name": "活动名称",
  "date": "2026-10-09",
  "dateLabel": "2026-10-09",
  "topic": "acg",
  "category": "演出与聚会"
}
```

日期不确定时，`date` 填 `null`，`dateLabel` 保留以年份开头的原文（例如 `2025下半年`），不要补造具体日期。文件夹仍可使用这个原文。修改活动名称或移动活动文件夹时保持 `id` 不变，已有链接靠 ID 识别。

- `topic`：唯一主要主题，必须为 `acg`、`sports`、`art`、`travel` 或 `life`。整场活动的照片和视频继承该主题。动漫主题演奏会归二次元，艺术栏目可添加普通链接引用。
- `category`：主题内的活动类型，例如“快闪与联动”“展会”“演出与聚会”；可增加简短类型名，页面自动生成按钮。
- 可选 `cover`：本场图片或视频的原始文件名，不填则采用按文件名排序的第一个素材，视频会自动提取封面。
- 可选 `note`：个人感想，显示在相册标题下，纯文本。

支持 `.jpg`、`.jpeg`、`.png`、`.webp`、`.mp4`、`.mov`。活动目录自动扫描，缺失或错误的 `event.json`、重复 ID、无效日期、多个 topic 或封面找不到都会报错。每场元数据和原始素材均需要提交，包括 MP4 的现有 Git LFS 管理。

## 修改页面与样式

页面文案、栏目链接和预览数量在根目录 HTML 修改。共享主站样式在 `assets/css/style.css`，活动样式在 `assets/css/activities.css`；交互在 `assets/js/script.js`、`activities.js`、`anime-activities.js`。原有封面继续在 `images/`。rank 的组件和样式继续由 `rank/` 自己管理。

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

`verify-activities.mjs --static` 只执行元数据、逐场素材数量和部署排除检查。完整验收还覆盖全部活动、五主题隔离（额外主题使用测试响应，不写真实记录）、类型与年份、直接分享、旧链接、预览开关、图片放大、视频实际播放及关闭、返回列表、rank 入口、页面与资源访问和 390/768/1440px 布局。截图保存在忽略的 `test-results/activities/`。日常验收按当前元数据和原始素材动态检查。

GitHub Pages 工作流继续从 main 部署，使用通用脚本组装和验收；活动生成缓存可复用。用户只提交源码、元数据和原始素材，生成产物自动处理。店铺维护另遵守 [固定维护规则](shop-directory-rules.md)。
