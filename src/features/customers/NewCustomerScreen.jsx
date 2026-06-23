import { Field, OverlayScreen, PageHeader } from "@/shared/ui/layout/AppChrome.jsx";
import { MenuSelect } from "@/shared/ui/inputs/MenuSelect.jsx";

export function NewCustomerScreen({ isEdit, entry, upd, onSubmit, onClose }) {
  return (
    <OverlayScreen className="overlay-screen--form-footer">
      <PageHeader title={isEdit ? "Edit customer" : "New customer"} onBack={onClose} />
      <div className="overlay-scroll overlay-scroll--form-body">
        <form id="form-new-customer" className="form-sections" onSubmit={onSubmit}>
          <div className="form-card">
            <div className="form-card-title">Contact</div>
            <div className="form-stack">
              <Field label="Customer name">
                <input type="text" required value={entry.name} onChange={(e) => upd("name", e.target.value)} autoComplete="name" />
              </Field>
              <Field label="Phone 1">
                <input type="tel" required value={entry.customerNo1} onChange={(e) => upd("customerNo1", e.target.value)} autoComplete="tel" />
              </Field>
              <Field label="Phone 2 (optional)">
                <input type="tel" value={entry.customerNo2} onChange={(e) => upd("customerNo2", e.target.value)} />
              </Field>
              <Field label="Email (optional)">
                <input type="email" value={entry.email || ""} onChange={(e) => upd("email", e.target.value)} autoComplete="email" />
              </Field>
              <Field label="Customer type">
                <MenuSelect
                  value={entry.customerType || ""}
                  onChange={(v) => upd("customerType", v)}
                  options={[
                    { value: "", label: "—" },
                    { value: "Retail", label: "Retail" },
                    { value: "B2B", label: "B2B" },
                  ]}
                />
              </Field>
            </div>
          </div>
          <div className="form-card">
            <div className="form-card-title">Address</div>
            <div className="form-stack">
              <Field label="Street / area">
                <textarea
                  className="textarea-compact"
                  rows={2}
                  value={entry.customerAddress}
                  onChange={(e) => upd("customerAddress", e.target.value)}
                  placeholder="Building, road, landmark (optional)"
                />
              </Field>
              <div className="field-row">
                <Field label="City">
                  <input type="text" value={entry.customerCity} onChange={(e) => upd("customerCity", e.target.value)} />
                </Field>
                <Field label="State">
                  <input type="text" value={entry.customerState} onChange={(e) => upd("customerState", e.target.value)} />
                </Field>
              </div>
              <Field label="PIN code">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  value={entry.customerPincode}
                  onChange={(e) => upd("customerPincode", e.target.value)}
                />
              </Field>
            </div>
          </div>
          <div className="form-card">
            <div className="form-card-title">Note</div>
            <div className="form-stack">
              <Field label="Internal note (optional)">
                <textarea
                  className="textarea-compact"
                  rows={2}
                  value={entry.note}
                  onChange={(e) => upd("note", e.target.value)}
                  placeholder="e.g. referral, preferences"
                />
              </Field>
            </div>
          </div>
        </form>
      </div>
      <div className="overlay-form-footer">
        <button type="submit" form="form-new-customer" className="primary-btn submit-btn">
          {isEdit ? "Save changes" : "Save customer"}
        </button>
      </div>
    </OverlayScreen>
  );
}
