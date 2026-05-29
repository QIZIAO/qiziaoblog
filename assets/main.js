const year = document.querySelector("#year");
const postList = document.querySelector("#post-list");
const archiveList = document.querySelector("#archive-list");
const postSearch = document.querySelector("#post-search");
const tagFilters = document.querySelector("#tag-filters");
const archiveCount = document.querySelector("#archive-count");
const clearFilters = document.querySelector("#clear-filters");
const themeToggle = document.querySelector(".theme-toggle");
const readingProgressBar = document.querySelector("#reading-progress-bar");
const favoriteButton = document.querySelector(".favorite-button");
const copyLinkButton = document.querySelector(".copy-link-button");
const backToTop = document.querySelector(".back-to-top");
const csVisualCanvas = document.querySelector("#cs-visual-canvas");
const root = document.documentElement;
const storageKey = "qiziao-theme";
const favoriteKey = "qiziao-favorites";

function initCsVisual() {
  if (!csVisualCanvas) return;
  const ctx = csVisualCanvas.getContext("2d");
  if (!ctx) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const nodes = Array.from({ length: 34 }, (_, index) => ({
    x: (index * 97) % 760,
    y: (index * 151) % 820,
    vx: ((index % 5) - 2) * 0.18,
    vy: (((index + 2) % 5) - 2) * 0.16
  }));
  const resize = () => {
    const rect = csVisualCanvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    csVisualCanvas.width = Math.max(1, Math.floor(rect.width * ratio));
    csVisualCanvas.height = Math.max(1, Math.floor(rect.height * ratio));
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  };
  resize();
  window.addEventListener("resize", resize);
  function draw(time = 0) {
    const width = csVisualCanvas.clientWidth;
    const height = csVisualCanvas.clientHeight;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#080a10";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(49, 200, 255, 0.08)";
    for (let x = 0; x < width; x += 34) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 34) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    nodes.forEach((node) => {
      if (!reduceMotion) {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 18 || node.x > width - 18) node.vx *= -1;
        if (node.y < 18 || node.y > height - 18) node.vy *= -1;
      }
    });
    nodes.forEach((a, index) => {
      nodes.slice(index + 1).forEach((b) => {
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (distance < 150) {
          ctx.strokeStyle = `rgba(49, 200, 255, ${0.23 - distance / 760})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      });
    });
    nodes.forEach((node, index) => {
      const pulse = reduceMotion ? 1 : 1 + Math.sin(time / 450 + index) * 0.22;
      ctx.fillStyle = index % 4 === 0 ? "#9b8cff" : "#31c8ff";
      ctx.beginPath();
      ctx.arc(node.x, node.y, 3.8 * pulse, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = "rgba(217, 247, 255, 0.72)";
    ctx.font = "12px Consolas, monospace";
    ["class Node<T>", "while(queue.length)", "hash(key)", "return signal"].forEach((text, index) => {
      ctx.fillText(text, 34, 58 + index * 28);
    });
    if (!reduceMotion) requestAnimationFrame(draw);
  }
  draw();
}

initCsVisual();

function systemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function setTheme(theme, persist = true) {
  root.dataset.theme = theme;
  if (themeToggle) {
    const isDark = theme === "dark";
    themeToggle.setAttribute("aria-pressed", String(isDark));
    themeToggle.setAttribute("aria-label", isDark ? "切换到明色模式" : "切换到暗色模式");
  }
  if (persist) {
    localStorage.setItem(storageKey, theme);
  }
}

setTheme(localStorage.getItem(storageKey) || systemTheme(), false);

themeToggle?.addEventListener("click", () => {
  setTheme(root.dataset.theme === "dark" ? "light" : "dark");
});

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (!localStorage.getItem(storageKey)) {
    setTheme(systemTheme(), false);
  }
});

if (year) {
  year.textContent = new Date().getFullYear();
}

const posts = Array.isArray(window.BLOG_POSTS) ? window.BLOG_POSTS : [];
const state = {
  query: "",
  tag: "全部"
};
let allPosts = [...posts];

function postCard(post) {
  return `
    <a class="post-card" href="${post.url}">
      <div class="post-meta">
        <time datetime="${post.date}">${post.date}</time>
        <span>${post.category}</span>
      </div>
      <h3>${post.title}</h3>
      <p>${post.summary}</p>
      <div class="post-tags">${(post.tags || []).map((tag) => `<span>${tag}</span>`).join("")}</div>
      <div class="post-stats">
        <span>${Number(post.views || 0)} 次浏览</span>
        <span>${Number(post.likes || 0)} 次喜欢</span>
      </div>
      <span class="post-tag">阅读全文</span>
    </a>
  `;
}

if (postList) {
  const limit = Number(postList.dataset.limit || posts.length);
  postList.innerHTML = allPosts.slice(0, limit).map(postCard).join("");
  fetch("/api/posts")
    .then((response) => response.ok ? response.json() : { posts: [] })
    .then((data) => {
      const remotePosts = Array.isArray(data.posts) ? data.posts : [];
      const known = new Set(allPosts.map((post) => post.url));
      allPosts = [...remotePosts.filter((post) => !known.has(post.url)), ...allPosts];
      postList.innerHTML = allPosts.slice(0, limit).map(postCard).join("");
    })
    .catch(() => {});
}

function archiveItem(post) {
  return `
    <a class="archive-item" href="${post.url}">
      <div>
        <time datetime="${post.date}">${post.date}</time>
        <h2>${post.title}</h2>
        <p>${post.summary}</p>
        <div class="post-tags">${(post.tags || []).map((tag) => `<span>${tag}</span>`).join("")}</div>
      </div>
      <span>${post.category}</span>
    </a>
  `;
}

function matchesPost(post) {
  const query = state.query.trim().toLowerCase();
  const searchable = [
    post.title,
    post.date,
    post.category,
    post.summary,
    ...(post.tags || [])
  ].join(" ").toLowerCase();
  const matchesQuery = !query || searchable.includes(query);
  const matchesTag = state.tag === "全部" || post.category === state.tag || (post.tags || []).includes(state.tag);
  return matchesQuery && matchesTag;
}

function renderArchive() {
  if (!archiveList) return;
  const filtered = allPosts.filter(matchesPost);
  const groups = filtered.reduce((map, post) => {
    const year = String(post.date || "").slice(0, 4) || "未归档";
    if (!map.has(year)) map.set(year, []);
    map.get(year).push(post);
    return map;
  }, new Map());
  archiveList.innerHTML = filtered.length
    ? [...groups.entries()].map(([year, items]) => `
      <section class="archive-year">
        <div class="archive-year-heading">
          <h2>${year}</h2>
          <span>${items.length} 篇</span>
        </div>
        ${items.map(archiveItem).join("")}
      </section>
    `).join("")
    : `<div class="empty-state"><h2>没有找到文章</h2><p>换个关键词或清空筛选试试。</p></div>`;
  if (archiveCount) {
    archiveCount.textContent = `找到 ${filtered.length} 篇文章`;
  }
}

function renderTags() {
  if (!tagFilters) return;
  const tags = ["全部", ...new Set(allPosts.flatMap((post) => [post.category, ...(post.tags || [])]))];
  tagFilters.innerHTML = tags.map((tag) => `
    <button class="tag-button" type="button" data-tag="${tag}" aria-pressed="${tag === state.tag}">
      ${tag}
    </button>
  `).join("");
}

if (archiveList) {
  renderTags();
  renderArchive();
  fetch("/api/posts")
    .then((response) => response.ok ? response.json() : { posts: [] })
    .then((data) => {
      const remotePosts = Array.isArray(data.posts) ? data.posts : [];
      const known = new Set(allPosts.map((post) => post.url));
      allPosts = [...remotePosts.filter((post) => !known.has(post.url)), ...allPosts];
      renderTags();
      renderArchive();
    })
    .catch(() => {});
}

postSearch?.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderArchive();
});

tagFilters?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-tag]");
  if (!button) return;
  state.tag = button.dataset.tag;
  tagFilters.querySelectorAll(".tag-button").forEach((item) => {
    item.setAttribute("aria-pressed", String(item.dataset.tag === state.tag));
  });
  renderArchive();
});

clearFilters?.addEventListener("click", () => {
  state.query = "";
  state.tag = "全部";
  if (postSearch) postSearch.value = "";
  renderTags();
  renderArchive();
});

function favoriteSet() {
  try {
    return new Set(JSON.parse(localStorage.getItem(favoriteKey) || "[]"));
  } catch {
    return new Set();
  }
}

function saveFavorites(favorites) {
  localStorage.setItem(favoriteKey, JSON.stringify([...favorites]));
}

function updateFavoriteButton() {
  if (!favoriteButton) return;
  const favorites = favoriteSet();
  const url = location.pathname;
  const saved = favorites.has(url);
  favoriteButton.textContent = saved ? "已收藏" : "收藏文章";
  favoriteButton.setAttribute("aria-pressed", String(saved));
}

favoriteButton?.addEventListener("click", () => {
  const favorites = favoriteSet();
  const url = location.pathname;
  if (favorites.has(url)) {
    favorites.delete(url);
  } else {
    favorites.add(url);
  }
  saveFavorites(favorites);
  updateFavoriteButton();
});

updateFavoriteButton();

copyLinkButton?.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    copyLinkButton.textContent = "已复制";
    setTimeout(() => {
      copyLinkButton.textContent = "复制链接";
    }, 1600);
  } catch {
    copyLinkButton.textContent = "复制失败";
  }
});

function updateReadingProgress() {
  if (!readingProgressBar) return;
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0;
  readingProgressBar.style.width = `${Math.round(progress * 100)}%`;
}

window.addEventListener("scroll", () => {
  updateReadingProgress();
  if (backToTop) {
    backToTop.classList.toggle("is-visible", window.scrollY > 480);
  }
}, { passive: true });

backToTop?.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

updateReadingProgress();

const publishForm = document.querySelector("#publish-form");
const publishStatus = document.querySelector("#publish-status");
const resetEditor = document.querySelector("#reset-editor");
const adminPostList = document.querySelector("#admin-post-list");
const adminLoginForm = document.querySelector("#admin-login-form");
const adminLoginStatus = document.querySelector("#admin-login-status");
const adminDashboard = document.querySelector("#admin-dashboard");
const adminLogout = document.querySelector("#admin-logout");
const adminPostCount = document.querySelector("#admin-post-count");
const adminMessageCount = document.querySelector("#admin-message-count");
const adminMessageList = document.querySelector("#admin-message-list");
const adminCommentList = document.querySelector("#admin-comment-list");
const adminPasswordForm = document.querySelector("#admin-password-form");
const adminPasswordStatus = document.querySelector("#admin-password-status");
const markdownPreview = document.querySelector("#markdown-preview");
const coverUpload = document.querySelector("#cover-upload");
const contentImageUpload = document.querySelector("#content-image-upload");
const editorToolbar = document.querySelector(".editor-toolbar");
const adminPostSearch = document.querySelector("#admin-post-search");
const adminStatusFilter = document.querySelector("#admin-status-filter");
const adminPostBreakdown = document.querySelector("#admin-post-breakdown");
const adminFeedbackCount = document.querySelector("#admin-feedback-count");
const adminViewCount = document.querySelector("#admin-view-count");
const adminLikeCount = document.querySelector("#admin-like-count");
const autosaveStatus = document.querySelector("#autosave-status");
const previewPostButton = document.querySelector("#preview-post");
const mediaLibrary = document.querySelector("#media-library");
const refreshMedia = document.querySelector("#refresh-media");
const likeButton = document.querySelector(".like-button");
const commentPanel = document.querySelector(".comment-panel");
const guestbookForm = document.querySelector("#guestbook-form");
const guestbookList = document.querySelector("#guestbook-list");
const guestbookStatus = document.querySelector("#guestbook-status");
const revealTargets = document.querySelectorAll(".section, .page-hero, .post-card, .archive-item, .article");
const adminSessionKey = "qiziao-admin-key";
const editorDraftKey = "qiziao-editor-draft";
const adminPostState = {
  posts: [],
  query: "",
  status: "all"
};
let autosaveTimer = null;
let lastAutosavePayload = "";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function inlineMarkdown(value) {
  return value
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, `<img src="$2" alt="$1">`)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, `<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>`);
}

function markdownToHtml(markdown) {
  const lines = String(markdown ?? "").replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let paragraph = [];
  let list = [];
  let code = [];
  let inCode = false;
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
  lines.forEach((line) => {
    if (line.trim().startsWith("```")) {
      if (inCode) {
        html.push(`<pre><button class="copy-code-button" type="button">??</button><code>${escapeHtml(code.join("\n"))}</code></pre>`);
        code = [];
        inCode = false;
      } else {
        flushParagraph();
        flushList();
        inCode = true;
      }
      return;
    }
    if (inCode) {
      code.push(line);
      return;
    }
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }
    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      html.push(`<h${level}>${inlineMarkdown(escapeHtml(heading[2]))}</h${level}>`);
      return;
    }
    const item = trimmed.match(/^[-*]\s+(.+)$/);
    if (item) {
      flushParagraph();
      list.push(item[1]);
      return;
    }
    flushList();
    paragraph.push(trimmed);
  });
  if (inCode) html.push(`<pre><button class="copy-code-button" type="button">??</button><code>${escapeHtml(code.join("\n"))}</code></pre>`);
  flushParagraph();
  flushList();
  return html.join("") || `<p>????????????????</p>`;
}

