import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  bankAccountMatchesSearch,
  customerDirectoryRecordMatchesSearch,
  dateHuman,
  emiEntryMatchesSearch,
  fuseFilter,
  money,
  otherIncomeMatchesSearch,
  purchaseMatchesSearch,
  saleMatchesSearch,
  vendorDirectoryRecordMatchesSearch,
} from "@/domain/index.js";
import {
  IcBack,
  IcBanking,
  IcBox,
  IcEmi,
  IcIncome,
  IcPayable,
  IcSales,
  IcSpend,
  IcUsers,
  IcX,
} from "@/shared/ui/icons/AppIcons.jsx";
import { OverlayScreen } from "@/shared/ui/layout/AppChrome.jsx";

const CAP = {
  sales: 40,
  purchases: 40,
  expenses: 40,
  otherIncome: 25,
  products: 40,
  customers: 25,
  vendors: 25,
  emi: 25,
  banks: 15,
};

/**
 * Global search: invoices, purchases, expenses, other income, inventory, contacts, EMIs, and bank accounts.
 */
export function SearchScreen({
  sales = [],
  purchases = [],
  expenses = [],
  otherIncomes = [],
  invRows = [],
  customerDirectory = [],
  vendorDirectory = [],
  emiEntries = [],
  bankAccounts = [],
  onClose,
  onOpenSale,
  onOpenPurchase,
  onOpenExpense,
  onOpenOtherIncome,
  onOpenProduct,
  onOpenCustomer,
  onOpenVendor,
  onOpenEmi,
  onOpenBankAccount,
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const qLen = query.trim().length;

  const mergeFuzzy = useCallback((fused, legacy, getId) => {
    const seen = new Set(fused.map((x) => String(getId(x))));
    const extra = legacy.filter((x) => !seen.has(String(getId(x))));
    return [...fused, ...extra];
  }, []);

  const salResults = useMemo(() => {
    if (qLen < 1) return [];
    const fused = fuseFilter(
      sales,
      [
        { name: "customerName", weight: 2 },
        { name: "invoiceNo", weight: 1.5 },
        "item",
        "description",
        "note",
        "customerNo1",
        "customerNo2",
        "financeCompany",
        "doNo",
      ],
      query,
      CAP.sales,
    );
    const legacy = sales.filter((s) => saleMatchesSearch(s, query));
    return mergeFuzzy(fused, legacy, (s) => s.id).slice(0, CAP.sales);
  }, [sales, query, qLen, mergeFuzzy]);

  const purResults = useMemo(() => {
    if (qLen < 1) return [];
    const fused = fuseFilter(
      purchases,
      [{ name: "supplierName", weight: 2 }, "invoiceRef", "notes", "lines.item"],
      query,
      CAP.purchases,
    );
    const legacy = purchases.filter((p) => purchaseMatchesSearch(p, query));
    return mergeFuzzy(fused, legacy, (p) => p.id).slice(0, CAP.purchases);
  }, [purchases, query, qLen, mergeFuzzy]);

  const expResults = useMemo(() => {
    if (qLen < 1) return [];
    return fuseFilter(expenses, ["description", "category", "note"], query, CAP.expenses);
  }, [expenses, query, qLen]);

  const oiResults = useMemo(() => {
    if (qLen < 1) return [];
    const fused = fuseFilter(otherIncomes, ["description", "category", "note"], query, CAP.otherIncome);
    const legacy = otherIncomes.filter((x) => otherIncomeMatchesSearch(x, query));
    return mergeFuzzy(fused, legacy, (x) => x.id).slice(0, CAP.otherIncome);
  }, [otherIncomes, query, qLen, mergeFuzzy]);

  const prodResults = useMemo(() => {
    if (qLen < 1) return [];
    return fuseFilter(invRows, ["item", "category"], query, CAP.products);
  }, [invRows, query, qLen]);

  const custResults = useMemo(() => {
    if (qLen < 1) return [];
    const fused = fuseFilter(
      customerDirectory,
      ["name", "customerNo1", "customerNo2", "email", "customerCity", "customerState"],
      query,
      CAP.customers,
    );
    const legacy = customerDirectory.filter((d) => customerDirectoryRecordMatchesSearch(d, query));
    return mergeFuzzy(fused, legacy, (d) => d.id || d.name).slice(0, CAP.customers);
  }, [customerDirectory, query, qLen, mergeFuzzy]);

  const vendResults = useMemo(() => {
    if (qLen < 1) return [];
    const fused = fuseFilter(vendorDirectory, ["name", "phone", "email", "city", "note"], query, CAP.vendors);
    const legacy = vendorDirectory.filter((d) => vendorDirectoryRecordMatchesSearch(d, query));
    return mergeFuzzy(fused, legacy, (d) => d.id || d.name).slice(0, CAP.vendors);
  }, [vendorDirectory, query, qLen, mergeFuzzy]);

  const emiResults = useMemo(() => {
    if (qLen < 1) return [];
    const fused = fuseFilter(emiEntries, ["customerName", "invoiceNo", "financeCompany"], query, CAP.emi);
    const legacy = emiEntries.filter((e) => emiEntryMatchesSearch(e, query));
    return mergeFuzzy(fused, legacy, (e) => e.id).slice(0, CAP.emi);
  }, [emiEntries, query, qLen, mergeFuzzy]);

  const bankResults = useMemo(() => {
    if (qLen < 1) return [];
    const fused = fuseFilter(bankAccounts, ["name", "kind"], query, CAP.banks);
    const legacy = bankAccounts.filter((a) => bankAccountMatchesSearch(a, query));
    return mergeFuzzy(fused, legacy, (a) => a.id).slice(0, CAP.banks);
  }, [bankAccounts, query, qLen, mergeFuzzy]);

  const hasResults =
    salResults.length > 0 ||
    purResults.length > 0 ||
    expResults.length > 0 ||
    oiResults.length > 0 ||
    prodResults.length > 0 ||
    custResults.length > 0 ||
    vendResults.length > 0 ||
    emiResults.length > 0 ||
    bankResults.length > 0;

  const openFirstSearchHit = useCallback(() => {
    if (qLen < 1) return;
    const tryOpen = [
      [salResults[0], () => onOpenSale?.(salResults[0].id)],
      [purResults[0], () => onOpenPurchase?.(purResults[0].id)],
      [expResults[0], () => onOpenExpense?.(expResults[0].id)],
      [oiResults[0], () => onOpenOtherIncome?.(oiResults[0].id)],
      [prodResults[0], () => onOpenProduct?.(prodResults[0])],
      [custResults[0], () => onOpenCustomer?.(custResults[0].name)],
      [vendResults[0], () => onOpenVendor?.(vendResults[0].name)],
      [emiResults[0], () => onOpenEmi?.(emiResults[0].id)],
      [bankResults[0], () => onOpenBankAccount?.(bankResults[0].id)],
    ];
    for (const [row, fn] of tryOpen) {
      if (row && typeof fn === "function") {
        fn();
        return;
      }
    }
  }, [
    qLen,
    salResults,
    purResults,
    expResults,
    oiResults,
    prodResults,
    custResults,
    vendResults,
    emiResults,
    bankResults,
    onOpenSale,
    onOpenPurchase,
    onOpenExpense,
    onOpenOtherIncome,
    onOpenProduct,
    onOpenCustomer,
    onOpenVendor,
    onOpenEmi,
    onOpenBankAccount,
  ]);

  const onSearchKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        openFirstSearchHit();
      }
    },
    [openFirstSearchHit],
  );

  return (
    <OverlayScreen className="overlay-screen--search">
      <div className="search-overlay-shell">
        <div className="search-overlay-bar">
          <button type="button" className="icon-btn search-overlay-back" onClick={onClose} aria-label="Back">
            <IcBack />
          </button>
          <input
            ref={inputRef}
            className="search-overlay-input"
            placeholder="Search sales, purchases, contacts…"
            aria-label="Search invoices, purchases, expenses, inventory, contacts, EMI, and bank accounts"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKeyDown}
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-keyshortcuts="Enter"
            aria-describedby="search-enter-hint"
          />
          {query ? (
            <button type="button" className="icon-btn-sm search-overlay-clear" onClick={() => setQuery("")} aria-label="Clear">
              <IcX />
            </button>
          ) : null}
        </div>
        <span id="search-enter-hint" className="sr-only">
          Enter opens the first result.
        </span>
        <div className="list-area search-results-scroll">
        {qLen < 1 ? (
          <div className="search-no-results">
            <p>Start typing</p>
            <p className="search-no-results-hint">Find sales, purchases, payables, income, products, customers, vendors, finance EMIs, and bank accounts.</p>
          </div>
        ) : !hasResults ? (
          <div className="search-no-results">
            <p>No results for &ldquo;{query}&rdquo;</p>
          </div>
        ) : (
          <>
            {salResults.length > 0 && (
              <>
                <div className="search-result-group-hd">Invoices ({salResults.length})</div>
                {salResults.map((s) => (
                  <button key={s.id} type="button" className="search-result-row" onClick={() => onOpenSale(s.id)}>
                    <div className="search-result-icon sri-sale">
                      <IcSales />
                    </div>
                    <div className="search-result-info">
                      <div className="search-result-title">{s.customerName}</div>
                      <div className="search-result-sub">
                        {s.invoiceNo}
                        {s.item ? ` · ${s.item}` : ""} · {dateHuman(s.date)}
                      </div>
                    </div>
                    <div className="search-result-amount">{money(s.totalSale)}</div>
                  </button>
                ))}
              </>
            )}
            {purResults.length > 0 && (
              <>
                <div className="search-result-group-hd">Purchases ({purResults.length})</div>
                {purResults.map((p) => (
                  <button key={p.id} type="button" className="search-result-row" onClick={() => onOpenPurchase(p.id)}>
                    <div className="search-result-icon sri-purchase">
                      <IcPayable />
                    </div>
                    <div className="search-result-info">
                      <div className="search-result-title">{(p.supplierName || "").trim() || "Supplier"}</div>
                      <div className="search-result-sub">
                        {(p.invoiceRef || "").trim() || "—"} · {dateHuman(p.date)}
                      </div>
                    </div>
                    <div className="search-result-amount">{money(p.totalAmount)}</div>
                  </button>
                ))}
              </>
            )}
            {expResults.length > 0 && (
              <>
                <div className="search-result-group-hd">Expenses ({expResults.length})</div>
                {expResults.map((e) => (
                  <button key={e.id} type="button" className="search-result-row" onClick={() => onOpenExpense(e.id)}>
                    <div className="search-result-icon sri-expense">
                      <IcSpend />
                    </div>
                    <div className="search-result-info">
                      <div className="search-result-title">{e.description || e.category}</div>
                      <div className="search-result-sub">
                        {e.category} · {dateHuman(e.date)}
                      </div>
                    </div>
                    <div className="search-result-amount search-result-amount--expense">{money(e.amount)}</div>
                  </button>
                ))}
              </>
            )}
            {oiResults.length > 0 && (
              <>
                <div className="search-result-group-hd">Other income ({oiResults.length})</div>
                {oiResults.map((oi) => (
                  <button key={oi.id} type="button" className="search-result-row" onClick={() => onOpenOtherIncome(oi.id)}>
                    <div className="search-result-icon sri-income">
                      <IcIncome />
                    </div>
                    <div className="search-result-info">
                      <div className="search-result-title">{oi.description || oi.category}</div>
                      <div className="search-result-sub">
                        {oi.category} · {dateHuman(oi.date)}
                      </div>
                    </div>
                    <div className="search-result-amount">{money(oi.amount)}</div>
                  </button>
                ))}
              </>
            )}
            {prodResults.length > 0 && (
              <>
                <div className="search-result-group-hd">Products / stock ({prodResults.length})</div>
                {prodResults.map((r) => (
                  <button
                    key={r.item}
                    type="button"
                    className="search-result-row"
                    onClick={() => onOpenProduct?.(r)}
                  >
                    <div className="search-result-icon sri-product">
                      <IcBox />
                    </div>
                    <div className="search-result-info">
                      <div className="search-result-title">{r.item}</div>
                      <div className="search-result-sub">
                        Qty: {r.currentQty} · Avg cost: {money(r.avgCost)}
                      </div>
                    </div>
                    <div className="search-result-amount">{money(r.stockValue)}</div>
                  </button>
                ))}
              </>
            )}
            {custResults.length > 0 && (
              <>
                <div className="search-result-group-hd">Customers ({custResults.length})</div>
                {custResults.map((d) => (
                  <button key={d.id} type="button" className="search-result-row" onClick={() => onOpenCustomer(d.name)}>
                    <div className="search-result-icon sri-customer">
                      <IcUsers />
                    </div>
                    <div className="search-result-info">
                      <div className="search-result-title">{d.name}</div>
                      <div className="search-result-sub">
                        {[d.customerNo1, d.customerCity].filter(Boolean).join(" · ") || "Saved contact"}
                      </div>
                    </div>
                  </button>
                ))}
              </>
            )}
            {vendResults.length > 0 && (
              <>
                <div className="search-result-group-hd">Vendors ({vendResults.length})</div>
                {vendResults.map((d) => (
                  <button key={d.id} type="button" className="search-result-row" onClick={() => onOpenVendor(d.name)}>
                    <div className="search-result-icon sri-vendor">
                      <IcPayable />
                    </div>
                    <div className="search-result-info">
                      <div className="search-result-title">{d.name}</div>
                      <div className="search-result-sub">
                        {[d.phone1, d.city].filter(Boolean).join(" · ") || "Saved vendor"}
                      </div>
                    </div>
                  </button>
                ))}
              </>
            )}
            {emiResults.length > 0 && (
              <>
                <div className="search-result-group-hd">Finance / EMI ({emiResults.length})</div>
                {emiResults.map((emi) => (
                  <button key={emi.id} type="button" className="search-result-row" onClick={() => onOpenEmi(emi.id)}>
                    <div className="search-result-icon sri-emi">
                      <IcEmi />
                    </div>
                    <div className="search-result-info">
                      <div className="search-result-title">{emi.customerName}</div>
                      <div className="search-result-sub">
                        {emi.invoiceNo} · {emi.financeCompany}
                        {emi.doNo ? ` · DO ${emi.doNo}` : ""}
                      </div>
                    </div>
                    <div className="search-result-amount">{money(emi.loanAmount)}</div>
                  </button>
                ))}
              </>
            )}
            {bankResults.length > 0 && (
              <>
                <div className="search-result-group-hd">Bank & cash accounts ({bankResults.length})</div>
                {bankResults.map((a) => (
                  <button key={a.id} type="button" className="search-result-row" onClick={() => onOpenBankAccount(a.id)}>
                    <div className="search-result-icon sri-bank">
                      <IcBanking />
                    </div>
                    <div className="search-result-info">
                      <div className="search-result-title">{a.name}</div>
                      <div className="search-result-sub">{a.kind === "cash" ? "Cash" : "Bank / wallet"}</div>
                    </div>
                    <div className="search-result-amount">{money(a.amount)}</div>
                  </button>
                ))}
              </>
            )}
          </>
        )}
        </div>
      </div>
    </OverlayScreen>
  );
}
