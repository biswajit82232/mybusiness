/**
 * Post-build: inject the hashed JS/CSS asset URLs into dist/sw.js so the service
 * worker precaches every code-split chunk. Without this, pages the user never
 * opened while online throw ChunkLoadError offline (broken offline-first PWA).
 *
 * Replaces the `/* __PRECACHE_ASSETS__ *\/` marker in dist/sw.js with the list
 * of `/assets/*.js` and `/assets/*.css` files emitted by Vite.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const distDir = join(root, "dist");
const swPath = join(distDir, "sw.js");
const assetsDir = join(distDir, "assets");
const MARKER = "/* __PRECACHE_ASSETS__ */";

function fail(msg) {
  console.error(`[inject-precache] ${msg}`);
  process.exit(1);
}

if (!existsSync(swPath)) fail("dist/sw.js not found — run the build first.");
if (!existsSync(assetsDir)) fail("dist/assets not found — run the build first.");

const assets = readdirSync(assetsDir)
  .filter((f) => f.endsWith(".js") || f.endsWith(".css"))
  .map((f) => `/assets/${f}`)
  .sort();

const sw = readFileSync(swPath, "utf8");
if (!sw.includes(MARKER)) fail(`marker ${MARKER} not found in dist/sw.js`);

const list = assets.map((u) => `\n  ${JSON.stringify(u)},`).join("");
const next = sw.replace(MARKER, list);
writeFileSync(swPath, next, "utf8");

console.log(`[inject-precache] precached ${assets.length} assets into dist/sw.js`);
