/**
 * Build / PWA config smoke checks — run: npm run test:config
 */
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

console.log("config-sanity:");

for (const rel of ["src/main.jsx", "src/domain/appModel.js", "src/config/env.js", "src/config/index.js"]) {
  const p = join(root, rel);
  assert.ok(existsSync(p), `expected ${rel} to exist`);
  assert.ok(statSync(p).size > 0, `${rel} should not be empty`);
}

const { default: viteConfig } = await import("../vite.config.js");
assert.ok(viteConfig && typeof viteConfig === "object", "vite.config.js should export a config object");
assert.ok(
  Array.isArray(viteConfig.plugins) && viteConfig.plugins.length > 0,
  "vite config should register plugins",
);

const { default: eslintConfig } = await import("../eslint.config.js");
assert.ok(
  eslintConfig && (Array.isArray(eslintConfig) || typeof eslintConfig === "object"),
  "eslint.config.js should export a config",
);
if (Array.isArray(eslintConfig)) {
  assert.ok(eslintConfig.length > 0, "eslint flat config should not be empty");
}

const indexHtml = readFileSync(join(root, "index.html"), "utf8");
assert.ok(/<div\s+id="root"/.test(indexHtml), "index.html should mount #root");
assert.ok(
  /<script\s+type="module"\s+src="\/src\/main\.jsx">/.test(indexHtml),
  "index.html should load /src/main.jsx as module",
);

const manifestPath = join(root, "public", "manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
assert.ok(String(manifest.name || "").trim(), "manifest.json should have name");
assert.equal(manifest.start_url, "/", "manifest start_url should be /");
assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0, "manifest should list icons");

const sw = readFileSync(join(root, "public", "sw.js"), "utf8");
const swVer = /const VERSION = "(v\d+)"/.exec(sw);
assert.ok(swVer, "public/sw.js should declare VERSION");
const precacheMarker = "PRECACHE_ASSETS";
assert.ok(sw.includes(precacheMarker), "sw.js should include PRECACHE_ASSETS marker for inject-precache.mjs");

console.log(`  ✓ vite + eslint + index.html + manifest (SW ${swVer[1]}) + src entry files — ok`);
