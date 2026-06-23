import { useMemo } from "react";
import { EXPENSE_CATEGORY_ALL, num, money, RECURRING_FREQUENCIES, dateSlash } from "@/domain/index.js";
import { IcChevR, IcPlus, IcSpend, IcTrash } from "@/shared/ui/icons/AppIcons.jsx";
import { EmptyState, TabPageChrome } from "@/shared/ui/layout/AppChrome.jsx";
import { MonthFilterCompact } from "@/shared/ui/shell/MonthFilterCompact.jsx";

export function ExpensesScreen({ expenses, recurring, businessMonth, setBusinessMonth, onOpenSidebar, onAdd, onOpenCategory, onDeleteRecurring }) {
  const total = useMemo(() => expenses.reduce((s, e) => s + num(e.amount), 0), [expenses]);

  const categoryTotals = useMemo(() => {
    const map = new Map();
    const counts = new Map();
    for (const e of expenses) {
      if (!e || typeof e !== "object") continue;
      const c = String(e.category || "Other").trim() || "Other";
      map.set(c, (map.get(c) || 0) + num(e.amount));
      counts.set(c, (counts.get(c) || 0) + 1);
    }
    return { totals: [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])), counts };
  }, [expenses]);

  const recList = useMemo(
    () => [...(recurring || [])].filter((r) => r.active !== false).sort((a, b) => String(a.nextDueDate).localeCompare(String(b.nextDueDate))),
    [recurring],
  );

  const hasOneOff = expenses.length > 0;

  return (
    <TabPageChrome title="Expenses" onOpenSidebar={onOpenSidebar}>
      <div className="period-bar period-bar-compact">
        <span className="sr-only">Expense period</span>
        <MonthFilterCompact value={businessMonth} onChange={setBusinessMonth} instanceId="global" />
      </div>
      <div className="tab-page-scroll">
        {!hasOneOff && recList.length === 0 ? (
          <EmptyState icon={<IcSpend />} title={businessMonth ? "No expenses this month" : "No expenses this financial year"} />
        ) : (
          <>
            {hasOneOff && (
              <div className="exp-spend-overview">
                <p className="exp-spend-overview-hd">One-off spending</p>
                <div className="list-area exp-cat-nav-list">
                  <button
                    type="button"
                    className="exp-cat-nav-row"
                    onClick={() => onOpenCategory(EXPENSE_CATEGORY_ALL)}
                    aria-label={`All transactions, total ${money(total)}`}
                  >
                    <div className="exp-cat-nav-main">
                      <span className="exp-cat-nav-name">All transactions</span>
                      <span className="exp-cat-nav-meta">
                        Every category · {expenses.length} item{expenses.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <span className="exp-cat-nav-amt">{money(total)}</span>
                    <span className="exp-cat-nav-chev" aria-hidden="true">
                      <IcChevR />
                    </span>
                  </button>
                  {categoryTotals.totals.map(([cat, amt]) => {
                    const n = categoryTotals.counts.get(cat) || 0;
                    return (
                      <button
                        key={cat}
                        type="button"
                        className="exp-cat-nav-row"
                        onClick={() => onOpenCategory(cat)}
                        aria-label={`${cat}, total ${money(amt)}`}
                      >
                        <div className="exp-cat-nav-main">
                          <span className="exp-cat-nav-name">{cat}</span>
                          <span className="exp-cat-nav-meta">
                            {n} transaction{n === 1 ? "" : "s"}
                          </span>
                        </div>
                        <span className="exp-cat-nav-amt">{money(amt)}</span>
                        <span className="exp-cat-nav-chev" aria-hidden="true">
                          <IcChevR />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {recList.length > 0 && (
              <div className="exp-recurring-block">
                <div className="exp-recurring-hd">Recurring</div>
                {recList.map((r) => (
                  <div key={r.id} className="exp-row exp-row-rec">
                    <div className="exp-left">
                      <span className="exp-desc">{r.description || r.category}</span>
                      <span className="exp-sub">
                        {RECURRING_FREQUENCIES.find((f) => f.id === r.frequency)?.label || "Monthly"} · Next {dateSlash(r.nextDueDate)}
                      </span>
                    </div>
                    <div className="exp-right">
                      <span className="exp-amount">{money(r.amount)}</span>
                      <button type="button" className="del-btn-sm" onClick={() => onDeleteRecurring(r.id)} aria-label="Remove recurring rule">
                        <IcTrash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <button type="button" className="fab" onClick={onAdd} aria-label="Add expense">
        <IcPlus />
      </button>
    </TabPageChrome>
  );
}
