# Deployment guide (v4.4.0)

Use this checklist before every production release. This release is **UI and correctness only** — no IndexedDB schema bump and no destructive Supabase migrations when applied in order.

---

## Verification status (run before deploy)

| Check | Command | Expected |
|-------|---------|----------|
| Full CI suite | `npm run verify` | All pass |
| E2E (production build) | `npm run test:e2e` | 3/3 pass |
| Supabase safety | `npm run test:supabase:push` | No blockers |

**Service worker:** bump `VERSION` in `public/sw.js` on each release (current: **v36**) so returning users load new assets.

---

## Why existing user data stays safe

### On device (IndexedDB)

- Database name is still **`mybusiness_offline_v1`** at version **10** — unchanged in this release.
- Upgrades only **add** stores/indexes; they do not delete sales, expenses, inventory, etc.
- Legacy `cache/app_state` snapshot remains as fallback.
- `mergePersistedPayload` only **normalizes** incoming JSON; invalid snapshots log a warning and fall back safely.
- **Business month** opens on the current calendar month each session (does not erase stored records; only the period filter default).

### Cloud (Supabase)

- Sync uses **`entity_records`** with version fields — server wins on conflict; local rejected edits are kept in **Settings → Sync conflicts** with optional **Restore local**.
- Pending migrations are **additive** (new columns, RLS fixes, entity types). Do **not** run `supabase db reset` on production.
- Migration `20260403120000_drop_legacy_workspace_user_tables.sql` only drops **empty** legacy tables; it fails if those tables still have rows (safety guard).

### After deploy

- Users keep all local data; first visit may show “Update available” → **Reload** (service worker).
- Cloud users: run **Settings → Cloud → Sync** once after deploy if you changed sync code.

---

## 1. Vercel (frontend)

### Project settings

| Setting | Value |
|---------|--------|
| Framework | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |
| Install command | `npm install` |

### Environment variables (Production)

Set in Vercel → Project → Settings → Environment Variables:

| Variable | Required | Notes |
|----------|----------|--------|
| `VITE_SUPABASE_URL` | For cloud login/sync | Supabase → Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | For cloud login/sync | Same |
| `VITE_PUBLIC_SITE_URL` | Recommended | e.g. `https://your-app.vercel.app` (no trailing slash) — link previews |
| `VITE_TELEMETRY_URL` | Optional | Error reporting endpoint |

Redeploy after changing any `VITE_*` variable.

### Deploy steps

```bash
npm run verify
npm run test:e2e
npm run build
# Push to GitHub; Vercel auto-deploys, or:
npx vercel --prod
```

### Post-deploy smoke test

1. Open production URL in a **private window** (or hard refresh).
2. Sign in (local or Supabase).
3. Confirm **Settings → Version** shows **4.4.0**.
4. Open **Dashboard**, **Invoices**, **Inventory**, **Reports** — no blank screen.
5. If using cloud: **Settings → Cloud → Sync now** — no errors.

---

## 2. Supabase (database)

Only if this environment has **not** received migrations yet.

```bash
npm run supabase:login          # once per machine
npm run supabase:link           # once per repo clone
# Backup: Supabase Dashboard → Database → Backups
npm run test:supabase
npm run test:sql
npm run test:supabase:push
npm run supabase:db:push
```

### Auth URL configuration

Supabase → **Authentication** → **URL configuration**:

- **Site URL:** your production URL
- **Redirect URLs:** production URL + `http://localhost:5173` (dev)

---

## 3. Rollback plan

| Layer | Action |
|-------|--------|
| **Vercel** | Redeploy previous deployment from Vercel dashboard |
| **Supabase** | Do not roll back SQL without a DBA plan; app remains compatible with already-applied migrations |
| **User data** | Local IndexedDB is untouched by redeploy; users can export backup from **Settings → Data backup** before major changes |

---

## 4. Pre-release backup (recommended)

Ask power users to:

1. **Settings → Data backup → Export** (JSON file).
2. If on cloud, run **Sync now** before you deploy.

---

## 5. What changed in v4.4.0 (this release)

- UI/UX polish (KPI strips, focus rings, inventory movement unit costs).
- Correct date sorting (receivables, reports).
- Sync conflict preview + restore local.
- Virtuoso lists (receivables, purchases).
- In-app confirm dialogs (no `window.confirm` on key screens).
- Sidebar **Search** entry.
- Service worker **v36**.

No change to IndexedDB `DB_VERSION`. No required user migration.

---

## Quick reference

| Item | Value |
|------|--------|
| App version | 4.4.0 |
| SW cache version | v36 |
| IndexedDB | `mybusiness_offline_v1` v10 |
| Local dev | `npm run dev` → http://localhost:5173 |
| Preview build | `npm run build && npm run preview` → http://localhost:4173 |
