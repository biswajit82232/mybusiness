# MyBusiness App - Complete Features and Pages Guide

> **App version:** 4.4.0 (see `package.json` / Settings → Version).  
> For setup and repo layout, see **[README.md](./README.md)**.

## Product Overview

MyBusiness is a local-first business management web app built with React + Vite.
It is designed for daily sales operations, inventory tracking, receivables control,
expense tracking, reporting, and business settings management.

- **Primary use case:** Small/medium business daily operations
- **Architecture:** Single-page app with overlay workflows
- **Storage model:** Local-first IndexedDB (with cache fallback); optional Supabase sync for multi-device (see below)
- **Offline behavior:** Works without internet for core operations
- **Theme support:** Light mode + dark mode toggle
- **Form factor:** Mobile-first responsive UI with grouped sidebar navigation + mobile app bar (search, notifications)

---

## Main Navigation

The app uses a **grouped sidebar** (Overview, Sales, Purchases, Inventory, Finance, Analytics, Settings). On mobile, open the menu from the app bar; **Search** is available in the sidebar and mobile app bar.

Primary areas include: Dashboard, Invoices, Customers, Receivables, Payables, Purchases, Vendors, Inventory, Branches, Products, Bundles, Balance sheet, Banking, Fixed Assets, Cash flow, Ledger, Expenses, Other income, EMI, Loans given, Reports, Growth, Net Worth, and Settings.

Each area opens as a tab page; detail flows use full-screen overlays (new/edit sale, customer detail, etc.).

---

## Legacy note (pre-4.x)

Older builds used a 5-tab bottom nav (Home / Sales / Inventory / Finance / More). Current builds use the sidebar model above.

---

## All Pages and Screens

## 1) Home Tab

Purpose: Business snapshot + fast daily actions.

Includes:
- KPI cards and summary blocks
- Month/period-based snapshot data
- Recent activity and alerts
- Quick actions (for example: create sale, add expense)
- Notification center trigger

Main user outcomes:
- Quickly see business health
- Jump into new sale/expense flows in one tap

---

## 2) Sales Tab

Purpose: Manage invoices and sales lifecycle.

Includes:
- Sales list with search and filters
- Month filter
- View mode filter (`all`, `paid`, `pending`, etc.)
- Open invoice detail
- New Sale entry action

Related overlays:
- `NewSaleScreen`
- `SaleDetailScreen`

---

## 3) Inventory Tab

Purpose: Track stock movement and stock availability.

Includes:
- Product/inventory row listing
- Current quantity view
- Add stock in/out flow
- Delete inventory entries

Related overlays:
- `AddStockScreen`
- `ProductCatalogScreen`

---

## 4) Finance Tab

Purpose: Financial position and account structure management.

Includes:
- Financial overview
- Bank accounts management
- Fixed assets management
- Other balance components
- Save/update account allocations

Finance sub-areas:
- Overview
- Accounts editing
- Balance updates

---

## 5) More Tab

Purpose: Access advanced operational pages.

From here, users can open:
- Customers
- Receivables
- Daily Summary
- Ledger
- Cash Flow
- Reports
- EMI List
- Settings
- Search
- Capital Growth

---

## Overlay Pages (Detailed)

## New Sale (`NewSaleScreen`)

Captures:
- Invoice date, invoice number, due date
- Customer details (name, phone)
- Product details (item, description, note)
- Quantity, sale price, cost price, received amount
- Optional finance details (company, loan, EMI)

Behavior:
- Validates required fields
- Auto-generates invoice number if missing
- Calculates totals/profit/outstanding
- Saves sale and updates derived state

---

## Sale Detail (`SaleDetailScreen`)

Shows:
- Invoice metadata
- Customer summary
- Payment status/outstanding
- Action buttons for edit, payment, delete

Actions:
- Record payment
- Edit sale
- Delete sale

---

## Add Stock (`AddStockScreen`)

Supports:
- Stock in
- Stock out
- Product selection or creation
- Quantity and valuation fields

Behavior:
- Prevents invalid stock-out quantities
- Updates inventory calculations

---

## EMI List (`EmiListScreen`)

Purpose:
- View financed invoices and EMI schedule details
- Navigate back to related sale invoices

---

## Expenses (`ExpensesScreen`) + New Expense (`NewExpenseScreen`)

Features:
- One-time expense list
- Recurring expense list
- Add new expense
- Delete normal or recurring entries

---

## Settings (`SettingsScreen`)

Contains:
- Business profile settings
- Invoice prefix and due-day defaults
- Financial year configuration
- Finance companies list
- Theme (dark mode) toggle
- Backup export/import tools
- Reset all data action

