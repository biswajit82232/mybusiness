import { useMemo, useState } from "react";
import { compareYmdDesc, dateHuman, money, num } from "@/domain/index.js";
import { IcEdit, IcTrash, IcUpload } from "@/shared/ui/icons/AppIcons.jsx";
import { ContactIcons, EmptyState, OverlayScreen, PageHeader } from "@/shared/ui/layout/AppChrome.jsx";
import { avatarColor, avatarInitials } from "@/features/customers/avatarUtils.js";

function purchaseStatus(p) {
  const out = num(p.outstanding);
  if (out <= 0.01) return { cls: "s-paid", text: "Paid" };
  return { cls: "s-unpaid", text: "Open" };
}

export function VendorDetailScreen({
  vendorName,
  purchases,
  vendorDirectory = [],
  onClose,
  onOpenPurchase,
  onEditDirectoryVendor,
  onDeleteDirectoryVendor,
}) {
  const [activeTab, setActiveTab] = useState("transactions");
  const normalizedName = (vendorName || "").trim().toLowerCase();
  const vendorPurchases = useMemo(
    () =>
      (purchases || [])
        .filter((p) => (p?.supplierName || "").trim().toLowerCase() === normalizedName)
        .sort((a, b) => compareYmdDesc(a?.date, b?.date)),
    [purchases, normalizedName],
  );
  const dirMatch = useMemo(
    () => (vendorDirectory || []).find((d) => (d.name || "").trim().toLowerCase() === normalizedName) ?? null,
    [vendorDirectory, normalizedName],
  );
  const totalPurchases = useMemo(() => vendorPurchases.reduce((s, x) => s + num(x.totalAmount), 0), [vendorPurchases]);
  const totalOutstanding = useMemo(() => vendorPurchases.reduce((s, x) => s + num(x.outstanding), 0), [vendorPurchases]);
  const totalPaid = useMemo(() => vendorPurchases.reduce((s, x) => s + num(x.received), 0), [vendorPurchases]);
  const avgBill = useMemo(
    () => (vendorPurchases.length ? totalPurchases / vendorPurchases.length : 0),
    [vendorPurchases.length, totalPurchases],
  );
  const phone1 = dirMatch?.phone1 || "";
  const phone2 = dirMatch?.phone2 || "";

  return (
    <OverlayScreen>
      <PageHeader
        title={vendorName}
        onBack={onClose}
        right={
          dirMatch ? (
            <div className="detail-hdr-actions">
              <button type="button" className="icon-btn icon-btn-sm" onClick={() => onEditDirectoryVendor(dirMatch)} aria-label="Edit vendor">
                <IcEdit />
              </button>
              <button type="button" className="icon-btn icon-btn-sm detail-hdr-del-ic" onClick={() => onDeleteDirectoryVendor(dirMatch.id)} aria-label="Delete vendor">
                <IcTrash />
              </button>
            </div>
          ) : undefined
        }
      />
      <div className="overlay-scroll overlay-scroll--flush">
        <div className="customer-detail-hero">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div className={`avatar ${avatarColor(vendorName)}`} style={{ width: 52, height: 52, fontSize: "1.1rem" }}>
              {avatarInitials(vendorName)}
            </div>
            <div>
              <div className="customer-detail-name">{vendorName}</div>
              {phone1 && <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{phone1}</div>}
              {phone2 && <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{phone2}</div>}
              {dirMatch?.email?.trim() && <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{dirMatch.email.trim()}</div>}
            </div>
          </div>
          {(phone1 || phone2) && (
            <div className="customer-detail-contact-icons">
              {phone1 ? <ContactIcons phone={phone1} /> : null}
              {phone2 && phone2 !== phone1 ? <ContactIcons phone={phone2} /> : null}
            </div>
          )}
          {dirMatch && (dirMatch.address || dirMatch.city || dirMatch.state || dirMatch.pincode) && (
            <p className="customer-detail-addr">
              {[dirMatch.address, [dirMatch.city, dirMatch.state].filter(Boolean).join(", "), dirMatch.pincode].filter(Boolean).join("\n")}
            </p>
          )}
          {dirMatch?.note?.trim() && (
            <p className="customer-detail-note">
              <span className="customer-detail-note-lbl">Note</span>
              {dirMatch.note.trim()}
            </p>
          )}
          <div className="customer-detail-kpis">
            <div className="customer-kpi-card">
              <div className="customer-kpi-card-lbl">Total purchases</div>
              <div className="customer-kpi-card-val">{money(totalPurchases)}</div>
            </div>
            <div className="customer-kpi-card">
              <div className="customer-kpi-card-lbl">Payables</div>
              <div className={`customer-kpi-card-val ${totalOutstanding > 0 ? "due" : ""}`}>{money(totalOutstanding)}</div>
            </div>
            <div className="customer-kpi-card">
              <div className="customer-kpi-card-lbl">Paid</div>
              <div className="customer-kpi-card-val">{money(totalPaid)}</div>
            </div>
            <div className="customer-kpi-card">
              <div className="customer-kpi-card-lbl">Invoices · Avg</div>
              <div className="customer-kpi-card-val">
                {vendorPurchases.length} · {money(avgBill)}
              </div>
            </div>
          </div>
        </div>

        <div className="detail-tabs">
          <button type="button" className={`detail-tab${activeTab === "transactions" ? " active" : ""}`} onClick={() => setActiveTab("transactions")}>
            PURCHASES
          </button>
          <button type="button" className={`detail-tab${activeTab === "summary" ? " active" : ""}`} onClick={() => setActiveTab("summary")}>
            SUMMARY
          </button>
        </div>

        {activeTab === "transactions" && (
          <div className="list-area">
            {vendorPurchases.length === 0 ? (
              <EmptyState icon={<IcUpload />} title="No purchase invoices" />
            ) : (
              vendorPurchases.map((p) => {
                const st = purchaseStatus(p);
                return (
                  <button key={p.id} type="button" className="sale-row" onClick={() => onOpenPurchase(p.id)}>
                    <div className="sr-left">
                      <span className="sr-name">{(p.invoiceRef || "").trim() || "—"}</span>
                      <span className="sr-item">{dateHuman(p.date)}</span>
                      <span className="sr-sub">{(p.notes || "").trim() || "Purchase"}</span>
                    </div>
                    <div className="sr-right">
                      <span className="sr-amount">{money(p.totalAmount)}</span>
                      <span className={`status-badge ${st.cls}`}>{st.text}</span>
                      {num(p.outstanding) > 0.01 && <span className="sr-due">Due {money(p.outstanding)}</span>}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}

        {activeTab === "summary" && (
          <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="form-card">
              <div className="form-card-title">Summary</div>
              <div className="dc-dl">
                <div>
                  <dt>Total invoiced</dt>
                  <dd>{money(totalPurchases)}</dd>
                </div>
                <div>
                  <dt>Paid to supplier</dt>
                  <dd style={{ color: "var(--success)" }}>{money(totalPaid)}</dd>
                </div>
                <div>
                  <dt>Outstanding</dt>
                  <dd style={{ color: totalOutstanding > 0 ? "var(--warning)" : "var(--success)" }}>{money(totalOutstanding)}</dd>
                </div>
                <div>
                  <dt>Number of invoices</dt>
                  <dd>{vendorPurchases.length}</dd>
                </div>
                <div>
                  <dt>Last invoice</dt>
                  <dd>{vendorPurchases[0]?.date ? dateHuman(vendorPurchases[0].date) : "—"}</dd>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </OverlayScreen>
  );
}
