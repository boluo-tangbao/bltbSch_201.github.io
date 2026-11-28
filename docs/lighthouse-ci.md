# Lighthouse CI 性能检测

工作流在 Push、Pull Request 或手动触发时构建榜单、组装 `_site/`，通过本地预览审计本次提交的页面。每个 URL 分别用 Lighthouse 移动默认配置和桌面预设连续运行三次。每项指标单独取三次有效测量的中位数，用原精度与预算比较。预算为 Performance ≥ 90、LCP ≤ 2.5 秒、CLS ≤ 0.1、TBT ≤ 200 毫秒。

Actions Summary 按设备和页面展示指标、未达标项及 Lighthouse 诊断。每次审计的 HTML、JSON、断言和摘要可从当次运行的 `lighthouse-reports` 附件下载，保留 14 天。性能预算使用 Lighthouse CI 的 `warn` 级别。构建、浏览器或报告不完整会使性能作业失败，便于排错。性能作业独立于发布工作流。

## 本地复测

在仓库根目录用 PowerShell 和 Node.js 24 执行。已经生成同一版本的 `_site/` 时可直接从安装 Lighthouse CI 的命令开始。

```powershell
$env:SITE_BASE = '/bltbSch_201.github.io/rank/'
npm --prefix rank ci
npm --prefix rank run build
$env:SITE_BASE = '/bltbSch_201.github.io/'
node scripts/assemble-site.mjs

$env:LHCI_TOOLS_DIR = Join-Path $env:TEMP 'pages-lighthouse'
npm install --prefix $env:LHCI_TOOLS_DIR --no-audit --no-fund @lhci/cli@0.16.0
$env:CHROME_PATH = 'C:\Path\To\chrome.exe'
node scripts/lighthouse/run.mjs
```

把 `CHROME_PATH` 设置为本机 Chrome 或 Chromium 的可执行文件路径。报告写入 `test-results/lighthouse/run-*/`。可为运行脚本传入已有服务的完整基址，如 `node scripts/lighthouse/run.mjs http://127.0.0.1:4180/bltbSch_201.github.io/`。

## 迁移到其他 Pages 项目

