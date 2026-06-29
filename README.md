# MyBusiness (React + Vite)

**Current version: 8.4.0** (shown in **Settings → Version**; service worker cache **v130**.)

Offline-first business management for small shops and traders: sales invoices, inventory, purchases, banking, expenses, GST-aware reporting, and optional Supabase cloud sync. Works as a installable **PWA** on phone and desktop.

---

## Table of contents

1. [Who it is for](#who-it-is-for)
2. [Quick start (users)](#quick-start-users)
3. [How the app works](#how-the-app-works)
4. [Navigation](#navigation)
5. [Modules — what each area does](#modules--what-each-area-does)
6. [Common workflows](#common-workflows)
7. [Settings reference](#settings-reference)
8. [Notifications & alerts](#notifications--alerts)
9. [PWA shortcuts](#pwa-shortcuts)
10. [Data, backup & sync](#data-backup--sync)
11. [What to expect (limitations)](#what-to-expect-limitations)
12. [For developers](#for-developers)

---

## Who it is for

- Retail / wholesale businesses that invoice customers, track stock, and manage cash in bank accounts
- GST-registered businesses in India (INR formatting, GST invoice fields, Bill of Supply)
- Operators who need **offline reliability** with optional multi-device sync
- Mobile-first daily use (Android Chrome “Add to Home screen” recommended)

---

## Quick start (users)

1. Open the app in a browser (or install as PWA).
2. Sign in locally or with Supabase (if cloud sync is configured).
3. Go to **Settings → Business info** and enter your business name, address, GSTIN, etc.
4. Go to **Settings → Invoice settings** — set invoice prefix, due days, monthly sales target.
5. Go to **Banking** — confirm bank accounts and opening balances.
6. Start recording: **Dashboard → New sale**, **Expenses**, **Inventory → Add stock**, **Purchases**.

**Month filter:** Most list screens use a month picker (top bar). Dashboard KPIs and lists respect the selected business month unless noted (balance sheet can use an **as-of date**).

**Accounting basis:** On the Dashboard header, toggle **Cash** vs **Accrual**. Cash basis uses payment dates for revenue/expenses; accrual uses invoice/expense dates. Labels on KPI cards update accordingly.

---

## How the app works

### Local-first storage

- All business data lives in **IndexedDB** on the device first.
- You can use the app fully **without internet** after the first load.
- Saves are debounced; critical actions persist immediately.

### Optional cloud sync (Supabase)

- When `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set, sign-in enables sync.
- Changes go to an **outbox** and upload when online.
- **Settings → Cloud sync** shows status, pending outbox count, and errors.
- A persist mutex prevents sync from overwriting in-flight local saves.

### Overlay vs page

- **Sidebar pages** (Invoices, Banking, …) are main tabs.
- **Overlays** slide in for create/edit flows: New sale, Add stock, Record payment, etc.
- **Back** / browser back returns through overlay stack, then sidebar page.

### Money & GST

- Amounts display in **INR** (`en-IN`).
- GST can be enabled per business (**Settings → Invoice settings**). Invoice lines support HSN, GST rate, intra/inter-state split on print/share.
- **Bill of Supply** is a separate document type for non-GST or exempt supplies.

---

## Navigation

Open the **☰ menu** (sidebar). Groups:

| Group | Pages |
|--------|--------|
| **Overview** | Dashboard |
| **Sales** | Invoices, Customers, Receivables, EMI, Servicing |
| **Purchasing** | Payables, Purchases, Vendors |
| **Stock** | Inventory, Branches, Products |
| **Finance** | Balance sheet, Banking, Fixed Assets, Cash flow, Ledger |
| **Costs & income** | Expenses, Other income |
| **Reports** | Reports, Growth, Net Worth |
| **Footer** | Settings, Sign out |

**Global search** (app bar / sidebar): fuzzy match on customers, invoices, products, vendors, phones — tap a result to jump to detail.

**Retired UI (data preserved):** Loans Given management screens were removed in v8.0.6. Existing loan data still appears in **Banking**, **Cash flow**, and **Ledger**; there is no dedicated loans menu item.

---

## Modules — what each area does

### Dashboard

**Purpose:** Daily snapshot and fast actions.

**What you see:**
- KPI grid: Net profit (with 60-day sparkline), Revenue, COGS, Gross profit, Expenses, Receivables, Total liquid cash
- Cash vs accrual toggle in the header
- Month filter for period-scoped KPIs and recent lists
- **Invoice draft** banner when a new-sale form was left incomplete (Resume / Discard)
- Quick actions: **New sale**, **Expense**
- Recent sales, purchases, receivables
- Notification bell (overdue invoices, EMI, servicing, low stock, etc.)

**What to expect:** Profit hides behind an eye toggle by default (tap to reveal). Sparklines need a few days of history to look meaningful.

---

### Invoices (Sales)

**Purpose:** Create and manage customer invoices.

**List:**
- Month filter, search, segments: **All**, **Unpaid**, **Overdue**, **BOS** (Bill of Supply)
- Tap a row for invoice detail

**New sale:**
- Multi-line items, customer picker, GST fields (when enabled), payment lines per bank account
- Finance / EMI block (links to EMI tracker)
- **Draft auto-save** — partial forms save automatically; resume from banner on Home/Invoices or open **New sale**
- Product pick can fill **last sold price** for that item
- Optional **auto stock-out** (Settings) deducts inventory on save

**Invoice detail:**
- View totals, payments, outstanding, share/print
- **Record payment**, **Edit**, **Delete**
- **Duplicate invoice** — copy lines and customer into a new sale
- **Credit note** / **Debit note** — linked to the original invoice (adjusts receivables and GST reports)
- Print/share includes **UPI QR** when UPI ID is set in Settings

**What to expect:** Duplicate invoice numbers warn but do not block save. Draft clears on successful save. Credit notes reduce outstanding on receivables and dashboard KPIs.

---

### Customers

**Purpose:** Customer directory built from sales + manual entries.

- Search and A–Z browse
- Tap for detail: contact, address, purchase history, outstanding
- **Account statement** — PDF or CSV export for the selected period
- **New customer** overlay for manual add/edit

---

### Receivables

**Purpose:** Outstanding customer balances.

- Lists invoices with amount due, due date, overdue status (credit notes reduce balance)
- Month filter; tap through to invoice detail or record payment

---

### EMI

**Purpose:** Track financed sales (Bajaj Finance, etc.).

- List of EMI schedules linked to invoice numbers
- Due dates, paid/unpaid markers
- Tap for EMI detail; jump to related invoice
- **Alerts:** browser notification **3 days before** each due date (if notifications enabled), with optional WhatsApp reminder text

---

### Servicing

**Purpose:** Post-sale service reminders (e.g. vehicle servicing).

- Upcoming and overdue slots derived from sales
- Mark complete, mark WhatsApp sent
- Alerts at T-3 and T-2 days before due

---

### Payables

**Purpose:** Money owed to suppliers.

- Credit purchases with outstanding balance
- Month filter; open purchase detail to record supplier payment

---

### Purchases

**Purpose:** Supplier purchases (stock or expense-type buys).

- New purchase: supplier, lines, GST, payment now vs credit
- **Credit:** paid now = 0; cash moves only when you record **payment entries** (not via duplicate stock-in bank links)
- Duplicate supplier invoice number blocked for same vendor
- Purchase detail: payments, edit, delete

---

### Vendors

**Purpose:** Supplier directory (mirror of Customers for purchases).

- Search, detail, purchase history, payables context
- **Account statement** — PDF or CSV export for the selected period

---

### Inventory

**Purpose:** Stock movements and on-hand quantities.

- Rows per product (aggregated or per branch)
- **Add stock:** stock in, stock out, opening stock, cost, optional bank link for cash stock-in
- Purchase-linked stock-in does **not** double-count cash (supplier payment handles it)
- Low-stock alerts when enabled

---

### Branches

**Purpose:** Multi-location stock (default: **Main** branch).

- Add/rename branches
- Inventory and auto stock-out respect default branch

---

### Products (catalog)

**Purpose:** Product master — name, category, HSN, GST rate, list price.

- Used by inventory and sale line pickers
- Rename propagates to inventory, sales lines, bundles in data

---

### Balance sheet

**Purpose:** Assets, liabilities, equity snapshot.

**Features:**
- **As-of date** — historical receivables, stock, GST liability, payables, fixed-asset **net book** for that day (bank balances stay live with a note)
- GST net liability row (when GST enabled)
- **Assets = Liabilities + Equity** check strip
- Current ratio, **working capital** (current assets − liabilities)
- Expandable line groups; edit “other” balance components inline

**Fixed assets** on sheet use straight-line depreciation (see Fixed Assets tab).

---

### Banking

**Purpose:** Bank accounts and cash movement.

**Hero:** Total liquid balance across included accounts.

**Per month:** Cash in / out / net for selected month.

**Actions:**
- **Transfer** between accounts
- **Deposit** / **Withdraw** (external cash in/out)
  - Withdraw: optional **Owner drawing** (personal withdrawal) — flows to Cash flow financing
  - Deposit: optional **Owner capital introduced**
- Tap account → transaction register (sales payments, expenses, transfers, stock, purchases, loans)
- Delete linked activity rows where supported

**What to expect:** Internal transfers net to zero in Cash flow; only external deposit/withdraw affect operating/financing totals.

---

### Fixed Assets

**Purpose:** Register of capital assets (vehicles, equipment).

- Purchase date, cost, depreciation % p.a.
- **Net book value** after straight-line depreciation
- Feeds balance sheet (not cash flow until sold/disposed)

---

### Cash flow

**Purpose:** Cash in vs out over time.

**Periods:** FY, Month (daily breakdown), or single Day.

**Includes:** Sale payments, other income, expenses, stock-in cash, supplier payments, loan disbursements/repayments, deposits/withdrawals/owner drawings.

**Breakdown strip:** Operating vs Financing totals; **Owner drawings** line when present.

---

### Ledger

**Purpose:** Chronological money journal across modules.

- Filter by month; virtualized long lists
- Rows from sales, expenses, purchases, banking, inventory cash, other income, loans

---

### Expenses

**Purpose:** Operating expenses.

- One-off expenses by category (bank-linked = cash out)
- **Recurring expenses** — auto-advance dates on schedule
- Category drill-down overlay
- New / edit / delete

---

### Other income

**Purpose:** Non-invoice receipts (interest, rent received, cashback, etc.).

- Categories configurable in Settings
- Bank-linked amounts count as cash in

---

### Reports

**Purpose:** Business reports hub with executive snapshot and 22 detail reports.

**Hub:**
- **Executive snapshot** — net profit, margins, collection rate, period purchases (respects cash vs accrual)
- Download snapshot as **PDF**
- Categories: **Sales**, **Purchase**, **Other**, **GST**

**Each report page:**
- Period bar: **FY**, **month**, **custom from–to**, or **all time**
- **Bill wise / Party wise** toggle on sales, purchase, and payment reports
- Top toolbar: **PDF**, **CSV**, **JSON** (where applicable), **Tally XML** (ledger export)

**GST reports:** GSTR-1 summary, GSTR-2B (purchase ITC), GSTR-3B net payable — export for filing prep.

**Other reports include:** sales register, outstanding, product-wise sales, inward payments, purchase register, payables, ledger, P&amp;L, stock, daybook, cash flow summary, and more.

**What to expect:** GSTR exports are summaries for reconciliation — validate against your CA before portal upload. Product reports are bill-wise only.

---

### Growth (Capital growth)

**Purpose:** Track owner capital and business growth over time.

- Owner capital invested, retained earnings context
- Charts/tables vs prior periods

---

### Net Worth

**Purpose:** High-level wealth snapshot (assets minus liabilities).

- Complements balance sheet with trend-friendly layout

---

### Settings

Hub with search. Sub-screens:

| Item | What you configure |
|------|---------------------|
| **Appearance** | Light / dark theme |
| **Data backup** | Export JSON backup, import with validation |
| **Cloud sync** | Sync now, outbox, conflict queue, errors |
| **Business info** | Name, address, city, state, pincode, GSTIN, PAN, logo, **UPI ID** and payee name (for invoice QR) |
| **Invoice settings** | Prefixes, next numbers, due days, sales target, GST defaults, invoice notes/terms, **credit/debit note** prefixes and counters |
| **Accounting & inventory** | Cash vs accrual default, auto stock-out on sale |
| **Financial year** | FY year, start month (e.g. April) |
| **Year-end close** | Checklist, FY-labelled backup download, saved FY snapshots |
| **Finance companies** | EMI lender names list |
| **Expense / Other income categories** | Custom category labels |
| **Notifications** | Master toggle + per alert type |
| **Danger zone** | Reset all data (prompts backup first) |

**Version** number shown at bottom of hub (matches `package.json`).

---

## Common workflows

### Sell something (cash)

1. **New sale** → customer, lines, quantities, prices  
2. Add **payment line** → amount, date, bank account  
3. Save → invoice listed; bank balance increases; optional stock-out  

### Sell on credit

1. New sale → leave payments below total (or zero)  
2. Save → appears in **Receivables**  
3. Later: invoice detail → **Record payment**  

### Buy stock on credit

1. **Purchases** → new → supplier, lines, **paid now = 0**  
2. Optional: link stock-in to purchase (no extra bank hit on stock row)  
3. **Payables** → record supplier payment when paid  

### Owner takes cash from business

1. **Banking** → **Withdraw** → amount  
2. Check **Owner drawing (personal withdrawal)**  
3. See amount under **Cash flow → Financing → Owner drawings**  

### Resume interrupted invoice

1. Open app → **Dashboard** or **Invoices** shows draft banner  
2. **Resume** (or **New sale** restores draft automatically)  
3. Finish and save, or **Discard**  

### Year-end

1. **Settings → Year-end close**  
2. Follow checklist, download FY backup  
3. Save snapshot for records  

---

## Notifications & alerts

Enable in **Settings → Notifications** and allow browser permission when prompted.

| Alert | When |
|--------|------|
| Overdue / due today / due soon | Customer invoice outstanding |
| EMI due (3 days before) | Financed sale schedule |
| Recurring expense | Due today / upcoming |
| Servicing | T-3, T-2, today, overdue |
| Low stock | Below threshold (inventory) |
| Loan month milestone | Optional loan tracking |

Dismiss individually or all from the notification panel on Dashboard.

---

## PWA shortcuts

Long-press app icon (Android) or use install menu shortcuts:

| Shortcut | Action |
|----------|--------|
| New Sale | Opens new invoice form |
| Balance Sheet | Opens accounts overview |
| Products | Opens product catalog |
| Customers | Opens customer list |
| New Expense | Opens new expense form |

URL actions: `/?action=new_sale`, `balance_sheet`, `products`, `customers`, `new_expense`.

After deploy, service worker updates may require one refresh; a banner offers reload when a new version is ready.

---

## Data, backup & sync

### Backup file

- **Export:** Settings → Data backup → downloads versioned JSON  
- **Import:** Validates schema and app version; blocks newer backups; warns on old versions  
- **Reset:** Danger zone offers “Download backup now” before erase  

### What is stored

Sales, purchases, inventory, expenses, banking, EMI, customers, vendors, settings, audit events, sync queue — see `src/domain/appModel.js` for the canonical shape.

### Multi-device

1. Same Supabase project on all devices  
2. Sign in with same account  
3. Use **Sync now** or wait for automatic sync  
4. Resolve conflicts from Settings if two devices edited offline  

---

## What to expect (limitations)

- **Single business per login** — not multi-tenant SaaS UI  
- **Loans Given** — no dedicated management UI; legacy loan rows still affect banking/cash flow/ledger  
- **Bundles / Daily summary** — screens removed; legacy bundle data may remain in backups  
- **Bank balances on historical balance sheet** — always current; other lines respect as-of date  
- **Lint warnings** in dev do not affect production build  
- **Desktop** works; UI optimized for portrait mobile  
- Requires modern browser with IndexedDB (Chrome, Edge, Firefox, Safari current versions)  

---

## For developers

### Tech stack

- **React** 19 · **Vite** 8 · **ESLint** 9  
- **IndexedDB** (`idb`) · optional **Supabase** (Auth + Postgres entity sync)  
- **Vitest** for domain unit tests · **Fuse.js** for search  
- **PWA:** `manifest.json` + `public/sw.js` (cache version auto-synced on build)

### Project layout

```
src/
  app/           # Shell, hooks (navigation, persist, sync, PWA)
  config/        # viteEnv — VITE_* reads
  data/          # Auth, IndexedDB, Supabase, sync executor
  domain/        # Business rules (no React)
  features/      # UI by area; lazy-loaded from main-stage
  shared/        # Shared components
public/
  sw.js          # Service worker (VERSION synced from package.json on prebuild)
supabase/
  migrations/    # Postgres schema for cloud sync
tests/
  domain/        # Vitest domain tests
```

Path alias: **`@/` → `src/`**

### Environment variables

Copy **`.env.example`** → **`.env`**:

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_PUBLIC_SITE_URL` | Optional OG image base URL |
| `VITE_TELEMETRY_URL` | Optional client error beacon |

### Scripts

| Command | Description |
|--------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Dev server (port 5173) |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run test:unit` | Vitest (`tests/domain/`) |
| `npm run verify` | Build + lint + all sanity scripts (`check` alias) |
| `npm run test:domain` | Domain logic sanity (large suite) |
| `npm run test:makeId` | ID uniqueness check |
| `npm run test:config` | Vite, manifest, SW version vs package.json |
| `npm run supabase:db:push` | Apply migrations to linked remote DB |

### Run locally

```bash
npm install
npm run dev
```

### Production build & release

```bash
npm run verify    # recommended before merge
npm run build
```

Version bump policy (see `.cursor/rules/release-and-polish.mdc`):

1. `package.json` → `version`  
2. `public/sw.js` → `VERSION` (auto via `scripts/sync-sw-version.mjs` on `prebuild`)  
3. `CHANGELOG.md` → top entry with app + cache version  
4. **README** → `Current version: x.y.z` (checked by `npm run test:pkg`)

### Deploy (e.g. Vercel)

- Framework: **Vite** · Build: **`npm run build`** · Output: **`dist`**  
- Set `VITE_*` in host dashboard  
- Supabase Auth → add production URL to allowed redirect URLs  

### Database

```bash
npm run supabase:login
npm run supabase:link
npm run supabase:db:push
```

### Architecture notes

- Domain logic stays in **`src/domain/`** — no imports from `app/` or `features/`  
- Persist: debounced whole-state writes + immediate paths for critical saves; **persist mutex** during sync  
- Routes code-split in **`lazyMainStageScreens.jsx`**  
- Legacy aggregate **`src/app/screens/index.jsx`** is for docs/tooling only  

---

## Changelog

Release history: **[CHANGELOG.md](./CHANGELOG.md)**

## License

Private project (`"private": true` in `package.json`).
