import { useCallback } from "react";
import {
  defCustomer,
  defVendor,
  makeId,
  normCustomerDirectory,
  normVendorDirectory,
  todayStr,
} from "@/domain/index.js";

/**
 * Save handlers for customer/vendor directory records.
 */
export function useDirectoryActions({
  customerEntry,
  editingCustomerId,
  vendorEntry,
  editingVendorId,
  state,
  showToast,
  setState,
  setScreen,
  setSelCustomerName,
  setSelVendorName,
  setEditingCustomerId,
  setEditingVendorId,
  setCustomerEntry,
  setVendorEntry,
  persistWholeStateImmediate,
}) {
  const onSaveCustomer = useCallback(
    async (e) => {
      e.preventDefault();
      const name = (customerEntry.name || "").trim();
      if (!name) {
        showToast("Enter customer name");
        return;
      }
      if (!(customerEntry.customerNo1 || "").trim()) {
        showToast("Phone 1 is required");
        return;
      }
      const nl = name.toLowerCase();
      const editId = editingCustomerId;

      if (editId) {
        const oldRec = (state.customerDirectory || []).find((d) => d && d.id === editId);
        const oldNl = oldRec ? (oldRec.name || "").trim().toLowerCase() : "";
        const dupDir = (state.customerDirectory || []).some(
          (d) => d && d.id !== editId && (d.name || "").trim().toLowerCase() === nl,
        );
        const dupSale =
          (state.sales || []).some((s) => (s.customerName || "").trim().toLowerCase() === nl) &&
          nl !== oldNl;
        if (dupDir || dupSale) {
          showToast("This name is already used — open that customer or use a different name.");
          return;
        }
        const next = {
          ...state,
          customerDirectory: normCustomerDirectory(
            (state.customerDirectory || []).map((d) =>
              d && d.id === editId
                ? {
                    ...d,
                    name,
                    customerNo1: customerEntry.customerNo1.trim(),
                    customerNo2: (customerEntry.customerNo2 || "").trim(),
                    email: (customerEntry.email || "").trim(),
                    customerType: (customerEntry.customerType || "").trim(),
                    customerAddress: (customerEntry.customerAddress || "").trim(),
                    customerCity: (customerEntry.customerCity || "").trim(),
                    customerState: (customerEntry.customerState || "").trim(),
                    customerPincode: (customerEntry.customerPincode || "").trim(),
                    note: (customerEntry.note || "").trim(),
                  }
                : d,
            ),
          ),
        };
        try {
          const __p = await persistWholeStateImmediate(next);
          if (__p) setState(__p);
          setEditingCustomerId(null);
          setSelCustomerName(name);
          setScreen("customerDetail");
          setCustomerEntry(defCustomer());
          showToast("Customer updated");
        } catch {
          showToast("Could not save customer");
        }
        return;
      }

      const dupDir = (state.customerDirectory || []).some(
        (d) => (d.name || "").trim().toLowerCase() === nl,
      );
      const dupSale = (state.sales || []).some((s) => (s.customerName || "").trim().toLowerCase() === nl);
      if (dupDir || dupSale) {
        showToast("This name is already used — open that customer or use a different name.");
        return;
      }
      const rec = {
        id: makeId(),
        name,
        customerNo1: customerEntry.customerNo1.trim(),
        customerNo2: (customerEntry.customerNo2 || "").trim(),
        email: (customerEntry.email || "").trim(),
        customerType: (customerEntry.customerType || "").trim(),
        customerAddress: (customerEntry.customerAddress || "").trim(),
        customerCity: (customerEntry.customerCity || "").trim(),
        customerState: (customerEntry.customerState || "").trim(),
        customerPincode: (customerEntry.customerPincode || "").trim(),
        note: (customerEntry.note || "").trim(),
        createdAt: todayStr(),
      };
      const next = {
        ...state,
        customerDirectory: normCustomerDirectory([rec, ...(state.customerDirectory || [])]),
      };
      try {
        const __p = await persistWholeStateImmediate(next);
        if (__p) setState(__p);
        setScreen(null);
        setCustomerEntry(defCustomer());
        showToast("Customer saved");
      } catch {
        showToast("Could not save customer");
      }
    },
    [
      customerEntry,
      editingCustomerId,
      persistWholeStateImmediate,
      setCustomerEntry,
      setEditingCustomerId,
      setScreen,
      setSelCustomerName,
      setState,
      showToast,
      state,
    ],
  );

  const onSaveVendor = useCallback(
    async (e) => {
      e.preventDefault();
      const name = (vendorEntry.name || "").trim();
      if (!name) {
        showToast("Enter vendor name");
        return;
      }
      if (!(vendorEntry.phone1 || "").trim()) {
        showToast("Phone 1 is required");
        return;
      }
      const nl = name.toLowerCase();
      const editId = editingVendorId;

      if (editId) {
        const oldRec = (state.vendorDirectory || []).find((d) => d && d.id === editId);
        const oldNl = oldRec ? (oldRec.name || "").trim().toLowerCase() : "";
        const dupDir = (state.vendorDirectory || []).some(
          (d) => d && d.id !== editId && (d.name || "").trim().toLowerCase() === nl,
        );
        const dupPur =
          (state.purchases || []).some((p) => (p.supplierName || "").trim().toLowerCase() === nl) &&
          nl !== oldNl;
        if (dupDir || dupPur) {
          showToast("This name is already used — open that vendor or use a different name.");
          return;
        }
        const next = {
          ...state,
          vendorDirectory: normVendorDirectory(
            (state.vendorDirectory || []).map((d) =>
              d && d.id === editId
                ? {
                    ...d,
                    name,
                    phone1: vendorEntry.phone1.trim(),
                    phone2: (vendorEntry.phone2 || "").trim(),
                    email: (vendorEntry.email || "").trim(),
                    address: (vendorEntry.address || "").trim(),
                    city: (vendorEntry.city || "").trim(),
                    state: (vendorEntry.state || "").trim(),
                    pincode: (vendorEntry.pincode || "").trim(),
                    note: (vendorEntry.note || "").trim(),
                  }
                : d,
            ),
          ),
        };
        try {
          const __p = await persistWholeStateImmediate(next);
          if (__p) setState(__p);
          setEditingVendorId(null);
          setSelVendorName(name);
          setScreen("vendorDetail");
          setVendorEntry(defVendor());
          showToast("Vendor updated");
        } catch {
          showToast("Could not save vendor");
        }
        return;
      }

      const dupDir = (state.vendorDirectory || []).some((d) => (d.name || "").trim().toLowerCase() === nl);
      const dupPur = (state.purchases || []).some((p) => (p.supplierName || "").trim().toLowerCase() === nl);
      if (dupDir || dupPur) {
        showToast("This name is already used — open that vendor or use a different name.");
        return;
      }
      const rec = {
        id: makeId(),
        name,
        phone1: vendorEntry.phone1.trim(),
        phone2: (vendorEntry.phone2 || "").trim(),
        email: (vendorEntry.email || "").trim(),
        address: (vendorEntry.address || "").trim(),
        city: (vendorEntry.city || "").trim(),
        state: (vendorEntry.state || "").trim(),
        pincode: (vendorEntry.pincode || "").trim(),
        note: (vendorEntry.note || "").trim(),
        createdAt: todayStr(),
      };
      const next = {
        ...state,
        vendorDirectory: normVendorDirectory([rec, ...(state.vendorDirectory || [])]),
      };
      try {
        const __p = await persistWholeStateImmediate(next);
        if (__p) setState(__p);
        setScreen(null);
        setVendorEntry(defVendor());
        showToast("Vendor saved");
      } catch {
        showToast("Could not save vendor");
      }
    },
    [
      editingVendorId,
      persistWholeStateImmediate,
      setEditingVendorId,
      setScreen,
      setSelVendorName,
      setState,
      setVendorEntry,
      showToast,
      state,
      vendorEntry,
    ],
  );

  return { onSaveCustomer, onSaveVendor };
}
