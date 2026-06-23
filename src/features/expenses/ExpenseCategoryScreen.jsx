import { useMemo } from "react";
import { EXPENSE_CATEGORY_ALL, entityTimeMsFromId, num, money, moneyFull, dateHuman } from "@/domain/index.js";
import { IcPlus, IcSpend, IcTrash } from "@/shared/ui/icons/AppIcons.jsx";
import { EmptyState, OverlayScreen, PageHeader } from "@/shared/ui/layout/AppChrome.jsx";
import { MonthFilterCompact } from "@/shared/ui/shell/MonthFilterCompact.jsx";

export function ExpenseCategoryScreen({
  category,
  expenses,
  businessMonth,
  setBusinessMonth,
  periodHint,
  onClose,
  onOpenDetail,
  onAdd,
  onDelete,
}) {
  const sorted = useMemo(
    () =>
      [...expenses].sort((a, b) => {
        const dc = String(b.date || "").localeCompare(String(a.date || ""));
        if (dc !== 0) return dc;
        return entityTimeMsFromId(b.id) - entityTimeMsFromId(a.id);
      }),
    [expenses],
  );
  const catTotal = useMemo(() => expenses.reduce((s, e) => s + num(e.amount), 0), [expenses]);
  const isAll = category === EXPENSE_CATEGORY_ALL;
  const title = isAll ? "All transactions" : category;
  const labelForRow = (exp) => (isAll ? String(exp.category || "Other") : (exp.description || "").trim() || category);

  return (
    <OverlayScreen>
      <PageHeader title={title} onBack={onClose} right={<span className="exp-cat-period-tag">{periodHint}</span>} />
      <div className="period-bar period-bar-compact period-bar-overlay">
        <span className="sr-only">Expense period</span>
        <MonthFilterCompact value={businessMonth} onChange={setBusinessMonth} instanceId="global" />
      </div>
      <div className="overlay-scroll">
        <section className="detail-hero detail-hero-v2 exp-cat-hero">
          <p className="exp-cat-hero-kicker">
            {isAll ? "This period" : "Category total"} · {sorted.length} transaction{sorted.length === 1 ? "" : "s"}
          </p>
          <h2 className="dh-name exp-cat-hero-amt">{moneyFull(catTotal)}</h2>
        </section>
        {sorted.length === 0 ? (
          <EmptyState icon={<IcSpend />} title={isAll ? "No expenses in this period" : `No ${category} in this period`} />
        ) : (
          <div className="list-area exp-cat-list">
            <div className="exp-cat-list-hd">{isAll ? "Every expense" : `All in ${category}`}</div>
            {sorted.map((exp) => (
              <div key={exp.id} className="exp-row exp-row-with-actions">
                <button
                  type="button"
                  className="exp-row-main"
                  onClick={() => onOpenDetail(exp.id)}
                  aria-label={`Expense ${exp.description || exp.category || exp.id}`}
                >
                  <div className="exp-left">
                    <span className="exp-desc">{(exp.description || "").trim() || (isAll ? labelForRow(exp) : category)}</span>
                    <span className="exp-sub">{isAll ? `${labelForRow(exp)} · ${dateHuman(exp.date)}` : dateHuman(exp.date)}</span>
                    {exp.note && <span className="exp-note">{exp.note}</span>}
                  </div>
                  <span className="exp-amount">{money(exp.amount)}</span>
                </button>
                <button type="button" className="del-btn-sm" onClick={() => onDelete(exp.id)} aria-label="Delete expense">
                  <IcTrash />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <button type="button" className="fab" onClick={onAdd} aria-label={isAll ? "Add expense" : `Add ${category} expense`}>
        <IcPlus />
      </button>
    </OverlayScreen>
  );
}
