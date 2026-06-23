/**
 * Local Supabase CLI config smoke checks — run: npm run test:supabase
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const configPath = join(root, "supabase", "config.toml");

console.log("supabase-sanity:");

const raw = readFileSync(configPath, "utf8");
const project = raw.match(/^\s*project_id\s*=\s*"([^"]*)"/m);
assert.ok(project && project[1], "config.toml should set project_id");

const major = raw.match(/^\s*major_version\s*=\s*(\d+)/m);
assert.ok(major, "config.toml should set db.major_version");

const api = raw.match(/^\s*enabled\s*=\s*true/m);
assert.ok(api, "config.toml should enable [api]");

console.log(`  ✓ supabase/config.toml (project_id=${project[1]}, PG ${major[1]}) — ok`);

/* ── entity_type CHECK constraint must cover every client ENTITY_TYPES value ──
 * Prevents a class of silent cloud-sync failures where a new client ships a
 * new entity type before a migration adds it to the CHECK constraint.
 *
 * The source file uses Vite's `@/` alias so we can't `import()` it from Node;
 * parse the literal array out of the source text instead. */
const cloudSyncSrc = readFileSync(join(root, "src", "data", "sync", "cloudSync.js"), "utf8");
const arrBlock = cloudSyncSrc.match(/export\s+const\s+ENTITY_TYPES\s*=\s*\[([\s\S]*?)\];/);
assert.ok(arrBlock, "cloudSync.js should export `ENTITY_TYPES` as an array literal");
const ENTITY_TYPES = arrBlock[1]
  .split(",")
  .map((s) => s.trim().replace(/^['"`]|['"`]$/g, ""))
  .filter((s) => s && !s.startsWith("//"));
assert.ok(ENTITY_TYPES.length > 0, "cloudSync ENTITY_TYPES list should not be empty");

const migrationsDir = join(root, "supabase", "migrations");
const migrationFiles = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

let latestCheckList = null;
for (const f of migrationFiles) {
  const sql = readFileSync(join(migrationsDir, f), "utf8");
  /* Capture the last CHECK constraint definition for entity_type in this file. */
  const re = /entity_type\s+IN\s*\(([^)]+)\)/gi;
  let m;
  while ((m = re.exec(sql))) {
    const values = m[1]
      .split(",")
      .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean);
    if (values.length > 0) latestCheckList = values;
  }
}

assert.ok(
  Array.isArray(latestCheckList) && latestCheckList.length > 0,
  "supabase/migrations should define an entity_type IN (...) CHECK constraint",
);

const missing = ENTITY_TYPES.filter((t) => !latestCheckList.includes(t));
assert.equal(
  missing.length,
  0,
  `Client ENTITY_TYPES not covered by latest CHECK constraint: ${missing.join(", ")}. Add a new migration before shipping.`,
);

console.log(
  `  ✓ entity_type CHECK covers ${ENTITY_TYPES.length}/${latestCheckList.length} client entity types — ok`,
);
