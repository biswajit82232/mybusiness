import { useMemo } from "react";
import { GroupedVirtuoso } from "react-virtuoso";
import { dateSlash, isEmiDuePaid, isOverdue, money, todayStr } from "@/domain/index.js";
import { IcEmi } from "@/shared/ui/icons/AppIcons.jsx";
import { EmptyState, TabPageChrome } from "@/shared/ui/layout/AppChrome.jsx";
import { useMainStageScrollParent } from "@/features/main-stage/MainStageScrollContext.jsx";
import { emiDueBucket, emiSortKey } from "./emiGrouping.js";

const GROUP_LABELS = {
  overdue: "Overdue",
  soon: "Due within 7 days",
  later: "Later",
};

export function EmiListScreen({ emiEntries = [], onOpenEmi, onOpenSidebar }) {
  const today = todayStr();
  const grouped = useMemo(() => {
    const g = { overdue: [], soon: [], later: [] };
    for (const emi of emiEntries) {
      g[emiDueBucket(emi, today)].push(emi);
    }
    const cmp = (a, b) =>
      String(emiSortKey(a)).localeCompare(String(emiSortKey(b))) ||
      String(a.customerName || "").localeCompare(String(b.customerName || ""));
    g.overdue.sort(cmp);
    g.soon.sort(cmp);
    g.later.sort(cmp);
    return g;
  }, [emiEntries, today]);

  const renderEmi = (emi) => (
    <button
      type="button"
      className="emi-row"
      onClick={() => onOpenEmi(emi)}
      aria-label={`EMI details for ${emi.customerName}, ${emi.invoiceNo}`}
    >
      <div className="emi-top">
        <span className="emi-name">{emi.customerName}</span>
        <span className="emi-loan">{money(emi.loanAmount)}</span>
      </div>
      <div className="emi-sub">
        {emi.invoiceNo} · {emi.financeCompany}
        {emi.doNo ? ` · DO: ${emi.doNo}` : ""}
      </div>
      <div className="emi-detail">
        <span>
          EMI: <strong>{money(emi.emiAmount)}</strong>
        </span>
        <span>
          Down: <strong>{money(emi.downPayment)}</strong>
        </span>
      </div>
      {(emi.dueDates || []).length > 0 && (
        <div className="emi-dates">
          {(emi.dueDates || []).map((d, i) => {
            const paid = isEmiDuePaid(emi, d);
            return (
              <span
                key={`${emi.id}-${d || i}`}
                className={`emi-date-chip${paid ? " emi-date-paid" : ""}${!paid && isOverdue(d) ? " emi-overdue" : ""}`}
              >
                {dateSlash(d)}
              </span>
            );
          })}
        </div>
      )}
    </button>
  );

  const { flat, groupCounts, groupKeys } = useMemo(() => {
    const order = ["overdue", "soon", "later"];
    const counts = [];
    const keys = [];
    const flatRows = [];
    for (const k of order) {
      const rows = grouped[k];
      if (rows.length > 0) {
        keys.push(k);
        counts.push(rows.length);
        flatRows.push(...rows);
      }
    }
    return { flat: flatRows, groupCounts: counts, groupKeys: keys };
  }, [grouped]);

  const scrollParent = useMainStageScrollParent();

  return (
    <TabPageChrome title="EMI" onOpenSidebar={onOpenSidebar}>
      <div className="tab-page-scroll">
        {emiEntries.length === 0 ? (
          <EmptyState icon={<IcEmi />} title="No EMI entries" />
        ) : !scrollParent ? (
          <div aria-hidden style={{ minHeight: 1 }} />
        ) : (
          <div className="list-area">
            <GroupedVirtuoso
              customScrollParent={scrollParent}
              groupCounts={groupCounts}
              computeItemKey={(index) => flat[index]?.id ?? `emi-${index}`}
              overscan={400}
              groupContent={(idx) => (
                <div className="emi-group-hd">{GROUP_LABELS[groupKeys[idx]] || ""}</div>
              )}
              itemContent={(index) => renderEmi(flat[index])}
            />
          </div>
        )}
      </div>
    </TabPageChrome>
  );
}
