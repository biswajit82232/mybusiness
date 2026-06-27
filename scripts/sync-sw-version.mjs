/**
 * Sync service-worker cache VERSION from package.json.
 * When app semver changes, cache version auto-increments (no manual sw.js edit).
 *
 * Run: node scripts/sync-sw-version.mjs
 * Wired into npm run build via prebuild.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const lockPath = join(root, ".sw-version-lock.json");
const swPath = join(root, "public", "sw.js");

const appVersion = String(pkg.version || "").trim();
if (!appVersion) {
  console.error("[sync-sw-version] package.json missing version");
  process.exit(1);
}

let lock = { appVersion: "", cacheVersion: 0 };
if (existsSync(lockPath)) {
  try {
    lock = JSON.parse(readFileSync(lockPath, "utf8"));
  } catch {
    lock = { appVersion: "", cacheVersion: 0 };
  }
}

let cacheVersion = Number(lock.cacheVersion) || 0;
if (!cacheVersion) {
  const sw = readFileSync(swPath, "utf8");
  const m = /const VERSION = "(v(\d+))"/.exec(sw);
  cacheVersion = m ? Number(m[2]) : 100;
}

if (lock.appVersion !== appVersion) {
  cacheVersion += 1;
}

const VERSION = `v${cacheVersion}`;
const sw = readFileSync(swPath, "utf8");
if (!/const VERSION = "v\d+";/.test(sw)) {
  console.error("[sync-sw-version] could not find VERSION line in public/sw.js");
  process.exit(1);
}
const nextSw = sw.replace(/const VERSION = "v\d+";/, `const VERSION = "${VERSION}";`);
if (nextSw !== sw) {
  writeFileSync(swPath, nextSw, "utf8");
}
writeFileSync(lockPath, JSON.stringify({ appVersion, cacheVersion }, null, 2) + "\n", "utf8");

console.log(`[sync-sw-version] app ${appVersion} → cache ${VERSION}`);
