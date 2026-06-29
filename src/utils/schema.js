// src/utils/schema.js
// Schema versioning and data migrations for MyBusiness PWA.
// CURRENT_SCHEMA_VERSION must be bumped every time the data
// structure changes. Never break old data silently.

export const CURRENT_SCHEMA_VERSION = 2;
// Version history:
// 1 — original schema (money stored as rupee floats)
// 2 — Phase 1: money converted to integer paise, tokens applied

/**
 * The shape of a valid v2 data object.
 * Used to validate imported data and new data.
 */
export const DEFAULT_DATA_V2 = {
  schemaVersion: 2,
  lastMigrated: null,
  business: {
    name: 'Biswajit Power Hub',
    gstin: '',
    address: '',
    phone: '',
    email: '',
    stateCode: '19', // West Bengal
  },
  invoices: [],
  purchases: [],
  products: [],
  customers: [],
  vendors: [],
  banking: [],
  expenses: [],
  journalEntries: [],
  settings: {
    financialYearStart: 'April',
    defaultGSTRate: 18,
    currency: 'INR',
    defaultState: 'West Bengal',
  },
};

function toP(v) {
  if (v === null || v === undefined) return 0;
  return Math.round(parseFloat(v) * 100);
}

function migratePaymentEntries(entries) {
  return (entries || []).map((pe) => ({
    ...pe,
    amount: toP(pe.amount ?? pe.amountPaise),
  }));
}

function migrateSaleLineItems(items) {
  return (items || []).map((item) => ({
    ...item,
    salePrice: toP(item.salePrice ?? item.salePricePaise),
    costPrice: toP(item.costPrice ?? item.costPricePaise),
    unitPrice: undefined,
    unitPricePaise: item.unitPricePaise != null ? toP(item.unitPricePaise) : undefined,
    taxableAmount: undefined,
    taxableAmountPaise: item.taxableAmountPaise != null ? toP(item.taxableAmountPaise) : undefined,
    gstAmount: undefined,
    gstAmountPaise: item.gstAmountPaise != null ? toP(item.gstAmountPaise) : undefined,
    total: undefined,
    totalPaise: item.totalPaise != null ? toP(item.totalPaise) : undefined,
  }));
}

function migrateSales(sales) {
  return (sales || []).map((inv) => ({
    ...inv,
    salePrice: toP(inv.salePrice ?? inv.salePricePaise),
    costPrice: toP(inv.costPrice ?? inv.costPricePaise),
    discount: toP(inv.discount ?? inv.discountPaise),
    additionalCharges: toP(inv.additionalCharges ?? inv.additionalChargesPaise),
    totalSale: toP(inv.totalSale ?? inv.totalSalePaise ?? inv.grandTotal ?? inv.grandTotalPaise),
    totalCost: toP(inv.totalCost ?? inv.totalCostPaise),
    grossProfit: toP(inv.grossProfit ?? inv.grossProfitPaise),
    received: toP(inv.received ?? inv.receivedPaise ?? inv.paidAmount ?? inv.paidAmountPaise),
    outstanding: toP(inv.outstanding ?? inv.outstandingPaise ?? inv.balanceDue ?? inv.balanceDuePaise),
    subtotal: undefined,
    subtotalPaise: inv.subtotalPaise != null ? toP(inv.subtotalPaise) : undefined,
    totalGST: undefined,
    totalGSTPaise: inv.totalGSTPaise != null ? toP(inv.totalGSTPaise) : undefined,
    grandTotal: undefined,
    grandTotalPaise: inv.grandTotalPaise != null ? toP(inv.grandTotalPaise) : undefined,
    lineItems: migrateSaleLineItems(inv.lineItems ?? inv.items),
    items: undefined,
    paymentEntries: migratePaymentEntries(inv.paymentEntries),
  }));
}

function migratePurchaseLines(lines) {
  return (lines || []).map((item) => ({
    ...item,
    costPerUnit: toP(item.costPerUnit ?? item.unitCost ?? item.unitCostPaise),
    unitCost: undefined,
    totalCost: undefined,
    totalCostPaise: item.totalCostPaise != null ? toP(item.totalCostPaise) : undefined,
  }));
}

