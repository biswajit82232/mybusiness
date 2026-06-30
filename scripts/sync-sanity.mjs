/**
 * Cloud sync invariants — run: npm run test:sync
 */
import assert from "node:assert/strict";
import {
  entityRowsToLocalPayload,
  isPayloadEffectivelyEmpty,
  isTransientSyncError,
  remoteWinsLocalRow,
  settingsMetaForOutboxDiff,
} from "../src/data/sync/syncPayloadUtils.js";

console.log("sync-sanity:");

assert.equal(isPayloadEffectivelyEmpty(null), true);
assert.equal(isPayloadEffectivelyEmpty({}), true);
assert.equal(isPayloadEffectivelyEmpty({ sales: [{ id: "1" }] }), false);

assert.equal(isTransientSyncError({ code: 503 }), true);
assert.equal(isTransientSyncError({ message: "Failed to fetch" }), true);
assert.equal(isTransientSyncError({ message: "invalid input" }), false);

assert.equal(remoteWinsLocalRow(null, "2026-01-02T00:00:00Z", false), true);
assert.equal(
  remoteWinsLocalRow({ updatedAt: "2026-01-03T00:00:00Z" }, "2026-01-02T00:00:00Z", false),
  false,
);
assert.equal(
  remoteWinsLocalRow({ updatedAt: "2026-01-01T00:00:00Z" }, "2026-01-02T00:00:00Z", true),
  false,
);
assert.equal(
  remoteWinsLocalRow({ updatedAt: "2026-01-01T00:00:00Z" }, "2026-01-02T00:00:00Z", false),
  true,
);

const rows = [
  {
    entity_type: "settings",
    record_id: "__settings__",
    deleted: false,
    payload: {
      settings: { businessName: "Co" },
      balance: null,
      servicingCompletions: [{ saleId: "s1", serviceNum: 1, completedDate: "2026-03-01" }],
    },
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    entity_type: "sales",
    record_id: "a",
    deleted: false,
    payload: { id: "b", totalSale: 100 },
    updated_at: "2026-01-02T00:00:00Z",
  },
  {
    entity_type: "sales",
    record_id: "a",
    deleted: false,
    payload: { id: "a", totalSale: 200 },
    updated_at: "2026-01-01T00:00:00Z",
  },
];
const payload = entityRowsToLocalPayload(rows);
assert.equal(payload.servicingCompletions?.length, 1);
assert.equal(payload.servicingCompletions[0].serviceNum, 1);
assert.equal(payload.sales.length, 1);
assert.equal(payload.sales[0].id, "a");
assert.equal(payload.sales[0].totalSale, 200);

const metaA = {
  settings: { businessName: "Co" },
  balance: { bankAccounts: [{ id: "b1", openingBalance: 100, amount: 500 }] },
  servicingCompletions: [],
  servicingWaSent: [],
};
const metaB = {
  ...metaA,
  balance: { bankAccounts: [{ id: "b1", openingBalance: 100, amount: 999 }] },
};
assert.equal(
  JSON.stringify(settingsMetaForOutboxDiff(metaA)),
  JSON.stringify(settingsMetaForOutboxDiff(metaB)),
);

console.log("  ✓ sync payload + transient error helpers — ok");