function renderMarkdownPreview() {
  if (!markdownPreview || !publishForm) return;
  markdownPreview.classList.toggle("empty-state", !publishForm.elements.content.value.trim());
  markdownPreview.innerHTML = markdownToHtml(publishForm.elements.content.value);
}

function saveEditorDraft() {
  if (!publishForm) return;
  const draft = editorPayload();
  localStorage.setItem(editorDraftKey, JSON.stringify(draft));
  scheduleCloudAutosave();
}

function editorPayload() {
  if (!publishForm) return {};
  const payload = Object.fromEntries(new FormData(publishForm).entries());
  payload.pinned = publishForm.elements.pinned?.checked || false;
  return payload;
}

function scheduleCloudAutosave() {
  if (!localStorage.getItem(adminSessionKey)) return;
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(saveCloudAutosave, 1200);
}

async function saveCloudAutosave() {
  const payload = editorPayload();
  if (!payload.title && !payload.content) return;
  payload.password = localStorage.getItem(adminSessionKey);
  const serialized = JSON.stringify(payload);
  if (serialized === lastAutosavePayload) return;
  lastAutosavePayload = serialized;
  if (autosaveStatus) autosaveStatus.textContent = "正在云端自动保存...";
  const response = await fetch("/api/admin/autosave", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: serialized
  }).catch(() => null);
  if (autosaveStatus) {
    autosaveStatus.textContent = response?.ok ? `云端已自动保存：${new Date().toLocaleTimeString("zh-CN")}` : "云端自动保存失败，本地草稿仍已保存。";
  }
}

