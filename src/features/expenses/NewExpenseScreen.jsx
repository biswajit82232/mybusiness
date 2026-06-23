import { DEFAULT_EXPENSE_CATEGORIES, getDefaultBankAccountId, RECURRING_FREQUENCIES } from "@/domain/index.js";
import { MenuSelect } from "@/shared/ui/inputs/MenuSelect.jsx";
import { Field, OverlayScreen, PageHeader } from "@/shared/ui/layout/AppChrome.jsx";

export function NewExpenseScreen({ isEdit, entry, upd, expenseCategories, bankAccounts = [], onSubmit, onClose }) {
  const cats = expenseCategories?.length ? expenseCategories : DEFAULT_EXPENSE_CATEGORIES;
  const catValue = cats.includes(entry.category) ? entry.category : cats.includes("Other") ? "Other" : cats[0];
  const banks = bankAccounts.filter((b) => b && b.id);
  const rawBankId = String(entry.bankAccountId || "").trim();
  const bankSelectValue = banks.some((b) => String(b.id) === rawBankId) ? rawBankId : getDefaultBankAccountId(banks);
  return (
    <OverlayScreen className="overlay-screen--form-footer">
      <PageHeader title={isEdit ? "Edit expense" : "New Expense"} onBack={onClose} />
      <div className="overlay-scroll overlay-scroll--form-body">
        <form id="form-new-expense" className="form-sections" onSubmit={onSubmit}>
          <div className="form-card">
            <div className="form-stack">
              <div className="field-row">
                <Field label="Date">
                  <input type="date" value={entry.date} onChange={(e) => upd("date", e.target.value)} />
                </Field>
                <Field label="Amount (₹)">
                  <input type="number" min="0.01" step="0.01" required value={entry.amount} onChange={(e) => upd("amount", e.target.value)} autoFocus />
                </Field>
              </div>
              <Field label="Category">
                <MenuSelect
                  value={catValue}
                  onChange={(v) => upd("category", v)}
                  options={cats.map((c) => ({ value: c, label: c }))}
                />
              </Field>
              {banks.length > 0 && (
                <Field label="Paid from">
                  <MenuSelect
                    value={bankSelectValue}
                    onChange={(v) => upd("bankAccountId", v)}
                    options={banks.map((b) => ({ value: b.id, label: (b.name || "").trim() || "Account" }))}
                  />
                </Field>
              )}
              <Field label="Description">
                <input type="text" value={entry.description} onChange={(e) => upd("description", e.target.value)} placeholder="What was it for?" />
              </Field>
              <Field label="Note (optional)">
                <textarea className="textarea-compact" rows={2} value={entry.note} onChange={(e) => upd("note", e.target.value)} />
              </Field>
              {!isEdit && (
                <>
                  <label className="field field-check">
                    <span className="field-lbl">Recurring expense</span>
                    <span className="check-row">
                      <input type="checkbox" checked={!!entry.recurring} onChange={(e) => upd("recurring", e.target.checked)} />
                    </span>
                  </label>
                  {entry.recurring && (
                    <Field label="Repeat every">
                      <MenuSelect
                        value={entry.frequency || "monthly"}
                        onChange={(v) => upd("frequency", v)}
                        options={RECURRING_FREQUENCIES.map((f) => ({ value: f.id, label: f.label }))}
                      />
                    </Field>
                  )}
                </>
              )}
            </div>
          </div>
        </form>
      </div>
      <div className="overlay-form-footer">
        <button type="submit" form="form-new-expense" className="primary-btn submit-btn">
          {isEdit ? "Save changes" : "Save Expense"}
        </button>
      </div>
    </OverlayScreen>
  );
}
