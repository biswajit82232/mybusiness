# Supabase — safe deployment (existing user data)

## Principles

- **Never** run `supabase db reset` on production (wipes the database).
- Prefer **`supabase db push`** — applies only **pending** migrations to the linked remote project.
- New migrations in this repo are **additive** (new columns, expanded CHECK constraints, RPC `CREATE OR REPLACE`) unless explicitly documented otherwise.

## One-time checklist (production)

1. **Link the project** (local machine):
   ```bash
   npm run supabase:login
   npm run supabase:link
   ```
2. **Confirm what is already applied**  
   Supabase Dashboard → **Database** → **Migrations**, or:
   ```bash
   supabase migration list
   ```
3. **Backup**  
   Dashboard → **Database** → **Backups** (or your provider snapshot).
4. **Run local guards**:
   ```bash
   npm run test:sql
   npm run test:supabase
   npm run test:supabase:push
   ```
5. **Apply pending migrations**:
   ```bash
   npm run supabase:db:push
   ```

## Legacy table drop (`20260403120000_drop_legacy_workspace_user_tables.sql`)

This migration removes old `user_*` / `workspace_*` tables from an early schema.

- It **aborts** if any of those tables still contain rows (data-safety guard).
- If push fails with “still has N row(s)”, your production DB may still hold data only in legacy tables. **Do not force-drop.** Export or migrate into `entity_records` first, or confirm users already use cloud sync on the current app version.

If this migration is **already applied** on production, it will not run again on the next push.

## Latest additive migration (`20260515120000_entity_records_client_updated_at.sql`)

- Adds nullable `client_updated_at` on `entity_records`.
- Updates `sync_upsert_entity_record` to store the client timestamp.
- **No** `NOT NULL`, **no** backfill, **no** row deletes — existing rows stay valid.

## Client ↔ database alignment

`npm run test:supabase` asserts every client `ENTITY_TYPES` value is allowed by the latest `entity_type` CHECK constraint (see `20260412120000_entity_records_add_audit_sync_types.sql`).

## After push

1. Smoke-test sign-in and cloud sync on a test account.
2. Settings → sync / pull once; confirm no schema errors in the browser console.
3. Deploy the web app (Vercel or your host) with matching `VITE_SUPABASE_*` env vars.