function migratePurchases(purchases) {
  return (purchases || []).map((p) => ({
    ...p,
    lines: migratePurchaseLines(p.lines ?? p.items),
    items: undefined,
    totalAmount: toP(p.totalAmount ?? p.totalAmountPaise),
    totalGST: toP(p.totalGST ?? p.totalGSTPaise),
    received: toP(p.received ?? p.receivedPaise),
    outstanding: toP(p.outstanding ?? p.outstandingPaise),
    paymentEntries: migratePaymentEntries(p.paymentEntries),
  }));
}

function migrateAmountList(list) {
  return (list || []).map((e) => ({
    ...e,
    amount: toP(e.amount ?? e.amountPaise),
  }));
}

function migrateInventory(entries) {
  return (entries || []).map((e) => ({
    ...e,
    costPerUnit: toP(e.costPerUnit ?? e.costPerUnitPaise),
    salesPrice: toP(e.salesPrice ?? e.salesPricePaise),
  }));
}

function migrateBalance(balance) {
  if (!balance || typeof balance !== 'object') return balance;
  const bankAccounts = (balance.bankAccounts || []).map((x) => ({
    ...x,
    amount: toP(x.amount ?? x.amountPaise),
    openingBalance: toP(x.openingBalance ?? x.openingBalancePaise ?? x.amount),
    balanceAdjustment:
      x.balanceAdjustment != null && x.balanceAdjustment !== ''
        ? toP(x.balanceAdjustment ?? x.balanceAdjustmentPaise)
        : x.balanceAdjustment,
  }));
  const fixedAssetAccounts = (balance.fixedAssetAccounts || []).map((x) => ({
    ...x,
    amount: toP(x.amount ?? x.amountPaise),
    accumulatedDepreciation: toP(x.accumulatedDepreciation ?? x.accumulatedDepreciationPaise),
  }));
  const loanSchedule = (balance.loanSchedule || []).map((r) => ({
    ...r,
    balance: toP(r.balance ?? r.balancePaise),
  }));
  const bankTransfers = (balance.bankTransfers || []).map((t) => ({
    ...t,
    amount: toP(t.amount ?? t.amountPaise),
  }));
  return {
    ...balance,
    bankAccounts,
    fixedAssetAccounts,
    loanSchedule,
    bankTransfers,
    cashInHand: balance.cashInHand != null ? toP(balance.cashInHand) : balance.cashInHand,
    bankBalance: balance.bankBalance != null ? toP(balance.bankBalance) : balance.bankBalance,
    fixedAssets: balance.fixedAssets != null ? toP(balance.fixedAssets) : balance.fixedAssets,
    otherAssets: toP(balance.otherAssets ?? balance.otherAssetsPaise),
    supplierPayables: toP(balance.supplierPayables ?? balance.supplierPayablesPaise),
    loans: toP(balance.loans ?? balance.loansPaise),
    ownerCapitalInvested: toP(balance.ownerCapitalInvested ?? balance.ownerCapitalInvestedPaise),
  };
}

function migrateLoansGiven(loans) {
  return (loans || []).map((lg) => ({
    ...lg,
    principal: toP(lg.principal ?? lg.principalPaise),
    disbursementAmount: toP(lg.disbursementAmount ?? lg.disbursementAmountPaise),
    principalRepaid: toP(lg.principalRepaid ?? lg.principalRepaidPaise),
    interestOutstanding: toP(lg.interestOutstanding ?? lg.interestOutstandingPaise),
    repaymentEntries: (lg.repaymentEntries || []).map((rep) => ({
      ...rep,
      amount: toP(rep.amount ?? rep.amountPaise),
    })),
  }));
}

function migrateEmiEntries(emi) {
  return (emi || []).map((x) => ({
    ...x,
    loanAmount: toP(x.loanAmount ?? x.loanAmountPaise),
    downPayment: toP(x.downPayment ?? x.downPaymentPaise),
    emiAmount: toP(x.emiAmount ?? x.emiAmountPaise),
  }));
}

function migrateRecurring(list) {
  return (list || []).map((x) => ({
    ...x,
    amount: toP(x.amount ?? x.amountPaise),
  }));
}

function migrateAdvancePayments(advances) {
  return (advances || []).map((x) => ({
    ...x,
    amount: toP(x.amount ?? x.amountPaise),
    applications: (x.applications || []).map((a) => ({
      ...a,
      amount: toP(a.amount ?? a.amountPaise),
    })),
  }));
}