function fillEditor(post) {
  if (!publishForm || !post) return;
  publishForm.elements.slug.value = post.slug || "";
  publishForm.elements.title.value = post.title || "";
  publishForm.elements.category.value = post.category || "";
  publishForm.elements.tags.value = (post.tags || []).join(", ");
  publishForm.elements.cover.value = post.cover || "";
  publishForm.elements.status.value = post.status || "published";
  publishForm.elements.pinned.checked = Boolean(post.pinned);
  publishForm.elements.summary.value = post.summary || "";
  publishForm.elements.content.value = post.content || "";
  renderMarkdownPreview();
  saveEditorDraft();
}

function contentField() {
  return publishForm?.elements.content || null;
}

function insertMarkdown(before, after = "", fallback = "?") {
  const field = contentField();
  if (!field) return;
  const start = field.selectionStart ?? field.value.length;
  const end = field.selectionEnd ?? field.value.length;
  const selected = field.value.slice(start, end) || fallback;
  const insertion = `${before}${selected}${after}`;
  field.setRangeText(insertion, start, end, "select");
  field.focus();
  renderMarkdownPreview();
  saveEditorDraft();
}

function insertCodeBlock() {
  insertMarkdown("```\n", "\n```", "console.log('hello');");
}

async function uploadImage(file) {
  const password = localStorage.getItem(adminSessionKey);
  if (!file) throw new Error("请选择图片文件");
  if (!password) throw new Error("请先登录后台");
  const form = new FormData();
  form.append("password", password);
  form.append("file", file);
  const response = await fetch("/api/admin/images", {
    method: "POST",
    body: form
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "图片上传失败");
  return data.url;
}

if ("IntersectionObserver" in window) {
  revealTargets.forEach((item) => item.classList.add("reveal"));
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14 });
  revealTargets.forEach((item) => revealObserver.observe(item));
} else {
  revealTargets.forEach((item) => item.classList.add("is-visible"));
}

