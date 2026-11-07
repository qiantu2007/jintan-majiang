# 金坛麻将

常州金坛地方麻将 · 单机 + 联机。手机浏览器直接玩，可以装到桌面，断网也能打。

**开始玩：** https://qiantu2007.github.io/jintan-majiang/

当前版本 v2.6.0。这个仓库只存放网站的发布产物（压缩后的页面、离线缓存脚本、图标、音乐与语音），供 GitHub Pages 托管。

### 全网各网站嵌入支持 (Cross-Site Embedding)
各网站均可直接通过 `<iframe>` 嵌入正版游戏页面，无需部署服务器即可直接体验：
```html
<iframe src="https://qiantu2007.github.io/jintan-majiang/" width="100%" height="720" frameborder="0" allowfullscreen></iframe>
```

### 源码防盗与云端鉴权机制 (Anti-Theft & Cloud License)
- **代码不可脱离官方服务独立运行**：本仓库代码为生产环境编译打包产物，深度绑定官方云端鉴权微服务（Cloudflare Durable Objects），脱网或私自镜像运行将触发防盗机制锁定。
- **正版授权验证**：直接抓取、克隆或镜像部署至非授权域名的代码，在发牌与联机时均会触发正版保护锁屏。
- **版权声明**：© 2026 qiantu2007（金坛麻将） 版权所有，保留所有权利。严禁复制、镜像克隆、提取素材或用于任何商业用途。
