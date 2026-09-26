# 我的逛店体验榜

菠萝汤包scho 的中文个人榜单。店铺按城市归档，由作者维护真实体验。

2026-09-20 更新：店铺按城市分组，精简字段，详情以图文评价为主。完整填写示例见 [城市归档填写指南](docs/city-data.md)。

- 榜单：<https://boluo-tangbao.github.io/bltbSch_201.github.io/rank/>
- 地图与详细评价：<https://boluo-tangbao.github.io/bltbSch_201.github.io/rank/guide/>
- 站点首页：<https://boluo-tangbao.github.io/bltbSch_201.github.io/>
- 仓库：<https://github.com/boluo-tangbao/bltbSch_201.github.io>

根目录的个人主页、学习经历、项目经历与博客保持原样；新应用源代码在 `rank/`。工作流将原站静态文件和榜单构建产物一起发布。

## 下次更新，只需改这些文件

| 想做什么 | 文件 |
| --- | --- |
| 新增店铺、改评价、改档位与顺序 | `rank/src/data/places.json` |
| 记录新增、升档、降档、文案修改与原因 | `rank/src/data/updates.json` |
| 改标题、署名、评价标准、同档规则 | `rank/src/data/site.json` |
| 上传自己的封面和详情照片 | `rank/public/images/places/` |
| 固定各城市的边框和地图颜色 | `rank/src/data/site.json` 的 `cityColors` |
| 地址与地图位置 | `rank/src/data/places.json` 的 `location` |

最简流程：上传图片 → 修改 JSON → 推送到 `main` → Actions 自动记录档内顺序调整并部署 → 打开榜单确认。无需手动生成排名更新记录或改组件代码。也可以直接把条目、评价与图片交给 Agent 更新。

### 按城市填写

`places.json` 现在使用 `{ "上海": [店铺对象], "广州": [] }`，店铺内部不填写 `city`。全站同档仍共用 `order` 排序，不同城市也不能出现同档重复顺序。

已移除 `pros`、`cons`、`coverAlt`、`isDemo`、`video`。优点不足直接写在 `details`；封面说明自动从城市和店名生成；`location` 可先填文字地址。

完整可复制模板、图片路径、坐标和更新记录说明见 [城市归档填写指南](docs/city-data.md)。JSON 请保存为 UTF-8。

## 开发与验证

使用 **Node.js 24 LTS** 和 npm；CI 使用相同主版本。Vue 3 + TypeScript + Vite，无后端、数据库或账号系统。TypeScript 固定为与 Vue 类型检查器兼容的 5.9.3，依赖锁文件已提交。

```sh
cd rank
npm ci
npm run dev
```

开发地址：`http://127.0.0.1:5173/bltbSch_201.github.io/rank/`。

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
4. 合并输出到 `_site/`：保留原站已跟踪的静态页面与素材，新榜单放在 `_site/rank/`。不会上传整个源码目录。
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
- **增加原站其他文件类型**：`scripts/assemble-site.mjs` 保留已跟踪的静态文件，新增特殊扩展名时在白名单补充；提交后才会被复制。

实现时核对的官方资料：[Vue 快速开始](https://vuejs.org/guide/quick-start.html)、[Vite Pages 部署](https://vite.dev/guide/static-deploy.html#github-pages)、[GitHub 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。
