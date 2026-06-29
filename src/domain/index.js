/**
 * Domain layer: pure business rules, defaults, normalization (no React, no I/O).
 * Keep imports acyclic: domain must not import from `@/data`, `@/features`, or `@/app`.
 */
export * from "./appModel.js";
export * from "./backup.js";
export * from "./servicing.js";
export * from "./invoiceGst.js";
export * from "./invoiceTemplates.js";
export * from "./balanceSheet.js";
export * from "./sparkline.js";
export * from "./fuzzySearch.js";
export * from "./saleDraft.js";
export * from "./cashflow.js";
export * from "./payments.js";
export * from "./saleDocuments.js";
export * from "./gstr1.js";
export * from "./gstr2b.js";
export * from "./gstr3b.js";
export * from "./reportPeriod.js";
export * from "./profitLoss.js";
export * from "./businessReports.js";
export * from "./partyStatement.js";
export * from "./tallyExport.js";
export * from "./upi.js";
