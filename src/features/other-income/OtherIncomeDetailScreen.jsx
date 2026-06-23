import { dateSlash, moneyFull } from "@/domain/index.js";
import { IcEdit, IcTrash } from "@/shared/ui/icons/AppIcons.jsx";
import { OverlayScreen, PageHeader } from "@/shared/ui/layout/AppChrome.jsx";

export function OtherIncomeDetailScreen({ row, bankAccounts = [], onClose, onEdit, onDelete }) {
  const title = (row.description || "").trim() || row.category || "Other income";
  const acct = bankAccounts.find((b) => b && String(b.id) === String(row.bankAccountId || "").trim()) || null;
  const acctLabel = acct ? (acct.name || "").trim() || "Account" : "—";
  return (
    <OverlayScreen>
      <PageHeader
        title="Other income"
        onBack={onClose}
        right={
          <div className="detail-hdr-actions">
            <button type="button" className="icon-btn icon-btn-sm" onClick={onEdit} aria-label="Edit income">
              <IcEdit />
            </button>
            <button type="button" className="icon-btn icon-btn-sm detail-hdr-del-ic" onClick={onDelete} aria-label="Delete income">
              <IcTrash />
            </button>
          </div>
        }
      />
      <div className="overlay-scroll detail-scroll">
        <section className="detail-hero detail-hero-v2">
          <div className="dh-topline">
            <span className="dh-inv">{row.category || "Income"}</span>
          </div>
          <h2 className="dh-name">{title}</h2>
          <div className="detail-kpi-grid">
            <div className="detail-kpi">
              <span className="detail-kpi-lbl">Amount</span>
              <strong className="detail-kpi-val is-due">{moneyFull(row.amount)}</strong>
            </div>
            <div className="detail-kpi">
              <span className="detail-kpi-lbl">Date</span>
              <strong className="detail-kpi-val">{dateSlash(row.date)}</strong>
            </div>
          </div>
        </section>

        <section className="detail-card detail-card-v2">
          <div className="dc-title">Details</div>
          <dl className="dc-dl">
            <div>
              <dt>Category</dt>
              <dd>{row.category || "—"}</dd>
            </div>
            <div>
              <dt>Description</dt>
              <dd>{(row.description || "").trim() || "—"}</dd>
            </div>
            <div>
              <dt>Received in</dt>
              <dd>{acctLabel}</dd>
            </div>
            <div>
              <dt>Note</dt>
              <dd>{(row.note || "").trim() || "—"}</dd>
            </div>
          </dl>
        </section>
      </div>
    </OverlayScreen>
  );
}
