# Changelog

All notable changes are tracked here. The Settings screen shows **Version** from `package.json`.

## [8.6.0] — 2026-06-30

### Features
- **Invoices** — Draft state with gapless BPH/FY numbering; confirm assigns `BPH/2425/NNNN`; confirmed invoices cannot be deleted.
- **Credit notes** — Issue credit note flow against confirmed invoices; original invoice marked cancelled; credit note list tab.
- **Payments** — Split payment tracking with method, reference, and UNPAID/PARTIAL/PAID status on list and detail.
- **Banking** — Transaction categories for P&amp;L linkage; categorized bank transfers feed profit &amp; loss reports.
- **Validation** — Chassis/serial number uniqueness check on invoice confirm with inline errors.

### Improvements
- **Data** — Schema v3 migration (invoice status, payments, credit notes, banking categories on legacy data).

App version **8.6.0**; service worker cache **v134**.

---

## [8.5.0] — 2026-06-30

### Improvements
- **Money** — All financial amounts stored and calculated as integer paise (no float GST/P&amp;L errors); `formatINR` display throughout.
- **Data** — Schema v2 with automatic v1→v2 migration on load (rupee floats → paise integers).
- **Design** — `src/tokens.js` design token system; CSS variables injected at app root.
- **Backup** — Import safety checks before restore (`checkImportSafety`).

### Fixes
- **GST** — Invoice GST model uses integer paise arithmetic (`calcGST`, `splitGST`, `calcTaxableFromInclusive`).

App version **8.5.0**; service worker cache **v133**.

---

## [8.4.2] — 2026-06-29

### Fixes
- **Inventory** — Credit/debit notes no longer trigger automatic stock-out or stock sufficiency checks when cloned from an invoice.

App version **8.4.2**; service worker cache **v132**.


---

## [8.4.1] — 2026-06-24

### Features
- **Invoices** — Per-line **Item description** on New Sale; text appears on printed and PDF invoices under each product name.

App version **8.4.1**; service worker cache **v131**.

---

## [8.4.0] — 2026-06-24

Production release — accounts, invoicing, and reports.

### Features
- **Invoices** — Duplicate sale; credit/debit notes linked to original invoice; UPI QR on print (Settings → Business).
- **Reports** — Hub with 22 reports (Sales, Purchase, Other, GST); FY / month / custom date range; executive snapshot on hub.
- **Reports** — PDF & CSV export; bill-wise / party-wise toggle; GSTR-1, GSTR-2B, GSTR-3B; Tally XML export.
- **Customers & vendors** — Account statement PDF and CSV from detail screens.

### Improvements
- **Dashboard & receivables** — Credit notes reduce receivables via signed amounts; accrual revenue uses signed sale totals.
- **Credit/debit note print** — Shows linked original invoice number on printed documents.
- **Settings** — Credit/debit note prefixes and counters; UPI payee name for QR.

App version **8.4.0**; service worker cache **v130**.

---

## [8.3.3] — 2026-06-24

### Features
- **Reports** — Export buttons (PDF, CSV) moved to the top toolbar on every report page.
- **Reports** — **Bill wise / Party wise** toggle on sales, purchase, and payment reports (group by customer or supplier).

App version **8.3.3**; service worker cache **v129**.

---

## [8.3.2] — 2026-06-24

### Features
- **Reports** — Download PDF on every report detail page and on the hub snapshot (A4 layout via print sheet).

App version **8.3.2**; service worker cache **v128**.

---

## [8.3.1] — 2026-06-24

### Improvements
- **Reports** — Executive snapshot (net profit, margins, collection rate, period purchases) restored at the top of the reports hub.

App version **8.3.1**; service worker cache **v127**.

---

## [8.3.0] — 2026-06-24

### Features
- **Reports** — Hub with separate pages: Sales Reports (sales, outstanding, product, inward payment), Purchase Reports, Other Reports (ledger, P&amp;L, stock, daybook, etc.), and GST Reports (GSTR-1, GSTR-2B, GSTR-3B).
- **Reports** — Smart period bar: FY, month, custom from–to range, and all time on every report page; CSV export on tabular reports.

### Improvements
- **Vendors** — Statement PDF and CSV export on vendor detail (mirrors customer).
- **Domain** — Shared `reportPeriod`, `businessReports`, `profitLoss`, `gstr2b`, and `gstr3b` modules.

App version **8.3.0**; service worker cache **v124**.

---

## [8.2.0] — 2026-06-29

### Features
- **Invoices** — Duplicate sale; credit note and debit note linked to original invoice; UPI QR on printed invoices (Settings → Business → UPI ID).
- **Reports** — GSTR-1 summary with CSV/JSON export; Tally XML export for sales, receipts, purchases, and expenses.
- **Customers** — Account statement PDF and CSV export from customer detail.

### Improvements
- **P&amp;L / reports** — Credit notes reduce revenue and receivables via signed amounts.
- **Settings** — Credit/debit note prefixes and next numbers; UPI payee name for QR.

App version **8.2.0**; service worker cache **v123**.

---

## [8.1.12] — 2026-06-29

### Fixes
- **Cash flow** — Customer advance receipts count in the month received (aligned with Banking); advance-applied invoice payments no longer inflate operating inflow.
- **Banking** — Customer advance payments can be deleted from account activity when not yet applied to invoices.
- **GST invoices** — Amount in words includes paise; reverse charge excludes tax from grand total (tax shown for disclosure); negative qty/prices blocked on save.

App version **8.1.12**; service worker cache **v122**. Supabase migration `20260629120000_entity_records_add_customer_advance_payments.sql` required for cloud sync of advance payments.

---

## [8.1.11] — 2026-06-29

### Fixes
- **Payments** — Period KPIs no longer double-count advance-applied invoice receipts; list renders before scroll parent mounts.
- **Advances** — Removing an advance-applied payment restores unapplied balance; bank account delete clears advance bank links; balance sheet includes advance liability and historical bank totals with advances.
- **GST invoices** — Explicit 0% GST rate honoured; discount shown on tax invoices; line-items footer no longer double-counts additional charges; bundled line serials preserved on GST print.
- **Navigation** — Mobile Settings sub-screens get a back button; Payments page title on mobile; tab changes clear stale selection state; Escape/swipe back uses proper close handlers for expense/stock forms.
- **Other** — Transfer save reports persist failure; duplicate invoice numbers blocked on save; PDF download shows inline error; `html2pdf.js` declared in dependencies; debug telemetry removed.

App version **8.1.11**; service worker cache **v121**.

---

## [8.1.10] — 2026-06-29

### Fixes
- **Payments In/Out** — Customer advance picker showed blank names (`displayName` vs `name`); advance payments now persist to IndexedDB; banking balances and activity include advance receipts.

App version **8.1.10**; service worker cache **v121**.

---

## [8.1.9] — 2026-06-29

### Features
- **Payments In/Out** — Finance sidebar module listing all customer receipts, supplier payments, and advance payments with payment IDs, detail panel, and printable receipts. Record customer advance payments and apply unapplied balance to outstanding invoices.

App version **8.1.9**; service worker cache **v120**.

---

## [8.1.8] — 2026-06-29

### Features
- **More invoice templates** — four layout styles (Compact, Centered, Framed, Stacked) and five colour themes (Ocean, Forest, Burgundy, Royal, Sunset). Settings → Invoice groups templates by type.

App version **8.1.8**; service worker cache **v119**.

---

## [8.1.7] — 2026-06-29

### Features
- **Invoice templates** — Settings → Invoice: choose from four print/preview layouts (Premium, Classic, Modern, Minimal). All include full GST Rule 46 fields; templates change visual style only (Tally / Zoho Books inspired).

App version **8.1.7**; service worker cache **v118**.

---

## [8.1.6] — 2026-06-27

### Fixes
- **Cloud sync during edits** — Background pull no longer overwrites in-memory changes made while sync is in flight (restores pending-write / debounce guard removed in v8.1.5).

App version **8.1.6**; service worker cache **v117**.

---

## [8.1.5] — 2026-06-27

### Fixes
- **Historical balance sheet** — Bank totals as-of a past date are recomputed from transactions (opening + activity), not today’s stored book balances.
- **Receivables / outstanding** — Non-bank payment lines now count toward amount received (mixed bank + cash payments no longer overstate outstanding).
- **Fixed assets save** — Save reads latest edits via functional `setState` (same fix as Banking); no more stale values when saving immediately after edit.
- **Cloud sync restore** — Full restore and incremental pull always hydrate React state after IndexedDB apply; legacy workspace import no longer overwrites non-empty local data.
- **GST tax invoices** — Customer state is required when saving a GST-enabled tax invoice; `interStateOverride` supported for explicit IGST when place of supply is known.

App version **8.1.5**; service worker cache **v116**.

---

## [8.1.4] — 2026-06-27

