/**
 * Pre-flight checks before `supabase db push` — run: npm run test:supabase:push
 *
 * Does not connect to the database; inspects migration files only.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "..", "supabase", "migrations");

const DESTRUCTIVE_DROP = "20260403120000_drop_legacy_workspace_user_tables.sql";

console.log("supabase-pre-push-safety:");

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

let hasDestructiveDrop = false;
let hasAdditiveOnly = true;

for (const f of files) {
  const body = readFileSync(join(migrationsDir, f), "utf8");
  const upper = body.toUpperCase();

  if (f === DESTRUCTIVE_DROP) {
    hasDestructiveDrop = true;
    if (!upper.includes("REFUSING TO DROP") && !upper.includes("RAISE EXCEPTION")) {
      console.warn(`  ⚠ ${f} drops tables without a row-count guard — review before push`);
    } else {
      console.log(`  ✓ ${f} — guarded (empty legacy tables only)`);
    }
  }

  if (upper.includes("DROP TABLE") && f !== DESTRUCTIVE_DROP) {
    console.warn(`  ⚠ ${f} contains DROP TABLE — verify this is intentional`);
    hasAdditiveOnly = false;
  }
  if (upper.includes("DROP COLUMN") || upper.includes("DELETE FROM")) {
    console.warn(`  ⚠ ${f} may remove column/row data — review before push`);
    hasAdditiveOnly = false;
  }
}

console.log(`  ✓ ${files.length} migration file(s) scanned`);
console.log("");
console.log("Before pushing to production:");
console.log("  1. supabase link   (once per machine)");
console.log("  2. supabase db pull --linked  (optional: see pending vs remote)");
console.log("  3. Backup: Supabase Dashboard → Database → Backups");
console.log("  4. npm run test:supabase && npm run test:sql");
console.log("  5. supabase db push");
if (hasDestructiveDrop) {
  console.log("");
  console.log(`  If ${DESTRUCTIVE_DROP} is not yet applied:`);
  console.log("  • It will FAIL if legacy user_* / workspace_* tables still have rows.");
  console.log("  • If your users already sync via entity_records only, those tables should be empty.");
}
if (hasAdditiveOnly) {
  console.log("");
  console.log("  Pending additive migrations are safe for existing entity_records rows.");
}