High-impact actions:
- Export backup JSON
- Import backup JSON
- Full local data reset (with confirmation)

---

## Capital Growth (`CapitalGrowthScreen`)

Purpose:
- Period-wise view of sales, expenses, and net capital trend

---

## Reports (`ReportsScreen`)

Purpose:
- Aggregated reporting for printable/operational review

Includes:
- Sales and expense summaries
- Inventory and balance references
- Receivable and performance indicators

---

## Customers (`CustomersScreen`)

Purpose:
- Customer-level list generated from sales
- Search and navigation to customer profile

---

## Customer Detail (`CustomerDetailScreen`)

Purpose:
- Full transaction history for one customer
- View linked invoices and payment/outstanding context

---

## Receivables (`ReceivablesScreen`)

Purpose:
- Track unpaid and partially paid invoices
- Open invoice directly for payment or follow-up

---

## Product Catalog (`ProductCatalogScreen`)

Purpose:
- Product-level stock and movement visibility
- Quick lookup for inventory operations

---

## Ledger (`LedgerScreen`)

Purpose:
- Combined chronological view of inflows/outflows
- Sales + expense lines in one timeline

---

## Cash Flow (`CashFlowScreen`)

Purpose:
- Period cash flow analysis
- Understand inflow vs outflow position

---

## Daily Summary (`DailySummaryScreen`)

Purpose:
- Day-level sales/expense snapshot
- Quick close-of-day business review

---

## Search (`SearchScreen`)

Global search overlay across:
- Sales/invoices
- Customer references
- Expenses
- Inventory items

---

## Data Model and Persistence

### Local-first storage

Primary persistence is IndexedDB (`mybusiness_offline_v1`) with normalized stores:
- `user_settings`
- `sales`
- `expenses`
- `recurring_expenses`
- `inventory_entries`
- `emi_entries`
- `dismissed_alerts`
- plus legacy `cache` snapshot and optional empty legacy stores from older app versions

Fallback storage path:
- `cache/app_state` snapshot is also maintained for recovery fallback.

Key characteristics:
- Writes are performed on user actions (save/update/delete)
- App loads local state at startup before full interaction
- Pending writes are tracked to reduce accidental data-loss refreshes

### Optional cloud sync (Supabase)

When `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set and the user signs in with cloud:

- Local changes are queued in an **outbox** and uploaded to server `entity_records` when online.
- **New device / empty local data:** a **full snapshot** can be restored from the server.
- **Device already has data:** **incremental** fetch of rows newer than a saved time cursor; **newer `updated_at` wins** per record (ties keep the local copy).
- Background sync runs on a **timer** (about every **20 seconds** while the app is open), when the **tab becomes visible**, and when the network comes **back online**; **Settings → Cloud** shows status, outbox, sync conflicts (with **local preview restore**), and a manual sync button.

---

## Data Integrity and Reliability Features

- Input validation on critical forms
- Safe list guards for malformed records
- ErrorBoundary for runtime crash capture
- Defensive persistence flow (non-destructive writes)
- Boot-time fallback from normalized stores to cache snapshot
- Backup export/import support for data portability

---

## Notifications and PWA

- Installable PWA manifest
- Service worker for production caching/offline shell
- In-app notification center and alert handling
- Background sync hooks (best effort)

Note:
- Service worker is disabled in development mode to avoid stale-dev cache issues.

---

## Workflow Summary (Business Operations)

## Sales workflow
1. Create New Sale
2. Save invoice
3. Track payment/outstanding in Sale Detail + Receivables
4. Update payment status via Record Payment

## Inventory workflow
1. Add stock in/out entries
2. Track current quantity and valuation
3. Use Product Catalog for quick product-level visibility

## Expense workflow
1. Add one-time or recurring expenses
2. Track expense impacts in reports/ledger/cash flow

## Reporting workflow
1. Open Reports / Ledger / Cash Flow / Daily Summary
2. Review period performance and position
3. Use Settings + backup for operational continuity

---

## Operational Notes

- The app is currently optimized around single local business data context.
- No mandatory cloud backend is required for day-to-day usage.
- Regular backups are recommended for business-critical deployments.
- For production hosting, use build output from `dist/`.

---

## Technical Stack

- React
- Vite
- IndexedDB via `idb`; optional Supabase (`@supabase/supabase-js`) for auth + `entity_records` sync
- CSS-based responsive design system
- PWA manifest + service worker

---

## Quick Start

```bash
npm install
npm run dev
```

Production:

```bash
npm run build
npm run preview
```





