import { money, moneyFull, dateSlash } from "@/domain/index.js";

export function ReportKpiStrip({ items = [], printMode = false }) {
  if (!items.length) return null;
  if (printMode) {
    return (
      <table className="rep-print-kpi-tbl">
        <tbody>
          <tr>
            {items.map((k) => (
              <td key={k.label}>
                <span className="rep-print-kpi-l">{k.label}</span>
                <strong className="rep-print-kpi-v">{k.value}</strong>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    );
  }
  return (
    <div className="rep-kpi-grid rep-kpi-grid--minimal rep-kpi-grid--detail">
      {items.map((k) => (
        <div key={k.label} className="rep-kpi">
          <span className="rep-kpi-l">{k.label}</span>
          <span className={`rep-kpi-v${k.danger ? " rep-kpi-v--danger" : ""}${k.positive ? " cg-pos" : ""}`}>{k.value}</span>
        </div>
      ))}
    </div>
  );
}

export function ReportTable({ columns, rows, emptyText = "No records in this period.", printMode = false }) {
  if (!rows?.length) return <p className="rep-empty">{emptyText}</p>;
  const tableClass = printMode
    ? "ips-itm ips-stmt-tbl rep-table--print"
    : "rep-table rep-table--minimal rep-table--stack rep-table--detail";
  return (
    <div className={printMode ? undefined : "rep-table-wrap"}>
      <table className={tableClass}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={c.num ? "rep-num" : undefined}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id ?? i}>
              {columns.map((c) => {
                let val = row[c.key];
                if (c.format === "money") val = moneyFull(val);
                else if (c.format === "moneyShort") val = money(val);
                else if (c.format === "date") val = dateSlash(val);
                else if (c.format === "pct" && val != null) val = `${Number(val).toFixed(1)}%`;
                return (
                  <td key={c.key} data-label={c.label} className={c.num ? "rep-num" : c.ellipsis ? "rep-ellipsis" : undefined}>
                    {val ?? "—"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ReportLines({ lines, printMode = false }) {
  return (
    <div className={`rep-lines rep-lines--tight${printMode ? " rep-lines--print" : ""}`}>
      {lines.map((ln) => (
        <div key={ln.label} className={`rep-line${ln.total ? " rep-line-total" : ""}${ln.sub ? " rep-line-sub rep-line-sub--soft" : ""}`}>
          <span>{ln.label}</span>
          <strong className={ln.neg ? "cg-neg" : ln.pos ? "cg-pos" : undefined}>{ln.value}</strong>
        </div>
      ))}
    </div>
  );
}

export function ReportNote({ children, printMode = false }) {
  return <p className={`rep-muted rep-note${printMode ? " rep-note--print" : ""}`}>{children}</p>;
}

export function ReportExportBar({ onCsv, onJson, onPdf, pdfBusy, extra, className = "" }) {
  return (
    <div className={`rep-export-actions${className ? ` ${className}` : ""}`}>
      {onPdf ? (
        <button type="button" className="btn btn-secondary btn-sm" disabled={pdfBusy} onClick={onPdf}>
          {pdfBusy ? "Preparing…" : "Download PDF"}
        </button>
      ) : null}
      {onCsv ? (
        <button type="button" className="btn btn-secondary btn-sm" onClick={onCsv}>
          Export CSV
        </button>
      ) : null}
      {onJson ? (
        <button type="button" className="btn btn-secondary btn-sm" onClick={onJson}>
          Export JSON
        </button>
      ) : null}
      {extra}
    </div>
  );
}