function setAdminUnlocked(password) {
  if (!adminDashboard || !adminLoginForm) return;
  adminLoginForm.hidden = true;
  adminDashboard.hidden = false;
  if (publishForm?.elements.password) {
    publishForm.elements.password.value = password;
  }
  if (adminPasswordForm?.elements.password) {
    adminPasswordForm.elements.password.value = password;
  }
  localStorage.setItem(adminSessionKey, password);
  loadAdminPosts();
  loadAdminMessages();
  loadAdminModeration();
  loadMediaLibrary();
}

async function verifyAdmin(password) {
  const response = await fetch("/api/admin/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password })
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "密钥错误");
  }
}

adminLoginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = new FormData(adminLoginForm).get("password");
  if (adminLoginStatus) adminLoginStatus.textContent = "正在验证...";
  console.info("Admin verification started");
  try {
    await verifyAdmin(password);
    if (adminLoginStatus) adminLoginStatus.textContent = "";
    setAdminUnlocked(password);
  } catch (error) {
    if (adminLoginStatus) adminLoginStatus.textContent = error.message;
  }
});

adminLogout?.addEventListener("click", () => {
  localStorage.removeItem(adminSessionKey);
  if (adminDashboard) adminDashboard.hidden = true;
  if (adminLoginForm) {
    adminLoginForm.hidden = false;
    adminLoginForm.reset();
  }
});

