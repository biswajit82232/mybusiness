import { addDaysStr, isOverdue } from "@/domain/index.js";
import { IcMenu, IcPlus, IcSales, IcSearch, IcX } from "@/shared/ui/icons/AppIcons.jsx";
import { EmptyState } from "@/shared/ui/layout/AppChrome.jsx";
import { MonthFilterCompact } from "@/shared/ui/shell/MonthFilterCompact.jsx";
import { PaginatedSaleList } from "./PaginatedSaleList.jsx";

export function SalesTab({
  filteredSales,
  saleView,
  setSaleView,
  searchTerm,
  setSearchTerm,
  showSearch,
  setShowSearch,
  businessMonth,
  setBusinessMonth,
  openNewSale,
  openSaleDetail,
  defaultDueDays = 30,
  onOpenSidebar,
}) {
  const unpaidCt = filteredSales.filter((s) => s.outstanding > 0 && !isOverdue(s.dueDate || addDaysStr(s.date, defaultDueDays))).length;
  const overdueCt = filteredSales.filter((s) => s.outstanding > 0 && isOverdue(s.dueDate || addDaysStr(s.date, defaultDueDays))).length;
  return (
    <div className="tab-page">
      <div className="tab-appbar">
        {showSearch ? (
          <>
            <input
              className="search-box"
              type="search"
              placeholder="Customer, invoice, phone, item…"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button
              type="button"
              className="icon-btn"
              onClick={() => {
                setShowSearch(false);
                setSearchTerm("");
              }}
            >
              <IcX />
            </button>
          </>
        ) : (
          <>
            {onOpenSidebar && (
              <button type="button" className="hamburger-btn" onClick={onOpenSidebar} aria-label="Open menu">
                <IcMenu />
              </button>
            )}
            <h1 className="tab-title">Invoices</h1>
            <button type="button" className="icon-btn" onClick={() => setShowSearch(true)} aria-label="Search">
              <IcSearch />
            </button>
          </>
        )}
      </div>
      {!showSearch && (
        <div className="period-bar period-bar-sales period-bar-compact">
          <span className="sr-only">Sales period</span>
          <MonthFilterCompact value={businessMonth} onChange={setBusinessMonth} instanceId="global" />
        </div>
      )}
      <div className="seg-bar">
        {[
          { v: "all", l: "All" },
          { v: "unpaid", l: `Unpaid${unpaidCt ? ` (${unpaidCt})` : ""}` },
          { v: "overdue", l: `Overdue${overdueCt ? ` (${overdueCt})` : ""}` },
        ].map(({ v, l }) => (
          <button
            key={v}
            type="button"
            className={`seg-btn${saleView === v ? " active" : ""}`}
            aria-pressed={saleView === v}
            onClick={() => setSaleView(v)}
          >
            {l}
          </button>
        ))}
        <span className="seg-sort-hint" title="Sorted by invoice number (highest first)">
          By invoice #
        </span>
        <span className="seg-count">{filteredSales.length}</span>
      </div>
      <div className="list-area">
        <PaginatedSaleList
          key={`${saleView}|${businessMonth}|${searchTerm}`}
          filteredSales={filteredSales}
          defaultDueDays={defaultDueDays}
          openSaleDetail={openSaleDetail}
          emptyState={
            <EmptyState
              icon={<IcSales />}
              title={searchTerm ? `No results for "${searchTerm}"` : businessMonth ? "No sales in this month" : "No sales yet"}
            />
          }
        />
      </div>
      <button type="button" className="fab" onClick={openNewSale} aria-label="New sale">
        <IcPlus />
      </button>
    </div>
  );
}
