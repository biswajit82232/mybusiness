import { useState } from "react";
import { buildExistingCustomerPickerRows, getDefaultBankAccountId, num, todayStr } from "@/domain/index.js";
import { IcX } from "@/shared/ui/icons/AppIcons.jsx";
import { MenuSelect } from "@/shared/ui/inputs/MenuSelect.jsx";
import { Field } from "@/shared/ui/layout/AppChrome.jsx";

export function RecordAdvancePaymentModal({
  sales = [],
  customerDirectory = [],
  bankAccounts = [],
  defaultBankAccountId = "",
  onSubmit,
  onDismiss,
}) {
  const customerOptions = buildExistingCustomerPickerRows(sales, customerDirectory).map((r) => ({
    value: r.displayName,
    label: r.displayName,
  }));
  const [customerName, setCustomerName] = useState("");
  const [bankAccountId, setBankAccountId] = useState(
    () => defaultBankAccountId || getDefaultBankAccountId(bankAccounts) || "",
  );
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => todayStr());
  const [note, setNote] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!String(customerName || "").trim() || !String(bankAccountId || "").trim() || !num(amount)) return;
    onSubmit?.({
      customerName: String(customerName).trim(),
      amount,
      date: String(date || todayStr()).slice(0, 10),
      bankAccountId: String(bankAccountId).trim(),
      note: String(note || "").trim(),
    });
  };

  return (
    <div className="modal-overlay" onClick={onDismiss}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Record customer advance payment"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="modal-hdr">
          <span className="modal-title">Customer advance payment</span>
          <button type="button" className="icon-btn-sm" onClick={onDismiss} aria-label="Close">
            <IcX />
          </button>
        </div>
        <p className="modal-sub">Record money received in advance from a customer. A receipt number is assigned automatically.</p>
        <form onSubmit={handleSubmit}>
          <Field label="Customer">
            <MenuSelect
              value={customerName}
              onChange={setCustomerName}
              options={[{ value: "", label: "Select customer" }, ...customerOptions]}
            />
          </Field>
          <Field label="Deposit to (bank / cash)">
            <MenuSelect
              value={bankAccountId}
              onChange={setBankAccountId}
              options={[
                { value: "", label: "Select account" },
                ...(bankAccounts || []).map((b) => ({
                  value: b.id,
                  label: (b.name || "").trim() || "Account",
                })),
              ]}
            />
          </Field>
          <Field label="Amount received (₹)">
            <input
              type="number"
              min="0.01"
              step="0.01"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </Field>
          <Field label="Payment date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </Field>
          <Field label="Note (optional)">
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Booking advance" />
          </Field>
          <div className="modal-btns">
            <button type="button" className="ghost-btn" onClick={onDismiss}>
              Cancel
            </button>
            <button
              type="submit"
              className="primary-btn"
              disabled={!String(customerName || "").trim() || !String(bankAccountId || "").trim()}
            >
              Record &amp; receipt
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
