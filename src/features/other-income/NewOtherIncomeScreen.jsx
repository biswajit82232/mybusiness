import { DEFAULT_OTHER_INCOME_CATEGORIES, getDefaultBankAccountId } from "@/domain/index.js";
import { MenuSelect } from "@/shared/ui/inputs/MenuSelect.jsx";
import { Field, OverlayScreen, PageHeader } from "@/shared/ui/layout/AppChrome.jsx";

export function NewOtherIncomeScreen({ isEdit, entry, upd, incomeCategories, bankAccounts = [], onSubmit, onClose }) {
  const cats = incomeCategories?.length ? incomeCategories : DEFAULT_OTHER_INCOME_CATEGORIES;
  const catValue = cats.includes(entry.category) ? entry.category : cats.includes("Other") ? "Other" : cats[0];
  const banks = bankAccounts.filter((b) => b && b.id);
  const rawBankId = String(entry.bankAccountId || "").trim();
  const bankSelectValue = banks.some((b) => String(b.id) === rawBankId) ? rawBankId : getDefaultBankAccountId(banks);
  return (
    <OverlayScreen className="overlay-screen--form-footer">
      <PageHeader title={isEdit ? "Edit other income" : "Other income"} onBack={onClose} />
      <div className="overlay-scroll overlay-scroll--form-body">
        <form id="form-new-other-income" className="form-sections" onSubmit={onSubmit}>
          {banks.length === 0 && (
            <p className="banking-empty-hint" style={{ padding: "0 16px 12px", color: "var(--warn, #c2410c)" }}>
              Add a bank or cash account under Banking so other income can be tied to an account. Without it, P&amp;L and cash flow may not align.
            </p>
          )}
          <div className="form-card">
            <div className="form-stack">
              <div className="field-row">
                <Field label="Date">
                  <input type="date" value={entry.date} onChange={(e) => upd("date", e.target.value)} />
                </Field>
                <Field label="Amount (₹)">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={entry.amount}
                    onChange={(e) => upd("amount", e.target.value)}
                    autoFocus
                  />
                </Field>
              </div>
              <Field label="Category">
                <MenuSelect value={catValue} onChange={(v) => upd("category", v)} options={cats.map((c) => ({ value: c, label: c }))} />
              </Field>
              {banks.length > 0 && (
                <Field label="Received in">
                  <MenuSelect
                    value={bankSelectValue}
                    onChange={(v) => upd("bankAccountId", v)}
                    options={banks.map((b) => ({ value: b.id, label: (b.name || "").trim() || "Account" }))}
                  />
                </Field>
              )}
              <Field label="Description">
                <input
                  type="text"
                  value={entry.description}
                  onChange={(e) => upd("description", e.target.value)}
                  placeholder="e.g. Bank interest"
                />
              </Field>
              <Field label="Note (optional)">
                <textarea className="textarea-compact" rows={2} value={entry.note} onChange={(e) => upd("note", e.target.value)} />
              </Field>
            </div>
          </div>
        </form>
      </div>
      <div className="overlay-form-footer">
        <button type="submit" form="form-new-other-income" className="primary-btn submit-btn">
          {isEdit ? "Save changes" : "Save"}
        </button>
      </div>
    </OverlayScreen>
  );
}