if (adminLoginForm) {
  const savedPassword = localStorage.getItem(adminSessionKey);
  if (savedPassword) {
    verifyAdmin(savedPassword).then(() => setAdminUnlocked(savedPassword)).catch(() => {
      localStorage.removeItem(adminSessionKey);
    });
  }
}

publishForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(publishForm);
  const payload = Object.fromEntries(formData.entries());
  if (publishStatus) publishStatus.textContent = payload.status === "draft" ? "正在保存草稿..." : "正在保存文章...";

  try {
    const response = await fetch("/api/posts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "发布失败");
    }
    publishForm.reset();
    localStorage.removeItem(editorDraftKey);
    renderMarkdownPreview();
    if (publishStatus) {
      publishStatus.innerHTML = `${data.post.status === "draft" ? "草稿已保存" : "文章已保存"}：<a href="${data.post.url}">${data.post.title}</a>`;
    }
    loadAdminPosts();
  } catch (error) {
    if (publishStatus) publishStatus.textContent = error.message;
  }
});

resetEditor?.addEventListener("click", () => {
  publishForm?.reset();
  if (publishForm?.elements.slug) publishForm.elements.slug.value = "";
  localStorage.removeItem(editorDraftKey);
  renderMarkdownPreview();
  if (publishStatus) publishStatus.textContent = "已切换到新建文章。";
});

publishForm?.addEventListener("input", () => {
  renderMarkdownPreview();
  saveEditorDraft();
});

publishForm?.addEventListener("change", saveEditorDraft);

if (publishForm) {
  const draft = localStorage.getItem(editorDraftKey);
  if (draft) {
    try {
      const parsed = JSON.parse(draft);
      fillEditor(parsed);
      if (publishStatus) publishStatus.textContent = "已恢复本地草稿。";
    } catch {
      localStorage.removeItem(editorDraftKey);
    }
  }
  renderMarkdownPreview();
}

editorToolbar?.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.insertCode !== undefined) {
    insertCodeBlock();
    return;
  }
  if (button.dataset.uploadImage !== undefined) {
    contentImageUpload?.click();
    return;
  }
  insertMarkdown(button.dataset.insertBefore || "", button.dataset.insertAfter || "");
});

coverUpload?.addEventListener("change", async () => {
  const file = coverUpload.files?.[0];
  if (!file || !publishForm) return;
  if (publishStatus) publishStatus.textContent = "正在上传封面图...";
  try {
    const url = await uploadImage(file);
    publishForm.elements.cover.value = new URL(url, location.origin).href;
    saveEditorDraft();
    if (publishStatus) publishStatus.textContent = "封面图已上传。";
  } catch (error) {
    if (publishStatus) publishStatus.textContent = error.message;
  } finally {
    coverUpload.value = "";
  }
});

contentImageUpload?.addEventListener("change", async () => {
  const file = contentImageUpload.files?.[0];
  if (!file) return;
  if (publishStatus) publishStatus.textContent = "正在上传文章插图...";
  try {
    const url = await uploadImage(file);
    insertMarkdown(`![图片](${url})`, "", "");
    if (publishStatus) publishStatus.textContent = "文章插图已插入。";
  } catch (error) {
    if (publishStatus) publishStatus.textContent = error.message;
  } finally {
    contentImageUpload.value = "";
  }
});

async function loadAdminPosts() {
  if (!adminPostList) return;
  const password = localStorage.getItem(adminSessionKey);
  const data = await fetch("/api/admin/moderation", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password })
  }).then((res) => res.json()).catch(() => ({ posts: [] }));
  adminPostState.posts = data.posts || [];
  if (data.dashboard) renderDashboard(data.dashboard);
  if (data.autosave && publishForm && !publishForm.elements.title.value && !publishForm.elements.content.value) {
    fillEditor(data.autosave);
    if (autosaveStatus) autosaveStatus.textContent = `已恢复云端草稿：${new Date(data.autosave.savedAt).toLocaleString("zh-CN")}`;
  }
  renderAdminPosts();
}

