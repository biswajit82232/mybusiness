import { useState } from "react";
import { num } from "@/domain/index.js";
import { Field } from "@/shared/ui/layout/AppChrome.jsx";

/** Owns draft state; remount via `key` when saved investment changes (save / sync). */
export function NetWorthInvestForm({ investedSaved, onSaveInvested }) {
  const [draft, setDraft] = useState(() => (investedSaved > 0 ? String(investedSaved) : ""));
  const onSubmit = async (e) => {
    e.preventDefault();
    await onSaveInvested(num(draft));
  };
  return (
    <form className="form-card nw-invest-card" onSubmit={onSubmit}>
      <span className="form-card-title">Track vs your books</span>
      <div className="form-stack">
        <Field label="Total money you put into the business (₹)">
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="e.g. 500000"
          />
        </Field>
      </div>
      <div className="nw-form-actions">
        <button type="submit" className="qa-btn qa-primary nw-save-btn">
          Save investment
        </button>
      </div>
    </form>
  );
}
