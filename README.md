# 七子傲个人博客

这是 `qiziaoblog.cc.cd` 的个人博客静态网站，可以直接部署到 Cloudflare Pages 免费托管。

## 本地预览

```powershell
python -m http.server 8788
```

然后访问 `http://localhost:8788`。

## Cloudflare Pages 部署

1. 把 `D:\wangzhan` 目录上传到 GitHub 新仓库。
2. 打开 Cloudflare Dashboard，进入 `Workers & Pages`。
3. 选择 `Create application`，再选择 `Pages`，连接你的 GitHub 仓库。
4. 构建设置：
   - Framework preset: `None`
   - Build command: 留空
   - Build output directory: `/`
5. 部署完成后，在 Pages 项目的 `Custom domains` 添加 `qiziaoblog.cc.cd`。
6. 如果 Cloudflare 提示添加 DNS 记录，按提示添加 CNAME 到 Pages 默认域名。

## 写新文章

1. 在 `posts` 目录新建一个 `.html` 文件。
2. 复制现有文章模板并修改标题、日期和内容。
3. 打开 `assets/posts.js`，把新文章加入 `window.BLOG_POSTS` 数组。

## 后续可扩展

- RSS 订阅
- 标签和归档页
- Markdown 写作流程
- 评论区
- Cloudflare Web Analytics

## 动态功能

当前动态功能使用 Cloudflare Pages Functions + KV：

- 管理员发布、编辑、删除文章
- 文章评论
- 访客留言
- 点赞和浏览量

后续如果要更强的查询、审核、批量管理，可以把评论和文章迁移到 Cloudflare D1；如果要上传图片和附件，可以接 Cloudflare R2；如果要自动化部署，可以把本目录推到 GitHub 并在 Cloudflare Pages 里连接仓库。
