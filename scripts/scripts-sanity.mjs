/**
 * Every `node scripts/*.mjs` referenced from package.json must exist — run: npm run test:scripts
 */
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

console.log("scripts-sanity:");

const blob = Object.values(pkg.scripts || {}).join("\n");
const re = /\bnode\s+(scripts\/[^\s&|"'`]+\.mjs)/g;
const paths = new Set();
let m;
while ((m = re.exec(blob))) paths.add(m[1]);

assert.ok(paths.size > 0, "package.json should reference at least one node scripts/*.mjs");

for (const rel of paths) {
  const p = join(root, rel);
  assert.ok(existsSync(p), `missing file for npm script: ${rel}`);
  assert.ok(statSync(p).size > 0, `script should not be empty: ${rel}`);
}

console.log(`  ✓ ${paths.size} script path(s) from package.json — ok`);
