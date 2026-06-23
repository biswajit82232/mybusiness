/**
 * Cloud sync invariants — run: npm run test:sync
 */
import assert from "node:assert/strict";
import {
  entityRowsToLocalPayload,
  isPayloadEffectivelyEmpty,
  isTransientSyncError,
} from "../src/data/sync/syncPayloadUtils.js";

console.log("sync-sanity:");

assert.equal(isPayloadEffectivelyEmpty(null), true);
assert.equal(isPayloadEffectivelyEmpty({}), true);
assert.equal(isPayloadEffectivelyEmpty({ sales: [{ id: "1" }] }), false);

assert.equal(isTransientSyncError({ code: 503 }), true);
assert.equal(isTransientSyncError({ message: "Failed to fetch" }), true);
assert.equal(isTransientSyncError({ message: "invalid input" }), false);

const rows = [
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
assert.equal(payload.sales.length, 1);
assert.equal(payload.sales[0].id, "a");
assert.equal(payload.sales[0].totalSale, 200);

console.log("  ✓ sync payload + transient error helpers — ok");
