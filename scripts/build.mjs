import { cp, mkdir, rm } from "node:fs/promises";

await rm("dist", { force: true, recursive: true });
await mkdir("dist", { recursive: true });

for (const item of ["index.html", "assets", "posts", "_headers", "_redirects"]) {
  await cp(item, `dist/${item}`, { recursive: true });
}

console.log("Built static site to dist.");
