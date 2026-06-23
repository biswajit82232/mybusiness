/**
 * Domain layer: pure business rules, defaults, normalization (no React, no I/O).
 * Keep imports acyclic: domain must not import from `@/data`, `@/features`, or `@/app`.
 */
export * from "./appModel.js";
export * from "./backup.js";
export * from "./servicing.js";
