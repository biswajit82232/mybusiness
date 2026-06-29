import { dateSlash, todayStr } from "@/domain/index.js";

export function ReportPrintSheet({
  businessName,
  categoryTitle,
  reportTitle,
  periodLabel,
  accountingBasis,
  children,
}) {
  const coName = String(businessName || "").trim() || "My Business";
  return (
    <div className="invoice-print-sheet invoice-print-sheet--report invoice-print-sheet--tpl-premium">
      <div className="ips-hdr">
        <div className="ips-hdr-left">
          <div className="ips-hdr-brand">
            <div className="ips-co-name-new">{coName}</div>
            {categoryTitle ? <div className="ips-co-line-new">{categoryTitle}</div> : null}
          </div>
        </div>
        <div className="ips-hdr-right">
          <div className="ips-doc-type">{String(reportTitle || "REPORT").toUpperCase()}</div>
        </div>
      </div>
      <div className="ips-divider" />
      <div className="ips-meta-2col rep-print-meta">
        <div className="ips-billto">
          <div className="ips-section-lbl">Period</div>
          <div className="ips-cust-name">{periodLabel || "—"}</div>
        </div>
        <div className="ips-invmeta">
          <table className="ips-det-tbl">
            <tbody>
              <tr>
                <th>Generated</th>
                <td>{dateSlash(todayStr())}</td>
              </tr>
              <tr>
                <th>Basis</th>
                <td>{accountingBasis === "accrual" ? "Accrual" : "Cash"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className="rep-print-body">{children}</div>
    </div>
  );
}
