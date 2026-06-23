import { useEffect } from "react";
import { addDaysStr, getDefaultBankAccountId, num, todayStr } from "@/domain/index.js";
import { MenuSelect } from "@/shared/ui/inputs/MenuSelect.jsx";
import { Field, OverlayScreen, PageHeader } from "@/shared/ui/layout/AppChrome.jsx";

export function NewLoanGivenScreen({ isEdit, entry, upd, bankAccounts = [], onSubmit, onClose }) {
  const banks = bankAccounts.filter((b) => b && b.id);
  const rawBank = String(entry.receivedBankAccountId || "").trim();
  const bankVal = banks.some((b) => String(b.id) === rawBank) ? rawBank : getDefaultBankAccountId(banks) || "";

  useEffect(() => {
    if (isEdit || entry.dueDate) return;
    const d = addDaysStr(entry.date || todayStr(), 30);
    if (d !== entry.dueDate) upd("dueDate", d);
  }, [isEdit, entry.date, entry.dueDate, upd]);

  return (
    <OverlayScreen className="overlay-screen--form-footer">
      <PageHeader title={isEdit ? "Edit loan" : "New loan given"} onBack={onClose} />
      <div className="overlay-scroll overlay-scroll--form-body">
        <form id="form-new-loan-given" className="form-sections" onSubmit={onSubmit}>
          <div className="form-card">
            <div className="form-stack">
              <Field label="Date">
                <input type="date" required value={entry.date} onChange={(e) => upd("date", e.target.value)} />
              </Field>
              <Field label="Due date">
                <input type="date" value={entry.dueDate} onChange={(e) => upd("dueDate", e.target.value)} />
              </Field>
              <Field label="Borrower name">
                <input type="text" required value={entry.borrowerName} onChange={(e) => upd("borrowerName", e.target.value)} />
              </Field>
              <Field label="Phone (optional)">
                <input type="tel" value={entry.borrowerPhone} onChange={(e) => upd("borrowerPhone", e.target.value)} />
              </Field>
              <Field label="Principal (₹)">
                <input type="number" min="0.01" step="0.01" required value={entry.principal} onChange={(e) => upd("principal", e.target.value)} />
              </Field>
              {!isEdit && (
                <>
                  <Field label="Received now (₹)">
                    <input type="number" min="0" step="0.01" value={entry.receivedAmount} onChange={(e) => upd("receivedAmount", e.target.value)} placeholder="0" />
                  </Field>
                  {num(entry.receivedAmount) > 0 && banks.length > 0 && (
                    <Field label="Deposit to">
                      <MenuSelect
                        value={bankVal}
                        onChange={(v) => upd("receivedBankAccountId", v)}
                        options={banks.map((b) => ({ value: b.id, label: (b.name || "").trim() || "Account" }))}
                      />
                    </Field>
                  )}
                </>
              )}
              <Field label="Notes">
                <textarea className="textarea-compact" rows={2} value={entry.notes} onChange={(e) => upd("notes", e.target.value)} />
              </Field>
            </div>
          </div>
        </form>
      </div>
      <div className="overlay-form-footer">
        <button type="submit" form="form-new-loan-given" className="primary-btn submit-btn">{isEdit ? "Save changes" : "Save loan"}</button>
      </div>
    </OverlayScreen>
  );
}
