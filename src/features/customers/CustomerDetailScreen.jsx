import { useMemo, useState } from "react";
import { compareYmdDesc, hasSaleAddress, money, num, saleAddressLines, saleStatus, dateHuman } from "@/domain/index.js";
import { IcEdit, IcSales, IcTrash } from "@/shared/ui/icons/AppIcons.jsx";
import { ContactIcons, EmptyState, OverlayScreen, PageHeader } from "@/shared/ui/layout/AppChrome.jsx";
import { avatarColor, avatarInitials } from "./avatarUtils.js";

export function CustomerDetailScreen({
  customerName,
  sales = [],
  defaultDueDays = 30,
  customerDirectory = [],
  onClose,
  onOpenSale,
  onEditDirectoryCustomer,
  onDeleteDirectoryCustomer,
}) {
  const [activeTab, setActiveTab] = useState("transactions");
  const normalizedCustomerName = (customerName || "").trim().toLowerCase();
  const customerSales = useMemo(
    () =>
      sales
        .filter((s) => (s?.customerName || "").trim().toLowerCase() === normalizedCustomerName)
        .sort((a, b) => compareYmdDesc(a?.date, b?.date)),
    [sales, normalizedCustomerName],
  );
  const dirMatch = useMemo(
    () => (customerDirectory || []).find((d) => (d.name || "").trim().toLowerCase() === normalizedCustomerName) ?? null,
    [customerDirectory, normalizedCustomerName],
  );
  const totalRevenue = useMemo(() => customerSales.reduce((s, x) => s + num(x.totalSale), 0), [customerSales]);
  const totalOutstanding = useMemo(() => customerSales.reduce((s, x) => s + num(x.outstanding), 0), [customerSales]);
  const totalPaid = useMemo(() => customerSales.reduce((s, x) => s + num(x.received), 0), [customerSales]);
  const avgOrder = useMemo(
    () => (customerSales.length ? totalRevenue / customerSales.length : 0),
    [customerSales.length, totalRevenue],
  );
  const sample = customerSales[0] || {};
  const phone1 = sample.customerNo1 || dirMatch?.customerNo1 || "";
  const phone2 = sample.customerNo2 || dirMatch?.customerNo2 || "";
  const addrSource = sample && hasSaleAddress(sample) ? sample : dirMatch && hasSaleAddress(dirMatch) ? dirMatch : null;

  return (
    <OverlayScreen>
      <PageHeader
        title={customerName}
        onBack={onClose}
        right={
          dirMatch ? (
            <div className="detail-hdr-actions">
              <button type="button" className="icon-btn icon-btn-sm" onClick={() => onEditDirectoryCustomer(dirMatch)} aria-label="Edit customer">
                <IcEdit />
              </button>
              <button type="button" className="icon-btn icon-btn-sm detail-hdr-del-ic" onClick={() => onDeleteDirectoryCustomer(dirMatch.id)} aria-label="Delete customer">
                <IcTrash />
              </button>
            </div>
          ) : undefined
        }
      />
      <div className="overlay-scroll" style={{ padding: 0 }}>
        <div className="customer-detail-hero">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div className={`avatar ${avatarColor(customerName)}`} style={{ width: 52, height: 52, fontSize: "1.1rem" }}>
              {avatarInitials(customerName)}
            </div>
            <div>
              <div className="customer-detail-name">{customerName}</div>
              {phone1 && <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{phone1}</div>}
              {phone2 && <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{phone2}</div>}
              {dirMatch?.email?.trim() && (
                <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{dirMatch.email.trim()}</div>
              )}
              {dirMatch?.customerType?.trim() && (
                <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{dirMatch.customerType.trim()}</div>
              )}
            </div>
          </div>
          {(phone1 || phone2) && (
            <div className="customer-detail-contact-icons">
              {phone1 ? <ContactIcons phone={phone1} /> : null}
              {phone2 && phone2 !== phone1 ? <ContactIcons phone={phone2} /> : null}
            </div>
          )}
          {addrSource && <p className="customer-detail-addr">{saleAddressLines(addrSource).join("\n")}</p>}
          {dirMatch?.note?.trim() && (
            <p className="customer-detail-note">
              <span className="customer-detail-note-lbl">Note</span>
              {dirMatch.note.trim()}
            </p>
          )}
          <div className="customer-detail-kpis">
            <div className="customer-kpi-card">
              <div className="customer-kpi-card-lbl">Total Revenue</div>
              <div className="customer-kpi-card-val">{money(totalRevenue)}</div>
            </div>
            <div className="customer-kpi-card">
              <div className="customer-kpi-card-lbl">Receivables</div>
              <div className={`customer-kpi-card-val ${totalOutstanding > 0 ? "due" : ""}`}>{money(totalOutstanding)}</div>
            </div>
            <div className="customer-kpi-card">
              <div className="customer-kpi-card-lbl">Total Paid</div>
              <div className="customer-kpi-card-val">{money(totalPaid)}</div>
            </div>
            <div className="customer-kpi-card">
              <div className="customer-kpi-card-lbl">Invoices · Avg</div>
              <div className="customer-kpi-card-val">
                {customerSales.length} · {money(avgOrder)}
              </div>
            </div>
          </div>
        </div>

        <div className="detail-tabs">
          <button type="button" className={`detail-tab${activeTab === "transactions" ? " active" : ""}`} onClick={() => setActiveTab("transactions")}>
            TRANSACTIONS
          </button>
          <button type="button" className={`detail-tab${activeTab === "summary" ? " active" : ""}`} onClick={() => setActiveTab("summary")}>
            SUMMARY
          </button>
        </div>

        {activeTab === "transactions" && (
          <div className="list-area">
            {customerSales.length === 0 ? (
              <EmptyState icon={<IcSales />} title="No invoices" />
            ) : (
              customerSales.map((s) => {
                const st = saleStatus(s, defaultDueDays);
                return (
                  <button key={s.id} type="button" className="sale-row" onClick={() => onOpenSale(s.id)}>
                    <div className="sr-left">
                      <span className="sr-name">{s.invoiceNo}</span>
                      <span className="sr-item">{s.item}</span>
                      <span className="sr-sub">{dateHuman(s.date)}</span>
                    </div>
                    <div className="sr-right">
                      <span className="sr-amount">{money(s.totalSale)}</span>
                      <span className={`status-badge ${st.cls}`}>{st.text}</span>
                      {s.outstanding > 0 && <span className="sr-due">Due {money(s.outstanding)}</span>}
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
              <div className="form-card-title">Financial Summary</div>
              <div className="dc-dl">
                <div>
                  <dt>Total Invoiced</dt>
                  <dd>{money(totalRevenue)}</dd>
                </div>
                <div>
                  <dt>Total Collected</dt>
                  <dd style={{ color: "var(--success)" }}>{money(totalPaid)}</dd>
                </div>
                <div>
                  <dt>Outstanding</dt>
                  <dd style={{ color: totalOutstanding > 0 ? "var(--warning)" : "var(--success)" }}>{money(totalOutstanding)}</dd>
                </div>
                <div>
                  <dt>Number of Invoices</dt>
                  <dd>{customerSales.length}</dd>
                </div>
                <div>
                  <dt>Last Transaction</dt>
                  <dd>{customerSales[0]?.date ? dateHuman(customerSales[0].date) : "—"}</dd>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </OverlayScreen>
  );
}
