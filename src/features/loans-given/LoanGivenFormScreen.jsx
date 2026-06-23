import { useMemo } from "react";
import { buildLoanPartnerPickerRows, buildLoanPartyPickerRows, makeId, money } from "@/domain/index.js";
import { Field, OverlayScreen, PageHeader } from "@/shared/ui/layout/AppChrome.jsx";
import { LoanGivenNameSuggest } from "@/features/loans-given/LoanGivenNameSuggest.jsx";

/**
 * Add or edit a loan you gave (informal lending — balance sheet receivable).
 */
export function LoanGivenFormScreen({ isEdit, entry, upd, onSubmit, onClose, loansGiven = [] }) {
  const partners = Array.isArray(entry.partners) ? entry.partners : [];

  const partyPickRows = useMemo(() => buildLoanPartyPickerRows(loansGiven), [loansGiven]);
  const partnerPickRows = useMemo(() => buildLoanPartnerPickerRows(loansGiven), [loansGiven]);

  const addPartner = () => {
    upd("partners", [...partners, { id: makeId(), name: "", amountGiven: "", interestSharePct: "" }]);
  };
  const patchPartner = (idx, key, val) => {
    const arr = [...partners];
    arr[idx] = { ...arr[idx], [key]: val };
    upd("partners", arr);
  };
  const removePartner = (idx) => {
    upd(
      "partners",
      partners.filter((_, i) => i !== idx),
    );
  };

  const pickParty = (row) => {
    upd("borrowerName", row.displayName);
    upd("phone", row.phone || "");
  };

  const pickPartner = (idx, row) => {
    const arr = [...partners];
    arr[idx] = {
      ...arr[idx],
      name: row.displayName,
      ...(row.amountGiven ? { amountGiven: row.amountGiven } : {}),
      ...(row.interestSharePct ? { interestSharePct: row.interestSharePct } : {}),
    };
    upd("partners", arr);
  };

  const partnerMeta = (r) => {
    const bits = [];
    if (r.amountGiven) bits.push(money(Number(r.amountGiven)));
    if (r.interestSharePct) bits.push(`${r.interestSharePct}%/mo`);
    return bits.join(" · ");
  };

  return (
    <OverlayScreen className="overlay-screen--form-footer">
      <PageHeader title={isEdit ? "Edit loan" : "New loan given"} onBack={onClose} />
      <div className="overlay-scroll overlay-scroll--form-body">
        <form id="form-loan-given" className="form-sections" onSubmit={onSubmit}>
          <div className="form-card">
            <div className="form-stack">
              <LoanGivenNameSuggest
                label="Borrower name"
                value={entry.borrowerName}
                onChange={(v) => upd("borrowerName", v)}
                onPick={pickParty}
                rows={partyPickRows}
                listId="loan-party-suggest-listbox"
                required
                autoFocus
                placeholder="Name"
                metaForRow={(r) => r.phone || ""}
              />
              <Field label="Phone">
                <input
                  type="tel"
                  inputMode="tel"
                  value={entry.phone}
                  onChange={(e) => upd("phone", e.target.value)}
                  placeholder="Mobile / WhatsApp"
                />
              </Field>
              <div className="field-row">
                <Field label="Loan amount (₹)">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={entry.principal}
                    onChange={(e) => upd("principal", e.target.value)}
                  />
                </Field>
                <Field label="Principal repaid (₹)">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={entry.principalRepaid}
                    onChange={(e) => upd("principalRepaid", e.target.value)}
                  />
                </Field>
              </div>
              <div className="field-row">
                <Field label="Interest % per month">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={entry.interestRateMonthlyPct ?? ""}
                    onChange={(e) => upd("interestRateMonthlyPct", e.target.value)}
                    placeholder="e.g. 2"
                  />
                </Field>
                <Field label="Interest due in books (₹)">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={entry.interestOutstanding}
                    onChange={(e) => upd("interestOutstanding", e.target.value)}
                    placeholder="0"
                  />
                </Field>
              </div>
              <div className="field-row">
                <Field label="Date given">
                  <input type="date" value={entry.dateGiven} onChange={(e) => upd("dateGiven", e.target.value)} />
                </Field>
                <Field label="Due date">
                  <input type="date" value={entry.dueDate} onChange={(e) => upd("dueDate", e.target.value)} />
                </Field>
              </div>
              <Field label="Description / notes">
                <textarea
                  className="textarea-compact"
                  rows={3}
                  value={entry.description}
                  onChange={(e) => upd("description", e.target.value)}
                  placeholder="Purpose, terms, reminders…"
                />
              </Field>
              <label className="loan-given-closed-check">
                <input
                  type="checkbox"
                  checked={entry.trackOnBalanceSheet !== false}
                  onChange={(e) => upd("trackOnBalanceSheet", e.target.checked)}
                />
                <span>Include on balance sheet</span>
              </label>
              <label className="loan-given-closed-check">
                <input type="checkbox" checked={!!entry.closed} onChange={(e) => upd("closed", e.target.checked)} />
                <span>Loan settled</span>
              </label>
            </div>
          </div>

          <div className="form-card loan-given-partners-card">
            <div className="loan-given-partners-hd">
              <h3 className="form-card-hd loan-given-partners-card-title">Partners</h3>
              <button type="button" className="text-btn" onClick={addPartner}>
                + Add partner
              </button>
            </div>
            {partners.length > 0 ? (
              <div className="form-stack loan-given-partner-stack">
                {partners.map((p, idx) => (
                  <div key={p.id || idx} className="loan-given-partner-row">
                    <LoanGivenNameSuggest
                      label="Partner name"
                      value={p.name}
                      onChange={(v) => patchPartner(idx, "name", v)}
                      onPick={(row) => pickPartner(idx, row)}
                      rows={partnerPickRows}
                      listId={`loan-partner-suggest-${idx}`}
                      placeholder="e.g. Rajesh"
                      metaForRow={partnerMeta}
                    />
                    <div className="field-row">
                      <Field label="Amount given (₹)">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={p.amountGiven ?? p.amount ?? p.shareValue ?? ""}
                          onChange={(e) => patchPartner(idx, "amountGiven", e.target.value)}
                          placeholder="e.g. 50000"
                        />
                      </Field>
                      <Field label="%/mo on loan">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={p.interestSharePct ?? ""}
                          onChange={(e) => patchPartner(idx, "interestSharePct", e.target.value)}
                          placeholder="e.g. 2"
                        />
                      </Field>
                    </div>
                    <button type="button" className="text-btn loan-given-partner-remove" onClick={() => removePartner(idx)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </form>
      </div>
      <div className="overlay-form-footer">
        <button type="submit" form="form-loan-given" className="primary-btn submit-btn">
          {isEdit ? "Save changes" : "Save"}
        </button>
      </div>
    </OverlayScreen>
  );
}
