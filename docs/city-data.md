# 按城市填写店铺

维护 `rank/src/data/places.json`。最外层以城市名称归档，每个城市对应一个店铺数组，店铺内部不用写 `city`。可先保留空城市数组，空城市不会显示在前台筛选里。

```json
{
  "上海": [
    {
      "id": "shanghai-shop-001",
      "name": "填写真实店名",
      "tier": "hang",
      "order": 10,
      "summary": "填写一句话评价",
      "details": "填写详细评价。\n换段继续写。",
      "tags": ["周边", "谷子"],
      "cover": null,
      "gallery": [],
      "visitedAt": null,
      "updatedAt": "2026-09-20",
      "published": false,
      "location": null
    }
  ],
  "广州": [],
  "苏州": [],
  "兰州": []
}
```

示例默认隐藏；替换真实内容、更新日期后再将 `published` 改为 `true`。全空榜单用 `{}`。同一城市新增店铺时复制完整 `{ ... }`，对象之间用英文逗号隔开；不要复制外层城市键。保存为 **UTF-8**，不要使用 ANSI/GBK。JSON 不能写注释，最后一个字段后面不加逗号。

## 内容填写清单

新增条目之前，先核对城市、店名、档位、全榜同档顺序、一句话评价、详细评价、图片路径、到访日期和地址。未知封面、到访日期或位置可用 `null`，详细评价暂缺可用空字符串；评级和实际更新日期由作者确定。城市颜色在 `site.json` 中固定，后续维护始终使用原来的店铺 ID。

## 日常字段

| 字段 | 用途 |
| --- | --- |
| `id` | 全站唯一，小写英文、数字、短横线；改名或移到其他城市时也保留 ID，旧链接和更新记录继续可用 |
| `name` | 店铺名称 |
| `tier` | `hang` 夯 / `top` 顶级 / `above` 人上人 / `npc` NPC / `bad` 拉完了 |
| `order` | 全榜同档的排序，越小越靠前，可用 10、20、30；即使城市不同，同档公开条目也不能重复 |
| `summary` | 一句话评价，最多 600 字 |
| `details` | 具体感受和评级理由；优点不足直接写在这里，换段用 `\n`；暂缺可写 `""` |
| `tags` | 标签数组，没有用 `[]` |
| `cover` | 封面相对路径，如 `"images/places/Shanghai/第一百货.jpg"`；没有用 `null` |
| `gallery` | 详情照片与视频数组，例如 `[{"src":"images/places/Shanghai/店内.jpg","alt":"店内陈列"}]`；没有用 `[]` |
| `visitedAt` | 到访日期 `"2026-09"` / `"2026-09-20"`，未知用 `null` |
| `updatedAt` | 实际更新日期，必须是完整年月日 |
| `published` | `true` 显示，`false` 隐藏；公开仓库里的隐藏内容仍然可被读取 |
| `location` | 文字地址、坐标对象或 `null`，见下文 |

已移除店铺顶层的 `pros`、`cons`、`coverAlt`、`isDemo`、`video`，不要再填写。优点不足写入 `details`，照片和视频写入 `gallery`。封面替代文字自动使用城市和店名；图库素材仍用 `alt` 提供具体说明。

介绍和小手记支持 `**加粗**`、`[red]标红[/red]`、`[large]稍大字号[/large]` 和 `[huge]超大字号[/huge]`，可组合，例如 `[red]**重点**[/red]`。完整内容导出保留这些样式。普通 HTML 标签按文字显示。

## 图集与页面入口

照片不填 `type` 时默认按图片处理；视频填写 `type: "video"`，使用本地 MP4 相对路径。`poster` 可指定图片封面，未提供时开发或构建会自动提取视频首帧。示例只说明格式，加入条目前需要放入实际文件：

```json
"gallery": [
  {
    "src": "images/places/Shanghai/店内.jpg",
    "alt": "店内货架",
    "group": "店铺内景"
  },
  {
    "type": "video",
    "src": "images/places/Shanghai/现场.mp4",
    "poster": "images/places/Shanghai/视频封面.jpg",
    "alt": "现场逛店视频",
    "group": "店铺内景"
  }
]
```

`group` 用于将照片与视频放进同一分类，没有填写时归入“现场记录”。来源素材可补充 `sourceName` 和 `sourceUrl`，用于展示出处；不要把宣传图或旧照片描述成作者当前实拍。既有选材与来源集中在 [店铺与素材来源](research-sources.md)。

- 总榜：`/bltbSch_201.github.io/rank/`。
- 地图与目录：`/bltbSch_201.github.io/rank/guide/`。
- 店铺详情：`/bltbSch_201.github.io/rank/guide/#/place/店铺ID`。

