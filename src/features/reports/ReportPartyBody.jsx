import { moneyFull } from "@/domain/index.js";
import { ReportKpiStrip, ReportTable } from "./ReportViewParts.jsx";

/** Renders party-wise (customer / supplier grouped) report tables. */
export function ReportPartyBody({ reportId, data, printMode = false }) {
  if (!data || data.view !== "party") return null;

  switch (reportId) {
    case "sales":
      return (
        <>
          <ReportKpiStrip
            printMode={printMode}
            items={[
              { label: "Customers", value: data.count },
              { label: "Total", value: moneyFull(data.totals.amount) },
              { label: "Received", value: moneyFull(data.totals.received) },
              { label: "Outstanding", value: moneyFull(data.totals.outstanding) },
            ]}
          />
          <ReportTable
            printMode={printMode}
            columns={[
              { key: "party", label: "Customer", ellipsis: true },
              { key: "bills", label: "Bills", num: true },
              { key: "amount", label: "Amount", format: "money", num: true },
              { key: "received", label: "Received", format: "money", num: true },
              { key: "outstanding", label: "Due", format: "money", num: true },
            ]}
            rows={data.rows}
          />
        </>
      );

    case "salesOutstanding":
      return (
        <>
          <ReportKpiStrip
            printMode={printMode}
            items={[
              { label: "Customers", value: data.count },
              { label: "Outstanding", value: moneyFull(data.totalOutstanding), danger: data.totalOutstanding > 0 },
            ]}
          />
          <ReportTable
            printMode={printMode}
            columns={[
              { key: "party", label: "Customer", ellipsis: true },
              { key: "bills", label: "Open bills", num: true },
              { key: "amount", label: "Invoiced", format: "money", num: true },
              { key: "outstanding", label: "Due", format: "money", num: true },
            ]}
            rows={data.rows}
          />
        </>
      );

    case "inwardPayment":
      return (
        <>
          <ReportKpiStrip
            printMode={printMode}
            items={[
              { label: "Customers", value: data.count },
              { label: "Total received", value: moneyFull(data.total), positive: true },
            ]}
          />
          <ReportTable
            printMode={printMode}
            columns={[
              { key: "party", label: "Customer", ellipsis: true },
              { key: "receipts", label: "Receipts", num: true },
              { key: "amount", label: "Amount", format: "money", num: true },
            ]}
            rows={data.rows}
          />
        </>
      );

    case "otherDocument":
      return (
        <>
          <ReportKpiStrip printMode={printMode} items={[{ label: "Customers", value: data.count }, { label: "Amount", value: moneyFull(data.totals.amount) }]} />
          <ReportTable
            printMode={printMode}
            columns={[
              { key: "party", label: "Customer", ellipsis: true },
              { key: "bills", label: "Documents", num: true },
              { key: "amount", label: "Amount", format: "money", num: true },
              { key: "outstanding", label: "Due", format: "money", num: true },
            ]}
            rows={data.rows}
          />
        </>
      );

    case "purchase":
      return (
        <>
          <ReportKpiStrip
            printMode={printMode}
            items={[
              { label: "Suppliers", value: data.count },
              { label: "Purchases", value: moneyFull(data.totals.amount) },
              { label: "Paid", value: moneyFull(data.totals.paid) },
              { label: "Outstanding", value: moneyFull(data.totals.outstanding) },
            ]}
          />
          <ReportTable
            printMode={printMode}
            columns={[
              { key: "party", label: "Supplier", ellipsis: true },
              { key: "bills", label: "Bills", num: true },
              { key: "amount", label: "Amount", format: "money", num: true },
              { key: "paid", label: "Paid", format: "money", num: true },
              { key: "outstanding", label: "Due", format: "money", num: true },
            ]}
            rows={data.rows}
          />
        </>
      );

    case "purchaseOutstanding":
      return (
        <>
          <ReportKpiStrip
            printMode={printMode}
            items={[
              { label: "Suppliers", value: data.count },
              { label: "Payables", value: moneyFull(data.totalOutstanding), danger: data.totalOutstanding > 0 },
            ]}
          />
          <ReportTable
            printMode={printMode}
            columns={[
              { key: "party", label: "Supplier", ellipsis: true },
              { key: "bills", label: "Open bills", num: true },
              { key: "amount", label: "Invoiced", format: "money", num: true },
              { key: "outstanding", label: "Due", format: "money", num: true },
            ]}
            rows={data.rows}
          />
        </>
      );

    case "outwardPayment":
      return (
        <>
          <ReportKpiStrip printMode={printMode} items={[{ label: "Suppliers", value: data.count }, { label: "Total paid", value: moneyFull(data.total) }]} />
          <ReportTable
            printMode={printMode}
            columns={[
              { key: "party", label: "Supplier", ellipsis: true },
              { key: "payments", label: "Payments", num: true },
              { key: "amount", label: "Amount", format: "money", num: true },
            ]}
            rows={data.rows}
          />
        </>
      );

    default:
      return null;
  }
}