function migrateSaleDraft(draft) {
  if (!draft || typeof draft !== 'object') return draft;
  const lineItems = (draft.lineItems || []).map((li) => ({
    ...li,
    salePrice: li.salePrice != null && li.salePrice !== '' ? toP(li.salePrice) : li.salePrice,
    costPrice: li.costPrice != null && li.costPrice !== '' ? toP(li.costPrice) : li.costPrice,
  }));
  return {
    ...draft,
    salePrice: draft.salePrice != null && draft.salePrice !== '' ? toP(draft.salePrice) : draft.salePrice,
    costPrice: draft.costPrice != null && draft.costPrice !== '' ? toP(draft.costPrice) : draft.costPrice,
    discount: draft.discount != null && draft.discount !== '' ? toP(draft.discount) : draft.discount,
    additionalCharges:
      draft.additionalCharges != null && draft.additionalCharges !== ''
        ? toP(draft.additionalCharges)
        : draft.additionalCharges,
    receivedAmount:
      draft.receivedAmount != null && draft.receivedAmount !== ''
        ? toP(draft.receivedAmount)
        : draft.receivedAmount,
    lineItems,
    paymentLines: (draft.paymentLines || []).map((pl) => ({
      ...pl,
      amount: pl.amount != null && pl.amount !== '' ? toP(pl.amount) : pl.amount,
    })),
  };
}

function migrateSettings(settings) {
  if (!settings || typeof settings !== 'object') return settings;
  const fyCloseSnapshots = (settings.fyCloseSnapshots || []).map((x) => ({
    ...x,
    gstLiability: toP(x.gstLiability ?? x.gstLiabilityPaise),
    revenue: toP(x.revenue ?? x.revenuePaise),
    netProfit: toP(x.netProfit ?? x.netProfitPaise),
  }));
  return {
    ...settings,
    monthlySalesTarget: settings.monthlySalesTarget, // count, not money
    fyCloseSnapshots,
    saleDraft: migrateSaleDraft(settings.saleDraft),
  };
}

/**
 * Migration from v1 to v2:
 * Converts all money fields from rupee floats to integer paise.
 */
function migrateV1toV2(data) {
  // Migrate invoices (task template + alias for sales)
  const invoices = (data.invoices || []).map((inv) => ({
    ...inv,
    items: (inv.items || []).map((item) => ({
      ...item,
      unitPricePaise: toP(item.unitPrice ?? item.unitPricePaise),
      taxableAmountPaise: toP(item.taxableAmount ?? item.taxableAmountPaise),
      gstAmountPaise: toP(item.gstAmount ?? item.gstAmountPaise),
      cgstPaise: toP(item.cgst ?? item.cgstPaise),
      sgstPaise: toP(item.sgst ?? item.sgstPaise),
      igstPaise: toP(item.igst ?? item.igstPaise),
      totalPaise: toP(item.total ?? item.totalPaise),
      unitPrice: undefined,
      taxableAmount: undefined,
      gstAmount: undefined,
      cgst: undefined,
      sgst: undefined,
      igst: undefined,
      total: undefined,
    })),
    subtotalPaise: toP(inv.subtotal ?? inv.subtotalPaise),
    totalGSTPaise: toP(inv.totalGST ?? inv.totalGSTPaise),
    cgstPaise: toP(inv.cgst ?? inv.cgstPaise),
    sgstPaise: toP(inv.sgst ?? inv.sgstPaise),
    igstPaise: toP(inv.igst ?? inv.igstPaise),
    roundOffPaise: toP(inv.roundOff ?? inv.roundOffPaise),
    grandTotalPaise: toP(inv.grandTotal ?? inv.grandTotalPaise),
    paidAmountPaise: toP(inv.paidAmount ?? inv.paidAmountPaise),
    balanceDuePaise: toP(inv.balanceDue ?? inv.balanceDuePaise),
    subtotal: undefined,
    totalGST: undefined,
    cgst: undefined,
    sgst: undefined,
    igst: undefined,
    roundOff: undefined,
    grandTotal: undefined,
    paidAmount: undefined,
    balanceDue: undefined,
  }));

  const purchases = (data.purchases || []).map((p) => ({
    ...p,
    items: (p.items || []).map((item) => ({
      ...item,
      unitCostPaise: toP(item.unitCost ?? item.unitCostPaise),
      totalCostPaise: toP(item.totalCost ?? item.totalCostPaise),
      unitCost: undefined,
      totalCost: undefined,
    })),
    totalAmountPaise: toP(p.totalAmount ?? p.totalAmountPaise),
    totalGSTPaise: toP(p.totalGST ?? p.totalGSTPaise),
    totalAmount: undefined,
    totalGST: undefined,
  }));

  const products = (data.products || []).map((p) => ({
    ...p,
    sellingPricePaise: toP(p.sellingPrice ?? p.sellingPricePaise),
    costPricePaise: toP(p.costPrice ?? p.costPricePaise),
    sellingPrice: undefined,
    costPrice: undefined,
  }));

  const banking = (data.banking || []).map((b) => ({
    ...b,
    amountPaise: toP(b.amount ?? b.amountPaise),
    amount: undefined,
  }));

  const expensesMigrated = (data.expenses || []).map((e) => {
    const paise = toP(e.amount ?? e.amountPaise);
    const isAppPayload = !!(data.sales || data.balance || data.settings);
    if (isAppPayload) {
      return { ...e, amount: paise };
    }
    return { ...e, amountPaise: paise, amount: undefined };
  });

  return {
    ...DEFAULT_DATA_V2,
    ...data,
    schemaVersion: 2,
    lastMigrated: new Date().toISOString(),
    invoices,
    purchases: migratePurchases(data.purchases?.length ? data.purchases : purchases),
    products,
    banking,
    expenses: expensesMigrated,
    sales: migrateSales(data.sales),
    otherIncomes: migrateAmountList(data.otherIncomes),
    recurringExpenses: migrateRecurring(data.recurringExpenses),
    inventoryEntries: migrateInventory(data.inventoryEntries),
    emiEntries: migrateEmiEntries(data.emiEntries),
    loansGiven: migrateLoansGiven(data.loansGiven),
    customerAdvancePayments: migrateAdvancePayments(data.customerAdvancePayments),
    balance: migrateBalance(data.balance),
    settings: migrateSettings(data.settings),
    customers: data.customers || [],
    vendors: data.vendors || [],
    journalEntries: data.journalEntries || [],
  };
}

