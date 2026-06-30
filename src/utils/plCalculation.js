import { BANKING_CATEGORIES, affectsPL, getPLAccount, categoryFromTransferKind } from './bankingCategories.js';
import { sumMoney } from './money.js';

const BANK_EXTERNAL_SOURCE_ID = '__bank_external_source__';

function num(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

/** Convert app bank transfers to P&L banking entries. */
export function bankTransfersToBankingEntries(transfers = []) {
  return (transfers || [])
    .filter((t) => t && typeof t === 'object')
    .map((t) => {
      const isDeposit =
        t.kind === 'deposit' ||
        String(t.fromAccountId || '') === BANK_EXTERNAL_SOURCE_ID;
      const type = isDeposit ? 'credit' : 'debit';
      const category =
        t.category ||
        categoryFromTransferKind(t.kind, isDeposit);
      return {
        id: t.id,
        date: t.date,
        description: t.note || '',
        amountPaise: num(t.amount),
        type,
        category,
        subcategory: t.subcategory || '',
        linkedDocumentId: t.linkedDocumentId || '',
        linkedDocumentType: t.linkedDocumentType || 'other',
      };
    });
}

export function calculatePL(data, fromDate, toDate) {
  const banking = bankTransfersToBankingEntries(data.balance?.bankTransfers || data.banking || []);

  const bankingInDateRange = banking.filter((entry) => {
    const d = new Date(entry.date);
    return d >= new Date(fromDate) && d <= new Date(toDate);
  });

  const revenueFromBanking = bankingInDateRange
    .filter((e) => e.type === 'credit' && affectsPL(e.category))
    .reduce((acc, e) => {
      const account = getPLAccount(e.category);
      if (!acc[account]) acc[account] = 0;
      acc[account] += e.amountPaise;
      return acc;
    }, {});

  const expensesFromBanking = bankingInDateRange
    .filter((e) => e.type === 'debit' && affectsPL(e.category))
    .reduce((acc, e) => {
      const account = getPLAccount(e.category);
      if (!acc[account]) acc[account] = 0;
      acc[account] += e.amountPaise;
      return acc;
    }, {});

  const invoiceRevenue = (data.sales || [])
    .filter(
      (inv) =>
        (inv.status === 'confirmed' || (!inv.status && inv.invoiceNo)) &&
        inv.status !== 'cancelled' &&
        inv.status !== 'draft' &&
        new Date(inv.date) >= new Date(fromDate) &&
        new Date(inv.date) <= new Date(toDate),
    )
    .reduce((sum, inv) => sum + num(inv.totalSale), 0);

  const cogsFromPurchases = (data.purchases || [])
    .filter(
      (p) =>
        new Date(p.date) >= new Date(fromDate) &&
        new Date(p.date) <= new Date(toDate),
    )
    .reduce((sum, p) => sum + num(p.totalAmount ?? p.totalAmountPaise), 0);

  const totalRevenue =
    invoiceRevenue + sumMoney(Object.values(revenueFromBanking));

  const totalExpenses =
    cogsFromPurchases + sumMoney(Object.values(expensesFromBanking));

  const grossProfit = invoiceRevenue - cogsFromPurchases;
  const netProfit = totalRevenue - totalExpenses;

  return {
    revenue: {
      invoiceSales: invoiceRevenue,
      otherIncome: revenueFromBanking['Other income'] || 0,
      bankingRevenue: revenueFromBanking['Revenue'] || 0,
      total: totalRevenue,
    },
    expenses: {
      cogs: cogsFromPurchases,
      operatingExpenses: expensesFromBanking['Operating expenses'] || 0,
      breakdown: expensesFromBanking,
      total: totalExpenses,
    },
    grossProfit,
    netProfit,
    ownerDrawings: bankingInDateRange
      .filter((e) => e.category === 'OWNER_DRAWING')
      .reduce((sum, e) => sum + e.amountPaise, 0),
    uncategorisedCount: bankingInDateRange.filter((e) => !e.category).length,
  };
}

export { BANKING_CATEGORIES, affectsPL, getPLAccount };
