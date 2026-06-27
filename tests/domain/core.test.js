import { describe, expect, it } from "vitest";
import { roundMoney2, bankingActivityForMonth } from "@/domain/appModel.js";
import {
  BACKUP_SCHEMA_VERSION,
  validateBackupImport,
  backupImportErrorMessage,
  wrapStateForBackup,
} from "@/domain/backup.js";
import {
  computeFixedAssetDepreciation,
  computeOutputGstCollected,
  computeNetGstLiability,
  findDuplicatePurchase,
  saleOutstandingAsOf,
  sumFixedAssetsNetBook,
} from "@/domain/balanceSheet.js";
import { splitInclusiveGst, buildInvoiceGstModel } from "@/domain/invoiceGst.js";
import { buildDailySparkline, buildDailyRevenueMap } from "@/domain/sparkline.js";
import {
  classifyEmiReminderDiff,
  buildEmiAlertsForEntry,
  isEmiDuePaid,
  normBankTransfers,
  BANK_EXTERNAL_SOURCE_ID,
  BANK_EXTERNAL_SINK_ID,
} from "@/domain/appModel.js";
import {
  saleEntryHasDraftContent,
  normSaleDraft,
  buildSaleDraftEnvelope,
} from "@/domain/saleDraft.js";
import {
  BANK_TRANSFER_KIND,
  sumOwnerDrawingsInMonth,
  computeCashflowBreakdownForMonth,
} from "@/domain/cashflow.js";

describe("roundMoney2", () => {
  it("rounds to 2 decimal places", () => {
    expect(roundMoney2(10.666666)).toBe(10.67);
    expect(roundMoney2("99.994")).toBe(99.99);
    expect(roundMoney2(0)).toBe(0);
  });
});

describe("splitInclusiveGst / buildInvoiceGstModel", () => {
  it("splits 18% inclusive GST correctly", () => {
    const split = splitInclusiveGst(1180, 18);
    expect(split.taxable).toBe(1000);
    expect(split.tax).toBe(180);
    expect(split.total).toBe(1180);
  });

  it("builds invoice GST totals for a single line", () => {
    const model = buildInvoiceGstModel({
      lineItems: [{ item: "Battery", qty: 1, salePrice: 1180, gstRate: 18, hsn: "8507" }],
      settings: { defaultProductGstRate: 18, defaultProductHsn: "8507" },
      businessState: "West Bengal",
      customerState: "West Bengal",
    });
    expect(model.totalTax).toBe(180);
    expect(model.grandTotal).toBe(1180);
  });
});

describe("bankingActivityForMonth", () => {
  it("includes sale payment inflows for the month", () => {
    const sales = [
      {
        id: "s1",
        date: "2026-06-10",
        paymentEntries: [{ id: "p1", date: "2026-06-15", amount: 5000, bankAccountId: "b1" }],
      },
    ];
    const { cashIn } = bankingActivityForMonth([], sales, [], [], "2026-06");
    expect(cashIn).toBe(5000);
  });
});

describe("fixed asset depreciation", () => {
  it("straight-line reduces net book over time", () => {
    const asset = {
      amount: 100000,
      purchaseDate: "2024-01-01",
      depreciationRatePct: 10,
      accumulatedDepreciation: 0,
    };
    const early = computeFixedAssetDepreciation(asset, "2024-07-01");
    const later = computeFixedAssetDepreciation(asset, "2026-01-01");
    expect(early.netBook).toBeLessThan(100000);
    expect(later.netBook).toBeLessThan(early.netBook);
    expect(later.accumulated).toBeGreaterThan(early.accumulated);
  });

  it("sums net book for register", () => {
    const accounts = [{ amount: 50000, purchaseDate: "2025-01-01", depreciationRatePct: 20 }];
    expect(sumFixedAssetsNetBook(accounts, "2026-01-01")).toBeLessThan(50000);
  });
});

describe("receivables as-of", () => {
  it("uses payments on or before date", () => {
    const sale = {
      date: "2026-06-01",
      totalSale: 10000,
      paymentEntries: [{ id: "p1", date: "2026-06-15", amount: 4000, bankAccountId: "b1" }],
    };
    expect(saleOutstandingAsOf(sale, "2026-06-10")).toBe(10000);
    expect(saleOutstandingAsOf(sale, "2026-06-20")).toBe(6000);
  });
});