### Improvements
- **Dashboard sparkline tooltip** — Frosted glass pointer (deep blur) that blends with the KPI card background in light and dark mode.
- **Mobile scrubber** — Taller touch target (40px), edge-clamped tooltip, and lost-pointer cleanup so drag feels smooth on phones without fighting page scroll.

App version **8.1.4**; service worker cache **v115**.

---

## [8.1.3] — 2026-06-27

### Features
- **Dashboard sparkline scrubber** — Touch or drag Revenue and Net profit mini-charts to see a minimal pointer with date and amount; hidden until interacted with.

App version **8.1.3**; service worker cache **v114**.

---

## [8.1.2] — 2026-06-27

### Improvements
- **Dashboard sparklines** — Removed Receivables chart. Revenue and Net profit sparklines now follow the selected month (or full FY when month filter is cleared) and respect cash vs accrual basis.

App version **8.1.2**; service worker cache **v113**.

---

## [8.1.1] — 2026-06-27

### Features
- **Signature upload** — Settings → Invoice → Upload signature; image appears above “Authorised Signatory” on all printed invoices (PNG/JPG, max 350 KB).

### Fixes
- **TAX INVOICE title** — Large centered “TAX INVOICE” banner on every GST invoice print (with copy label). Full GST columns print whenever GST invoicing is on and business GSTIN is set.

App version **8.1.1**; service worker cache **v112**.

---

## [8.1.0] — 2026-06-27

### Features
- **Premium Invoice PDFs** — Complete redesign of all three invoice layouts (GST Tax Invoice, Bill of Supply, Simple Invoice) to a professional Tally/Zoho Books–style black-and-white letterhead format:
  - **Logo on every layout** — business logo now appears in the letterhead header of all invoice types, not just Bill of Supply.
  - **Premium letterhead header** — company name (large bold), address, phone, WhatsApp, GSTIN, and PAN displayed cleanly on the left; "TAX INVOICE" / "BILL OF SUPPLY" / "INVOICE" in a bold bordered badge on the right with the copy label (Original/Duplicate/Triplicate) below.
  - **Two-column Bill To block** — "Bill To" (customer name, address, GSTIN, Place of Supply) on the left, Invoice No. / Date / Due Date / Reverse Charge on the right in a structured table.
  - **GST line-items table** — dark black header row (white text), alternating light-gray body rows, dark totals row; columns: Sr., Description, HSN/SAC, Qty, Rate, Taxable Value, CGST %, CGST ₹, SGST/UTGST %, SGST ₹ (or IGST for inter-state), Total.
  - **HSN/SAC Summary table** — aggregated by HSN/rate with per-column tax breakdown and a bold totals row.
  - **Amount in Words** — Indian numbering (crore/lakh) in uppercase, in a bordered band below HSN summary.
  - **Tax summary panel** — right-column table: Taxable Amount → CGST/SGST (or IGST) → Total Tax → **Grand Total** (dark inverted row) → Payment Received → Balance Due.
  - **Signature footer** — E&OE disclaimer (italic) left, "For COMPANY NAME" + signature line + "Authorised Signatory" right.
  - Full Indian GST law compliance: GSTIN of supplier, place of supply, reverse-charge field, HSN/SAC per line, CGST/SGST/IGST split, invoice copy label.

App version **8.1.0**; service worker cache **v111**.

---

## [8.0.11] — 2026-06-27

### Improvements
- **Sidebar** — Restored flat navigation (no collapsible sections); neutral dim overlay and charcoal drawer styling so opening the menu no longer washes the screen blue.

App version **8.0.11**; service worker cache **v110**.

---

## [8.0.10] — 2026-06-27

### Improvements
- **Cloud sync reliability** — Flush debounced local saves before sync; defer pull when persist is busy; honor pending outbox in LWW merge; persist audit/conflict queues; store server revision after push; multi-batch outbox drain; fix duplicate conflict queue entries.
- **Balance sheet** — Removed the Assets = Liabilities + Equity verification strip and current ratio line from the overview.

App version **8.0.10**; service worker cache **v109**.

---

## [8.0.9] — 2026-06-27

### Features
- **Draft invoices** — New-sale form auto-saves in progress to `settings.saleDraft`; resume from Home or Invoices, discard from banner or the form; cleared on successful save.
- **Owner drawings** — Banking withdraw/deposit modals support owner drawing and owner capital flags; Cash flow shows operating vs financing breakdown with owner drawings line.

### Improvements
- **Balance sheet** — New line **Current assets − liabilities** (working capital) after total liabilities, with signed coloring.

App version **8.0.9**; service worker cache **v108**.

---

## [8.0.8] — 2026-06-27

### Features
- **Balance sheet — as-of date** — Pick a historical date; receivables, stock, GST, payables, and fixed-asset net book recalculate for that day (bank balances stay current with a clear note).
- **Fixed assets — auto depreciation** — Straight-line net book from purchase date and % p.a.; balance sheet and register show net (not gross) totals.
- **Settings — Year-end close** — Guided checklist, FY-labelled backup download, and saved FY snapshots (totals + optional note).

### Improvements
- **Reset all data** — Reset flow offers “Download backup now” before the final erase step; confirms whether a backup was downloaded this session.
- **Backup import** — Validates schema version and app version; blocks imports from newer schemas; warns on legacy or older app backups.

App version **8.0.8**; service worker cache **v107**.

---

## [8.0.7] — 2026-06-27

### Features
- **Balance sheet** — GST net liability row, Assets = Liabilities + Equity verification strip, and current ratio when liabilities exist.
- **Dashboard** — 60-day sparklines on Revenue, Net profit, and Receivables KPI cards.
- **Reports** — Month-over-month delta on revenue and net profit when viewing a single month.
- **Search** — Fuzzy matching via Fuse.js (names, SKUs, typos) with legacy phone/digit matchers kept.

### Improvements
- **Service worker** — Cache `VERSION` auto-syncs from `package.json` on build (`scripts/sync-sw-version.mjs`); no manual `sw.js` bump.
- **Vitest** — Domain unit tests (`npm run test:unit`) for money rounding, GST, banking activity, EMI alerts, sparklines, purchase duplicates.
- **Sync safety** — Persist mutex prevents cloud sync from overwriting in-flight IndexedDB saves.
- **Banking** — Deleting a bank account clears linked payment/stock/expense references (no orphaned IDs).
- **Purchases** — Blocks duplicate supplier invoice numbers for the same vendor.

App version **8.0.7**; service worker cache **v106**.

---

## [8.0.6] — 2026-06-27

### Improvements
- **Dead code removal** — Retired Loans Given UI (15 screens), orphaned Daily Summary and Bundles screens, unused `useLoanGivenActions`, and legacy `src/lib` re-export shim. Loan *data* still loads/syncs and appears in banking, cash flow, and ledger; only the unreachable management UI and nav plumbing were removed. PWA shortcut for loans removed.

App version **8.0.6**; service worker cache **v105**.

---

## [8.0.5] — 2026-06-26

### Improvements
- **New sale** — Picking a product fills sale price from the last invoice for that item; falls back to inventory list price if never sold.

### Fixes
- **Purchases & banking** — Credit purchases no longer double-hit bank via stock-in rows; supplier cash only moves on `paymentEntries`. Legacy `received` without payment lines migrates on load. Purchase-linked inventory strips stray `bankAccountId`.
- **Purchases UI** — Clear “paid now = 0 for credit” hint; bank account picker only when paying; remove supplier payments from purchase detail.

App version **8.0.5**; service worker cache **v104**.

---

## [8.0.4] — 2026-06-26

### Fixes
- **Banking — activity delete on mobile** — Small trash icon (24px) sits tight beside each row again; visible tint, amounts keep full width.

App version **8.0.4**; service worker cache **v103**.

---

## [8.0.3] — 2026-06-26

### Fixes
- **Banking — account activity on mobile** — Delete action moves below each row so amounts are not clipped; wider side padding and full-width amount columns.

App version **8.0.3**; service worker cache **v102**.

---

## [8.0.2] — 2026-06-26

### Improvements
- **Inventory — redesign & polish** — Hero stock-value card, KPI grid (products / in stock / low), branch chips, stock-level filters, quick Stock in / Opening / Out actions, status pills on rows, and product detail month filter with All-time movements toggle. Fixes text cutoffs on small screens.

App version **8.0.2**; service worker cache **v101**.

---

## [8.0.1] — 2026-06-26

### Improvements
- **Banking — redesign & polish** — Hero card for total liquid, month-scoped In / Out / Net KPIs, aligned account rows with kind dots and exclude badges, shared month picker, and account detail month filter with All-time activity toggle. Fixes text cutoffs on small screens.

App version **8.0.1**; service worker cache **v100**.

---

## [8.0.0] — 2026-06-26

