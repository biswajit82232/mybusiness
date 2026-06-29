import { useCallback } from "react";
import {
  defCustomer,
  defExpense,
  defOtherIncome,
  defPurchase,
  defStock,
  defVendor,
  expenseToEntry,
  findInvRowByItemName,
  getDefaultBankAccountId,
  getExpenseCategoriesList,
  inventoryEntryToStockForm,
  makeId,
  moneyInputStr,
  normBranchesList,
  otherIncomeToEntry,
  purchaseToEntry,
  getDefaultBranchId,
} from "@/domain/index.js";

/**
 * Screen navigation helpers (open/close overlays, detail views, banking drill-down).
 * Back-stack refs are owned by AuthenticatedApp and passed in.
 */
export function useAppNavigation({
  state,
  invRows,
  showToast,
  setState,
  setScreen,
  setPage,
  setEditingCustomerId,
  setEditingVendorId,
  setEditingExpenseId,
  setEditingInventoryId,
  setEditingOtherIncomeId,
  setEditingPurchaseId,
  setCustomerEntry,
  setVendorEntry,
  setExpEntry,
  setStockEntry,
  setOiEntry,
  setPurchaseEntry,
  setSelSaleId,
  setSelExpenseId,
  setSelExpenseCategory,
  setSelEmiId,
  setSelBankAccountId,
  setSelCustomerName,
  setSelVendorName,
  setSelPurchaseId,
  setSelOtherIncomeId,
  setInvItemDetail,
  setDelConfirm,
  editingCustomerId,
  editingVendorId,
  editingExpenseId,
  editingOtherIncomeId,
  saleNavRef,
  purchaseNavRef,
  emiDetailNavRef,
  expenseNavRef,
  stockNavRef,
  newExpenseOpenedFromRef,
  otherIncomeOpenedFromRef,
  otherIncomeDetailFromRef,
  openedFromGlobalSearchRef,
}) {
  const updCustomer = useCallback((k, v) => setCustomerEntry((p) => ({ ...p, [k]: v })), [setCustomerEntry]);
  const openNewCustomer = useCallback(() => {
    setEditingCustomerId(null);
    setCustomerEntry(defCustomer());
    setScreen("newCustomer");
  }, [setCustomerEntry, setEditingCustomerId, setScreen]);
  const closeNewCustomer = useCallback(() => {
    if (editingCustomerId) {
      setEditingCustomerId(null);
      setScreen("customerDetail");
      return;
    }
    setScreen(null);
  }, [editingCustomerId, setEditingCustomerId, setScreen]);

  const updVendor = useCallback((k, v) => setVendorEntry((p) => ({ ...p, [k]: v })), [setVendorEntry]);
  const openNewVendor = useCallback(() => {
    setEditingVendorId(null);
    setVendorEntry(defVendor());
    setScreen("newVendor");
  }, [setEditingVendorId, setScreen, setVendorEntry]);
  const closeNewVendor = useCallback(() => {
    if (editingVendorId) {
      setEditingVendorId(null);
      setScreen("vendorDetail");
      return;
    }
    setScreen(null);
  }, [editingVendorId, setEditingVendorId, setScreen]);

  const openSaleDetail = useCallback(
    (id, from = "default") => {
      saleNavRef.current = { from };
      setSelSaleId(id);
      setScreen("saleDetail");
    },
    [saleNavRef, setScreen, setSelSaleId],
  );

  const openEmiDetail = useCallback(
    (emiOrId, from = "default") => {
      const id = emiOrId && typeof emiOrId === "object" ? emiOrId.id : emiOrId;
      if (id == null || id === "") return;
      emiDetailNavRef.current = from;
      setSelEmiId(String(id));
      setScreen("emiDetail");
    },
    [emiDetailNavRef, setScreen, setSelEmiId],
  );

  const closeEmiDetailNav = useCallback(() => {
    setSelEmiId(null);
    if (emiDetailNavRef.current === "search") {
      setScreen("search");
      return;
    }
    setScreen(null);
  }, [emiDetailNavRef, setScreen, setSelEmiId]);

  const openSaleDetailFromInvoice = useCallback(
    (invoiceNo) => {
      const sale = state.sales.find((s) => s.invoiceNo === invoiceNo);
      if (!sale) {
        showToast("Sale not found for this EMI");
        return;
      }
      const navFrom = emiDetailNavRef.current === "search" ? "search" : "default";
      saleNavRef.current = { from: navFrom };
      setSelEmiId(null);
      setSelSaleId(sale.id);
      setScreen("saleDetail");
    },
    [emiDetailNavRef, saleNavRef, setScreen, setSelEmiId, setSelSaleId, showToast, state.sales],
  );

  const closeSaleDetailNav = useCallback(() => {
    const { from } = saleNavRef.current;
    setSelSaleId(null);
    if (from === "banking") {
      setScreen("bankAccountDetail");
      return;
    }
    if (from === "search") {
      setScreen("search");
      return;
    }
    setScreen(null);
  }, [saleNavRef, setScreen, setSelSaleId]);

  const onStockProductPick = useCallback(
    (pick) => {
      setStockEntry((p) => {
        if (p.type === "out") {
          if (!pick) return { ...p, productPick: "", item: "", category: "" };
          const row = findInvRowByItemName(invRows, pick);
          return {
            ...p,
            productPick: pick,
            item: row ? row.item : pick,
            category: row?.category ? String(row.category) : "",
          };
        }
        if (pick === "__new__") return { ...p, productPick: "__new__", item: "", category: "" };
        const row = findInvRowByItemName(invRows, pick);
        if (!row) return { ...p, productPick: pick, item: pick, category: "" };
        return {
          ...p,
          productPick: pick,
          item: row.item,
          category: row.category ? String(row.category) : "",
          costPerUnit: row.avgCost ? moneyInputStr(row.avgCost) : "",
          salesPrice: row.salesPrice ? moneyInputStr(row.salesPrice) : "",
        };
      });
    },
    [invRows, setStockEntry],
  );

  const onStockTypeChange = useCallback(
    (t) => {
      const branches = normBranchesList(state.settings?.branches);
      const defaultBank = getDefaultBankAccountId(state.balance?.bankAccounts);
      setStockEntry((p) => ({
        ...defStock(),
        date: p.date,
        type: t,
        productPick: t === "out" ? "" : "__new__",
        note: p.note,
        bankAccountId: t === "opening" ? "" : defaultBank,
        branchId: String(p.branchId || "").trim() || getDefaultBranchId(branches),
      }));
    },
    [setStockEntry, state.balance?.bankAccounts, state.settings?.branches],
  );

  const openEditInventoryEntry = useCallback(
    (id, from = "ledger") => {
      const inv = (state.inventoryEntries || []).find((e) => e && String(e.id) === String(id));
      if (!inv) {
        showToast("Entry not found");
        return;
      }
      stockNavRef.current = { from };
      setEditingInventoryId(String(id));
      setStockEntry(inventoryEntryToStockForm(inv));
      setScreen("addStock");
    },
    [setEditingInventoryId, setScreen, setStockEntry, showToast, state.inventoryEntries, stockNavRef],
  );

  const closeAddStock = useCallback(() => {
    setEditingInventoryId(null);
    const from = stockNavRef.current.from;
    stockNavRef.current = { from: "default" };
    if (from === "banking") {
      setScreen("bankAccountDetail");
    } else if (from === "ledger") {
      setScreen(null);
      setPage("ledger");
    } else if (from === "inventoryItem") {
      setScreen("inventoryItemDetail");
    } else {
      setScreen(null);
    }
  }, [setEditingInventoryId, setPage, setScreen, stockNavRef]);

  const openInventoryItemDetail = useCallback(
    (row, branchFilter) => {
      if (!row || typeof row.item !== "string" || !String(row.item).trim()) return;
      const item = String(row.item).trim();
      setInvItemDetail({
        itemKey: item.toLowerCase(),
        displayName: item,
        branchId: branchFilter != null && String(branchFilter).trim() ? String(branchFilter).trim() : "",
      });
      setScreen("inventoryItemDetail");
    },
    [setInvItemDetail, setScreen],
  );

  const openInventoryItemDetailFromSearch = useCallback(
    (row) => {
      openedFromGlobalSearchRef.current = true;
      openInventoryItemDetail(row);
    },
    [openInventoryItemDetail, openedFromGlobalSearchRef],
  );

  const closeInventoryItemDetail = useCallback(() => {
    setInvItemDetail(null);
    if (openedFromGlobalSearchRef.current) {
      openedFromGlobalSearchRef.current = false;
      setScreen("search");
      return;
    }
    setScreen(null);
  }, [openedFromGlobalSearchRef, setInvItemDetail, setScreen]);

  const openAddStock = useCallback(
    (type = "in", prefillItem = "", branchIdOpt = null, navFrom) => {
      stockNavRef.current = { from: navFrom === "inventoryItem" ? "inventoryItem" : "default" };
      setEditingInventoryId(null);
      const defaultBank = getDefaultBankAccountId(state.balance?.bankAccounts);
      const branches = normBranchesList(state.settings?.branches);
      const defaultBranch = String(branchIdOpt || "").trim() || getDefaultBranchId(branches);
      if (prefillItem) {
        const key = prefillItem.trim().toLowerCase();
        const row = invRows.find((r) => r.item.toLowerCase() === key);
        const inOrOpening = type === "in" || type === "opening";
        setStockEntry({
          ...defStock(),
          type,
          productPick: key,
          item: row ? row.item : prefillItem.trim(),
          category: row?.category ? String(row.category) : "",
          costPerUnit: row && inOrOpening && row.avgCost ? moneyInputStr(row.avgCost) : "",
          salesPrice: row && inOrOpening && row.salesPrice ? moneyInputStr(row.salesPrice) : "",
          bankAccountId: type === "opening" ? "" : defaultBank,
          branchId: defaultBranch,
        });
      } else {
        setStockEntry({
          ...defStock(),
          type,
          productPick: type === "out" ? "" : "__new__",
          bankAccountId: type === "opening" ? "" : defaultBank,
          branchId: defaultBranch,
        });
      }
      setScreen("addStock");
    },
    [
      invRows,
      setEditingInventoryId,
      setScreen,
      setStockEntry,
      state.balance?.bankAccounts,
      state.settings?.branches,
      stockNavRef,
    ],
  );

  const openNewExpense = useCallback(
    (opts) => {
      let presetCategory = null;
      let returnTo = "expenses";
      if (typeof opts === "string") {
        presetCategory = opts;
      } else if (opts && typeof opts === "object" && ("presetCategory" in opts || "returnTo" in opts)) {
        presetCategory = opts.presetCategory ?? null;
        if (opts.returnTo === "expenseCategory") returnTo = "expenseCategory";
      }
      newExpenseOpenedFromRef.current = { screen: returnTo };
      setEditingExpenseId(null);
      const cats = getExpenseCategoriesList(state.settings);
      let defCat = cats.includes("Other") ? "Other" : cats[0] || "Other";
      if (presetCategory && cats.includes(presetCategory)) defCat = presetCategory;
      setExpEntry({
        ...defExpense(),
        category: defCat,
        bankAccountId: getDefaultBankAccountId(state.balance?.bankAccounts),
      });
      setScreen("newExpense");
    },
    [
      newExpenseOpenedFromRef,
      setEditingExpenseId,
      setExpEntry,
      setScreen,
      state.balance?.bankAccounts,
      state.settings,
    ],
  );

  const openExpenseCategory = useCallback(
    (cat) => {
      const c = String(cat || "").trim();
      if (!c) return;
      setPage("expenses");
      setSelExpenseCategory(c);
      setScreen("expenseCategory");
    },
    [setPage, setScreen, setSelExpenseCategory],
  );

  const openExpenseDetail = useCallback(
    (id, from = "expenses", category = null) => {
      expenseNavRef.current = { from, category };
      setSelExpenseId(String(id));
      setScreen("expenseDetail");
    },
    [expenseNavRef, setScreen, setSelExpenseId],
  );

  const openEditExpense = useCallback(
    (exp) => {
      if (!exp?.id) return;
      setEditingExpenseId(exp.id);
      setExpEntry(expenseToEntry(exp));
      setScreen("newExpense");
    },
    [setEditingExpenseId, setExpEntry, setScreen],
  );

  const closeNewExpense = useCallback(() => {
    if (editingExpenseId) {
      setEditingExpenseId(null);
      setScreen("expenseDetail");
    } else {
      const ret = newExpenseOpenedFromRef.current;
      if (ret.screen === "expenseCategory") {
        setScreen("expenseCategory");
      } else {
        setScreen(null);
        setPage("expenses");
      }
    }
  }, [editingExpenseId, newExpenseOpenedFromRef, setEditingExpenseId, setPage, setScreen]);

  const closeExpenseDetail = useCallback(() => {
    const { from, category } = expenseNavRef.current;
    setSelExpenseId(null);
    if (from === "banking") {
      setScreen("bankAccountDetail");
      return;
    }
    if (from === "search") {
      setScreen("search");
      return;
    }
    if (from === "ledger") {
      setScreen(null);
      setPage("ledger");
      return;
    }
    if (from === "expenseCategory" && category) {
      setSelExpenseCategory(category);
      setScreen("expenseCategory");
    } else {
      setSelExpenseCategory(null);
      setScreen(null);
      setPage("expenses");
    }
  }, [expenseNavRef, setPage, setScreen, setSelExpenseCategory, setSelExpenseId]);

  const closeExpenseCategory = useCallback(() => {
    setScreen(null);
    setSelExpenseCategory(null);
    setPage("expenses");
  }, [setPage, setScreen, setSelExpenseCategory]);

  const openOtherIncomeDetail = useCallback(
    (id, from = "list") => {
      const row = (state.otherIncomes || []).find((x) => x && x.id === id);
      if (!row) {
        showToast("Entry not found");
        return;
      }
      otherIncomeDetailFromRef.current = from;
      setSelOtherIncomeId(String(id));
      setScreen("otherIncomeDetail");
    },
    [otherIncomeDetailFromRef, setScreen, setSelOtherIncomeId, showToast, state.otherIncomes],
  );

  const openNewOtherIncome = useCallback(() => {
    otherIncomeOpenedFromRef.current = { from: "list" };
    setEditingOtherIncomeId(null);
    setOiEntry({
      ...defOtherIncome(),
      bankAccountId: getDefaultBankAccountId(state.balance?.bankAccounts),
    });
    setScreen("newOtherIncome");
  }, [otherIncomeOpenedFromRef, setEditingOtherIncomeId, setOiEntry, setScreen, state.balance?.bankAccounts]);

  const openEditOtherIncome = useCallback(
    (row, from = "list") => {
      if (!row?.id) return;
      otherIncomeOpenedFromRef.current = { from };
      setEditingOtherIncomeId(row.id);
      setOiEntry(otherIncomeToEntry(row));
      setScreen("newOtherIncome");
    },
    [otherIncomeOpenedFromRef, setEditingOtherIncomeId, setOiEntry, setScreen],
  );

  const closeNewOtherIncome = useCallback(() => {
    const editing = editingOtherIncomeId;
    setEditingOtherIncomeId(null);
    if (editing) {
      const oiFrom = otherIncomeOpenedFromRef.current.from;
      if (oiFrom === "detail") {
        setScreen("otherIncomeDetail");
        return;
      }
      if (oiFrom === "banking") {
        setScreen("bankAccountDetail");
        return;
      }
      if (oiFrom === "ledger") {
        setScreen(null);
        setPage("ledger");
        return;
      }
    }
    setScreen(null);
    setPage("otherIncome");
  }, [editingOtherIncomeId, otherIncomeOpenedFromRef, setEditingOtherIncomeId, setPage, setScreen]);

  const patchBank = useCallback(
    (id, patch) => {
      const rest = { ...patch };
      delete rest.amount;
      setState((p) => ({
        ...p,
        balance: {
          ...p.balance,
          bankAccounts: (p.balance.bankAccounts || []).map((a) => (a.id === id ? { ...a, ...rest } : a)),
        },
      }));
    },
    [setState],
  );

  const addBank = useCallback(() => {
    const id = makeId();
    setState((p) => ({
      ...p,
      balance: {
        ...p.balance,
        bankAccounts: [
          ...(p.balance.bankAccounts || []),
          { id, name: "New Account", amount: 0, openingBalance: 0, balanceAdjustment: 0, kind: "bank", excludeFromBalanceSheet: false, excludeFromLiquid: false },
        ],
      },
    }));
    setSelBankAccountId(id);
    setScreen("bankAccountDetail");
  }, [setScreen, setSelBankAccountId, setState]);

  const closeBankAccountDetail = useCallback(() => {
    setSelBankAccountId(null);
    if (openedFromGlobalSearchRef.current) {
      openedFromGlobalSearchRef.current = false;
      setScreen("search");
      return;
    }
    setScreen(null);
  }, [openedFromGlobalSearchRef, setScreen, setSelBankAccountId]);

  const openBankAccountFromSearch = useCallback(
    (id) => {
      openedFromGlobalSearchRef.current = true;
      setSelBankAccountId(String(id));
      setScreen("bankAccountDetail");
    },
    [openedFromGlobalSearchRef, setScreen, setSelBankAccountId],
  );

  const openCustomerDetailFromSearch = useCallback(
    (name) => {
      openedFromGlobalSearchRef.current = true;
      setSelCustomerName(name);
      setScreen("customerDetail");
    },
    [openedFromGlobalSearchRef, setScreen, setSelCustomerName],
  );

  const closeCustomerDetailNav = useCallback(() => {
    setSelCustomerName("");
    if (openedFromGlobalSearchRef.current) {
      openedFromGlobalSearchRef.current = false;
      setScreen("search");
      return;
    }
    setScreen(null);
  }, [openedFromGlobalSearchRef, setScreen, setSelCustomerName]);

  const openVendorDetailFromSearch = useCallback(
    (name) => {
      openedFromGlobalSearchRef.current = true;
      setSelVendorName(name);
      setScreen("vendorDetail");
    },
    [openedFromGlobalSearchRef, setScreen, setSelVendorName],
  );

  const closeVendorDetailNav = useCallback(() => {
    setSelVendorName("");
    if (openedFromGlobalSearchRef.current) {
      openedFromGlobalSearchRef.current = false;
      setScreen("search");
      return;
    }
    setScreen(null);
  }, [openedFromGlobalSearchRef, setScreen, setSelVendorName]);

  const requestDeleteBankActivity = useCallback(
    (t) => {
      if (!t || typeof t !== "object") return;
      if (t.linkKind === "expense" && t.expenseId) {
        setDelConfirm({ type: "expense", id: t.expenseId });
        return;
      }
      if (t.linkKind === "stockIn" && t.inventoryId) {
        stockNavRef.current = { from: "banking" };
        setDelConfirm({ type: "stock", id: t.inventoryId });
        return;
      }
      if (t.linkKind === "otherIncome" && t.otherIncomeId) {
        otherIncomeOpenedFromRef.current = { from: "banking" };
        setDelConfirm({ type: "otherIncome", id: t.otherIncomeId });
        return;
      }
      if (t.linkKind === "transfer" && t.transferId) {
        setDelConfirm({ type: "bankTransfer", id: t.transferId });
        return;
      }
      if (t.linkKind === "payment" && t.saleId && t.paymentEntryId) {
        setDelConfirm({ type: "salePayment", saleId: t.saleId, paymentEntryId: t.paymentEntryId });
        return;
      }
      if (t.linkKind === "purchasePayment" && t.purchaseId && t.paymentEntryId) {
        setDelConfirm({
          type: "purchasePayment",
          purchaseId: t.purchaseId,
          paymentEntryId: t.paymentEntryId,
        });
        return;
      }
      if (t.linkKind === "advancePayment" && t.advancePaymentId) {
        setDelConfirm({ type: "customerAdvance", id: t.advancePaymentId });
      }
    },
    [otherIncomeOpenedFromRef, setDelConfirm, stockNavRef],
  );

  const openNewPurchase = useCallback(() => {
    setEditingPurchaseId(null);
    const e = defPurchase();
    const banks = state.balance?.bankAccounts || [];
    const defBank = getDefaultBankAccountId(banks);
    if (defBank) e.bankAccountId = defBank;
    setPurchaseEntry(e);
    setPage("purchases");
    setScreen("newPurchase");
  }, [setEditingPurchaseId, setPage, setPurchaseEntry, setScreen, state.balance?.bankAccounts]);

  const openEditPurchase = useCallback(
    (p) => {
      if (!p || !p.id) return;
      setPurchaseEntry(purchaseToEntry(p));
      setEditingPurchaseId(String(p.id));
      setSelPurchaseId(null);
      setPage("purchases");
      setScreen("newPurchase");
    },
    [setEditingPurchaseId, setPage, setPurchaseEntry, setScreen, setSelPurchaseId],
  );

  const closeNewPurchase = useCallback(() => {
    setEditingPurchaseId(null);
    setScreen(null);
  }, [setEditingPurchaseId, setScreen]);

  const openPurchaseDetail = useCallback(
    (id, from = "default") => {
      if (id == null || id === "") return;
      purchaseNavRef.current = { from };
      setSelPurchaseId(String(id));
      setScreen("purchaseDetail");
    },
    [purchaseNavRef, setScreen, setSelPurchaseId],
  );

  const closePurchaseDetail = useCallback(() => {
    const { from } = purchaseNavRef.current;
    setSelPurchaseId(null);
    if (from === "search") {
      setScreen("search");
      return;
    }
    setScreen(null);
  }, [purchaseNavRef, setScreen, setSelPurchaseId]);

  return {
    updCustomer,
    openNewCustomer,
    closeNewCustomer,
    updVendor,
    openNewVendor,
    closeNewVendor,
    openSaleDetail,
    openEmiDetail,
    closeEmiDetailNav,
    openSaleDetailFromInvoice,
    closeSaleDetailNav,
    onStockProductPick,
    onStockTypeChange,
    openEditInventoryEntry,
    closeAddStock,
    openInventoryItemDetail,
    openInventoryItemDetailFromSearch,
    closeInventoryItemDetail,
    openAddStock,
    openNewExpense,
    openExpenseCategory,
    openExpenseDetail,
    openEditExpense,
    closeNewExpense,
    closeExpenseDetail,
    closeExpenseCategory,
    openOtherIncomeDetail,
    openNewOtherIncome,
    openEditOtherIncome,
    closeNewOtherIncome,
    patchBank,
    addBank,
    closeBankAccountDetail,
    openBankAccountFromSearch,
    openCustomerDetailFromSearch,
    closeCustomerDetailNav,
    openVendorDetailFromSearch,
    closeVendorDetailNav,
    requestDeleteBankActivity,
    openNewPurchase,
    openEditPurchase,
    closeNewPurchase,
    openPurchaseDetail,
    closePurchaseDetail,
  };
}
