import { Fragment, useState } from "react";
import { LIST_PAGE_SIZE, money } from "@/domain/index.js";
import { IcChevR } from "@/shared/ui/icons/AppIcons.jsx";
import { avatarColor, avatarInitials } from "./avatarUtils.js";

export function PaginatedCustomerList({ filtered, onOpenCustomer, emptyState, alphaHeaders }) {
  const [listCap, setListCap] = useState(LIST_PAGE_SIZE);
  const visible = filtered.slice(0, listCap);
  const remaining = filtered.length - visible.length;
  if (filtered.length === 0) return emptyState;
  return (
    <>
      {visible.map((c, i) => {
        const letter = ((c.name || "").trim()[0] || "#").toUpperCase();
        const prevLetter = i > 0 ? ((visible[i - 1].name || "").trim()[0] || "#").toUpperCase() : "";
        const showAlpha = alphaHeaders && letter !== prevLetter;
        return (
          <Fragment key={c.key}>
            {showAlpha && <div className="customer-alpha-hd">{letter}</div>}
            <button type="button" className="customer-row" onClick={() => onOpenCustomer(c.name)}>
              <div className={`avatar ${avatarColor(c.name)}`}>{avatarInitials(c.name)}</div>
              <div className="customer-info">
                <div className="customer-name">{c.name}</div>
                <div className="customer-meta">
                  <div className="customer-kpi">
                    <span className="customer-kpi-lbl">Total Revenue</span>
                    <span className="customer-kpi-val">{money(c.totalRevenue)}</span>
                  </div>
                  <div className="customer-kpi">
                    <span className="customer-kpi-lbl">Receivables</span>
                    <span className={`customer-kpi-val ${c.totalOutstanding > 0 ? "due" : "paid"}`}>{money(c.totalOutstanding)}</span>
                  </div>
                  <div className="customer-kpi">
                    <span className="customer-kpi-lbl">Invoices</span>
                    <span className="customer-kpi-val">{c.salesCount}</span>
                  </div>
                </div>
              </div>
              <IcChevR />
            </button>
          </Fragment>
        );
      })}
      {remaining > 0 && (
        <div className="list-load-more-wrap">
          <button type="button" className="list-load-more-btn" onClick={() => setListCap((c) => c + LIST_PAGE_SIZE)}>
            Load more ({remaining} remaining)
          </button>
        </div>
      )}
    </>
  );
}