describe("backup validation", () => {
  it("rejects newer schema", () => {
    const r = validateBackupImport({ schemaVersion: 99, data: { sales: [] } }, "8.0.8");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("newer_than_app");
  });

  it("accepts versioned envelope", () => {
    const r = validateBackupImport(
      { schemaVersion: BACKUP_SCHEMA_VERSION, appVersion: "8.0.0", data: { sales: [], settings: {} } },
      "8.0.8",
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warning).toMatch(/8\.0\.0/);
  });

  it("wraps state with schema version", () => {
    const w = wrapStateForBackup({ sales: [] }, "8.0.8");
    expect(w.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
    expect(backupImportErrorMessage("newer_than_app", 2)).toMatch(/newer app/);
  });
});

describe("GST liability", () => {
  it("computes output GST on tax invoices", () => {
    const sales = [
      {
        docType: "taxInvoice",
        lineItems: [{ item: "Scooter", qty: 1, salePrice: 118000, gstRate: 18 }],
      },
    ];
    const out = computeOutputGstCollected(sales, { gstEnabled: true, defaultProductGstRate: 18 });
    expect(out).toBe(18000);
  });

  it("net liability is non-negative", () => {
    const liability = computeNetGstLiability([], [], { gstEnabled: true });
    expect(liability).toBe(0);
  });
});

describe("findDuplicatePurchase", () => {
  it("detects same supplier invoice ref", () => {
    const purchases = [
      { id: "p1", supplierName: "Tata", invoiceRef: "INV-99" },
      { id: "p2", supplierName: "Tata", invoiceRef: "INV-100" },
    ];
    expect(findDuplicatePurchase(purchases, "Tata", "INV-99", null)?.id).toBe("p1");
    expect(findDuplicatePurchase(purchases, "Tata", "INV-99", "p1")).toBeNull();
  });
});

describe("sparkline", () => {
  it("builds 60-day series", () => {
    const map = buildDailyRevenueMap([{ date: "2026-06-27", totalSale: 1000 }]);
    const pts = buildDailySparkline(map, "2026-06-27", 60);
    expect(pts.length).toBe(60);
    expect(pts[pts.length - 1]).toBe(1000);
  });
});

describe("EMI alert logic", () => {
  it("classifies reminder windows", () => {
    expect(classifyEmiReminderDiff(3)).toBe("three-days");
    expect(classifyEmiReminderDiff(0)).toBeNull();
    expect(classifyEmiReminderDiff(10)).toBeNull();
  });

  it("marks due paid when date in paidDueDates", () => {
    const emi = { dueDates: ["2026-07-01"], paidDueDates: ["2026-07-01"] };
    expect(isEmiDuePaid(emi, "2026-07-01")).toBe(true);
  });

  it("builds alert for upcoming due", () => {
    const emi = {
      id: "e1",
      customerName: "Ravi",
      invoiceNo: "INV-1",
      dueDates: [],
      emiSchedule: [{ dueDate: "2099-01-05", amount: 2000 }],
      paidDates: [],
    };
    const alerts = buildEmiAlertsForEntry(emi, { businessName: "Test" });
    expect(Array.isArray(alerts)).toBe(true);
  });
});

describe("sale draft", () => {
  it("detects meaningful draft content", () => {
    expect(saleEntryHasDraftContent({ customerName: "  " })).toBe(false);
    expect(saleEntryHasDraftContent({ customerName: "Ravi" })).toBe(true);
    expect(saleEntryHasDraftContent({ lineItems: [{ item: "Battery", qty: 1, salePrice: 100 }] })).toBe(true);
  });

  it("round-trips draft envelope", () => {
    const entry = { customerName: "Ravi", item: "Battery", qty: "1" };
    const env = buildSaleDraftEnvelope(entry);
    expect(env?.entry.customerName).toBe("Ravi");
    expect(normSaleDraft(env)?.entry.customerName).toBe("Ravi");
  });
});

describe("bank transfer kinds", () => {
  it("infers deposit and withdraw kinds", () => {
    const transfers = normBankTransfers([
      {
        fromAccountId: BANK_EXTERNAL_SOURCE_ID,
        toAccountId: "b1",
        amount: 1000,
        date: "2026-06-10",
      },
      {
        fromAccountId: "b1",
        toAccountId: BANK_EXTERNAL_SINK_ID,
        amount: 500,
        date: "2026-06-11",
        kind: "ownerDrawing",
      },
    ]);
    expect(transfers[0].kind).toBe("deposit");
    expect(transfers[1].kind).toBe("ownerDrawing");
  });
});

describe("cashflow owner drawings", () => {
  it("counts owner drawings in financing out", () => {
    const transfers = normBankTransfers([
      {
        fromAccountId: "b1",
        toAccountId: BANK_EXTERNAL_SINK_ID,
        amount: 2500,
        date: "2026-06-15",
        kind: BANK_TRANSFER_KIND.OWNER_DRAWING,
      },
    ]);
    expect(sumOwnerDrawingsInMonth(transfers, "2026-06")).toBe(2500);
    const b = computeCashflowBreakdownForMonth({
      sales: [],
      expenses: [],
      inventoryEntries: [],
      otherIncomes: [],
      purchases: [],
      loansGiven: [],
      bankTransfers: transfers,
      monthKey: "2026-06",
    });
    expect(b.ownerDrawings).toBe(2500);
    expect(b.financingOut).toBe(2500);
  });
});
