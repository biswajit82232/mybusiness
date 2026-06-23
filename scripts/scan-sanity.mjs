/**
 * Static scans for recurring footguns — run: npm run test:scan
 * (EmptyState uses `sub`, not `subtitle`; dangerous patterns, etc.)
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const srcRoot = join(__dirname, "..", "src");

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if ([".jsx", ".js", ".tsx", ".ts"].includes(extname(name))) acc.push(p);
  }
  return acc;
}

const files = walk(srcRoot);
const issues = [];

for (const f of files) {
  let text;
  try {
    text = readFileSync(f, "utf8");
  } catch {
    continue;
  }
  const emptyStateUsesSubtitle = [...text.matchAll(/<EmptyState[\s\S]*?\/>|<EmptyState[\s\S]*?<\/EmptyState>/g)].some(
    (m) => /subtitle\s*=/.test(m[0]),
  );
  if (emptyStateUsesSubtitle) {
    issues.push(`${f}: EmptyState may use invalid prop "subtitle" (use "sub")`);
  }
  if (/\bdangerouslySetInnerHTML\s*=/.test(text)) {
    issues.push(`${f}: dangerouslySetInnerHTML — review XSS risk`);
  }
  if (/\beval\s*\(/.test(text) && !text.includes("eslint")) {
    issues.push(`${f}: eval() — review`);
  }
  if (/\bnew Function\s*\(/.test(text)) {
    issues.push(`${f}: new Function(...) — review dynamic code`);
  }
  if (/\b(it|describe|test)\.only\s*\(/.test(text)) {
    issues.push(`${f}: focused test .only() — remove before merge`);
  }
  if (/\b(it|describe|test)\.skip\s*\(/.test(text)) {
    issues.push(`${f}: skipped test .skip() — remove or fix before merge`);
  }
  if (/(?:^|\n)\s*debugger\s*;/.test(text)) {
    issues.push(`${f}: debugger statement — remove before merge`);
  }
  if (/\bwindow\.location\s*=\s*/.test(text)) {
    issues.push(`${f}: window.location = … — review navigation / open redirect`);
  }
  if (/\bdocument\.write\s*\(/.test(text)) {
    issues.push(`${f}: document.write() — avoid (breaks SPA / XSS risk)`);
  }
  if (/\brequire\s*\(\s*['"]/.test(text)) {
    issues.push(`${f}: require() — use ESM import in app source`);
  }
  if (/\.innerHTML\s*=/.test(text)) {
    issues.push(`${f}: .innerHTML = … — prefer textContent or React children (XSS risk)`);
  }
  if (/javascript\s*:/i.test(text)) {
    issues.push(`${f}: javascript: URL — XSS / unsafe navigation`);
  }

  const norm = f.replace(/\\/g, "/");
  const isEnvModule = /\/src\/config\/env\.js$/.test(norm);
  if (norm.includes("/src/") && text.includes("import.meta.env") && !isEnvModule) {
    issues.push(
      `${f}: use viteEnv from src/config/env.js instead of import.meta.env (keeps env access centralized)`,
    );
  }
  if (
    norm.includes("/src/") &&
    /from\s+["']@\/app\/screens/.test(text) &&
    !/\/src\/app\/screens\/index\.jsx$/.test(norm)
  ) {
    issues.push(
      `${f}: do not import from @/app/screens — use @/features/<area> or main-stage/lazyMainStageScreens.jsx`,
    );
  }
}

console.log("scan-sanity:");
if (issues.length === 0) {
  console.log(`  ✓ ${files.length} source files — no flagged patterns — ok`);
} else {
  for (const m of issues) console.error(`  ✗ ${m}`);
  process.exit(1);
}
