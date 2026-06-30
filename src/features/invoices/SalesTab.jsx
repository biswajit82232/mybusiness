import { addDaysStr, isOverdue, money } from "@/domain/index.js";
import { SaleDraftBanner } from "@/features/invoices/SaleDraftBanner.jsx";
import { IcMenu, IcPlus, IcSales, IcSearch, IcX } from "@/shared/ui/icons/AppIcons.jsx";
import { EmptyState } from "@/shared/ui/layout/AppChrome.jsx";
import { MonthFilterCompact } from "@/shared/ui/shell/MonthFilterCompact.jsx";
import { PaginatedSaleList } from "./PaginatedSaleList.jsx";


function CreditNoteRow({ cn, onOpen }) {
  return (
    <button type="button" className="sale-row sale-row--credit" onClick={() => onOpen(cn.id)}>
      <div className="sr-left">
        <span className="sr-name">{cn.partyName || "Customer"}</span>
        <span className="sr-sub">
          {cn.creditNoteDate} · vs {cn.originalInvoiceNumber}
        </span>
      </div>
      <div className="sr-right">
        <span className="sr-amount sr-amount--negative">{money(cn.grandTotalPaise)}</span>
        <span className="status-badge pill-credit">Credit note</span>
      </div>
    </button>
  );
}

export function SalesTab({
  filteredSales,
  filteredCreditNotes = [],
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
  openCreditNoteDetail,
  defaultDueDays = 30,
  saleDraftSummary: saleDraftResume = null,
  onResumeSaleDraft,
  onDiscardSaleDraft,
  onOpenSidebar,
}) {
  const unpaidCt = filteredSales.filter(
    (s) => s.status !== "draft" && s.outstanding > 0 && !isOverdue(s.dueDate || addDaysStr(s.date, defaultDueDays)),
  ).length;
  const overdueCt = filteredSales.filter(
    (s) => s.status !== "draft" && s.outstanding > 0 && isOverdue(s.dueDate || addDaysStr(s.date, defaultDueDays)),
  ).length;
  const draftCt = filteredSales.filter((s) => s.status === "draft").length;
  const isCreditNotesView = saleView === "creditNotes";

  return (
    <div className="tab-page">
      <div className="tab-appbar">
        {showSearch ? (
          <>
            <input
              className="search-box"
              type="search"
              placeholder="Customer, invoice, chassis / serial…"
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
      {saleDraftResume ? (
        <SaleDraftBanner
          summary={saleDraftResume}
          onResume={onResumeSaleDraft}
          onDiscard={onDiscardSaleDraft}
        />
      ) : null}
      <div className="seg-bar">
        {[
          { v: "all", l: "All" },
          { v: "drafts", l: `Drafts${draftCt ? ` (${draftCt})` : ""}` },
          { v: "unpaid", l: `Unpaid${unpaidCt ? ` (${unpaidCt})` : ""}` },
          { v: "partial", l: "Partial" },
          { v: "paid", l: "Paid" },
          { v: "balanceDue", l: "Balance due" },
          { v: "overdue", l: `Overdue${overdueCt ? ` (${overdueCt})` : ""}` },
          { v: "creditNotes", l: "Credit Notes" },
          { v: "bos", l: "BOS", title: "Bill of Supply" },
        ].map(({ v, l, title }) => (
          <button
            key={v}
            type="button"
            className={`seg-btn${saleView === v ? " active" : ""}`}
            aria-pressed={saleView === v}
            title={title}
            onClick={() => setSaleView(v)}
          >
            {l}
          </button>
        ))}
        <span className="seg-count">{isCreditNotesView ? filteredCreditNotes.length : filteredSales.length}</span>
      </div>
      <div className="list-area">
        {isCreditNotesView ? (
          filteredCreditNotes.length === 0 ? (
            <EmptyState icon={<IcSales />} title="No credit notes yet" />
          ) : (
            filteredCreditNotes.map((cn) => (
              <CreditNoteRow key={cn.id} cn={cn} onOpen={openCreditNoteDetail} />
            ))
          )
        ) : (
          <PaginatedSaleList
            key={`${saleView}|${businessMonth}|${searchTerm}`}
            filteredSales={filteredSales}
            defaultDueDays={defaultDueDays}
            openSaleDetail={openSaleDetail}
            emptyState={
              <EmptyState
                icon={<IcSales />}
                title={
                  searchTerm
                    ? `No results for "${searchTerm}"`
                    : saleView === "drafts"
                      ? "No draft invoices"
                      : saleView === "bos"
                        ? businessMonth
                          ? "No bills of supply in this month"
                          : "No bills of supply yet"
                        : businessMonth
                          ? "No sales in this month"
                          : "No sales yet"
                }
              />
            }
          />
        )}
      </div>
      <button type="button" className="fab" onClick={openNewSale} aria-label="New sale">
        <IcPlus />
      </button>
    </div>
  );
}
