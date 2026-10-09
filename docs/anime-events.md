# 活动记录维护

## 页面结构

- activities.html：独立的活动记录页，默认收录全部二次元和生活活动。
- activities.html?topic=acg：只展示二次元主题，筛选、数量和单场相册均限制在二次元记录；从 anime 和 rank 进入此视图。
- activities.html?topic=life：只展示其他生活活动。
- activities.html#event/活动ID：单场相册，可以直接分享、刷新。
- anime.html：二次元介绍和最近三场二次元活动预览，不存放完整相册。把 event-preview 的 data-preview-count 改成 0 即可隐藏整块预览，顶部二次元活动入口仍保留。
- index.html 的“活动记录”：链接到全部记录。

## 素材与分类

素材继续混放在原 images/anime/events/ 的每场活动文件夹里，照片和视频不用分开，保留原文件名；现阶段不需要搬目录。其他生活活动也可按相同方式加入。文件夹格式为“日期：活动名称”，不要求地点。精确日期显示 YYYY-MM-DD，时间范围保留原文。

scripts/anime-events.config.mjs 手动维护网站分类和稳定 ID。每条配置为 [文件夹, ID, 分类, 主题]；主题 acg 表示二次元，life 表示其他生活。当前 18 场均属二次元，省略第四项默认为 acg；新增生活活动必须显式填写 life。分类为简短文字，可新增“旅行与出游”“生活日常”等，页面自动生成筛选按钮。记录必须先确认主题归属，不根据照片猜填。ID 不随名称变更。

## 生成与发布

node scripts/prepare-anime-events.mjs 生成缩略图、1600px 大图、视频封面及 H.264 MP4；生成位置为 images/anime/event-web/ 和 data/activities.json，原素材不改动。纯视频活动使用视频封面。

先在 rank/ 运行 npm run build，再在根目录运行 node scripts/assemble-site.mjs。发布流程会自动生成并打包网页素材，排除大体积原素材。node scripts/preview-site.mjs 提供完整本地预览；node scripts/verify-anime-events.mjs 验收页面及主题隔离。

验收包括：anime 只展示三场二次元预览且跳转独立页；全部页可收录生活活动；二次元视图不混入生活活动，包括直接输入生活记录 ID；分类、年份、时间范围、纯视频、照片放大、视频关闭、键盘操作、分享刷新、rank 入口和手机布局。