/**
 * Run all necessary migrations on data to bring it to current version.
 * Always safe to call — if already current version, returns data unchanged.
 *
 * Usage: const safeData = migrateData(rawDataFromLocalStorage);
 */
export function migrateData(data) {
  if (!data || typeof data !== 'object') {
    console.warn('[schema] No data or invalid data — returning defaults');
    return { ...DEFAULT_DATA_V2 };
  }

  const version = data.schemaVersion || 1;

  if (version === CURRENT_SCHEMA_VERSION) {
    return data;
  }

  if (version > CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `[schema] Data version ${version} is newer than app version ` +
      `${CURRENT_SCHEMA_VERSION}. Please update the app.`
    );
  }

  console.log(`[schema] Migrating data from v${version} to v${CURRENT_SCHEMA_VERSION}`);

  let migrated = { ...data };

  if (version < 2) migrated = migrateV1toV2(migrated);

  console.log('[schema] Migration complete');
  return migrated;
}

/**
 * Validate that data has all required top-level keys.
 * Returns { valid: boolean, missing: string[] }
 */
export function validateDataStructure(data) {
  const required = [
    'schemaVersion', 'business', 'invoices', 'purchases',
    'products', 'customers', 'vendors', 'banking', 'expenses',
  ];
  const missing = required.filter((k) => !(k in data));
  return { valid: missing.length === 0, missing };
}

/**
 * Check if imported data is safe to import.
 * Returns { safe: boolean, reason: string | null }
 */
export function checkImportSafety(importedData, currentData) {
  if (!importedData.schemaVersion) {
    return { safe: true, reason: null, needsMigration: true };
  }
  if (importedData.schemaVersion > CURRENT_SCHEMA_VERSION) {
    return {
      safe: false,
      reason: `Imported data is from a newer version of the app ` +
              `(v${importedData.schemaVersion}). Please update MyBusiness first.`,
      needsMigration: false,
    };
  }
  const importedDate = new Date(importedData.lastMigrated || 0);
  const currentDate = new Date(currentData?.lastMigrated || 0);
  if (importedDate < currentDate) {
    return {
      safe: true,
      reason: `Warning: imported data is older than your current data ` +
              `(imported: ${importedDate.toLocaleDateString()}). ` +
              `Importing will overwrite newer data.`,
      needsMigration: importedData.schemaVersion < CURRENT_SCHEMA_VERSION,
    };
  }
  return {
    safe: true,
    reason: null,
    needsMigration: importedData.schemaVersion < CURRENT_SCHEMA_VERSION,
  };
}
