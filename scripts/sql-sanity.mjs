/**
 * Supabase migration hygiene — run: npm run test:sql
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "..", "supabase", "migrations");

console.log("sql-sanity:");

const names = readdirSync(migrationsDir)
  .filter((n) => n.endsWith(".sql"))
  .sort();

assert.ok(names.length > 0, "supabase/migrations should contain .sql files");

const seenPrefixes = new Set();
for (const name of names) {
  assert.match(
    name,
    /^\d{14}_[a-zA-Z0-9_.-]+\.sql$/,
    `migration filename should be YYYYMMDDHHmmss_name.sql: ${name}`,
  );
  const prefix = name.slice(0, 14);
  assert.ok(!seenPrefixes.has(prefix), `duplicate migration timestamp prefix: ${prefix}`);
  seenPrefixes.add(prefix);

  const p = join(migrationsDir, name);
  assert.ok(statSync(p).size > 0, `migration file should not be empty: ${name}`);

  const body = readFileSync(p, "utf8");
  assert.ok(body.trim().length > 0, `migration should have non-whitespace content: ${name}`);

  const upper = body.toUpperCase();
  assert.ok(!upper.includes("DROP DATABASE"), `avoid DROP DATABASE in migrations: ${name}`);
  assert.ok(!upper.includes("DROP SCHEMA PUBLIC"), `avoid DROP SCHEMA public in migrations: ${name}`);
}

const seedPath = join(__dirname, "..", "supabase", "seed.sql");
assert.ok(existsSync(seedPath), "supabase/seed.sql should exist");
assert.ok(statSync(seedPath).size > 0, "supabase/seed.sql should not be empty");
const seedBody = readFileSync(seedPath, "utf8");
const seedUp = seedBody.toUpperCase();
assert.ok(!seedUp.includes("DROP DATABASE"), "avoid DROP DATABASE in seed.sql");
assert.ok(!seedUp.includes("DROP SCHEMA PUBLIC"), "avoid DROP SCHEMA public in seed.sql");

console.log(`  ✓ ${names.length} migration files + seed.sql — naming, uniqueness, content — ok`);
