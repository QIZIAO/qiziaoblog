const postList = document.querySelector("#post-list");
const year = document.querySelector("#year");

if (year) {
  year.textContent = new Date().getFullYear();
}

if (postList && Array.isArray(window.BLOG_POSTS)) {
  postList.innerHTML = window.BLOG_POSTS.map((post) => `
    <a class="post-card" href="${post.url}">
      <div class="post-meta">
        <time datetime="${post.date}">${post.date}</time>
        <span>${post.category}</span>
      </div>
      <h3>${post.title}</h3>
      <p>${post.summary}</p>
      <span class="post-tag">阅读全文</span>
    </a>
  `).join("");
}