图片外框、城市图例、地图和导出统一使用 `site.json` 的城市颜色。同档按 `order` 保持全榜顺序。隐藏店铺不在页面展示，也不进入导出。

导出提供简洁 PNG、短评 PNG 和完整内容 HTML。完整 HTML 使用原图片并保留评价、图集、地址等内容，可离线阅读或打印；视频链接、导航和最新网站页面仍需要联网。

## 城市颜色

`rank/src/data/site.json` 的 `cityColors` 继续统一管理，城市名称与外层键完全一致，颜色必须有 `#`，不同城市不能相同：

```json
"cityColors": {
  "上海": "#b95b43",
  "广州": "#507ba2",
  "苏州": "#FF4500",
  "兰州": "#008000"
}
```

## 地址和地图

只知道地址时可以直接写：

```json
"location": "上海市黄浦区南京东路800号第一百货C馆"
```

地址会出现在详情和完整内容导出中。地图使用百度地图；只有文字地址时，加载地图后会尝试按城市和地址在线解析，失败时保留地址并允许重试。解析结果不会自动写回 JSON。百度地图配置见 [地图接入与 AK 使用](baidu-map-security.md)。

坐标确认后可改成以下对象（示例坐标仅说明格式，发布前替换真实值）：

```json
"location": {
  "lat": 31.23,
  "lng": 121.47,
  "coordinateSystem": "wgs84",
  "address": "填写准确地址"
}
```

手动填写的坐标必须是已确认的 WGS84 坐标，地图会将它转换为百度坐标。未知用 `null`；仅填写地址时可以使用上述在线解析。高德、腾讯或百度的坐标不能只改标签当作 WGS84。

## 更新记录与发布

`rank/src/data/updates.json` 仍是数组，用店铺 `id` 关联。同一天、同一类型的操作可以写成一个批次。

批量新增或批量更新内容使用 `placeIds`：

```json
[
  {
    "id": "places-added-20260923",
    "date": "2026-09-23",
    "type": "added",
    "placeIds": [
      "shanghai-shop-001",
      "shanghai-shop-002",
      "guangzhou-shop-001"
    ],
    "note": "首次加入榜单。"
  }
]
```

一次调整多个地点档位时使用 `changes`，每个地点分别记录原档位和新档位：

```json
[
  {
    "id": "ranking-adjusted-20260923",
    "date": "2026-09-23",
    "type": "tier-change",
    "changes": [
      {
        "placeId": "shanghai-shop-001",
        "fromTier": "top",
        "toTier": "hang"
      },
      {
        "placeId": "shanghai-shop-002",
        "fromTier": "top",
        "toTier": "above"
      }
    ],
    "note": "重新比较近期体验后统一调整排名。"
  }
]
```

如果地点仍在原档位，只是调整同档内的先后顺序，推送到 `main` 后由 Pages 工作流自动生成 `ranking-change` 批次记录并同步相关条目的 `updatedAt`，随后 Actions bot 会提交记录并继续本轮部署。无需手动运行 npm 命令或填写调整原因。

修改评价、图集或地图信息时把 `type` 写为 `edited`，同样可以使用 `placeIds`。可选填 `category`：`content` 显示“内容更新”，`gallery` 显示“图集更新”，`map` 显示“地图更新”；不填时显示“内容更新”。只更新一个地点时，旧的 `placeId` 单条格式仍然兼容；单次调档可继续在记录顶层填写 `placeId`、`fromTier`、`toTier`。同一批次不能重复填写相同地点，也不能同时混用单条和批量字段。

同步每个相关店铺的 `updatedAt`，更新记录不能晚于它。无需为城市另建更新文件。页面会把一个批次显示成一条时间线记录，但每个地点仍会独立获得“新增/升档/降档”徽章。

图片仍放 `rank/public/images/places/`，可以自行建城市子目录。路径不写 `public/`，文件名大小写必须一致。可选 `coverPosition: [50, 30]` 调整封面焦点。

本地在 `rank` 目录运行 `npm run validate:data`、`npm test`、`npm run build`。提交到 `main` 后等待 Actions 成功，榜单、地图、详情和导出都会读取同一份城市归档内容。

## 日常维护原则

评价标准和档位说明维护在 `site.json`，具体条目的档位理由写入 `details`。图集优先选择能支撑评价的现场素材，保留出处和适用时间。

重访后记录实际观察到的变化；升降档时注明原因，搬迁、停业、装修或活动结束按已核实的信息更新。普通错字修正无需单独占用最近更新。店铺一览和营业依据另遵守 [固定维护规则](shop-directory-rules.md)，不把旧研究记录当成当前已确认营业的结论。
