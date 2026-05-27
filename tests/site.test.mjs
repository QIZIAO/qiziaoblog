import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import assert from "node:assert/strict";

const root = resolve(".");
const port = 9797;
const types = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".svg", "image/svg+xml; charset=utf-8"]
]);

function filePathFor(url) {
  const parsed = new URL(url, `http://127.0.0.1:${port}`);
  const pathname = parsed.pathname === "/" ? "/index.html" : parsed.pathname;
  const candidate = normalize(join(root, decodeURIComponent(pathname)));
  if (!candidate.startsWith(root)) {
    throw new Error("Invalid path");
  }
  return candidate;
}

const server = createServer(async (req, res) => {
  try {
    const filePath = filePathFor(req.url ?? "/");
    const body = await readFile(filePath);
    res.writeHead(200, {
      "content-type": types.get(extname(filePath)) ?? "application/octet-stream"
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
});

await new Promise((resolveListen) => server.listen(port, "127.0.0.1", resolveListen));

try {
  const base = `http://127.0.0.1:${port}`;
  const get = async (path) => {
    const response = await fetch(`${base}${path}`);
    const text = await response.text();
    return { response, text };
  };

  const home = await get("/");
  assert.equal(home.response.status, 200);
  assert.match(home.text, /<title>七子傲 \| 个人博客<\/title>/);
  assert.match(home.text, /id="post-list"/);
  assert.match(home.text, /assets\/hero-visual.svg/);

  const postsJs = await get("/assets/posts.js");
  assert.equal(postsJs.response.status, 200);
  assert.equal((postsJs.text.match(/url:/g) ?? []).length, 3);
  assert.match(postsJs.text, /七子傲：博客正式上线/);

  const styles = await get("/assets/styles.css");
  assert.equal(styles.response.status, 200);
  assert.match(styles.text, /backdrop-filter/);
  assert.match(styles.text, /clamp\(64px, 11vw, 138px\)/);

  for (const path of ["/posts/hello.html", "/posts/why-blog.html", "/posts/roadmap.html"]) {
    const page = await get(path);
    assert.equal(page.response.status, 200);
    assert.match(page.text, /七子傲/);
    assert.match(page.text, /返回首页/);
  }

  const asset = await get("/assets/logo-mark.svg");
  assert.equal(asset.response.status, 200);
  assert.match(asset.response.headers.get("content-type") ?? "", /image\/svg\+xml/);

  console.log("Site tests passed.");
} finally {
  await new Promise((resolveClose) => server.close(resolveClose));
}
