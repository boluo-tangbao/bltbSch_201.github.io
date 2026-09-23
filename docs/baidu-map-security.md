# 百度地图接入与 AK 安全

站点使用百度地图 JavaScript API。访客无需登录百度账号；调用身份属于站点开发者。

## 必做：限制浏览器端 AK

1. 在百度地图开放平台创建“浏览器端”AK。
2. 在 AK 设置中开启 JavaScript API，并配置 Referer 白名单，只允许正式站点域名 `boluo-tangbao.github.io`。页面路径 `/bltbSch_201.github.io/rank/` 不属于域名部分，无需单独作为域名填写。
3. 本地调试建议使用单独的开发 AK，并只允许 `localhost` / `127.0.0.1`；不要把正式 AK 放宽到任意来源。
4. 定期查看调用统计和配额告警；发现异常时轮换 AK。

浏览器端 AK 会随页面请求发送，无法靠前端代码隐藏。Referer 白名单才是防止复制后在其他网站使用的关键限制。

## 本地开发

复制 `rank/.env.example` 为 `rank/.env.local`，填写：

```env
VITE_BAIDU_MAP_AK=你的本地开发AK
```

`.env.local` 已被 `.gitignore` 的 `*.local` 规则忽略，不会进入 Git。

## GitHub Pages 部署

在 GitHub 仓库的 Settings → Secrets and variables → Actions 中创建：

- `BAIDU_MAP_AK`：正式浏览器端 AK。

部署工作流会在构建时读取 Secret。需要注意：构建后的浏览器代码仍会包含浏览器端 AK，因此必须同时配置 Referer 白名单。

## 更高安全模式（可选）

代码也支持 `VITE_BAIDU_MAP_PROXY_URL`。部署百度官方兼容的反向代理，并把该地址保存为同名 GitHub Secret 后，页面将通过代理加载 JS API，不再直接携带 AK。代理端还应校验来源域名、限流并记录异常调用。