### Features
- **Settings — GST master toggle** — Turn all GST-related features on or off from Invoice settings: HSN/GST on products and sales, business GSTIN/PAN/state code, and tax-invoice print layout. Bill of Supply and chassis/motor/battery fields remain available when GST is off.

App version **8.0.0**; service worker cache **v99**.

---

## [7.3.21] — 2026-06-26

### Features
- **Invoices — professional GST print** — Tax invoice PDF/print layout matched to standard GST billing format: customer detail block, HSN/CGST/SGST table, HSN summary, amount in words, terms, and tax totals panel.
- **Invoices — Bill of Supply print** — Simple BOS print layout (no GST columns).
- **Settings** — Business address, GSTIN, PAN, logo upload, invoice notes/terms/signatory, default HSN/GST.
- **Sales form** — Customer GSTIN, reverse charge, print copy type, per-line HSN/GST, chassis/motor/battery serials.
- **Products** — HSN and GST % defaults per product for invoice lines.

App version **7.3.21**; service worker cache **v97**.

---

## [7.3.20] — 2026-06-26

### Improvements
- **WhatsApp (sales only)** — Invoice/BOS share message includes the review link; EMI and service reminders no longer include it.

App version **7.3.20**; service worker cache **v96**.

---

## [7.3.19] — 2026-06-26

