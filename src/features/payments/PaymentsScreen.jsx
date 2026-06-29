import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import {
  buildPaymentsLedger,
  dateHuman,
  filterPaymentsLedgerByPeriod,
  money,
  PAYMENT_KIND_LABEL,
  paymentsPeriodTotals,
} from "@/domain/index.js";
import { useMainStageScrollParent } from "@/features/main-stage/MainStageScrollContext.jsx";
import { IcPayment, IcPlus } from "@/shared/ui/icons/AppIcons.jsx";
import { EmptyState, OverlayScreen, PageHeader, TabPageChrome } from "@/shared/ui/layout/AppChrome.jsx";
import { MonthFilterCompact } from "@/shared/ui/shell/MonthFilterCompact.jsx";
import { PaymentDetailPanel } from "./PaymentDetailPanel.jsx";
import { RecordAdvancePaymentModal } from "./RecordAdvancePaymentModal.jsx";
import "./payments.css";

export function PaymentsScreen({
  sales = [],
  purchases = [],
  customerAdvancePayments = [],
  customerDirectory = [],
  bankAccounts = [],
  settings = {},
  businessMonth,
  setBusinessMonth,
  fsm,
  fyYear,
  onOpenSidebar,
  onOpenSale,
  onOpenPurchase,
  onRecordAdvancePayment,
  onApplyAdvanceToSale,
}) {
  const [filter, setFilter] = useState("all");
  const [selectedKey, setSelectedKey] = useState("");
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [isWide, setIsWide] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 900px)").matches,
  );
  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);
  const scrollParent = useMainStageScrollParent();
  const layoutRef = useRef(null);
  const listAreaRef = useRef(null);
  const periodBarRef = useRef(null);

  const allRows = useMemo(
    () => buildPaymentsLedger({ sales, purchases, customerAdvancePayments }),
    [sales, purchases, customerAdvancePayments],
  );

  const periodRows = useMemo(
    () => filterPaymentsLedgerByPeriod(allRows, { businessMonth, fsm, fyYear }),
    [allRows, businessMonth, fsm, fyYear],
  );

  const filtered = useMemo(() => {
    if (filter === "in") return periodRows.filter((r) => r.dir === "in");
    if (filter === "out") return periodRows.filter((r) => r.dir === "out");
    return periodRows;
  }, [periodRows, filter]);

  const totals = useMemo(() => paymentsPeriodTotals(periodRows), [periodRows]);
  const inCount = useMemo(() => periodRows.filter((r) => r.dir === "in").length, [periodRows]);
  const outCount = useMemo(() => periodRows.filter((r) => r.dir === "out").length, [periodRows]);

  const selected = useMemo(
    () => filtered.find((r) => r.key === selectedKey) || periodRows.find((r) => r.key === selectedKey) || null,
    [filtered, periodRows, selectedKey],
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)");
    const sync = () => setIsWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (isWide) setMobileDetailOpen(false);
  }, [isWide]);

  useEffect(() => {
    const stillVisible = periodRows.some((r) => r.key === selectedKey);
    if (selectedKey && !stillVisible) {
      setSelectedKey(isWide ? periodRows[0]?.key || "" : "");
      setMobileDetailOpen(false);
    } else if (!selectedKey && periodRows.length > 0 && isWide) {
      setSelectedKey(periodRows[0].key);
    }
  }, [periodRows, selectedKey, isWide]);

  const selectRow = (key) => {
    setSelectedKey(key);
    if (!isWide) setMobileDetailOpen(true);
  };

  const renderPaymentRow = (r) => {
    const active = r.key === selectedKey;
    const kindLabel = PAYMENT_KIND_LABEL[r.kind] || "Payment";
    const displayId = r.receiptNo || r.id;
    return (
      <button
        type="button"
        className={`payments-row${active ? " payments-row--active" : ""}`}
        onClick={() => selectRow(r.key)}
      >
        <div className="payments-row-top">
          <span className={`payments-row-dir payments-row-dir--${r.dir}`}>{r.dir === "in" ? "IN" : "OUT"}</span>
          <span className="payments-row-amt">{money(r.amount)}</span>
        </div>
        <span className="payments-row-party">{r.partyName}</span>
        <span className="payments-row-meta">
          {kindLabel} · ID {displayId} · {dateHuman(r.date)}
        </span>
        {r.reference && r.reference !== "—" ? <span className="payments-row-ref">{r.reference}</span> : null}
      </button>
    );
  };

  const handleAdvanceSubmit = async (payload) => {
    const ok = await onRecordAdvancePayment?.(payload);
    if (ok !== false) setAdvanceModalOpen(false);
  };

  return (
    <TabPageChrome
      title="Payments In / Out"
      onOpenSidebar={onOpenSidebar}
      className="tab-page--split-scroll tab-page--payments"
    >
      <div className="period-bar period-bar-compact" ref={periodBarRef}>
        <span className="sr-only">Payment period</span>
        <MonthFilterCompact value={businessMonth} onChange={setBusinessMonth} instanceId="payments" />
      </div>

      <div className="receivables-summary payments-kpi-strip">
        <div className="recv-kpi">
          <div className="recv-kpi-lbl">Received (in)</div>
          <div className="recv-kpi-val primary">{money(totals.cashIn)}</div>
        </div>
        <div className="recv-kpi">
          <div className="recv-kpi-lbl">Paid (out)</div>
          <div className="recv-kpi-val warning">{money(totals.cashOut)}</div>
        </div>
        <div className="recv-kpi">
          <div className="recv-kpi-lbl">Net</div>
          <div className={`recv-kpi-val${totals.net >= 0 ? "" : " danger"}`}>{money(totals.net)}</div>
        </div>
      </div>

      <div className="seg-bar" role="group" aria-label="Filter payments">
        <button type="button" className={`seg-btn${filter === "all" ? " active" : ""}`} onClick={() => setFilter("all")}>
          All ({periodRows.length})
        </button>
        <button type="button" className={`seg-btn${filter === "in" ? " active" : ""}`} onClick={() => setFilter("in")}>
          In ({inCount})
        </button>
        <button type="button" className={`seg-btn${filter === "out" ? " active" : ""}`} onClick={() => setFilter("out")}>
          Out ({outCount})
        </button>
      </div>

      <div className="payments-layout" ref={layoutRef}>
        <div className="payments-list-pane">
          <div className="payments-list-hd">
            <span>All payments</span>
            <button type="button" className="payments-advance-btn" onClick={() => setAdvanceModalOpen(true)}>
              <IcPlus />
              Advance
            </button>
          </div>
          <div className="list-area payments-list-area" ref={listAreaRef}>
            {filtered.length === 0 ? (
              <EmptyState
                icon={<IcPayment />}
                title={businessMonth ? "No payments this month" : "No payments this period"}
                sub="Customer receipts, supplier payments, and advance payments appear here."
              />
            ) : !scrollParent ? (
              <div className="payments-fallback-list">
                {filtered.map((r) => (
                  <Fragment key={r.key}>{renderPaymentRow(r)}</Fragment>
                ))}
              </div>
            ) : (
              <Virtuoso
                customScrollParent={scrollParent}
                data={filtered}
                computeItemKey={(_, r) => r.key}
                overscan={300}
                itemContent={(_, r) => renderPaymentRow(r)}
              />
            )}
          </div>
        </div>

        <div className="payments-detail-pane">
          <PaymentDetailPanel
            row={selected}
            bankAccounts={bankAccounts}
            settings={settings}
            sales={sales}
            onOpenSale={onOpenSale}
            onOpenPurchase={onOpenPurchase}
            onApplyAdvance={onApplyAdvanceToSale}
          />
        </div>
      </div>

      {mobileDetailOpen && selected && !isWide ? (
        <OverlayScreen className="overlay-screen--payments-detail">
          <PageHeader title="Payment details" onBack={() => setMobileDetailOpen(false)} />
          <div className="overlay-scroll">
            <div className="payments-detail-pane payments-detail-pane--overlay">
              <PaymentDetailPanel
                row={selected}
                bankAccounts={bankAccounts}
                settings={settings}
                sales={sales}
                onOpenSale={onOpenSale}
                onOpenPurchase={onOpenPurchase}
                onApplyAdvance={onApplyAdvanceToSale}
              />
            </div>
          </div>
        </OverlayScreen>
      ) : null}

      {advanceModalOpen ? (
        <RecordAdvancePaymentModal
          sales={sales}
          customerDirectory={customerDirectory}
          bankAccounts={bankAccounts}
          onSubmit={handleAdvanceSubmit}
          onDismiss={() => setAdvanceModalOpen(false)}
        />
      ) : null}
    </TabPageChrome>
  );
}
