import { dateSlash, moneyFull, RECURRING_FREQUENCIES } from "@/domain/index.js";
import { IcEdit, IcTrash } from "@/shared/ui/icons/AppIcons.jsx";
import { OverlayScreen, PageHeader } from "@/shared/ui/layout/AppChrome.jsx";

export function ExpenseDetailScreen({ expense, recurringRule, bankAccounts = [], onClose, onEdit, onDelete }) {
  const title = (expense.description || "").trim() || expense.category || "Expense";
  const paidFrom = bankAccounts.find((b) => b && String(b.id) === String(expense.bankAccountId || "").trim()) || null;
  const paidFromLabel = paidFrom ? (paidFrom.name || "").trim() || "Account" : "";
  const freqLabel = recurringRule ? RECURRING_FREQUENCIES.find((f) => f.id === recurringRule.frequency)?.label || "Recurring" : "";
  return (
    <OverlayScreen>
      <PageHeader
        title="Expense"
        onBack={onClose}
        right={
          <div className="detail-hdr-actions">
            <button type="button" className="icon-btn icon-btn-sm" onClick={onEdit} aria-label="Edit expense">
              <IcEdit />
            </button>
            <button type="button" className="icon-btn icon-btn-sm detail-hdr-del-ic" onClick={onDelete} aria-label="Delete expense">
              <IcTrash />
            </button>
          </div>
        }
      />
      <div className="overlay-scroll detail-scroll">
        <section className="detail-hero detail-hero-v2">
          <div className="dh-topline">
            <span className="dh-inv">{expense.category}</span>
          </div>
          <h2 className="dh-name">{title}</h2>
          <div className="detail-kpi-grid">
            <div className="detail-kpi">
              <span className="detail-kpi-lbl">Amount</span>
              <strong className="detail-kpi-val is-due">{moneyFull(expense.amount)}</strong>
            </div>
            <div className="detail-kpi">
              <span className="detail-kpi-lbl">Date</span>
              <strong className="detail-kpi-val">{dateSlash(expense.date)}</strong>
            </div>
          </div>
        </section>

        <section className="detail-card detail-card-v2">
          <div className="dc-title">Details</div>
          <dl className="dc-dl">
            <div>
              <dt>Category</dt>
              <dd>{expense.category || "—"}</dd>
            </div>
            <div>
              <dt>Description</dt>
              <dd>{(expense.description || "").trim() || "—"}</dd>
            </div>
            <div>
              <dt>Paid from</dt>
              <dd>{paidFromLabel || "—"}</dd>
            </div>
            <div>
              <dt>Note</dt>
              <dd>{(expense.note || "").trim() || "—"}</dd>
            </div>
          </dl>
        </section>

        {recurringRule && (
          <section className="detail-card detail-card-v2">
            <div className="dc-title">Recurring</div>
            <dl className="dc-dl">
              <div>
                <dt>Schedule</dt>
                <dd>
                  {freqLabel}
                  {recurringRule.nextDueDate ? ` · Next ${dateSlash(recurringRule.nextDueDate)}` : ""}
                </dd>
              </div>
            </dl>
          </section>
        )}
      </div>
    </OverlayScreen>
  );
}
