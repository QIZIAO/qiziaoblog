# 七子傲个人博客

这是 `qiziaoblog.cc.cd` 的个人博客和轻量 CMS。站点部署在 Cloudflare Pages，动态数据使用 Cloudflare KV，图片使用 Cloudflare R2，代码托管在 GitHub。

线上地址：

- 主域名：https://qiziaoblog.cc.cd/
- GitHub：https://github.com/QIZIAO/qiziaoblog

## 当前功能

- 个人博客首页、文章归档、作品页、关于页、工具页、留言板
- 首页计算机科学风格动态视觉区
- Markdown 文章编辑器
- 实时预览、换行预览、代码块样式、复制代码按钮
- 编辑器工具栏：标题、加粗、列表、链接、代码块、插图
- 本地草稿保存和云端自动保存
- 封面图和文章插图上传到 Cloudflare R2
- 媒体库：查看、复制链接、删除图片
- 文章公开、草稿、隐藏、置顶
- 草稿/隐藏文章临时预览链接
- 文章目录、上一篇/下一篇、相关文章推荐
- 浏览量、点赞数、评论、留言
- 评论和留言基础限流防刷
- 管理后台仪表盘、文章筛选、留言/评论管理、管理员改密
- RSS、Sitemap、robots.txt、404 页面
- GitHub Actions 自动部署到 Cloudflare Pages

## 项目结构

```text
.
├── index.html              # 首页
├── writing.html            # 文章归档
├── projects.html           # 作品页
├── about.html              # 关于页
├── guestbook.html          # 留言板
├── uses.html               # 工具页
├── admin.html              # 管理后台
├── functions-worker.js     # Cloudflare Pages Functions / Worker 逻辑
├── assets/
│   ├── main.js             # 前端交互和后台 CMS 逻辑
│   ├── styles.css          # 全站样式
│   └── post.css            # 文章页样式
├── posts/                  # 静态示例文章
├── scripts/build.mjs       # 构建脚本
├── tests/site.test.mjs     # 站点测试
├── wrangler.toml           # Cloudflare 资源绑定
└── .github/workflows/      # GitHub Actions 自动部署
```

## 本地开发

安装依赖：

```powershell
npm install
```

运行测试：

```powershell
npm test
```

构建静态产物：

```powershell
npm run build
```

本地预览静态页面：

```powershell
python -m http.server 8788
```

然后访问：

```text
http://127.0.0.1:8788/
```

注意：本地静态预览不包含 Cloudflare KV/R2 动态接口。后台发布、评论、图片上传等功能需要部署到 Cloudflare Pages 后使用。

## Cloudflare 配置

`wrangler.toml` 当前绑定：

```toml
name = "qiziaoblog"
compatibility_date = "2026-05-27"
pages_build_output_dir = "dist"

[[kv_namespaces]]
binding = "BLOG_POSTS_KV"
id = "25049c6175f749d88137c34d7f79a9da"

[[r2_buckets]]
binding = "IMAGES"
bucket_name = "qiziaoblog-images"
```

Cloudflare Pages 需要配置 Secret：

```text
ADMIN_PASSWORD
```

这个值是后台管理员密钥。后台改密后，新密码会写入 KV 的 `admin:password`，并优先于 `ADMIN_PASSWORD`。

## GitHub 自动部署

仓库已包含 GitHub Actions 工作流：

```text
.github/workflows/deploy.yml
```

每次推送到 `master` 或 `main` 时会自动：

1. 安装依赖
2. 运行测试
3. 构建 `dist`
4. 部署到 Cloudflare Pages

GitHub 仓库需要配置 Actions Secrets：

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

当前 Cloudflare Account ID：

```text
514952191ab9259365944acef7a6654d
```

## 常用命令

手动部署：

```powershell
npm run build
npx wrangler pages deploy dist --project-name qiziaoblog --commit-dirty=true
```

推送到 GitHub 并触发自动部署：

```powershell
git add .
git commit -m "Update site"
git push
```

## 后台使用

后台地址：

```text
https://qiziaoblog.cc.cd/admin.html
```

后台可以：

- 新建、编辑、删除文章
- 保存草稿、隐藏文章、置顶文章
- 上传封面图和文章插图
- 管理媒体库
- 生成草稿预览链接
- 查看浏览量、点赞数、评论、留言
- 修改管理员密码

## 数据存储

- 文章索引、动态文章内容、评论、留言、点赞、浏览量、自动保存草稿：Cloudflare KV
- 封面图、文章插图：Cloudflare R2
- 静态页面和资源：Cloudflare Pages

## 备注

媒体库删除图片时，如果已发布文章还引用这张图，文章里的图片会失效。删除前建议确认图片没有被文章使用。