### Improvements
- **WhatsApp** — Customer messages (invoice share, EMI reminders, service reminders) now include a review link to [biswajitpowerhub.in/reviews](https://www.biswajitpowerhub.in/reviews).

App version **7.3.19**; service worker cache **v95**.

---

## [7.3.18] — 2026-06-25

### Features
- **Invoices** — New **BOS** filter on the list page to show only Bill of Supply documents (month and search filters still apply).

App version **7.3.18**; service worker cache **v94**.

---

## [7.3.17] — 2026-06-24

### Improvements
- **Boot / loading screen** — Faster startup: one Supabase session read instead of two, IndexedDB opens in parallel with auth, local data prefetched when a remembered account exists, and a shorter finish animation.

App version **7.3.17**; service worker cache **v93**.

---

## [7.3.16] — 2026-06-23

### Fixes
- **Banking** — KPI amounts no longer clip; values wrap and stack on narrow screens.

App version **7.3.16**; service worker cache **v92**.

---

## [7.3.15] — 2026-06-23

### Improvements
- **Balance sheet** — **Subtotal — current** row highlighted in green for quick scanning.

App version **7.3.15**; service worker cache **v91**.

---

## [7.3.14] — 2026-06-23

### Features
- **Servicing** — **Next 7 days** group at top for upcoming pending visits; **Sent** mark on WhatsApp reminders (persisted and synced).

App version **7.3.14**; service worker cache **v90**.

---

## [7.3.13] — 2026-06-23

### Improvements
- **Dashboard privacy** — eye toggle also blurs Revenue and COGS (with net and gross profit).

App version **7.3.13**; service worker cache **v89**.

---

## [7.3.12] — 2026-06-23

### Features
- **Dashboard** — eye toggle on net profit blurs net and gross profit; hidden by default on every app load/reload; mobile-friendly tap target.

App version **7.3.12**; service worker cache **v88**.

---

## [7.3.11] — 2026-06-23

### Improvements
- **Servicing WhatsApp** — product name removed from the reminder message text.

App version **7.3.11**; service worker cache **v87**.

---

## [7.3.10] — 2026-06-23

### Features
- **Settings → Notifications** — separate toggle for free service reminder **2 days before** due date (in addition to existing 3-day, today, and overdue alerts).

App version **7.3.10**; service worker cache **v86**.

---

## [7.3.9] — 2026-06-23

### Improvements
- **Banking** — activity rows stack on narrow screens; account list edge-to-edge on phone; bank account overlay centered on desktop.
- **Fixed assets** — mobile card layout replaces horizontal table scroll.

App version **7.3.9**; service worker cache **v85**.

---

## [7.3.8] — 2026-06-23

### Improvements
- **Responsive lists** — all list screens comfortable on narrow phones through desktop: flush overlay lists, edge-to-edge tab lists on mobile, stacked row layouts under 380px, loan 3-column rows stack under 420px, centered 720px column on desktop.

App version **7.3.8**; service worker cache **v84**.

---

## [7.3.7] — 2026-06-23

### Improvements
- **Search** — responsive layout for all screen sizes: centered panel on tablet/desktop, full-width scroll on phone, tighter rows on narrow screens, truncated subtitles, safe-area padding.

App version **7.3.7**; service worker cache **v83**.

---

## [7.3.6] — 2026-06-23

### Improvements
- **Net Worth** — removed “Ahead of what you put in…” verdict text under Invested vs book equity.

App version **7.3.6**; service worker cache **v82**.

---

## [7.3.5] — 2026-06-23

### Improvements
- **Reports** — removed Top customers and Top products sections.
- **Growth** — removed redundant Net profit / Cumulative KPI strip (charts and table remain).
- **Balance sheet** — business name header moved below snapshot strip; removed equation hint, section intros, and profit-kept footnote.
- **New Sale** — removed product search box; payment section separated; responsive layout polish for all screen sizes.
- **Sidebar** — removed Light/Dark theme toggle (theme still in Settings).

App version **7.3.5**; service worker cache **v81**.

---

## [7.3.4] — 2026-06-23

### Improvements
- **Dark theme readability** — softened body text (`#b8b8b8`), labels, accents, and toasts for less eye strain; black backgrounds unchanged. Muted primary, semantic colors, toggles, KPI chips, and focus rings.

App version **7.3.4**; service worker cache **v80**.

---

## [7.3.3] — 2026-06-23

### Improvements
- **Dark theme** — shifted from blue-tinted navy to neutral near-black surfaces (`#0a0a0a` page, `#161616` cards, `#000` sidebar). PWA status bar, login, and report headers updated to match.

App version **7.3.3**; service worker cache **v79**.

---

## [7.3.2] — 2026-06-23

### Fixes
- **PWA home-screen name** — changed from “MyBiz” to “MyBusiness” (`manifest.json` `short_name` and iOS `apple-mobile-web-app-title`).

App version **7.3.2**; service worker cache **v78**.

---

## [7.3.1] — 2026-06-23

### Improvements
- **App logo & icons** — replaced PWA icons (favicon, Apple touch, manifest sizes 48–512) with the new MyBusiness brand artwork from app store assets. Sidebar, login, and boot splash now show the updated logo.

App version **7.3.1**; service worker cache **v77**.

---

## [7.3.0] — 2026-06-23

### Performance
- **Memoized `mergedMainStageProps`** — `useMemo` with full dep array prevents `MainStage` from re-rendering on unrelated parent state ticks.
- **`React.memo` on `MobileAppBar` and `AppSidebar`** — both are pure display components that now skip renders when their props are unchanged.

### Animation / Motion
- **Removed `nw-pulse` infinite animation** — net-worth live dot is now a static indicator; no unnecessary infinite RAF usage.
- **Removed `slideUp` animation on overlay screens** — overlays open instantly; no janky slide on low-end devices.
- **Removed decorative tap-scale transforms** — `.home-md3-action:active`, `.fab:active`, `.kpi-card:active`, `.qa-btn:active`, `.action-btn:active` no longer apply `translateY`/`scale`; interactions feel crisp and consistent.
- **Single authoritative `prefers-reduced-motion` block** — consolidated from 3 competing blocks into one in `premium-ui.css`; sidebar and scroll fallbacks merged in.

### CSS Fixes
- **Duplicate `-webkit-backdrop-filter`** on `.modal-overlay` removed; correct `blur(8px) saturate(1.2)` retained.
- **Duplicate `transition` on `.seg-btn`** removed; single token-based rule applies.
- **`scroll-behavior: auto`** on all main list scrollports (`.main-stage`, `.overlay-scroll`, `.overlay-screen > .list-area`) — programmatic scroll-to calls are now instant, preventing laggy "rewind" feel on low-end Android.
- **`home-md3-action` transition** simplified to `box-shadow + background` only; `transform` removed since active scale was already disabled.

### Typography
- **Font-size floor raised** — all sub-0.65 rem labels (`sidebar-section-label` 0.58→0.66rem, `bank-tx-num-lbl` 0.55→0.65rem, loan pills, growth-table headers, invoice summary labels) meet the minimum legible threshold for small Android screens.

### Spacing / Safe-area
- **`CustomerDetailScreen` and `VendorDetailScreen`** — inline `style={{ padding: 0 }}` on `.overlay-scroll` removed; replaced with `.overlay-scroll--flush` CSS variant that zeroes top/horizontal padding while preserving the bottom safe-area inset.

### Tokens
- **Z-index scale added to `app-tokens.css`** — `--z-appbar`, `--z-sidebar`, `--z-overlay`, `--z-modal`, `--z-toast`, `--z-banner`, `--z-welcome`, `--z-skip-link`; prevents future stacking context surprises.

App version **7.3.0**; service worker cache **v76**.

---

## [7.2.3] — 2026-06-23

### Improvements

- **Dashboard sales target** — all-caps display font styling (scoped MD3 tokens; no layout bleed).

App version **7.2.3**; service worker cache **v75**.

---

## [7.2.2] — 2026-06-23

### Improvements

- **Monthly sales target** — count of sales (e.g. `3 / 10 sales`), not rupees; dashboard line is slightly larger and bold. Re-save your target in Settings → Invoice settings if it was set as an amount.

App version **7.2.2**; service worker cache **v74**.

---

## [7.2.1] — 2026-06-23

### Fixes

- **Monthly sales target** — value saved from Settings → Invoice settings now persists and shows on the dashboard.

App version **7.2.1**; service worker cache **v73**.

---

## [7.2.0] — 2026-06-23

### Features

- **Dashboard** — **Total liquid** KPI (same figure as Banking → Total liquid; respects exclude-from-liquid accounts).

App version **7.2.0**; service worker cache **v72**.

---

## [7.1.9] — 2026-06-23

### Features

- **Dashboard** — monthly sales target progress shown left of the month filter (set in Settings → Invoice settings).

App version **7.1.9**; service worker cache **v71**.

---

## [7.1.8] — 2026-06-23

### Improvements

- **Sidebar** — removed Search from the menu (search remains on the mobile app bar and keyboard shortcut).

App version **7.1.8**; service worker cache **v70**.

---

## [7.1.7] — 2026-06-23

### Features

- **Stock product rename** — on the product detail screen, edit the product name (header edit icon or “Product name” row). Renames all stock entries, sales lines, bundles, and purchase lines for that SKU.

App version **7.1.7**; service worker cache **v69**.

---

## [7.1.6] — 2026-06-23

### Features

- **Bank account settings** — exclude an account from the balance sheet and/or Banking “Total liquid” (for profit, personal, or tracking accounts). Toggles under Account settings on the account detail screen.

App version **7.1.6**; service worker cache **v68**.

---

## [7.1.5] — 2026-06-23

### Fixes

- **Banking KPIs** — stopped amounts and meta text from clipping (removed nowrap/ellipsis on MD3 tiles); banking tab stacks Total / In / Out full-width on mobile.

App version **7.1.5**; service worker cache **v67**.

---

## [7.1.4] — 2026-06-23

### Features

- **Stock item detail** — summary shows On hand, Avg cost, Stock value, and Category in one grid; edit icon on category; add (+) in header and movements show edit icons.
- **Inventory list** — each row has add (+), edit, and delete icon buttons for quick stock in / open detail / remove.

App version **7.1.4**; service worker cache **v66**.

---

## [7.1.3] — 2026-06-23

### Improvements

- **Mobile layout polish** — banking page: KPI strip uses hero + 2-column layout on phones, month picker right-aligned, action buttons in a 2-column grid (Add account full width), account rows stack In/Out cleanly on narrow screens.
- **App-wide mobile spacing** — tighter section headers, reduced filter-bar padding, consistent card margins, balance sheet rows stack on small screens, KPI grids collapse to 1–2 columns on very small phones.

App version **7.1.3**; service worker cache **v65**.

---

## [7.1.2] — 2026-06-23

### Fixes

- **Invoices** — customer initials avatar on invoice rows now uses the shared `avatar` styles (circle, color, centered text); was broken after MD3 list update.

App version **7.1.2**; service worker cache **v64**.

---

## [7.1.1] — 2026-06-23

### Improvements

- **App-wide MD3 polish** — extended dashboard styling to banking, balance sheet, net worth, reports, customer/vendor detail heroes, nested list areas (expenses, overlays), banking account & transaction lists, recurring expense blocks, loans/inventory/product rows, and settings hub as grouped cards.

App version **7.1.1**; service worker cache **v63**.

---

## [7.1.0] — 2026-06-23

### Improvements

- **App-wide Material 3 theme** — dashboard design applied globally: flat backgrounds, flat headers, right-aligned month filter, KPI tiles as rounded cards, list areas in 24px rounded surfaces, MD3 list row spacing, flat FAB and filter pills (no glow), detail/form cards at 24px radius, settings hub rows as elevated tiles.

App version **7.1.0**; service worker cache **v62**.

---

## [7.0.8] — 2026-06-23

### Improvements

- **Dashboard** — removed glow shadow from New sale shortcut button.

App version **7.0.8**; service worker cache **v61**.

---

## [7.0.7] — 2026-06-23

### Improvements

- **Dashboard** — month filter aligned to the right.

App version **7.0.7**; service worker cache **v60**.

---

## [7.0.6] — 2026-06-23

### Improvements

- **Dashboard** — removed redundant mobile greeting block (Dashboard / business name / date) that duplicated the app bar; KPI grid starts sooner.

App version **7.0.6**; service worker cache **v59**.

---

## [7.0.5] — 2026-06-23

### Improvements

- **Dashboard** — net profit tile shows other income as small subtext (`incl. ₹X OI`) when OI is non-zero.

App version **7.0.5**; service worker cache **v58**.

---

## [7.0.4] — 2026-06-23

### Improvements

- **Dashboard KPIs** — all six metrics in one responsive grid (no horizontal scroll): 2×2 on small phones, 3-column on medium screens, 5-column row on tablet, compact bento layout on desktop. Fluid `clamp()` typography and ellipsis so large amounts fit on every screen width.

App version **7.0.4**; service worker cache **v57**.

---

## [7.0.3] — 2026-06-23

### Improvements

- **Dashboard — Material 3 / modern Android** — hero net-profit card with 28px rounded corners and tonal primary surface; revenue + receivables split below; horizontally scrollable metric chips (COGS, gross, expenses, receivables); filled + tonal action buttons; list sections with 40px avatars and clean dividers (Google Pay / Android 14 style). Flat background, no gradient KPI grid.

App version **7.0.3**; service worker cache **v56**.

---

## [7.0.2] — 2026-06-23

### Fixes

- **Saved values flickering / reverting** — cloud sync no longer overwrites newer local saves with stale remote snapshots. Conflict resolution is now true last-write-wins by timestamp (local kept when newer, even after outbox upload). UI reloads fresh data from device storage after sync instead of using a pre-push snapshot that could be outdated if you saved mid-sync.

App version **7.0.2**; service worker cache **v55**.

---

## [7.0.1] — 2026-06-23

### Fixes

- **Servicing “Done” not sticking** — marking a free service visit complete was lost on cloud sync because `servicingCompletions` was stripped from settings upload/download. Completions now sync end-to-end; local completions are preserved when merging older remote settings rows.
- **Bell alert after Done** — marking a visit complete now also dismisses its servicing notification immediately.

App version **7.0.1**; service worker cache **v54**.

---

## [7.0.0] — 2026-06-23

### Features & Improvements

- **Full app overhaul** — every screen redesigned: invoices, customers, expenses, purchases, receivables, banking, reports, growth, settings, balance sheet, net worth.
- **Invoice list** — avatar initials on every row (hashed colour per customer); persistent status left-border: red = overdue, amber = partial, purple = unpaid.
- **Seg-bars → pill tabs** — filter tabs on all list screens (Invoices, Receivables, Purchases, Expenses) now render as filled pill buttons with a primary glow on active.
- **Sort chips** — same pill treatment on Customers, Vendors, Receivables sort controls.
- **Activity icon circles** — Purchases/Ledger/Banking icon badges now 38 px rounded squares; colour-coded by type (amber = purchase, red = expense, green = payment, blue = sale).
- **Expense category rows** — faint red left-accent bar darkens on hover.
- **Detail screen heroes** — blue-to-white gradient background on all detail overlays.
- **Settings hub rows** — coloured icon squares with brand glow; hover state highlights with primary tint.
- **Empty states** — 64 px icon circle, rounded 20 px, brand colour with blue glow instead of flat grey.
- **Search bars** — pill-shaped on all overlay screens.
- **FAB** — gradient primary with stronger glow on all screens.
- **Tab appbar** — subtle blue-tinted gradient header replaces flat white on every page.
- **Field labels** — uppercase, 7 % letter-spacing, muted2 colour across all forms.
- **Service worker** — cache busted to **v53**; existing installs upgrade cleanly, all IndexedDB data preserved.

App version **7.0.0**; service worker cache **v53**.

---

## [6.2.0] — 2026-06-23

### Improvements

- **Premium makeover** — complete visual overhaul: new gradient design tokens, richer home page background, icon-accented KPI cards with per-metric color top bars, avatar initials on all list rows, gradient "New Sale" action button, card-style recent activity sections with rounded corners and shadows.
- **Dashboard** — KPI cards now show a contextual icon (Revenue → chart, COGS → box, etc.); mobile home-hdr hidden (MobileAppBar handles title/search/bell); desktop header shows gradient accent.
- **Sidebar** — brand area gets a gradient fade from primary; active item highlight matches brand color; section labels more legible.
- **Notifications** — panel gets colored left border per alert kind (danger = overdue, warning = due soon, teal = stock, green = servicing); bell badge repositioned with card border.
- **Balance sheet** — "Loans given (informal)" removed from assets total and display; plain-language section labels; collapsible detail rows.
- **Tokens** — `--gradient-primary`, `--gradient-home`, `--gradient-card-accent`, `--gradient-sidebar-brand` added to design system.

App version **6.2.0**; service worker cache **v52**.

---

## [6.1.0] — 2026-06-23

### Features

- **Servicing module** — 3 free visits at months 1, 2, 3 after each sale; mark complete, WhatsApp reminders, bell alerts.
- **Invoice numbers** — smart “Suggest next” with manual override; sales list sorted by invoice number (highest first).
- **Document types** — Invoice and Bill of Supply with separate prefixes and sequences.

### Improvements

- **Dashboard** — cleaner layout, KPI cards, recent activity sections.
- **Settings** — servicing due notification toggle (replaces loan milestone alerts in UI).

### Removals

- **Loans Given** and **Bundles** modules removed from navigation and new-sale UI. Existing `loansGiven`, `bundles`, and `bundleId` on old sales are preserved on sync/import for balance-sheet accuracy.

App version **6.1.0**; service worker cache **v51**.

---

## [6.0.4] — 2026-06-23

### Features

- **New invoice — split payments** across multiple bank/cash accounts on create and edit (`paymentLines` → `paymentEntries`).
- **Dashboard** — Net profit shows other income in small text; **Recent Sales**, **Recent Purchases**, and **Receivables** sections.

### Improvements

- **Sales list** — newest invoices first (date desc, then creation id when dates tie).
- **Banking** — account list uses live computed balances; month filter follows dashboard period; debounced persist writes normalized balances for sync.

App version **6.0.4**; service worker cache **v50**.

---

## [6.0.3] — 2026-05-29

### Fixes

- **Balance sheet — Loans given (informal)** counts and line items use **outstanding principal only** (interest receivable is no longer added to assets or per-borrower rows).

App version **6.0.3**; service worker cache **v49**.

---

## [6.0.2] — 2026-05-29

Focus: **Boot / loading screen never hangs** offline or on slow IndexedDB.

### Fixes

- **Bootstrap watchdog** (14s) and per-step timeouts for session check + local hydrate.
- **IndexedDB open + load** time-boxed so a blocked database cannot freeze the splash.
- **Finish animation** runs once; 2.5s safety dismisses splash after auth is ready.

App version **6.0.2**; service worker cache **v48**.

---

## [6.0.1] — 2026-05-29

Focus: **Borrowers & Partners directories** aligned with Loans given list UX; lint fix.

### Improvements

- **Borrowers / Partners lists** — same 3-column uniform rows as Loans given (name + loan count below, KPIs, filters, column headers).
- **Shared directory components** — `LoanGivenDirectoryList.jsx` for consistent layout.

### Fixes

- **Notifications** — `onNotificationClick` dependency array includes `emiEntries` (ESLint clean).

App version **6.0.1**; service worker cache **v47**.

---

## [6.0.0] — 2026-05-29

Major release: **offline-first reliability**, **premium mobile UI**, **bulletproof sync**, **EMI + Loans given** product polish, and **smooth app-wide scrolling**.

### Highlights

- **Offline-first & PWA** — boot no longer hangs offline; full asset precache; chunk recovery; service-worker auto-update after deploy; premium boot screen.
- **Cloud sync** — shared timed session helper, payload normalization, outbox sanitization, adaptive backoff, `test:sync` sanity coverage.
- **EMI** — single reminder **3 days before** each due date with WhatsApp message; OS push aligned to that rule only.
- **Loans given** — portfolio KPIs; Active / Overdue / Settled filters; uniform list rows (date under borrower); borrower & partner directories; reconciled P+I; record-payment footer; lean copy (no coaching hints).
- **Motion** — smooth scroll on all scrollports; sidebar drawer + fading backdrop; respects `prefers-reduced-motion`.

### Improvements (5.x carried into 6.0)

- Premium design tokens, mobile tap targets, static skeletons (no shimmer junk).
- Loan Given P+I calculations, partner splits, typed repayments, balance-sheet toggle.
- Root verify pipeline: domain, sync, config, SQL, Supabase pre-push safety.

### Fixes

- README / package version drift caught by `test:pkg`.
- Loans list lint: summary header extracted as stable component (Virtuoso layout).

App version **6.0.0**; service worker cache **v46**.

---

## [5.1.2] — 2026-05-29

Focus: **Loans given** — professional end-to-end UI with filters, calculation showcase, and clearer directories.

### Improvements

- **List** — Active / Overdue / Settled filters; richer rows (rate, days on book, interest slice, overdue & off–balance-sheet pills).
- **Detail** — “How amounts are calculated” card (P+I breakdown, simple-interest formula); reconciled principal/interest figures; sticky **Record payment** footer.
- **Borrowers directory** — renamed from “Partys”; portfolio KPIs; outstanding per borrower in list.
- **Partners directory** — accrued and collected share shown on each row.
- **Record payment** — shows estimated accrued interest when a monthly rate is set.

App version **5.1.2**; service worker cache **v45**.

---

## [5.1.1] — 2026-05-29

Focus: **Root polish** — shared auth session helper, sync/domain sanity tests, and PWA theme alignment.

### Improvements

- **Shared Supabase session reader** (`src/data/auth/supabaseSession.js`) — boot and cloud sync use the same timed `getSession()` helper; removed duplicate timeout logic from `cloudSync.js`.
- **Sanity coverage** — `scripts/sync-sanity.mjs` (payload dedup, transient errors); `domain-sanity` for EMI 3-day alerts + WhatsApp messages; `config-sanity` checks SW precache marker.
- **PWA / shell** — `manifest.json` and `index.html` light theme colors match app tokens (`#f5f7fb`, `#23408e`).
- **Docs** — README version and EMI reminder note aligned with app.

App version **5.1.1**; service worker cache **v44**.

---

## [5.1.0] — 2026-05-29

Focus: **Premium product polish** and **EMI notifications exactly 3 days before due** with WhatsApp-ready messages.

### Features

- **EMI alerts simplified** — one reminder per unpaid installment, only when due in exactly 3 days (no more today/tomorrow/soon spam). Bell list includes a **WhatsApp** button with a pre-filled professional message.
- **OS push for EMI** — only the 3-day EMI reminder triggers a system notification (other alert types unchanged).

### Improvements

- **Mobile premium pass** — refined tokens, tap targets, card rhythm, static skeletons (no shimmer), and EMI list/detail typography.
- **Cloud sync hardening** (from 5.0.3 carry-over) — payload normalization, outbox sanitization, session timeout guard, adaptive sync backoff.
- **Notification navigation** — tapping an EMI alert opens EMI detail directly.

### No breaking changes

Existing books data is preserved. Legacy EMI notification settings map to the new single **EMI reminder (3 days before)** toggle. App version **5.1.0**; service worker cache **v43** (`public/sw.js`).

---

## [5.0.3] — 2026-05-29

Focus: **Bulletproof data quality + sync reliability** with stronger offline→online recovery.

### Improvements

- **Mobile premium polish pass (all sizes)** — refined spacing/radius tokens, calmer premium color tuning, larger touch targets, and consistent card geometry across modules for cleaner ergonomics on small and large phones.
- **No junk motion** — removed bouncy tap-scale effects and switched skeletons to static professional placeholders.

### Fixes

- **Cloud sync session timeout guard** — sync now time-boxes session checks and retries safely, preventing edge-case hangs during flaky connectivity transitions.
- **Outbox hardening** — malformed rows are sanitized or dropped safely (with diagnostics), so one bad row cannot block the whole queue.
- **Entity normalization** — remote and local payloads are normalized/deduped by record id before merge, improving cross-device consistency and preventing corrupted payload drift.
- **Background sync stability** — added in-flight guard + adaptive backoff to avoid overlapping sync passes and reduce retry storms.

### No breaking changes

Existing user data, cloud sync, backups, and Supabase migrations are all unchanged. App version **5.0.3**; service worker cache **v42** (`public/sw.js`).

---

## [5.0.2] — 2026-05-28

Focus: **Premium boot experience**, offline app icon, and seamless auto-update.

### Features

- **Redesigned loading screen** — glass logo card with an animated conic halo, gradient wordmark, tagline, live progress percentage, gradient progress bar with travelling sheen, ambient aura, and an entrance animation. Fully respects `prefers-reduced-motion`.

### Fixes

- **App icon now shows offline** — the service worker precaches all PWA icons (`icon-72/96/144/192/512`, `apple-touch-icon-180`, `favicon-48`), so the boot logo renders without a network connection.
- **Auto-update is now reliable** — on load the app checks for a new deploy immediately and activates an already-waiting worker, so a fresh version is applied (and the page refreshed) without manual action.

### No breaking changes

Existing user data, cloud sync, backups, and Supabase migrations are all unchanged. App version **5.0.2**; service worker cache **v41** (`public/sw.js`).

---

## [5.0.1] — 2026-05-28

Focus: **Offline-first reliability** — the app now opens and works fully offline, including pages that were never visited while online.

### Fixes

- **Boot no longer hangs offline** — the startup session check (`supabase.auth.getSession()`) is now time-boxed (3s) and falls back to a remembered cloud user id, so the app always hydrates from local IndexedDB instead of freezing on the loading screen.
- **Loan Given (and every other page) works offline** — the service worker now precaches all code-split JS/CSS chunks (`PRECACHE_ASSETS`, injected at build by `scripts/inject-precache.mjs`). Previously only-visited pages were cached, so unvisited routes threw `ChunkLoadError` offline.
- **Stale-deploy self-heal** — lazy route loader retries and, when online, does a single guarded reload on `ChunkLoadError` (no reload loops offline).

### Improvements

- `build` script now runs `inject-precache.mjs` after `vite build` so every deploy ships a self-contained offline bundle.

### No breaking changes

Existing user data, cloud sync, backups, and Supabase migrations are all unchanged. App version **5.0.1**; service worker cache **v40** (`public/sw.js`).

---

## [5.0.0] — 2026-05-27

Focus: **Premium UI overhaul**, buttery-smooth mobile experience, **Light / System / Dark theme picker**, global keyboard shortcuts, Android PWA home-screen shortcuts, and **Purchases monthly view**.

### Features

- **Premium design system** — refined token palette, elevation shadows, tabular numerics, scroll performance (`content-visibility`, paint containment on all cards/lists).
- **Boot/loading screen** — animated logo halo, phase-driven status labels, online/offline indicator, shimmer progress bar.
- **Theme picker** — Settings → Appearance now shows a 3-way Light / System / Dark selector. System mode follows OS dark/light setting in real time.
- **Global keyboard shortcuts** — press `/` or `Cmd+K` anywhere to open search.
- **Android PWA shortcuts** — long-press the home-screen icon to jump directly to Loans Given, Balance Sheet, Products, New Sale, Customers, or New Expense.
- **Purchases — monthly/FY filter** — the same period bar used across every other module is now on the Purchases page too.

### Improvements

- `useDarkModeDocument` now supports `"auto"` mode; pre-paint script respects `biz_theme_mode` to avoid any flash of unstyled content on first load.
- `useGlobalShortcuts` — new hook wires `/`, `Cmd/Ctrl+K`, and `?` globally (suppressed during boot and in text fields).
- `usePwaLaunchActions` — extended to handle `loans_given`, `balance_sheet`, `products`, and `new_expense` deep-links from PWA shortcuts.
- Service worker bumped to `v39` — forces a fresh precache so updated manifest shortcuts propagate to existing Android installs.

### No breaking changes

Existing user data, cloud sync, backups, and Supabase migrations are all unchanged.

---

## [4.4.0] — 2026-05-15

Focus: **Multi-line invoices**, **single-timeline Ledger**, and a corporate-grade visual refresh of the design system. All changes preserve existing user data — legacy single-item sales are rehydrated as a one-line invoice with no migration step required.

### Features

- **Multi-item sales** (`NewSaleScreen`): the invoice form now supports an arbitrary number of line items. Each row carries its own item, qty, unit sale price, and unit cost, with a live per-line subtotal. Add/remove lines from the form. Bundle mode still operates as a single row. Totals (sale, cost, gross profit) are summed across all lines.
- **Sale data shape** is additive: a new `lineItems` array carries the per-line records, while the legacy `item` / `qty` / `salePrice` / `costPrice` fields are mirrored from the first line for back-compat (recent activity widgets, list subtitles, printable invoices, customer/vendor reports keep working). Sales captured before this version still render and edit correctly — they are synthesized as a one-line invoice on load.
- **Sale Detail** renders the full line-item table both on screen and on the printable A4 invoice. The list row in the sales screen shows the first item plus a `+N more` hint when an invoice has multiple lines.
- **Stock-out automation** iterates over all line items: each non-empty line emits its own `inventoryEntries.out` row tied to the sale id (sum-checked per item across the whole invoice so the same SKU on two lines is treated correctly). Bundle stock-out logic is unchanged.

### Ledger

- **Single timeline view**: the Ledger no longer groups by Sales / Expense / Other income / Purchase. Entries appear in one continuous newest-first list. A small inline chip per row labels the journal kind (Sales, Expense, Purchase, …) so the type is still visible at a glance.
- CSV export updated to walk the flat timeline rather than the four sections.

### Design system / corporate visual refresh

- **Tokens** reworked in `src/app/app-tokens.css`:
  - Brand shifted to a deeper indigo (`#1e40af`) for a more refined enterprise tone; status colors slightly desaturated (success `#047857`, warning `#b45309`, danger `#b91c1c`).
  - New typography scale tokens (`--fs-caption` → `--fs-display`), weights (`--fw-regular` → `--fw-heavy`), tracking (`--tracking-tight`, `--tracking-caps`), line-heights, and a separate `--font-display` stack for headings.
  - Spacing scale (`--space-1` … `--space-8`), refined radii (`--radius-pill`), and a layered shadow system (`--shadow-xs` → `--shadow-lg`) with legacy aliases (`--shadow-card`, `--shadow-float`) preserved so existing rules keep their look.
  - Motion tokens (`--dur-fast` / `--dur-base` / `--dur-slow`, `--ease-out`, `--ease-in-out`).
  - Tightened cool-slate neutrals, new `--line-strong` for emphasis, and a slightly richer shell gradient.
- **Components polished against the new scale**: primary/ghost/danger buttons, KPI cards (with `auto-fit` desktop grid above 720 px), sale rows (with a hover accent rail), the ledger row + new kind chip, status badges (with subtle borders), inputs (refined focus ring + hover state), modals (deeper backdrop blur + larger panel), the page header / tab appbar (display-font titles, sharper underline on the segmented filter, more crisp shadow), sidebar items, and the sale-detail amount-breakdown card.
- **Numbers use `tabular-nums`** on KPI cards, list amounts, and totals for column-clean alignment across all screens.

### Compatibility

- Existing IndexedDB rows and Supabase rows are untouched; no migration is required. Sales loaded without `lineItems` are virtually wrapped as a single line in memory.
- All previously running flows (record payment, edit sale, auto stock-out, finance / EMI capture, CSV exports, A4 print) continue to work and have been smoke-tested.
- Domain-sanity adds tests for `normSaleLineItems`, `sumSaleLineItems`, the multi-line round-trip, and the legacy fallback path.

## [4.3.0] — 2026-05-15

Focus: correctness, performance, accessibility, and tooling — code-only changes that preserve existing user data (IndexedDB layout and Supabase schema untouched).

### Correctness & data safety

- **`mergePersistedPayload`** no longer silently drops a whole import/sync payload on a single bad field. Failures emit `console.warn` plus a `mybusiness:persist-merge-failed` window event (forwarded to telemetry when configured) so issues are visible instead of becoming silent data loss.
- **Recurring expenses** wait for local hydration to complete before the first run (`useRecurringExpensesOnTimer(setState, authState === "ready")`). Previously the first tick ran against `defaultState`, which could miss postings on startup.
- **Receivables / Payables sort** uses lexicographic comparison on `YYYY-MM-DD` strings instead of `new Date(...)` subtraction. Avoids NaN comparators when a row has a malformed/missing due date.
- **Sync conflicts** preserve the rejected local payload as a `localPayloadPreview` (≤4 KB) on the queue row plus `op: "delete" | "upsert"` so users can recover overwritten edits from Settings → Sync conflicts. Previously the local payload was discarded.
- **Session-nav reset** emits a dev `console.warn` + telemetry event on parse failure instead of silently resetting to dashboard.
- **Telemetry PII trim**: full `navigator.userAgent` is replaced with a coarse `Browser/OS` summary; filenames are stripped of query strings and deep paths; error stacks/reasons capped to sensible lengths. Same applies to the React `ErrorBoundary` beacon.

### Performance

- **Virtualization**: `PayablesScreen`, `EmiListScreen` (GroupedVirtuoso), and `LoansGivenListScreen` now use `react-virtuoso` against the MainStage scroll parent.
- **Bank Account Detail activity** caps rendered rows at 200 with an explicit "Show more" button, bounding DOM cost on accounts with thousands of movements.
- **Product Catalog** removed `filtered.length` from the list `key` — prevents an unmount/remount on every filter-result-count change.
- **`useDebouncedLocalPersist`** short-circuits when `state` is reference-equal to the last persisted state, avoiding wasted debounce timer churn on parent-only re-renders.
- **Bundle visualizer** wired in: `npm run build:analyze` (uses `rollup-plugin-visualizer` behind `ANALYZE=1`). Disabled by default.

### Refactor (code health, behavior unchanged)

- Extracted `withSupabaseSyncHint` from `AuthenticatedApp.jsx` into `src/data/sync/syncErrorHints.js`.
- Extracted ~130 lines of derived state (`safeSales`, `dashSales`, `dashExp`, `dashOtherIncome`, `expensesInSelCategory`, `kpis`, …) from `AuthenticatedApp.jsx` into a dedicated `useAuthenticatedDerivedMetrics` hook.
- Extracted design tokens (`:root` + `[data-theme="dark"]`) from `App.css` into `src/app/app-tokens.css`, re-imported at the top of `App.css`. Cascade order unchanged.

### Tooling, security, PWA, a11y

- Added `eslint-plugin-jsx-a11y` (conservative ruleset). Disabled `no-redundant-roles` because `role="list"` on `<ul>` with `list-style:none` is intentional for VoiceOver compatibility.
- Disabled the new React-Compiler-era rules (`react-hooks/preserve-manual-memoization`, `react-hooks/refs`, `react-hooks/set-state-in-effect`, `react-hooks/purity`) from the 7.1+ bump — useful guidance but each flags many pre-existing patterns; re-enabling these is a separate cleanup pass.
- **`vercel.json`**: dropped the legacy `interest-cohort=()` token from `Permissions-Policy`.
- **`DeleteConfirmModal`**: added Escape-to-cancel and blocked overlay-click cancel while a delete is in-flight (race-safe).
- **Customers / Vendors search inputs**: added `aria-label` and `type="search"`.
- **`MenuSelect`**: added Arrow / Home / End keyboard navigation; opening the menu now moves focus to the currently selected option.
- Safe dependency bumps within current major: React 19.2.6, Vite 8.0.13, Supabase JS 2.105.4, Supabase CLI 2.98.2, Playwright 1.60.0, `@noble/hashes` 2.2.0, react-virtuoso 4.18.7, others. Zero vulnerabilities reported by `npm audit`.

### CI guards

- **`scripts/supabase-sanity.mjs`** now asserts that every client `ENTITY_TYPES` value is included in the latest `entity_records` `entity_type IN (...)` CHECK constraint. Prevents the class of silent cloud-sync failures where a new entity ships before its migration.

### Proposed (not applied)

- **`supabase/proposed/client_updated_at.proposed.sql`** — additive draft adding a nullable `client_updated_at` column to `entity_records` and persisting it in the `sync_upsert_entity_record` RPC. Reviewable; requires manual promotion into `supabase/migrations/` before it touches any database.

### Release

- App version **4.3.0**; service worker cache **v34** (`public/sw.js`).

## [4.2.5] — 2026-04-11

### Loans given

- **List row amount** shows outstanding principal + interest in books even when **Include on balance sheet** is off (so it is not confused with ₹0). Balance sheet totals and the “Outstanding (B/S)” summary tile still count only tracked loans.
- **Loan detail** hero and WhatsApp line use the same outstanding figure; subtitle notes when the loan is excluded from balance sheet totals.

### Release

- App version **4.2.5**; service worker cache **v33** (`public/sw.js`).

## [4.2.4] — 2026-04-11

### Loans given

- **Summary** uses the same **boxed KPI layout** as the dashboard (`kpi-card` tiles): 2×2 on phones, 4 across from ~600px, single column under ~340px for very narrow screens. Read-only cards use `kpi-card--static` (no hover lift).

### Release

- App version **4.2.4**; service worker cache **v32** (`public/sw.js`).

## [4.2.3] — 2026-04-11

### Loans given

- List **Summary** now includes **Est. interest (to today)** (portfolio sum of the same simple estimate as each loan detail), with an **As of** date line.

### Release

- App version **4.2.3**; service worker cache **v31** (`public/sw.js`).

## [4.2.2] — 2026-04-11

### Loans given

- **Include on balance sheet** toggle per loan (default on). Off excludes that loan from balance sheet / net worth receivable totals; list and Banking unchanged.
- **Loans given** summary: principal total for open loans, interest collected (repayments minus principal repaid), and outstanding included on the balance sheet.
- **Loan detail**: interest collected and balance sheet status; hero pill when excluded.

### Release

- App version **4.2.2**; service worker cache **v30** (`public/sw.js`).

## [4.2.1] — 2026-04-11

### Loans given

- **Estimated interest** copy is the formula only (`outstanding principal × (monthly % ÷ 100) × (days ÷ 30)`), plus a one-line balance-sheet note.
- **Help text** on list, form, and detail uses compact `loan-given-*` hint styles (small, muted).
- **Save** still applies new receipts to interest due first, then principal (unchanged).
- **Repayment lines** without a bank account persist for totals; banking still needs a linked account.

### Release

- App version **4.2.1**; service worker cache **v29** (`public/sw.js`).

## [4.2.0] — 2026-04-11

### Loans → Banking / Cash flow / Ledger integration

- **Loan disbursements** (cash out) and **repayments** (cash in) now appear in Banking, Cash flow, and Ledger — keeping all screens aligned with actual bank movements.
- Loan form extended with optional **disbursement account/date/amount** and repeating **repayment lines** (date, amount, bank account).
- Clicking a loan row in Banking or Ledger navigates to the loan editor.
- Dedicated **IcLoanGiven** icon in sidebar — visually distinct from Receivables.

### Reliability & correctness

- **Supabase migration** adds `auditEvents` and `syncConflictQueue` to the `entity_type` CHECK constraint, fixing potential cloud-sync rejections.
- **Null guards** added to all loan-related domain loops to prevent crashes when arrays contain null entries.
- **processRecurringExpenses** now guards against non-array `expenses` state.
- **bundleCostPerUnit / bundleStockSufficient** safe when inventory rows have null `item`.
- **bankingActivityForMonth** and **bankingActivityForAccountInMonth** return `roundMoney2` totals, eliminating floating-point drift.
- **Stale-screen reset** extended for loan editor (closes editor if loan deleted by sync).
- **Delete confirm modal** now blocks double-tap and shows "Deleting…" state.
- **Toast timer** properly cleaned up on overlapping toasts (no stale `setTimeout`).

### UI / responsive polish

- **Touch targets**: `--tap-min` raised to **44px** (WCAG); sidebar close, SW update, growth toggles, text buttons all meet minimum.
- **`100dvh` fix**: overlay screens now correctly prefer `100dvh` over `100vh` on mobile browsers with dynamic chrome.
- **`--accent` CSS token** defined at `:root` — reports skip-link outline no longer falls back.
- **Chart label floor** raised to 10px minimum (was 9px).
- Default prop guards added to **ReportsScreen, EmiListScreen, OtherIncomeScreen, CapitalGrowthScreen, ProductCatalogScreen, CustomersScreen, CustomerDetailScreen, NotifPanel, CapitalCumulativeSvg, CapitalNetBarsSvg, AccountsOverviewTab, PaginatedSaleList, PaginatedReceivableRows** — prevents crashes on missing data.
- **Customer combobox** (New Sale): Enter key now selects the first suggestion.
- **Home dashboard**: shows "No sales yet" empty state when there are no recent sales.
- **Null-safe** alphabetical headers in customer and vendor lists.

### Release

- App version **4.2.0**; service worker cache **v28** (`public/sw.js`).

## [4.1.1] — 2026-04-11

### Ledger

- **Four display categories only**: Sales (cash + open receivable in one section and KPI), Expense, Other income, Purchase (supplier payments + paid stock-in cash combined). Removed the extra receivable strip and separate Inventory KPI tile.

### Release

- App version **4.1.1**; service worker cache **v27** (`public/sw.js`).

## [4.1.0] — 2026-04-11

### Ledger

- Journal list is **grouped by source type** (Sales → Other income → Expenses → Purchases → Inventory), with cash receipts listed before open receivables under Sales. Within each group, lines stay **newest-first** by date.
- **Export CSV** follows the same grouped order for the full period (not the All/In/Out tab filter).

### Release

- App version **4.1.0**; service worker cache **v26** (`public/sw.js`).

## [4.0.0] — 2026-04-10

### Reporting consistency

- Reconciled dashboard/report calculations so cash/accrual behavior is consistent across Home KPIs, Reports P&L, and related summary cards.
- Cash basis now applies cash-movement logic for expenses and other income (not just revenue/COGS), reducing mixed-basis confusion.
- Reports collection-rate display now avoids mixed-cohort percentages in cash mode.

### Banking totals

- Aligned Banking top-level month `In/Out` totals with account-level flows by including transfers in the same month totals model.

### Release

- App version **4.0.0**; service worker cache **v25** (`public/sw.js`).

## [3.0.4] — 2026-04-10

### Desktop responsiveness

- Removed the desktop max-width cap from `.main-content` so all modules can fully stretch on large PC screens instead of staying centered/narrow.

### Release

- App version **3.0.4**; service worker cache **v24** (`public/sw.js`).

## [3.0.3] — 2026-04-10

### Mobile scrolling

- Audited page-shell scrolling across modules and removed a nested-scroll trap on **Reports**.
- `ReportsScreen` now uses the main stage flow scroll container (`tab-page-scroll`) instead of an inner `overlay-scroll`, improving touch scroll consistency on mobile.

### Release

- App version **3.0.3**; service worker cache **v23** (`public/sw.js`).

## [3.0.2] — 2026-04-10

### Purchases

- Improved the **supplier autocomplete** on `New purchase` so it behaves more like the sales customer picker:
  recent/saved suppliers appear while typing, the first match can be selected with **Enter**, and suggestion rows show richer context.
- Hardened **purchase save** to persist from the latest state snapshot and only show success after a real successful write.

### Release

- App version **3.0.2**; service worker cache **v22** (`public/sw.js`).

## [3.0.1] — 2026-04-10

### Banking & balance sheet

- **Save account settings** (banking detail): persist from the latest in-memory state (same pattern as fixed assets), with try/catch and success vs failure toasts so a failed IndexedDB write no longer shows “Saved”.
- **Balance sheet** (manual other assets / payables / loans) and **owner capital invested**: use latest state snapshot and the same accurate save feedback.
- **Delete bank account**: only close the screen and toast after a successful persist.

### Release

- App version **3.0.1**; service worker cache **v21** (`public/sw.js`).

## [2.0.2] — 2026-04-08

### Payables

- Removed **Open Purchases** shortcut and the aging explainer line; screen layout matches **Receivables** (KPIs → filters → sort → list).

### Release

- App version **2.0.2**; service worker cache **v20** (`public/sw.js`).

## [2.0.1] — 2026-04-07

### Release

- App version **2.0.1** (major line); service worker cache **v19** (`public/sw.js`).
- Error screen: **Reload** only (removed **Clear Data** from the error boundary).
- Settings: **Report bugs** via WhatsApp (**9635505436**) at the bottom of the hub.

## [1.3.11] — 2026-04-07

### UX, reliability & tooling

- Payables: **Open Purchases** action moved above sort controls with dedicated styling to avoid overlap with the glass toolbar and list.
- Bundles: new-bundle form uses native `<details>`/`<summary>` where appropriate; related **App.css** updates.
- Error boundary: **Technical details** (collapsible) shows the error message to aid support after rare resume/mobile crashes.
- **Playwright** E2E: smoke login + full main-nav UI tour (`npm run test:e2e`); `playwright.config.js` + `e2e/` (uses `vite preview`).
- Main stage scroll context and list virtualization tweaks (inventory / invoices) as in current tree.

### Release

- App version **1.3.11**; service worker cache **v18** (`public/sw.js`).

## [1.3.10] — 2026-04-06

### Fixes & UX

- Fixed intermittent Fixed Assets save reliability by persisting from the latest state snapshot and showing accurate save-failure feedback.
- Products KPI now shows total stock quantity (not just product count).
- Inventory mobile layout improved with a dedicated "Stock by branch" section and cleaner responsive summary cards.
- Inventory list now keeps zero-stock items at the bottom for easier scanning.

### Release

- App version **1.3.10**; service worker cache **v17** (`public/sw.js`).

## [1.3.8] — 2026-04-06

### Reliability & updates

- Added automatic service-worker update activation + auto reload when a new deploy is detected, including visibility polling and reload-loop guard per version.
- Added client release transition guard to clear stale session navigation state after app version changes.
- Improved cloud sync error messaging with explicit Supabase schema mismatch hint (`npm run supabase:db:push` + reload) when backend is behind.

### Release

- App version **1.3.8**; service worker cache **v16** (`public/sw.js`).

## [1.3.7] — 2026-04-06

### Fixes

- Fixed local IndexedDB entity handling so `balance` is recognized everywhere (`ENTITIES`, store mapping, singleton keying, and outbox coalescing), eliminating `Sync: Unknown entityType: balance`.

### Release

- App version **1.3.7**; service worker cache **v15** (`public/sw.js`).

## [1.3.6] — 2026-04-06

### Sync reliability

- Added server-side sync guardrails on `entity_records`: DB-managed `updated_at`, row `version`, and RPC upsert conflict checks.
- Cloud client now uses RPC upsert and handles stale-write conflicts safely.
- Added automatic startup full reconcile (once per app session) for cloud users.
- Expanded legacy fallback import path when `entity_records` is empty and no pull cursor exists.

### Release

- App version **1.3.6**; service worker cache **v14** (`public/sw.js`).

## [1.3.5] — 2026-04-06

### Sync reliability

- Added a **cloud sync watchdog** in Settings (warns if no successful sync for 2+ minutes while online).
- Added **Full reconcile** action to force a complete cloud pull/merge when values drift.
- Added legacy cloud fallback import (workspace snapshots) with automatic backfill into `entity_records` for fresh installs.
- Split cloud balance as its own entity and improved conflict handling so clean remote rows converge better across devices.

### UX

- Banking: added **Deposit** and **Withdraw** actions.
- Invoice print: simplified to **Bill** and removed unnecessary print details.
- Mobile polish: smoother loading background, touch/selection polish, branch scroll fixes.

### Release

- App version **1.3.5**; service worker cache **v13** (`public/sw.js`).

## [1.3.4] — 2026-04-07

### UX

- **Lazy-route loading:** full-bleed shell-gradient ambient screen (no skeleton card); overlay chunk loader uses safe-area insets and sits above mobile chrome.

### Tooling

- **pkg-sanity:** when validating `CHANGELOG` vs `package.json`, skip a leading `## [Unreleased]` section so CI stays green.

### Release

- App version **1.3.4**; service worker cache **v12** (`public/sw.js`).

## [1.3.3] — 2026-04-06

### Architecture & quality

- **Route-level code splitting:** main-stage screens load via `lazyMainStageScreens.jsx`; shell imports `AppSidebar` from `@/features/app-sidebar` only (avoids ineffective dynamic imports).
- **Centralized env:** `viteEnv` in `src/config/env.js` replaces scattered `import.meta.env` in app code; `src/vite-env.d.ts` for Vite client types.
- **ESLint:** stricter rules (`eqeqeq` smart, `no-console` with allowlist, `no-debugger`); `lint:fix` script.
- **Sanity scripts:** `scan-sanity` flags stray `import.meta.env` and `@/app/screens` imports; `config-sanity` checks `src/config/*`; `extract-screens.mjs` stubbed (obsolete monolithic extractor).
- **Domain:** `gstIndia.js` exported from `domain/index.js`; acyclic import rule documented.

### UX & performance

- **Mobile:** global mobile titles/subtitles, safe-area handling, glass toolbars, list row polish; `touch-action` only on chrome controls (not scroll list buttons).
- **UI:** shell gradient, frosted period/segment bars, overlay shell background alignment, form-card hover polish.

### Supabase

- Migration **`20260410120000_entity_records_vendor_directory.sql`** for vendor directory `entity_records` (apply with `supabase db push` when linked).

### Release

- App version **1.3.3**; service worker cache **v11** (`public/sw.js`).

### Documentation

- **README:** layout, `viteEnv`, scripts (`verify`, `test:*`), routing conventions.

## [1.3.2] — 2026-04-05

### Features & UX

- **Purchases** screen and **Payables** (supplier credit) · migration `20260409120000_entity_records_add_purchases.sql` for `entity_records` sync.
- **Banking → Activity:** open linked expense / stock / other income; delete from list; **Ledger** rows open expense / stock edit; stock **edit/save/delete** from activity.
- **Reports:** expense donut chart; PBT/PAT when income-tax-style expenses exist; **WhatsApp** links use `waMessageHref`.
- **Customers:** optional email & customer type (Retail/B2B); picker dedup by **GSTIN** where present.
- **Balance sheet:** non-current assets section; **Home** KPIs respect cash vs accrual basis; skip link hidden until keyboard focus.
- **Settings / other income** warnings and misc polish.

### Release

- App version **1.3.2**; service worker cache **v10** (`public/sw.js`).

### Documentation

- **README:** Supabase `db push` / link workflow, scripts table, feature list update.

## [1.3.1] — 2026-04-04

### Documentation

- Refreshed **README.md** (version, layout, scripts, deploy).
- Added **CHANGELOG.md**.
- **APP_FEATURES.md** header aligned with app version.

### Release

- App version **1.3.1**; service worker cache **v9** (see `public/sw.js`) for clean updates after deploy.
