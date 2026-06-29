import { useCallback } from "react";
import {
  addDaysStr,
  buildSalePaymentEntriesFromForm,
  bundleStockSufficient,
  computeInvRowsForBranch,
  defSale,
  defSalePaymentLine,
  findBundleById,
  findInvRowByItemName,
  genInvoiceNo,
  getDefaultBranchId,
  invoiceSequenceForPrefix,
  makeId,
  normalizeItemKey,
  normBranchesList,
  normBundlesList,
  normEmiPaidDates,
  normalizePaymentEntries,
  num,
  roundMoney2,
  toPaise,
  saleDocPrefix,
  saleToEntry,
  sumSaleLineItems,
  normSaleDraft,
  clearSaleDraftSettings,
  todayStr,
} from "@/domain/index.js";
import { isGstEnabled } from "@/domain/invoiceGst.js";
import {
  normalizeDocType,
  saleDocUsesAutoStockOut,
  saleDocNextNumberSettingKey,
} from "@/domain/saleDocuments.js";

/**
 * Save-sale handler (new + edit), including stock-out automation and EMI capture.
 * Navigation refs are read but never stored here — they live in AuthenticatedApp.
 */
export function useSalesActions({
  state,
  saleEntry,
  editingSaleId,
  showToast,
  setState,
  setScreen,
  setPage,
  setSaleEntry,
  setEditingSaleId,
  persistSaleImmediate,
  persistWholeStateImmediate,
  appendAuditEvent,
  emi2,
  emi3,
  emi4,
}) {
  const openNewSale = useCallback(
    (opts) => {
      setEditingSaleId(null);
      if (!opts?.fresh) {
        const draft = normSaleDraft(state.settings?.saleDraft);
        if (draft?.entry) {
          const base = { ...defSale(), ...draft.entry };
          const docType = normalizeDocType(base.docType);
          if (!String(base.invoiceNo || "").trim()) {
            const prefix = saleDocPrefix(state.settings, docType);
            const nextNo = state.settings?.[saleDocNextNumberSettingKey(docType)];
            base.invoiceNo = genInvoiceNo(state.sales, prefix, nextNo);
          }
          if (!String(base.dueDate || "").trim()) {
            base.dueDate = addDaysStr(
              base.date || todayStr(),
              num(state.settings?.defaultDueDays) || 30,
            );
          }
          setSaleEntry(base);
          setScreen("newSale");
          return;
        }
      }
      if (opts?.fresh && state.settings?.saleDraft) {
        setState((prev) => ({
          ...prev,
          settings: clearSaleDraftSettings(prev.settings),
        }));
      }
      const base = defSale();
      const docType = normalizeDocType(base.docType);
      const prefix = saleDocPrefix(state.settings, docType);
      const nextNo = state.settings?.[saleDocNextNumberSettingKey(docType)];
      setSaleEntry({
        ...base,
        docType,
        invoiceNo: genInvoiceNo(state.sales, prefix, nextNo),
        dueDate: addDaysStr(base.date, num(state.settings?.defaultDueDays) || 30),
      });
      setScreen("newSale");
    },
    [setEditingSaleId, setSaleEntry, setScreen, setState, state.sales, state.settings],
  );

  const discardSaleDraft = useCallback(() => {
    setState((prev) => ({
      ...prev,
      settings: clearSaleDraftSettings(prev.settings),
    }));
    showToast("Draft discarded");
  }, [setState, showToast]);

  const openEditSale = useCallback(
    (sale, emi) => {
      setEditingSaleId(sale.id);
      const br = normBranchesList(state.settings?.branches);
      const branchId = getDefaultBranchId(br);
      const stockRows = computeInvRowsForBranch(state.inventoryEntries || [], branchId, br).filter(
        (r) => r.currentQty > 0,
      );
      const saleBundleId = String(sale?.bundleId || "").trim();
      let itemProductPick = "__custom__";
      if (!saleBundleId && state.settings?.autoStockOutOnSale) {
        const raw = String(sale?.item || "").trim();
        if (raw) {
          const row = findInvRowByItemName(stockRows, raw);
          if (row) itemProductPick = normalizeItemKey(row.item);
        }
      }
      setSaleEntry({ ...saleToEntry(sale, emi), itemProductPick, bundleId: saleBundleId });
      setScreen("newSale");
    },
    [setEditingSaleId, setSaleEntry, setScreen, state.inventoryEntries, state.settings?.autoStockOutOnSale, state.settings?.branches],
  );

  const closeNewSale = useCallback(() => {
    if (editingSaleId) {
      setEditingSaleId(null);
      setScreen("saleDetail");
    } else {
      setScreen(null);
    }
  }, [editingSaleId, setEditingSaleId, setScreen]);

  const onSaveSale = useCallback(
    async (e) => {
      e.preventDefault();

      /* ── coerce line items ── */
      const rawLines =
        Array.isArray(saleEntry.lineItems) && saleEntry.lineItems.length > 0
          ? saleEntry.lineItems
          : [
              {
                item: saleEntry.item,
                qty: saleEntry.qty,
                salePrice: saleEntry.salePrice,
                costPrice: saleEntry.costPrice,
              },
            ];
      const lineItemsCoerced = rawLines
        .map((li) => ({
          id: String(li?.id || makeId()),
          item: String(li?.item || "").trim(),
          qty: num(li?.qty),
          salePrice: toPaise(num(li?.salePrice)),
          costPrice: toPaise(num(li?.costPrice)),
          hsn: String(li?.hsn || "").trim(),
          gstRate: num(li?.gstRate),
          chassisNo: String(li?.chassisNo || "").trim(),
          motorNo: String(li?.motorNo || "").trim(),
          batterySerialNo: String(li?.batterySerialNo || "").trim(),
          invoiceGroupId: String(li?.invoiceGroupId || "").trim(),
          itemDescription: String(li?.itemDescription || "").trim(),
        }))
        .filter((li) => li.item || li.qty > 0 || li.salePrice > 0 || li.costPrice > 0);
      if (lineItemsCoerced.length === 0) {
        showToast("Add at least one line item");
        return;
      }
      for (const li of lineItemsCoerced) {
        if (num(li.qty) < 0 || num(li.salePrice) < 0 || num(li.costPrice) < 0) {
          showToast("Quantity and prices cannot be negative");
          return;
        }
      }

      const lineTotals = sumSaleLineItems(lineItemsCoerced);
      const discount = roundMoney2(Math.max(0, toPaise(num(saleEntry.discount))));
      const additionalCharges = roundMoney2(Math.max(0, toPaise(num(saleEntry.additionalCharges))));
      const totalSale = roundMoney2(
        Math.max(0, lineTotals.totalSale - discount + additionalCharges),
      );
      const totalCost = lineTotals.totalCost;
      const first = lineItemsCoerced[0];
      const qty = first.qty;
      const sp = first.salePrice;
      const cp = first.costPrice;
      const payBuild = buildSalePaymentEntriesFromForm(
        saleEntry,
        saleEntry.date,
        state.balance?.bankAccounts || [],
        totalSale,
      );
      if (payBuild.error === "exceeds") {
        showToast("Payments received cannot exceed invoice total");
        return;
      }
      if (payBuild.error === "bank") {
        showToast("Choose the account for each payment (for Banking)");
        return;
      }
      const paymentEntriesFromForm = payBuild.entries;
      const receivedFromForm = payBuild.received;
      const oldSale = editingSaleId
        ? state.sales.find((s) => s && s.id === editingSaleId)
        : null;

      const docType = normalizeDocType(saleEntry.docType);
      if (isGstEnabled(state.settings) && docType !== "billOfSupply" && !(saleEntry.customerState || "").trim()) {
        showToast("Customer state is required for GST tax invoices");
        return;
      }
      const docPrefix = saleDocPrefix(state.settings, docType);
      const docNextSetting = state.settings?.[saleDocNextNumberSettingKey(docType)];
      const invoiceNo =
        (saleEntry.invoiceNo || "").trim() ||
        oldSale?.invoiceNo ||
        genInvoiceNo(state.sales, docPrefix, docNextSetting);
      const usedSeq = invoiceSequenceForPrefix(invoiceNo, docPrefix);
      const advanceSettingsNext = (settingsObj) => {
        const s2 = { ...settingsObj };
        const key = saleDocNextNumberSettingKey(docType);
        s2[key] = Math.max(1, num(s2[key]) || 1, usedSeq + 1);
        return s2;
      };

      if (
        state.sales.some(
          (s) => s && s.invoiceNo === invoiceNo && (!editingSaleId || s.id !== editingSaleId),
        )
      ) {
        showToast("Invoice number already used on another sale");
        return false;
      }

      const dueDate =
        (saleEntry.dueDate || "").trim() ||
        (saleEntry.financeCompany && saleEntry.dueDate1
          ? saleEntry.dueDate1
          : addDaysStr(saleEntry.date, num(state.settings.defaultDueDays) || 30));
      const received = Math.min(receivedFromForm, totalSale);
      const outstanding = Math.max(0, totalSale - received);

      const common = {
        docType,
        date: saleEntry.date,
        dueDate,
        invoiceNo,
        customerName: saleEntry.customerName.trim(),
        customerNo1: saleEntry.customerNo1.trim(),
        customerNo2: saleEntry.customerNo2.trim(),
        customerAddress: (saleEntry.customerAddress || "").trim(),
        customerCity: (saleEntry.customerCity || "").trim(),
        customerState: (saleEntry.customerState || "").trim(),
        customerPincode: (saleEntry.customerPincode || "").trim(),
        customerGstin: (saleEntry.customerGstin || "").trim().toUpperCase(),
        reverseCharge: saleEntry.reverseCharge === true,
        invoiceCopyType: ["duplicate", "triplicate"].includes(
          String(saleEntry.invoiceCopyType || "").toLowerCase(),
        )
          ? String(saleEntry.invoiceCopyType).toLowerCase()
          : "original",
        item: first.item,
        description: (saleEntry.description || "").trim(),
        note: (saleEntry.note || "").trim(),
        qty,
        salePrice: sp,
        costPrice: cp,
        lineItems: lineItemsCoerced,
        discount,
        additionalCharges,
        totalSale,
        totalCost,
        grossProfit: roundMoney2(totalSale - totalCost),
        received,
        outstanding,
        bundleId: String(saleEntry.bundleId || "").trim(),
        linkedSaleId: String(saleEntry.linkedSaleId || "").trim(),
        linkedInvoiceNo: String(saleEntry.linkedInvoiceNo || "").trim(),
      };

      const bundleList = normBundlesList(state.settings?.bundles);
      const sellBundle = common.bundleId ? findBundleById(bundleList, common.bundleId) : null;

      /* ── stock helper ── */
      const checkStockBeforeSave = (inventoryEntries, linesToCheck) => {
        if (!state.settings?.autoStockOutOnSale) return true;
        if (!saleDocUsesAutoStockOut(docType)) return true;
        const branches = normBranchesList(state.settings?.branches);
        const branchId = getDefaultBranchId(branches);
        const scoped = computeInvRowsForBranch(inventoryEntries, branchId, branches);
        if (sellBundle && sellBundle.lines.length >= 2) {
          if (!bundleStockSufficient(sellBundle, scoped, qty)) {
            showToast("Not enough stock for this bundle (default branch)");
            return false;
          }
        } else {
          const needPerItem = new Map();
          for (const li of linesToCheck) {
            const key = normalizeItemKey(li.item);
            if (!key) continue;
            needPerItem.set(key, (needPerItem.get(key) || 0) + num(li.qty));
          }
          for (const [key, need] of needPerItem) {
            const row = findInvRowByItemName(scoped, key);
            if (!row || row.currentQty < need - 1e-9) {
              const display =
                row?.item ||
                linesToCheck.find((l) => normalizeItemKey(l.item) === key)?.item ||
                key;
              showToast(`Not enough stock for ${display} (default branch)`);
              return false;
            }
          }
        }
        return true;
      };

      const buildAutoStockOutEntries = (inventoryEntries, saleRecord, saleIdForEntries) => {
        if (!state.settings?.autoStockOutOnSale) return inventoryEntries;
        if (!saleDocUsesAutoStockOut(saleRecord.docType)) return inventoryEntries;
        const branches = normBranchesList(state.settings?.branches);
        const branchId = getDefaultBranchId(branches);
        const scoped = computeInvRowsForBranch(inventoryEntries, branchId, branches);
        let newInv = [...inventoryEntries];
        if (sellBundle && sellBundle.lines.length >= 2) {
          for (const line of sellBundle.lines) {
            const row = scoped.find((r) => r.item.toLowerCase() === line.item.toLowerCase());
            if (!row) continue;
            const need = saleRecord.qty * num(line.qty);
            newInv = [
              {
                id: makeId(),
                date: saleRecord.date,
                item: row.item,
                type: "out",
                qty: need,
                qtyIn: 0,
                costPerUnit: row.avgCost,
                salesPrice: 0,
                note: `Auto stock-out · bundle · ${saleRecord.invoiceNo || ""}`,
                bankAccountId: "",
                branchId,
                saleId: saleIdForEntries,
              },
              ...newInv,
            ];
          }
        } else {
          for (const li of lineItemsCoerced) {
            const itemName = String(li.item || "").trim();
            const lineQty = num(li.qty);
            if (!itemName || lineQty <= 0) continue;
            const row = findInvRowByItemName(scoped, itemName);
            if (!row) continue;
            newInv = [
              {
                id: makeId(),
                date: saleRecord.date,
                item: row.item,
                type: "out",
                qty: lineQty,
                qtyIn: 0,
                costPerUnit: row.avgCost,
                salesPrice: 0,
                note: `Auto stock-out · ${saleRecord.invoiceNo || ""}`,
                bankAccountId: "",
                branchId,
                saleId: saleIdForEntries,
              },
              ...newInv,
            ];
          }
        }
        return newInv;
      };

      /* ── EDIT path ── */
      if (editingSaleId && oldSale) {
        const paymentEntries = paymentEntriesFromForm;
        const updated = { ...oldSale, ...common, id: editingSaleId, paymentEntries };
        const baseInv = (state.inventoryEntries || []).filter(
          (e) => String(e.saleId || "").trim() !== editingSaleId,
        );
        if (!checkStockBeforeSave(baseInv, lineItemsCoerced)) return;
        const nextInventoryEntries = buildAutoStockOutEntries(baseInv, updated, editingSaleId);

        let emiEntries = state.emiEntries.filter((e) => e.invoiceNo !== oldSale.invoiceNo);
        if (saleEntry.financeCompany && docType === "invoice") {
          const prevEmi = state.emiEntries.find((e) => e.invoiceNo === oldSale.invoiceNo);
          const newDueDates = [saleEntry.dueDate1, emi2, emi3, emi4].filter(Boolean);
          const paidDueDates =
            prevEmi && Array.isArray(prevEmi.paidDueDates)
              ? normEmiPaidDates(
                  prevEmi.paidDueDates.filter((d) => newDueDates.includes(String(d).slice(0, 10))),
                )
              : [];
          const emiId = prevEmi?.id || makeId();
          emiEntries = [
            {
              id: emiId,
              invoiceNo,
              customerName: updated.customerName,
              financeCompany: saleEntry.financeCompany,
              doNo: (saleEntry.doNo || "").trim(),
              loanAmount: num(saleEntry.loanAmount),
              downPayment: num(saleEntry.downPayment),
              emiAmount: num(saleEntry.emiAmount),
              dueDates: newDueDates,
              paidDueDates,
            },
            ...emiEntries,
          ];
        }

        let next = {
          ...state,
          settings: clearSaleDraftSettings(advanceSettingsNext(state.settings)),
          sales: state.sales.map((s) => (s.id === editingSaleId ? updated : s)),
          emiEntries,
          inventoryEntries: nextInventoryEntries,
        };
        next = appendAuditEvent(next, {
          entityType: "sales",
          recordId: String(editingSaleId),
          action: "update",
          note: `Invoice ${updated.invoiceNo || ""} updated`,
          details: { outstanding: updated.outstanding, received: updated.received },
        });
        await persistSaleImmediate(updated, oldSale);
        const __p = await persistWholeStateImmediate(next);
        if (__p) setState(__p);
        setEditingSaleId(null);
        setScreen("saleDetail");
        showToast("Sale updated");
        return;
      }

      /* ── CREATE path ── */
      const initialPayments = paymentEntriesFromForm;

      if (!checkStockBeforeSave(state.inventoryEntries || [], lineItemsCoerced)) return;

      const sale = {
        id: makeId(),
        ...common,
        paymentEntries: normalizePaymentEntries({ date: saleEntry.date, paymentEntries: initialPayments }),
      };
      let next = {
        ...state,
        settings: clearSaleDraftSettings(advanceSettingsNext(state.settings)),
        sales: [sale, ...state.sales],
      };
      next = {
        ...next,
        inventoryEntries: buildAutoStockOutEntries(next.inventoryEntries || [], sale, sale.id),
      };

      if (saleEntry.financeCompany && docType === "invoice") {
        next.emiEntries = [
          {
            id: makeId(),
            invoiceNo,
            customerName: sale.customerName,
            financeCompany: saleEntry.financeCompany,
            doNo: (saleEntry.doNo || "").trim(),
            loanAmount: num(saleEntry.loanAmount),
            downPayment: num(saleEntry.downPayment),
            emiAmount: num(saleEntry.emiAmount),
            dueDates: [saleEntry.dueDate1, emi2, emi3, emi4].filter(Boolean),
            paidDueDates: [],
          },
          ...state.emiEntries,
        ];
      }

      next = appendAuditEvent(next, {
        entityType: "sales",
        recordId: String(sale.id),
        action: "create",
        note: `Invoice ${sale.invoiceNo || ""} created`,
        details: { outstanding: sale.outstanding, received: sale.received },
      });

      await persistSaleImmediate(sale, null);
      const __p = await persistWholeStateImmediate(next);
      if (__p) setState(__p);
      setScreen(null);
      setPage("invoices");
      showToast("Sale saved");
    },
    [
      appendAuditEvent,
      editingSaleId,
      emi2,
      emi3,
      emi4,
      persistSaleImmediate,
      persistWholeStateImmediate,
      saleEntry,
      setEditingSaleId,
      setPage,
      setScreen,
      setState,
      showToast,
      state,
    ],
  );

  const prepClonedSaleEntry = useCallback(
    (sale, { docType, linkOriginal = false } = {}) => {
      const entry = saleToEntry(sale, null);
      const dt = normalizeDocType(docType || entry.docType);
      const safeType =
        dt === "creditNote" || dt === "debitNote"
          ? dt
          : dt === "billOfSupply"
            ? "billOfSupply"
            : "invoice";
      const prefix = saleDocPrefix(state.settings, safeType);
      const nextNo = state.settings?.[saleDocNextNumberSettingKey(safeType)];
      const defaultBank = "";
      return {
        ...entry,
        docType: safeType,
        invoiceNo: genInvoiceNo(state.sales, prefix, nextNo),
        date: todayStr(),
        dueDate: addDaysStr(todayStr(), num(state.settings?.defaultDueDays) || 30),
        receivedAmount: "",
        receivedBankAccountId: "",
        paymentLines: [defSalePaymentLine(defaultBank)],
        financeCompany: "",
        doNo: "",
        loanAmount: "",
        downPayment: "",
        emiAmount: "",
        dueDate1: "",
        linkedSaleId: linkOriginal ? String(sale.id || "") : "",
        linkedInvoiceNo: linkOriginal ? String(sale.invoiceNo || "") : "",
      };
    },
    [state.sales, state.settings],
  );

  const openDuplicateSale = useCallback(
    (sale) => {
      if (!sale) return;
      const src = normalizeDocType(sale.docType);
      const dupType =
        src === "creditNote" || src === "debitNote" ? "invoice" : src;
      setEditingSaleId(null);
      setSaleEntry(prepClonedSaleEntry(sale, { docType: dupType }));
      setScreen("newSale");
    },
    [prepClonedSaleEntry, setEditingSaleId, setSaleEntry, setScreen],
  );

  const openCreditNoteFromSale = useCallback(
    (sale) => {
      if (!sale) return;
      setEditingSaleId(null);
      setSaleEntry(prepClonedSaleEntry(sale, { docType: "creditNote", linkOriginal: true }));
      setScreen("newSale");
    },
    [prepClonedSaleEntry, setEditingSaleId, setSaleEntry, setScreen],
  );

  const openDebitNoteFromSale = useCallback(
    (sale) => {
      if (!sale) return;
      setEditingSaleId(null);
      setSaleEntry(prepClonedSaleEntry(sale, { docType: "debitNote", linkOriginal: true }));
      setScreen("newSale");
    },
    [prepClonedSaleEntry, setEditingSaleId, setSaleEntry, setScreen],
  );

  return {
    onSaveSale,
    openNewSale,
    openEditSale,
    closeNewSale,
    discardSaleDraft,
    openDuplicateSale,
    openCreditNoteFromSale,
    openDebitNoteFromSale,
  };
}
