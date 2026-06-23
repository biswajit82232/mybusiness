# MyBusiness (React + Vite)

**Current version: 7.3.14** (shown in **Settings**; sourced from `package.json` via `src/appVersion.js`.)

Simple, responsive business management web app: local-first data with optional Supabase cloud sync.

## Tech stack

- **React** 19 · **Vite** 8 · **ESLint** 9  
- **IndexedDB** (`idb`) for offline storage · optional **Supabase** (Auth + Postgres sync)  
- **PWA**: `manifest.json` + service worker (`public/sw.js`)

## What’s in the app

- Dashboard, search, notifications  
- Sales & invoices, customers, receivables, **payables**  
- **Purchases** (supplier buys, credit payables) · Inventory & products  
- Banking (activity with open/delete for linked expenses, stock, other income), fixed assets, balance sheet, **Net worth**, cash flow, ledger  
- Expenses, daily summary, reports, capital growth  
- EMI tracker (one reminder **3 days before** each due date, with WhatsApp message)  
- Settings: backup/import, theme, optional cloud sync  

Details: **[APP_FEATURES.md](./APP_FEATURES.md)** (full screen-by-screen guide).

## Project layout

```
src/
  app/           # Authenticated shell, hooks (navigation, persist, sync, PWA, …)
  config/        # viteEnv — single place for Vite env reads (see below)
  data/          # Auth, IndexedDB, Supabase client, telemetry, cloud sync
  domain/        # Business rules & calculations (no React; avoid importing app/features/data)
  features/      # UI by area; main-stage routes are code-split (lazyMainStageScreens.jsx)
  shared/        # Shared UI and small utilities
  vite-env.d.ts  # Vite client types for tooling
  App.jsx        # Re-exports app/App.jsx
  main.jsx       # Entry + service worker registration
public/
  sw.js          # Service worker (bump cache version when releasing)
supabase/
  migrations/    # Apply with Supabase CLI against your project
```

Path alias: **`@/` → `src/`** (see `vite.config.js`, `jsconfig.json`).

### Environment variables

Copy **`.env.example`** to **`.env`**. Runtime code reads variables through **`viteEnv`** in **`src/config/env.js`** (not scattered `import.meta.env`). Variables include:

- **`VITE_SUPABASE_URL`** / **`VITE_SUPABASE_ANON_KEY`** — cloud sign-in and sync  
- **`VITE_PUBLIC_SITE_URL`** — optional; absolute Open Graph / Twitter card images  
- **`VITE_TELEMETRY_URL`** — optional; client error reports via `sendBeacon`  

### UI / routing conventions

- **Feature modules**: import screens from **`@/features/<area>`** (or local paths), not from the legacy aggregate **`src/app/screens/index.jsx`** (documentation / tooling only; it pulls many screens into one graph).  
- **Lazy routes**: full-screen tabs and overlays are loaded via **`src/features/main-stage/lazyMainStageScreens.jsx`** to keep the initial bundle small.  
- **`scripts/extract-screens.mjs`** is a no-op stub; the old monolithic extractor is obsolete.

## Scripts

| Command | Description |
|--------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Dev server (default port 5173) |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | ESLint |
| `npm run lint:fix` | ESLint with `--fix` |
| `npm run verify` | Build + lint + all sanity scripts (`check` alias) |
| `npm run test:makeId` | Id uniqueness sanity (`scripts/makeId-sanity.mjs`) |
| `npm run test:domain` | Domain logic checks (`scripts/domain-sanity.mjs`) |
| `npm run test:scan` | Static source scans (footguns, env import patterns) |
| `npm run test:config` | Vite, ESLint, `index.html`, manifest, config files |
| `npm run test:sql` | Migration / SQL naming checks |
| `npm run test:supabase` | Local `config.toml` + entity_type CHECK vs client |
| `npm run test:supabase:push` | Pre-push migration safety notes (read before `db push`) |
| `npm run test:scripts` | Every `node scripts/*.mjs` referenced in `package.json` exists |
| `npm run test:pkg` | Package metadata sanity |
| `npm run supabase:db:push` | Apply pending SQL migrations to the **linked** remote DB |
| `npm run supabase:link` | Link local CLI to a Supabase project |
| `npm run supabase:status` | Show local/linked project status |

## Run locally

```bash
npm install
npm run dev
```

Set **`VITE_SUPABASE_URL`** and **`VITE_SUPABASE_ANON_KEY`** in **`.env`** for cloud sign-in and sync. Optional: **`VITE_PUBLIC_SITE_URL`**, **`VITE_TELEMETRY_URL`** (see **`.env.example`**).

## Production build

```bash
npm run build
npm run preview
```

Before merging larger changes, **`npm run verify`** is recommended.

## Deploy (e.g. Vercel + GitHub)

- Framework: **Vite** · Build: **`npm run build`** · Output: **`dist`**

Set the same `VITE_*` variables in the host dashboard. Redeploy after changing env vars.

**Supabase:** In **Authentication → URL configuration**, add your production URL and local dev URL if you use email links.

**Database (Supabase Postgres):** Migrations live in `supabase/migrations/`. After linking the CLI to your project:

```bash
npm run supabase:login    # once per machine
npm run supabase:link     # once per repo clone — pick project & password
npm run supabase:db:push  # apply any new migrations to the remote database
```

Use **`supabase db push`** when you add or change migration files. For a fresh local Supabase stack, use `supabase:db:reset` after `supabase:start`. You can also run migration SQL manually in the Supabase **SQL Editor** if you prefer.

**Service worker:** `public/sw.js` defines a cache `VERSION` string — bump it when you ship a release so clients pick up new assets after deploy.

## Changelog

See **[CHANGELOG.md](./CHANGELOG.md)**.

## License

Private project (`"private": true` in `package.json`).




