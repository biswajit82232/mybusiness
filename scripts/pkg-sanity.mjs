/**
 * Guardrails for package.json — run: npm run test:pkg
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import assert from "node:assert/strict";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const pkgPath = join(root, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));

console.log("pkg-sanity:");

assert.equal(pkg.type, "module", "package.json should use type: module");
assert.ok(pkg.version && String(pkg.version).length > 0, "package.json should have version");

const ver = String(pkg.version);
const readme = readFileSync(join(root, "README.md"), "utf8");
assert.ok(
  readme.includes(`Current version: ${ver}`),
  `README.md should mention "Current version: ${ver}" (sync with package.json)`,
);

const changelog = readFileSync(join(root, "CHANGELOG.md"), "utf8");
/** First non-Unreleased `## […]` heading (skip `## [Unreleased]` when present above the latest release). */
let firstRel = null;
for (const line of changelog.split(/\r?\n/)) {
  const m = /^## \[([^\]]+)\]/.exec(line);
  if (!m) continue;
  if (m[1].trim().toLowerCase() === "unreleased") continue;
  firstRel = m;
  break;
}
assert.ok(firstRel, "CHANGELOG.md should have a release section like ## [x.y.z]");
assert.equal(
  firstRel[1],
  ver,
  `CHANGELOG top release [${firstRel[1]}] should match package.json version ${ver}`,
);

const verify = String(pkg.scripts?.verify || "");
const required = ["test:makeId", "test:domain", "test:sync", "test:scan", "test:config", "test:sql", "test:supabase", "test:supabase:push", "test:scripts", "test:pkg"];
for (const s of required) {
  assert.ok(verify.includes(s), `verify script should run ${s}`);
}

console.log("  ✓ package.json scripts and metadata — ok");
