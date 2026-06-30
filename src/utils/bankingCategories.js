export const BANKING_CATEGORIES = {
  SALES_RECEIPT:     { label: 'Sales receipt',       plAccount: 'Revenue',     type: 'credit' },
  LOAN_RECEIVED:     { label: 'Loan received',        plAccount: null,          type: 'credit' },
  OWNER_CAPITAL:     { label: 'Owner capital in',     plAccount: null,          type: 'credit' },
  INTEREST_RECEIVED: { label: 'Interest received',    plAccount: 'Other income',type: 'credit' },
  OTHER_INCOME:      { label: 'Other income',         plAccount: 'Other income',type: 'credit' },
  REFUND_RECEIVED:   { label: 'Refund received',      plAccount: null,          type: 'credit' },

  PURCHASE_PAYMENT:  { label: 'Purchase payment',     plAccount: 'COGS',        type: 'debit'  },
  RENT:              { label: 'Rent',                  plAccount: 'Operating expenses', type: 'debit' },
  SALARY:            { label: 'Salary / wages',        plAccount: 'Operating expenses', type: 'debit' },
  ELECTRICITY:       { label: 'Electricity bill',      plAccount: 'Operating expenses', type: 'debit' },
  TRANSPORT:         { label: 'Transport / freight',   plAccount: 'Operating expenses', type: 'debit' },
  REPAIR:            { label: 'Repairs & maintenance', plAccount: 'Operating expenses', type: 'debit' },
  GST_PAYMENT:       { label: 'GST payment to govt',  plAccount: null,          type: 'debit'  },
  LOAN_REPAYMENT:    { label: 'Loan repayment',        plAccount: null,          type: 'debit'  },
  OWNER_DRAWING:     { label: 'Owner drawing',         plAccount: null,          type: 'debit'  },
  BANK_CHARGES:      { label: 'Bank charges',          plAccount: 'Operating expenses', type: 'debit' },
  OTHER_EXPENSE:     { label: 'Other expense',         plAccount: 'Operating expenses', type: 'debit' },
  TRANSFER:          { label: 'Internal transfer',     plAccount: null,          type: 'debit'  },
};

export function getCategories(type) {
  return Object.entries(BANKING_CATEGORIES)
    .filter(([, v]) => v.type === type)
    .map(([key, v]) => ({ key, ...v }));
}

export function affectsPL(categoryKey) {
  const cat = BANKING_CATEGORIES[categoryKey];
  return cat ? cat.plAccount !== null : false;
}

export function getPLAccount(categoryKey) {
  return BANKING_CATEGORIES[categoryKey]?.plAccount || null;
}

/** Map legacy bank transfer kind to default category key. */
export function categoryFromTransferKind(kind, isDeposit) {
  const k = String(kind || '').trim();
  if (k === 'owner_drawing') return 'OWNER_DRAWING';
  if (k === 'owner_capital') return 'OWNER_CAPITAL';
  if (k === 'deposit') return 'OTHER_INCOME';
  if (k === 'withdraw') return 'OTHER_EXPENSE';
  if (k === 'transfer') return 'TRANSFER';
  return isDeposit ? 'OTHER_INCOME' : 'OTHER_EXPENSE';
}
