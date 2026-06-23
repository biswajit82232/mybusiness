# Proposed migrations (review-only)

This folder holds Supabase migrations that have been **drafted but not yet
approved** for production. Files here are NOT applied by `supabase db push`
— Supabase only reads `supabase/migrations/`.

## Why this folder exists

Some improvements affect cloud schema. We never want to apply unreviewed SQL
to a production database that holds real user data. Drafts go here so you
can read the SQL, run it on a staging project first, then move it into
`supabase/migrations/` when you're satisfied.

## How to apply a proposed file

1. **Read it.** Every proposed file documents its data-safety guarantees in
   the header comments. Specifically look for: no `DROP`, no `DELETE`, no
   `NOT NULL` on a new column without a default, no `RENAME` of populated
   tables/columns.
2. **Verify on staging.** Create a temporary Supabase project (or a branch
   if you're on Pro), point your CLI at it (`supabase link`), copy the file
   into `supabase/migrations/` with a real timestamp, and run
   `supabase db push`. Confirm row counts and data integrity.
3. **Promote to production.** Rename the file to
   `YYYYMMDDHHmmss_<descriptive_name>.sql`, move it into
   `supabase/migrations/`, commit, and run `npm run supabase:db:push`.

## Current proposals

_None — `client_updated_at` was promoted to `supabase/migrations/20260515120000_entity_records_client_updated_at.sql`._

- **[client_updated_at.proposed.sql](./client_updated_at.proposed.sql)** — archived copy of the promoted migration (reference only).
