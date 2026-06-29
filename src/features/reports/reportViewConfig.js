/** Reports that support bill-wise vs party-wise (customer / supplier) grouping. */
export const REPORT_PARTY_CONFIG = {
  sales: { partyLabel: "Customer", billLabel: "Bill wise" },
  salesOutstanding: { partyLabel: "Customer", billLabel: "Bill wise" },
  inwardPayment: { partyLabel: "Customer", billLabel: "Bill wise" },
  otherDocument: { partyLabel: "Customer", billLabel: "Bill wise" },
  purchase: { partyLabel: "Supplier", billLabel: "Bill wise" },
  purchaseOutstanding: { partyLabel: "Supplier", billLabel: "Bill wise" },
  outwardPayment: { partyLabel: "Supplier", billLabel: "Bill wise" },
};

export function reportSupportsPartyView(reportId) {
  return reportId in REPORT_PARTY_CONFIG;
}

export function partyConfigForReport(reportId) {
  return REPORT_PARTY_CONFIG[reportId] ?? null;
}