function renderDashboard(dashboard) {
  if (adminPostCount) adminPostCount.textContent = String(dashboard.posts || 0);
  if (adminPostBreakdown) adminPostBreakdown.textContent = `公开 ${dashboard.published || 0} / 草稿 ${dashboard.drafts || 0} / 隐藏 ${dashboard.hidden || 0}`;
  if (adminMessageCount) adminMessageCount.textContent = String(dashboard.messages || 0);
  if (adminFeedbackCount) adminFeedbackCount.textContent = `评论 ${dashboard.comments || 0} / 留言 ${dashboard.messages || 0}`;
  if (adminViewCount) adminViewCount.textContent = String(dashboard.views || 0);
  if (adminLikeCount) adminLikeCount.textContent = `${dashboard.likes || 0} 次喜欢`;
}

function adminPostMatches(post) {
  const query = adminPostState.query.trim().toLowerCase();
  const matchesStatus = adminPostState.status === "all" || (post.status || "published") === adminPostState.status;
  const text = [
    post.title,
    post.summary,
    post.category,
    post.date,
    ...(post.tags || [])
  ].join(" ").toLowerCase();
  return matchesStatus && (!query || text.includes(query));
}

function renderAdminPosts() {
  if (!adminPostList) return;
  const posts = adminPostState.posts.filter(adminPostMatches);
  if (adminPostCount) adminPostCount.textContent = String(adminPostState.posts.length);
  adminPostList.innerHTML = posts.map((post) => `
    <article class="admin-post-item">
      <div>
        <h3>${post.title}</h3>
        <p>${post.date} · ${post.category} · ${post.status || "published"}${post.pinned ? " · 置顶" : ""} · ${Number(post.views || 0)} 浏览 · ${Number(post.likes || 0)} 喜欢</p>
      </div>
      <div class="admin-post-actions">
        <a class="small-button" href="${post.url}" target="_blank" rel="noopener noreferrer">查看</a>
        <button class="small-button" type="button" data-edit="${post.slug}">编辑</button>
        <button class="small-button" type="button" data-delete="${post.slug}">删除</button>
      </div>
    </article>
  `).join("") || `<div class="empty-state"><h2>没有匹配文章</h2><p>换个关键词或状态筛选试试。</p></div>`;
}

adminPostSearch?.addEventListener("input", (event) => {
  adminPostState.query = event.target.value;
  renderAdminPosts();
});

adminStatusFilter?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-status]");
  if (!button) return;
  adminPostState.status = button.dataset.status;
  adminStatusFilter.querySelectorAll("[data-status]").forEach((item) => {
    item.setAttribute("aria-pressed", String(item === button));
  });
  renderAdminPosts();
});

async function loadMediaLibrary() {
  if (!mediaLibrary) return;
  const password = localStorage.getItem(adminSessionKey);
  mediaLibrary.innerHTML = `<div class="empty-state"><h2>正在加载媒体库</h2><p>稍等一下。</p></div>`;
  const response = await fetch("/api/admin/media", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password })
  }).catch(() => null);
  const data = await response?.json().catch(() => ({}));
  if (!response?.ok) {
    mediaLibrary.innerHTML = `<div class="empty-state"><h2>媒体库暂不可用</h2><p>${data?.error || "加载失败"}</p></div>`;
    return;
  }
  mediaLibrary.innerHTML = (data.files || []).map((file) => `
    <article class="media-item">
      <img src="${file.url}" alt="">
      <div>
        <strong>${Math.round((file.size || 0) / 1024)} KB</strong>
        <p>${file.key}</p>
      </div>
      <div class="admin-post-actions">
        <button class="small-button" type="button" data-copy-media="${file.url}">复制链接</button>
        <button class="small-button" type="button" data-delete-media="${file.key}">删除</button>
      </div>
    </article>
  `).join("") || `<div class="empty-state"><h2>暂无图片</h2><p>上传封面或插图后会显示在这里。</p></div>`;
}

refreshMedia?.addEventListener("click", loadMediaLibrary);

mediaLibrary?.addEventListener("click", async (event) => {
  const copyButton = event.target.closest("[data-copy-media]");
  const deleteButton = event.target.closest("[data-delete-media]");
  if (copyButton) {
    await navigator.clipboard.writeText(new URL(copyButton.dataset.copyMedia, location.origin).href);
    copyButton.textContent = "已复制";
    setTimeout(() => { copyButton.textContent = "复制链接"; }, 1200);
  }
  if (deleteButton) {
    if (!confirm("确定删除这张图片吗？已发布文章里如果还在使用它，会显示失败。")) return;
    const password = localStorage.getItem(adminSessionKey);
    const response = await fetch("/api/admin/media", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password, key: deleteButton.dataset.deleteMedia })
    });
    if (response.ok) loadMediaLibrary();
  }
});