复制 `scripts/lighthouse/` 和 Lighthouse 工作流。按新站点修改 `config.mjs` 的页面清单，替换工作流中的构建步骤，并把新站点预览服务的完整基址传给 `run.mjs`。当前仓库的预览服务在省略基址时使用。页面配置使用相对路径，支持根域名和仓库子路径。预算、运行次数、报告生成与站点构建分离。 [Lighthouse CI 配置文档](https://github.com/GoogleChrome/lighthouse-ci/blob/v0.16.0/docs/configuration.md)

## 修改前性能基线

2026-11-27 对提交 `407b8ac` 重新构建的 `_site/` 实测。环境为 Windows、无头 Chrome 139、Lighthouse CI 0.16.0 和 Lighthouse 13.6.0。预览使用项目的 Pages 子路径与本地 HTTP 服务，含 Lighthouse 默认模拟节流。本地服务的响应和线上 Pages 的压缩、CDN、缓存及第三方服务可用性存在差异。榜单构建未注入部署用的百度地图配置。与后续数据比较时建议使用相同浏览器和运行环境。

原始记录位于本地 `test-results/lighthouse-baseline-407b8ac/` 的 `mobile/.lighthouseci/` 和 `desktop/.lighthouseci/`，每次运行分别保存 HTML 和 JSON。下面的路径相对于站点基址。

| 设备 | 页面 | 路径 | 有效运行 | Performance | LCP | CLS | TBT | 未达标项目 |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| 移动端 | 首页 | / | 3/3 | 100 | 1.36 s | 0.000 | 6.5 ms | 达标 |
| 移动端 | 逛店榜单 | rank/ | 3/3 | **57** | **9.70 s** | 0.000 | 132.5 ms | Performance、LCP |
| 移动端 | 商圈地图 | rank/guide/ | 3/3 | **61** | **6.31 s** | 0.000 | 97.0 ms | Performance、LCP |
| 移动端 | 城市指南 | rank/cities/ | 3/3 | 100 | 1.29 s | 0.000 | 39.0 ms | 达标 |
| 移动端 | 活动记录 | activities.html | 3/3 | 98 | 1.36 s | 0.092 | 0.5 ms | 达标 |
| 移动端 | 文体生活 | culture.html | 3/3 | 91 | **3.04 s** | **0.109** | 45.0 ms | LCP、CLS |
| 移动端 | 二次元 | anime.html | 3/3 | 100 | 1.29 s | 0.000 | 18.0 ms | 达标 |
| 移动端 | 旅行 | travel.html | 3/3 | **81** | **5.11 s** | 0.000 | 25.0 ms | Performance、LCP |
| 移动端 | 广州旅行手记 | guangzhou-travel.html | 3/3 | 96 | 2.38 s | 0.080 | 0.0 ms | 达标 |
| 移动端 | 日本旅行 | japan-travel.html | 3/3 | 91 | 1.51 s | **0.188** | 17.6 ms | CLS |
| 桌面端 | 首页 | / | 3/3 | 95 | 1.53 s | 0.000 | 0.0 ms | 达标 |
| 桌面端 | 逛店榜单 | rank/ | 3/3 | 90 | 1.65 s | 0.000 | 24.0 ms | 达标 |
| 桌面端 | 商圈地图 | rank/guide/ | 3/3 | 92 | 1.50 s | 0.001 | 17.0 ms | 达标 |
| 桌面端 | 城市指南 | rank/cities/ | 3/3 | 100 | 0.31 s | 0.000 | 0.0 ms | 达标 |
| 桌面端 | 活动记录 | activities.html | 3/3 | **77** | 0.78 s | **0.588** | 0.0 ms | Performance、CLS |
| 桌面端 | 文体生活 | culture.html | 3/3 | 98 | 0.66 s | 0.091 | 0.0 ms | 达标 |
| 桌面端 | 二次元 | anime.html | 3/3 | 99 | 0.68 s | 0.074 | 0.0 ms | 达标 |
| 桌面端 | 旅行 | travel.html | 3/3 | 99 | 0.91 s | 0.000 | 0.0 ms | 达标 |
| 桌面端 | 广州旅行手记 | guangzhou-travel.html | 3/3 | **78** | 0.49 s | **0.612** | 0.0 ms | Performance、CLS |
| 桌面端 | 日本旅行 | japan-travel.html | 3/3 | **80** | 0.37 s | **0.445** | 0.0 ms | Performance、CLS |

### 主要瓶颈与优化建议

1. **移动端榜单和商圈地图的首屏渲染。** 榜单 LCP 9.70 秒，三次范围 9.48–11.81 秒。LCP 是「南京路百联」卡片封面，现有高优先级设置生效，初始 HTML 中仍无法发现该图。商圈地图 LCP 6.31 秒，候选元素是「从全国，到一座城」标题。两页在首屏都请求约 262 KiB 的浏览模块、215 KiB 的素材索引模块和 124 KiB 的共享模块，均为资源原始体积。建议让默认首屏卡片和封面在初始文档可发现，延后载入仅在详情及打开原图时使用的数据，并用报告验证拆分首屏与工具面板样式的效果。
2. **桌面端异步内容进入后发生位移。** 广州手记 CLS 0.612，活动记录 0.588，日本旅行 0.445。日本旅行移动端也达到 0.188。报告分别标出手记主内容、活动列表区和日本旅行索引或出处区发生移动。建议为活动筛选与首排、手记首张图文、地图和说明区预留与最终状态相符的空间，或在组装时输出稳定的首屏结构。日本旅行可用占位容器维持原字节照片策略。
3. **移动端旅行和文体生活的封面发现偏晚。** 旅行页首张大佛寺封面使用懒加载，LCP 三次在 2.08–5.19 秒之间，中位数 5.11 秒，图片诊断估算该页约有 784 KiB 的传输缩减空间。建议将首屏确认为 LCP 的封面改为优先请求，校对 `sizes` 与实际显示宽度，其余封面继续按需加载。文体生活的首屏活动封面要等约 153 KiB 的活动清单到达才插入，移动端 LCP 为 3.04 秒、CLS 为 0.109。建议在构建时输出首条预览或先提供精简索引，并为预览卡片保留空间。

20 个组合中 8 个存在未达标指标，全部组合的 TBT 中位数均在目标内。上述体积和节省量来自本地 Lighthouse 诊断，实际收益需在改动后复测。
