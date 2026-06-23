import { Field, OverlayScreen, PageHeader } from "@/shared/ui/layout/AppChrome.jsx";

export function NewVendorScreen({ isEdit, entry, upd, onSubmit, onClose }) {
  return (
    <OverlayScreen className="overlay-screen--form-footer">
      <PageHeader title={isEdit ? "Edit vendor" : "New vendor"} onBack={onClose} />
      <div className="overlay-scroll overlay-scroll--form-body">
        <form id="form-new-vendor" className="form-sections" onSubmit={onSubmit}>
          <div className="form-card">
            <div className="form-card-title">Contact</div>
            <div className="form-stack">
              <Field label="Vendor name">
                <input type="text" required value={entry.name} onChange={(e) => upd("name", e.target.value)} autoComplete="organization" />
              </Field>
              <Field label="Phone 1">
                <input type="tel" required value={entry.phone1} onChange={(e) => upd("phone1", e.target.value)} autoComplete="tel" />
              </Field>
              <Field label="Phone 2 (optional)">
                <input type="tel" value={entry.phone2} onChange={(e) => upd("phone2", e.target.value)} />
              </Field>
              <Field label="Email (optional)">
                <input type="email" value={entry.email || ""} onChange={(e) => upd("email", e.target.value)} autoComplete="email" />
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
                  value={entry.address}
                  onChange={(e) => upd("address", e.target.value)}
                  placeholder="Building, road, landmark (optional)"
                />
              </Field>
              <div className="field-row">
                <Field label="City">
                  <input type="text" value={entry.city} onChange={(e) => upd("city", e.target.value)} />
                </Field>
                <Field label="State">
                  <input type="text" value={entry.state} onChange={(e) => upd("state", e.target.value)} />
                </Field>
              </div>
              <Field label="PIN code">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  value={entry.pincode}
                  onChange={(e) => upd("pincode", e.target.value)}
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
                  placeholder="e.g. payment terms, contact person"
                />
              </Field>
            </div>
          </div>
        </form>
      </div>
      <div className="overlay-form-footer">
        <button type="submit" form="form-new-vendor" className="primary-btn submit-btn">
          {isEdit ? "Save changes" : "Save vendor"}
        </button>
      </div>
    </OverlayScreen>
  );
}
