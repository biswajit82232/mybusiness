/**
 * Domain layer: pure business rules, defaults, normalization (no React, no I/O).
 * Keep imports acyclic: domain must not import from `@/data`, `@/features`, or `@/app`.
 */
export * from "./appModel.js";
export * from "./backup.js";
export * from "./servicing.js";
export * from "./invoiceGst.js";
export * from "./balanceSheet.js";
export * from "./sparkline.js";
export * from "./fuzzySearch.js";
export * from "./saleDraft.js";
export * from "./cashflow.js";
