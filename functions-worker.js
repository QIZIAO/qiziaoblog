const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

const htmlHeaders = {
  "content-type": "text/html; charset=utf-8",
  "cache-control": "public, max-age=60"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: jsonHeaders });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function markdownToHtml(markdown) {
  const lines = String(markdown ?? "").replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let paragraph = [];
  let list = [];
  let inCode = false;
  let code = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${inlineMarkdown(escapeHtml(paragraph.join("\n")).replace(/\n/g, "<br>"))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (!list.length) return;
    html.push(`<ul>${list.map((item) => `<li>${inlineMarkdown(escapeHtml(item))}</li>`).join("")}</ul>`);
    list = [];
  };

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      if (inCode) {
        html.push(`<pre><button class="copy-code-button" type="button">复制</button><code>${escapeHtml(code.join("\n"))}</code></pre>`);
        code = [];
        inCode = false;
      } else {
        flushParagraph();
        flushList();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      code.push(line);
      continue;
    }
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }
    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      const title = heading[2].replace(/[`*_#[\]()]/g, "").trim();
      html.push(`<h${level} id="${escapeHtml(headingId(title))}">${inlineMarkdown(escapeHtml(heading[2]))}</h${level}>`);
      continue;
    }
    const listItem = trimmed.match(/^[-*]\s+(.+)$/);
    if (listItem) {
      flushParagraph();
      list.push(listItem[1]);
      continue;
    }
    flushList();
    paragraph.push(trimmed);
  }
  if (inCode) html.push(`<pre><button class="copy-code-button" type="button">复制</button><code>${escapeHtml(code.join("\n"))}</code></pre>`);
  flushParagraph();
  flushList();
  return html.join("\n");
}

function headingId(title) {
  return slugify(title).replace(/^post-/, "section-");
}

function inlineMarkdown(value) {
  return value
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, `<img src="$2" alt="$1">`)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, `<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>`);
}

function tableOfContents(content) {
  return String(content ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim().match(/^#{2,3}\s+(.+)$/))
    .filter(Boolean)
    .slice(0, 12)
    .map((match) => match[1].replace(/[`*_#[\]()]/g, "").trim())
    .filter(Boolean);
}

function readingMinutes(content) {
  const text = String(content ?? "").replace(/```[\s\S]*?```/g, "").replace(/[^\p{L}\p{N}\u4e00-\u9fa5]/gu, "");
  return Math.max(1, Math.ceil(text.length / 420));
}

function slugify(title) {
  const ascii = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return ascii || `post-${Date.now().toString(36)}`;
}

function imageExtension(file) {
  const type = String(file?.type || "").toLowerCase();
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  if (type.includes("gif")) return "gif";
  return "jpg";
}

async function listPosts(env) {
  const raw = await env.BLOG_POSTS_KV.get("posts:index");
  const posts = raw ? JSON.parse(raw) : [];
  return enrichPosts(env, posts
    .filter((post) => post.status !== "draft" && post.status !== "hidden")
    .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || String(b.date).localeCompare(String(a.date))));
}

async function listAllPosts(env) {
  const raw = await env.BLOG_POSTS_KV.get("posts:index");
  const posts = raw ? JSON.parse(raw) : [];
  return enrichPosts(env, posts.sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || String(b.date).localeCompare(String(a.date))));
}

async function rawPostIndex(env) {
  const raw = await env.BLOG_POSTS_KV.get("posts:index");
  return raw ? JSON.parse(raw) : [];
}

async function enrichPosts(env, posts) {
  return Promise.all(posts.map(async (post) => ({
    ...post,
    views: await readNumber(env, `views:${post.slug}`),
    likes: await readNumber(env, `likes:${post.slug}`)
  })));
}

async function savePosts(env, posts) {
  await env.BLOG_POSTS_KV.put("posts:index", JSON.stringify(posts));
}

async function readList(env, key) {
  const raw = await env.BLOG_POSTS_KV.get(key);
  return raw ? JSON.parse(raw) : [];
}

async function writeList(env, key, value) {
  await env.BLOG_POSTS_KV.put(key, JSON.stringify(value));
}

async function readNumber(env, key) {
  const raw = await env.BLOG_POSTS_KV.get(key);
  return raw ? Number(raw) || 0 : 0;
}

