import { cp, mkdir, rm } from "node:fs/promises";

await rm("dist", { force: true, recursive: true });
await mkdir("dist", { recursive: true });

for (const item of [
  "index.html",
  "writing.html",
  "about.html",
  "projects.html",
  "uses.html",
  "guestbook.html",
  "admin.html",
  "404.html",
  "assets",
  "posts",
  "feed.xml",
  "sitemap.xml",
  "robots.txt",
  "_headers",
  "_redirects"
]) {
  await cp(item, `dist/${item}`, { recursive: true });
}

await cp("functions-worker.js", "dist/_worker.js");

console.log("Built static site to dist.");
