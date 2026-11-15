# 圣地巡礼维护

第一版入口为 pilgrimage.html，日本旅行页与二次元页链接到同一页面。支持按作品／地点、搜索、地区筛选、作品详情、共用地点详情、场景与实拍对照、多次到访、图片放大及稳定分享链接。第一版不含整页地图、自动路线规划或外部资料同步。

## 正式记录与演示

正式资料位于 assets/data/pilgrimage.json，目前为空。?demo=1 读取独立的 pilgrimage-demo.json，所有示例作品、地点、到访与代码绘制图片均明确标记为虚构，不混入个人记录。关闭演示返回正式资料。

## 关联规则

- works：作品，填写稳定 id、title，可有 description 和 cover。
- places：真实地点，填写稳定 id、name，按实际资料填写 region、city、address、description；可填 coordinates 的 lat／lng，前台才出现地图直达入口。
- scenes：作品场景，通过 workId、placeId 关联。可填 episode、timecode、caption、reference。matches 中的 visitId／photoId 关联同一地点的一次到访照片。
- visits：每次到访独立记录，填写 id、placeId、dateLabel 和 photos，可填真实 date、note；照片须有本次到访内唯一 id。

作品与地点通过场景多对多关联，地点不为不同作品重复建立。再次到访增加 visit，不复制地点。ID 不随标题修改，作品链接为 #work/ID，地点链接为 #place/ID，分享链接不带搜索筛选；演示分享保留 demo=1。

## 图片与来源

图片对象填写 preview、full 和 alt，caption 可选；作品画面 reference 可附 sourceLabel、sourceUrl，前台在场景旁展示出处。不得把示例、网图或动画截图冒充本人实拍，也不虚构集数、时间点、日期或坐标；缺项留空，页面显示待补。

preview／full 引用站内网页素材。新增真实图片仍须按 docs/visual-assets.md 生成 480px 缩略图和 1600px 查看图，检查清晰度与来源后再登记；可以复用活动中已生成的同一组网页图片，不重复上传。当前尚无独立巡礼原图生成器，正式资料为空，不能把原图路径直接当预览图填写。现阶段媒体提交与构建仍遵守仓库现有流程，不代表原件归档迁移已完成。

## 验证

资料校验由 assets/js/pilgrimage-data.js 共用，组装网站前验证正式清单的唯一 ID、关联、到访日期、图片路径、坐标等。模型测试为 rank/tests/pilgrimage.test.mjs；浏览器检查正式空状态、演示退出、两类列表、搜索／地区、详情直达／刷新／后退、重复到访、图片放大、390／768／1440px 与日本旅行入口。