previewPostButton?.addEventListener("click", async () => {
  if (!publishForm?.elements.slug.value) {
    if (publishStatus) publishStatus.textContent = "请先保存文章，再生成预览链接。";
    return;
  }
  const password = localStorage.getItem(adminSessionKey);
  const response = await fetch("/api/admin/preview-token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password, slug: publishForm.elements.slug.value })
  });
  const data = await response.json().catch(() => ({}));
  if (publishStatus) {
    publishStatus.innerHTML = response.ok
      ? `预览链接 1 小时内有效：<a href="${data.url}" target="_blank" rel="noopener noreferrer">打开预览</a>`
      : (data.error || "生成预览链接失败");
  }
});

async function loadAdminMessages() {
  if (!adminMessageList) return;
  const password = localStorage.getItem(adminSessionKey);
  const data = await fetch("/api/admin/moderation", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password })
  }).then((res) => res.json()).catch(() => ({ messages: [] }));
  if (adminMessageCount) adminMessageCount.textContent = String((data.messages || []).length);
  adminMessageList.innerHTML = (data.messages || []).map((message) => `
    <article class="admin-post-item">
      <div>
        <h3>${message.name}</h3>
        <p>${new Date(message.date).toLocaleString("zh-CN")}</p>
        <p>${message.content}</p>
      </div>
      <div class="admin-post-actions">
        <button class="small-button" type="button" data-delete-message="${message.id}">删除</button>
      </div>
    </article>
  `).join("") || `<div class="empty-state"><h2>暂无留言</h2><p>留言板收到内容后会出现在这里。</p></div>`;
}

adminMessageList?.addEventListener("click", async (event) => {
  const deleteButton = event.target.closest("[data-delete-message]");
  const button = deleteButton;
  if (!button) return;
  const password = localStorage.getItem(adminSessionKey);
  const response = await fetch("/api/guestbook", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      password,
      id: button.dataset.deleteMessage
    })
  });
  if (response.ok) loadAdminMessages();
});

adminPostList?.addEventListener("click", async (event) => {
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");
  if (editButton && publishForm) {
    const response = await fetch(`/api/posts/${editButton.dataset.edit}`);
    const data = await response.json();
    const post = data.post;
    fillEditor(post);
    if (publishStatus) publishStatus.textContent = "正在编辑已有文章。";
  }
  if (deleteButton && publishForm) {
    const password = publishForm.elements.password.value;
    if (!confirm("确定要删除这篇文章吗？这个操作不能撤销。")) return;
    if (!password) {
      if (publishStatus) publishStatus.textContent = "删除前请先填写管理员密码。";
      return;
    }
    const response = await fetch("/api/posts", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password, slug: deleteButton.dataset.delete })
    });
    const data = await response.json();
    if (publishStatus) publishStatus.textContent = response.ok ? "已删除文章。" : (data.error || "删除失败");
    loadAdminPosts();
  }
});

if (!adminLoginForm) loadAdminPosts();

async function loadAdminModeration() {
  if (!adminCommentList) return;
  const password = localStorage.getItem(adminSessionKey);
  const data = await fetch("/api/admin/moderation", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password })
  }).then((res) => res.json()).catch(() => ({ comments: [] }));
  adminCommentList.innerHTML = (data.comments || []).map((comment) => `
    <article class="admin-post-item">
      <div>
        <h3>${comment.name} · ${comment.postTitle}</h3>
        <p>${new Date(comment.date).toLocaleString("zh-CN")}</p>
        <p>${comment.content}</p>
      </div>
      <div class="admin-post-actions">
        <button class="small-button" type="button" data-delete-comment="${comment.postSlug}:${comment.id}">删除</button>
      </div>
    </article>
  `).join("") || `<div class="empty-state"><h2>暂无评论</h2><p>文章评论会出现在这里。</p></div>`;
}

adminCommentList?.addEventListener("click", async (event) => {
  const deleteButton = event.target.closest("[data-delete-comment]");
  const button = deleteButton;
  if (!button) return;
  const [slug, id] = button.dataset.deleteComment.split(":");
  const password = localStorage.getItem(adminSessionKey);
  const response = await fetch(`/api/posts/${slug}/comments`, {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password, id })
  });
  if (response.ok) loadAdminModeration();
});

adminPasswordForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(adminPasswordForm).entries());
  if (adminPasswordStatus) adminPasswordStatus.textContent = "正在更新密码...";
  const response = await fetch("/api/admin/password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (response.ok) {
    localStorage.setItem(adminSessionKey, payload.nextPassword);
    if (publishForm?.elements.password) publishForm.elements.password.value = payload.nextPassword;
    if (adminPasswordForm.elements.password) adminPasswordForm.elements.password.value = payload.nextPassword;
    adminPasswordForm.elements.nextPassword.value = "";
    if (adminPasswordStatus) adminPasswordStatus.textContent = "密码已更新，下次登录请使用新密码。";
  } else if (adminPasswordStatus) {
    adminPasswordStatus.textContent = data.error || "密码更新失败";
  }
});

async function loadArticleMeta(slug) {
  const stats = await fetch(`/api/posts/${slug}/stats`, { method: "POST" }).then((res) => res.json()).catch(() => null);
  if (likeButton && stats) {
    likeButton.querySelector("strong").textContent = stats.likes || 0;
  }
  const viewCount = document.querySelector("[data-view-count]");
  if (viewCount && stats) viewCount.textContent = stats.views || 0;
  const likeCount = document.querySelector("[data-like-count]");
  if (likeCount && stats) likeCount.textContent = stats.likes || 0;
}

likeButton?.addEventListener("click", async () => {
  const slug = likeButton.dataset.slug;
  const data = await fetch(`/api/posts/${slug}/likes`, { method: "POST" }).then((res) => res.json());
  likeButton.querySelector("strong").textContent = data.likes || 0;
  const likeCount = document.querySelector("[data-like-count]");
  if (likeCount) likeCount.textContent = data.likes || 0;
  const icon = likeButton.querySelector(".heart-icon");
  if (icon) icon.textContent = "♥";
  likeButton.setAttribute("aria-pressed", "true");
});

async function loadComments(slug) {
  const list = commentPanel?.querySelector(".comment-list");
  if (!list) return;
  const data = await fetch(`/api/posts/${slug}/comments`).then((res) => res.json()).catch(() => ({ comments: [] }));
  list.innerHTML = (data.comments || []).map((comment) => `
    <article class="comment-item">
      <strong>${comment.name}</strong>
      <time>${new Date(comment.date).toLocaleString("zh-CN")}</time>
      <p>${comment.content}</p>
    </article>
  `).join("") || `<div class="empty-state"><h2>还没有评论</h2><p>可以留下第一条想法。</p></div>`;
}

if (commentPanel) {
  const slug = commentPanel.dataset.slug;
  loadArticleMeta(slug);
  loadComments(slug);
  commentPanel.querySelector(".comment-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    payload.name = payload.name?.trim() || "匿名";
    const response = await fetch(`/api/posts/${slug}/comments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      event.currentTarget.reset();
      const submitButton = event.currentTarget.querySelector("button");
      if (submitButton) {
        submitButton.textContent = "已提交";
        setTimeout(() => { submitButton.textContent = "提交评论"; }, 1800);
      }
      loadComments(slug);
    } else {
      const submitButton = event.currentTarget.querySelector("button");
      if (submitButton) {
        submitButton.textContent = data.error || "提交失败";
        setTimeout(() => { submitButton.textContent = "提交评论"; }, 1800);
      }
    }
  });
}

async function loadGuestbook() {
  if (!guestbookList) return;
  const data = await fetch("/api/guestbook").then((res) => res.json()).catch(() => ({ messages: [] }));
  guestbookList.innerHTML = (data.messages || []).map((message) => `
    <article class="comment-item guestbook-note">
      <strong>${message.name}</strong>
      <time>${new Date(message.date).toLocaleString("zh-CN")}</time>
      <p>${message.content}</p>
    </article>
  `).join("") || `<div class="empty-state"><h2>还没有留言</h2><p>欢迎留下第一句。</p></div>`;
}

guestbookForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (guestbookStatus) guestbookStatus.textContent = "正在提交...";
  const payload = Object.fromEntries(new FormData(guestbookForm).entries());
  const response = await fetch("/api/guestbook", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (response.ok) {
    guestbookForm.reset();
    if (guestbookStatus) guestbookStatus.textContent = "留言成功，已显示在访客墙。";
    loadGuestbook();
  } else if (guestbookStatus) {
    guestbookStatus.textContent = data.error || "留言失败，请稍后再试。";
  }
});

loadGuestbook();

document.addEventListener("click", async (event) => {
  const button = event.target.closest(".copy-code-button");
  if (!button) return;
  const code = button.parentElement?.querySelector("code")?.textContent || "";
  try {
    await navigator.clipboard.writeText(code);
    button.textContent = "已复制";
    setTimeout(() => { button.textContent = "复制"; }, 1400);
  } catch {
    button.textContent = "失败";
  }
});