async function increment(env, key) {
  const value = await readNumber(env, key) + 1;
  await env.BLOG_POSTS_KV.put(key, String(value));
  return value;
}

async function checkRateLimit(env, key, limit, windowSeconds) {
  const now = Math.floor(Date.now() / 1000);
  const raw = await env.BLOG_POSTS_KV.get(key);
  const state = raw ? JSON.parse(raw) : { count: 0, resetAt: now + windowSeconds };
  if (now > state.resetAt) {
    state.count = 0;
    state.resetAt = now + windowSeconds;
  }
  state.count += 1;
  await env.BLOG_POSTS_KV.put(key, JSON.stringify(state), { expirationTtl: windowSeconds + 60 });
  return state.count <= limit;
}

function clientKey(request, scope) {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "local";
  return `rate:${scope}:${ip}`;
}

async function renderPost(post, env) {
  const body = markdownToHtml(post.content);
  const toc = tableOfContents(post.content);
  const posts = await listPosts(env);
  const currentIndex = posts.findIndex((item) => item.slug === post.slug);
  const previous = currentIndex >= 0 ? posts[currentIndex + 1] : null;
  const next = currentIndex > 0 ? posts[currentIndex - 1] : null;
  const related = posts
    .filter((item) => item.slug !== post.slug)
    .map((item) => ({
      post: item,
      score: Number(item.category === post.category) + (item.tags || []).filter((tag) => (post.tags || []).includes(tag)).length
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.post);

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="${escapeHtml(post.summary)}">
    <link rel="canonical" href="https://qiziaoblog.cc.cd${escapeHtml(post.url)}">
    <meta property="og:title" content="${escapeHtml(post.title)} | 七子傲">
    <meta property="og:description" content="${escapeHtml(post.summary)}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="https://qiziaoblog.cc.cd${escapeHtml(post.url)}">
    ${post.cover ? `<meta property="og:image" content="${escapeHtml(post.cover.startsWith("http") ? post.cover : `https://qiziaoblog.cc.cd${post.cover}`)}">` : ""}
    <meta name="twitter:card" content="summary_large_image">
    <title>${escapeHtml(post.title)} | 七子傲</title>
    <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
    <link rel="stylesheet" href="/assets/styles.css?v=20260528-glass4">
    <link rel="stylesheet" href="/assets/post.css?v=20260528-glass4">
  </head>
  <body>
    <header class="site-header">
      <a class="brand" href="/" aria-label="七子傲首页">
        <img src="/assets/logo-mark.svg" alt="" width="34" height="34">
        <span>七子傲</span>
      </a>
      <nav class="nav" aria-label="主导航">
        <a href="/writing.html">文章</a>
        <a href="/projects.html">作品</a>
        <a href="/about.html">关于</a>
        <a href="/guestbook.html">留言</a>
        <a href="/uses.html">工具</a>
      </nav>
      <button class="theme-toggle" type="button" aria-label="切换深浅色模式" aria-pressed="false">
        <span class="theme-toggle-icon" aria-hidden="true"></span>
      </button>
    </header>
    <main class="article-shell">
      <div class="reading-progress" aria-hidden="true"><span id="reading-progress-bar"></span></div>
      <article class="article glass-article">
        <a class="back-link" href="/writing.html">返回文章</a>
        <p class="eyebrow">${escapeHtml(post.category)}</p>
        <h1>${escapeHtml(post.title)}</h1>
        <p class="article-meta">${escapeHtml(post.date)} · 约 ${readingMinutes(post.content)} 分钟阅读 · 更新于 ${escapeHtml(post.updatedAt || post.date)} · <span data-view-count>${Number(post.views || 0)}</span> 次浏览 · <span data-like-count>${Number(post.likes || 0)}</span> 次喜欢</p>
        ${post.cover ? `<img class="article-cover" src="${escapeHtml(post.cover)}" alt="">` : ""}
        <div class="article-actions" aria-label="文章操作">
          <button class="small-button favorite-button" type="button" data-favorite-title="${escapeHtml(post.title)}">收藏文章</button>
          <button class="small-button copy-link-button" type="button">复制链接</button>
        </div>
        ${toc.length ? `<nav class="article-toc" aria-label="文章目录"><strong>目录</strong>${toc.map((item) => `<a href="#${escapeHtml(headingId(item))}">${escapeHtml(item)}</a>`).join("")}</nav>` : ""}
        ${body}
        <nav class="article-neighbors" aria-label="上一篇和下一篇">
          ${previous ? `<a href="${escapeHtml(previous.url)}"><span>上一篇</span><strong>${escapeHtml(previous.title)}</strong></a>` : `<span class="disabled"><span>上一篇</span><strong>没有更早的文章</strong></span>`}
          ${next ? `<a href="${escapeHtml(next.url)}"><span>下一篇</span><strong>${escapeHtml(next.title)}</strong></a>` : `<span class="disabled"><span>下一篇</span><strong>已经是最新文章</strong></span>`}
        </nav>
        ${related.length ? `<section class="related-posts" aria-labelledby="related-title"><div class="section-heading mini-heading"><div><p class="eyebrow">RELATED</p><h2 id="related-title">相关文章</h2></div></div><div>${related.map((item) => `<a href="${escapeHtml(item.url)}"><span>${escapeHtml(item.category)}</span><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.summary)}</p></a>`).join("")}</div></section>` : ""}
        <div class="article-like-panel">
          <button class="like-button heart-button" type="button" data-slug="${escapeHtml(post.slug)}" aria-label="给文章点赞">
            <span class="heart-icon" aria-hidden="true">♡</span>
            <span>喜欢</span>
            <strong>0</strong>
          </button>
        </div>
        <section class="comment-panel" aria-labelledby="comments-title" data-slug="${escapeHtml(post.slug)}">
          <div class="section-heading mini-heading">
            <div>
              <p class="eyebrow">COMMENTS</p>
              <h2 id="comments-title">评论</h2>
            </div>
          </div>
          <form class="comment-form">
            <input name="name" maxlength="24" placeholder="你的名字，可留空匿名">
            <textarea name="content" rows="4" maxlength="500" placeholder="写下你的想法" required></textarea>
            <button class="small-button" type="submit">提交评论</button>
          </form>
          <div class="comment-list"></div>
        </section>
      </article>
    </main>
    <button class="back-to-top" type="button" aria-label="返回顶部">↑</button>
    <script src="/assets/main.js?v=20260528-glass4"></script>
  </body>
</html>`;
}

async function adminPassword(env) {
  return await env.BLOG_POSTS_KV.get("admin:password") || env.ADMIN_PASSWORD;
}

async function requireAdmin(body, env) {
  const password = await adminPassword(env);
  return password && body && body.password === password;
}

async function handlePostsApi(request, env) {
  if (request.method === "GET") {
    return json({ posts: await listPosts(env) });
  }

  if (!(await adminPassword(env))) {
    return json({ error: "ADMIN_PASSWORD is not configured" }, 500);
  }

  const body = await request.json().catch(() => null);
  if (!(await requireAdmin(body, env))) {
    return json({ error: "密码错误，无法操作" }, 401);
  }

  if (request.method === "DELETE") {
    const slug = String(body.slug || "").trim();
    if (!slug) return json({ error: "缺少文章 slug" }, 400);
    const posts = (await rawPostIndex(env)).filter((post) => post.slug !== slug);
    await savePosts(env, posts);
    await env.BLOG_POSTS_KV.delete(`post:${slug}`);
    return json({ ok: true });
  }

  if (request.method !== "POST" && request.method !== "PUT") {
    return json({ error: "Method not allowed" }, 405);
  }

  const title = String(body.title || "").trim();
  const category = String(body.category || "").trim();
  const summary = String(body.summary || "").trim();
  const content = String(body.content || "").trim();
  const tags = String(body.tags || "")
    .split(/[,，]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 8);

  if (!title || !category || !summary || !content) {
    return json({ error: "标题、分类、摘要和正文都不能为空" }, 400);
  }

  const posts = await rawPostIndex(env);
  const editingSlug = String(body.slug || "").trim();
  let slug = editingSlug || slugify(title);
  if (!editingSlug) {
    const slugBase = slug;
    let index = 2;
    while (posts.some((post) => post.slug === slug)) {
      slug = `${slugBase}-${index}`;
      index += 1;
    }
  }

  const post = {
    slug,
    title,
    category,
    tags,
    summary,
    content,
    cover: String(body.cover || "").trim(),
    status: ["published", "draft", "hidden"].includes(String(body.status)) ? String(body.status) : "published",
    pinned: body.pinned === "true" || body.pinned === true || body.pinned === "on",
    date: String(body.date || "").trim() || new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString().slice(0, 10),
    url: `/p/${slug}`
  };

  await env.BLOG_POSTS_KV.put(`post:${slug}`, JSON.stringify(post));
  const item = {
    slug: post.slug,
    title: post.title,
    date: post.date,
    category: post.category,
    tags: post.tags,
    summary: post.summary,
    cover: post.cover,
    status: post.status,
    pinned: post.pinned,
    updatedAt: post.updatedAt,
    url: post.url
  };
  const nextPosts = posts.filter((existing) => existing.slug !== slug);
  nextPosts.unshift(item);
  await savePosts(env, nextPosts);

  return json({ post }, editingSlug ? 200 : 201);
}

async function handlePostDetail(request, env, slug) {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
  const raw = await env.BLOG_POSTS_KV.get(`post:${slug}`);
  if (!raw) return json({ error: "文章不存在" }, 404);
  return json({ post: JSON.parse(raw) });
}

async function handleStats(request, env, slug) {
  if (request.method === "POST") {
    const views = await increment(env, `views:${slug}`);
    const likes = await readNumber(env, `likes:${slug}`);
    return json({ views, likes });
  }
  const views = await readNumber(env, `views:${slug}`);
  const likes = await readNumber(env, `likes:${slug}`);
  return json({ views, likes });
}

async function handleLikes(request, env, slug) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const likes = await increment(env, `likes:${slug}`);
  return json({ likes });
}

async function handleComments(request, env, slug) {
  const key = `comments:${slug}`;
  if (request.method === "GET") {
    return json({ comments: await readList(env, key) });
  }
  if (request.method === "DELETE") {
    const body = await request.json().catch(() => null);
    if (!(await requireAdmin(body, env))) return json({ error: "密码错误，无法删除" }, 401);
    const id = String(body.id || "");
    await writeList(env, key, (await readList(env, key)).filter((comment) => comment.id !== id));
    return json({ ok: true });
  }
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!(await checkRateLimit(env, clientKey(request, `comments:${slug}`), 5, 600))) {
    return json({ error: "提交太频繁了，稍后再试" }, 429);
  }
  const body = await request.json().catch(() => null);
  const name = (String(body?.name || "").trim() || "匿名").slice(0, 24);
  const content = String(body?.content || "").trim().slice(0, 500);
  if (!name || !content) return json({ error: "名字和评论不能为空" }, 400);
  const comments = await readList(env, key);
  const comment = { id: crypto.randomUUID(), name, content, date: new Date().toISOString() };
  comments.unshift(comment);
  await writeList(env, key, comments.slice(0, 100));
  return json({ comment }, 201);
}

async function handleGuestbook(request, env) {
  const key = "guestbook:index";
  if (request.method === "GET") {
    return json({ messages: await readList(env, key) });
  }
  if (request.method === "DELETE") {
    const body = await request.json().catch(() => null);
    if (!(await requireAdmin(body, env))) return json({ error: "密码错误，无法删除" }, 401);
    const id = String(body.id || "");
    await writeList(env, key, (await readList(env, key)).filter((message) => message.id !== id));
    return json({ ok: true });
  }
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!(await checkRateLimit(env, clientKey(request, "guestbook"), 5, 600))) {
    return json({ error: "提交太频繁了，稍后再试" }, 429);
  }
  const body = await request.json().catch(() => null);
  const name = String(body?.name || "").trim().slice(0, 24);
  const content = String(body?.content || "").trim().slice(0, 500);
  if (!name || !content) return json({ error: "名字和留言不能为空" }, 400);
  const messages = await readList(env, key);
  const message = { id: crypto.randomUUID(), name, content, date: new Date().toISOString() };
  messages.unshift(message);
  await writeList(env, key, messages.slice(0, 120));
  return json({ message }, 201);
}

async function handleAdminVerify(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const body = await request.json().catch(() => null);
  if (!(await requireAdmin(body, env))) return json({ error: "密钥错误" }, 401);
  return json({ ok: true });
}

async function handleAdminModeration(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const body = await request.json().catch(() => null);
  if (!(await requireAdmin(body, env))) return json({ error: "密钥错误" }, 401);
  const posts = await listAllPosts(env);
  const comments = [];
  for (const post of posts) {
    const items = await readList(env, `comments:${post.slug}`);
    items.forEach((comment) => comments.push({ ...comment, postSlug: post.slug, postTitle: post.title }));
  }
  const messages = await readList(env, "guestbook:index");
  const dashboard = {
    posts: posts.length,
    published: posts.filter((post) => (post.status || "published") === "published").length,
    drafts: posts.filter((post) => post.status === "draft").length,
    hidden: posts.filter((post) => post.status === "hidden").length,
    views: posts.reduce((sum, post) => sum + Number(post.views || 0), 0),
    likes: posts.reduce((sum, post) => sum + Number(post.likes || 0), 0),
    comments: comments.length,
    messages: messages.length
  };
  const autosave = await env.BLOG_POSTS_KV.get("autosave:editor", "json");
  return json({ posts, messages, comments, dashboard, autosave });
}

async function handleAdminPassword(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const body = await request.json().catch(() => null);
  if (!(await requireAdmin({ password: body?.password }, env))) return json({ error: "当前密码错误" }, 401);
  const nextPassword = String(body?.nextPassword || "").trim();
  if (nextPassword.length < 8) return json({ error: "新密码至少 8 位" }, 400);
  await env.BLOG_POSTS_KV.put("admin:password", nextPassword);
  return json({ ok: true });
}

async function handleImageUpload(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!env.IMAGES) return json({ error: "R2 图片存储未配置。请先在 Cloudflare 启用 R2，并绑定 bucket 为 IMAGES。" }, 501);
  const form = await request.formData().catch(() => null);
  const password = String(form?.get("password") || "");
  if (!(await requireAdmin({ password }, env))) return json({ error: "密钥错误，无法上传图片" }, 401);
  const file = form.get("file");
  if (!file || typeof file.arrayBuffer !== "function") return json({ error: "请选择图片文件" }, 400);
  if (!String(file.type || "").startsWith("image/")) return json({ error: "只能上传图片文件" }, 400);
  if (file.size > 5 * 1024 * 1024) return json({ error: "图片不能超过 5MB" }, 400);
  const key = `uploads/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${imageExtension(file)}`;
  await env.IMAGES.put(key, await file.arrayBuffer(), {
    httpMetadata: {
      contentType: file.type || "application/octet-stream",
      cacheControl: "public, max-age=31536000, immutable"
    }
  });
  return json({ url: `/media/${key}`, key });
}

async function handleMediaLibrary(request, env) {
  if (!env.IMAGES) return json({ error: "R2 图片存储未配置" }, 501);
  const body = await request.json().catch(() => null);
  if (!(await requireAdmin(body, env))) return json({ error: "密钥错误，无法管理媒体库" }, 401);
  if (request.method === "DELETE") {
    const key = String(body.key || "").trim();
    if (!key.startsWith("uploads/")) return json({ error: "图片 key 无效" }, 400);
    await env.IMAGES.delete(key);
    return json({ ok: true });
  }
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const listed = await env.IMAGES.list({ prefix: "uploads/", limit: 100 });
  const files = listed.objects
    .sort((a, b) => String(b.uploaded || "").localeCompare(String(a.uploaded || "")))
    .map((item) => ({
      key: item.key,
      url: `/media/${item.key}`,
      size: item.size || 0,
      uploaded: item.uploaded || null
    }));
  return json({ files });
}

async function handleAutosave(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const body = await request.json().catch(() => null);
  if (!(await requireAdmin(body, env))) return json({ error: "密钥错误，无法自动保存" }, 401);
  const draft = {
    slug: String(body.slug || "").trim(),
    title: String(body.title || "").trim(),
    category: String(body.category || "").trim(),
    tags: String(body.tags || "").trim(),
    cover: String(body.cover || "").trim(),
    status: String(body.status || "draft"),
    pinned: body.pinned === "true" || body.pinned === true || body.pinned === "on",
    summary: String(body.summary || "").trim(),
    content: String(body.content || "").trim(),
    savedAt: new Date().toISOString()
  };
  await env.BLOG_POSTS_KV.put("autosave:editor", JSON.stringify(draft));
  return json({ autosave: draft });
}

async function handlePreviewToken(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const body = await request.json().catch(() => null);
  if (!(await requireAdmin(body, env))) return json({ error: "密钥错误，无法生成预览链接" }, 401);
  const slug = String(body.slug || "").trim();
  const raw = slug ? await env.BLOG_POSTS_KV.get(`post:${slug}`) : null;
  if (!raw) return json({ error: "请先保存文章，再生成预览链接" }, 400);
  const token = crypto.randomUUID();
  await env.BLOG_POSTS_KV.put(`preview:${token}`, slug, { expirationTtl: 3600 });
  return json({ url: `/preview/${slug}?token=${token}`, expiresIn: 3600 });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/posts") return handlePostsApi(request, env);
    if (url.pathname === "/api/guestbook") return handleGuestbook(request, env);
    if (url.pathname === "/api/admin/verify") return handleAdminVerify(request, env);
    if (url.pathname === "/api/admin/moderation") return handleAdminModeration(request, env);
    if (url.pathname === "/api/admin/password") return handleAdminPassword(request, env);
    if (url.pathname === "/api/admin/images") return handleImageUpload(request, env);
    if (url.pathname === "/api/admin/media") return handleMediaLibrary(request, env);
    if (url.pathname === "/api/admin/autosave") return handleAutosave(request, env);
    if (url.pathname === "/api/admin/preview-token") return handlePreviewToken(request, env);
    if (url.pathname.startsWith("/api/posts/")) {
      const parts = url.pathname.split("/").filter(Boolean);
      const slug = parts[2];
      const action = parts[3];
      if (!action) return handlePostDetail(request, env, slug);
      if (action === "stats") return handleStats(request, env, slug);
      if (action === "likes") return handleLikes(request, env, slug);
      if (action === "comments") return handleComments(request, env, slug);
    }

    if (url.pathname.startsWith("/p/")) {
      const slug = url.pathname.slice(3).replace(/\/$/, "");
      const raw = await env.BLOG_POSTS_KV.get(`post:${slug}`);
      if (!raw) {
        return env.ASSETS.fetch(new Request(new URL("/404.html", url), request));
      }
      const post = JSON.parse(raw);
      if (post.status === "draft" || post.status === "hidden") {
        return env.ASSETS.fetch(new Request(new URL("/404.html", url), request));
      }
      const enriched = { ...post, views: await readNumber(env, `views:${post.slug}`), likes: await readNumber(env, `likes:${post.slug}`) };
      return new Response(await renderPost(enriched, env), { headers: htmlHeaders });
    }

    if (url.pathname.startsWith("/preview/")) {
      const slug = url.pathname.slice("/preview/".length).replace(/\/$/, "");
      const token = url.searchParams.get("token") || "";
      const allowedSlug = token ? await env.BLOG_POSTS_KV.get(`preview:${token}`) : "";
      if (allowedSlug !== slug) return env.ASSETS.fetch(new Request(new URL("/404.html", url), request));
      const raw = await env.BLOG_POSTS_KV.get(`post:${slug}`);
      if (!raw) return env.ASSETS.fetch(new Request(new URL("/404.html", url), request));
      const post = JSON.parse(raw);
      const enriched = { ...post, views: await readNumber(env, `views:${post.slug}`), likes: await readNumber(env, `likes:${post.slug}`) };
      return new Response(await renderPost(enriched, env), { headers: htmlHeaders });
    }

    if (url.pathname.startsWith("/media/")) {
      if (!env.IMAGES) return new Response("R2 image storage is not configured", { status: 501 });
      const key = url.pathname.slice("/media/".length);
      const object = await env.IMAGES.get(key);
      if (!object) return new Response("Not found", { status: 404 });
      return new Response(object.body, {
        headers: {
          "content-type": object.httpMetadata?.contentType || "application/octet-stream",
          "cache-control": object.httpMetadata?.cacheControl || "public, max-age=31536000"
        }
      });
    }

    return env.ASSETS.fetch(request);
  }
};
