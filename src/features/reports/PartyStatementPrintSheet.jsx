import {
  formatStatementDate,
  formatStatementMoney,
} from "@/domain/partyStatement.js";

function StatementHeader({ company, statement }) {
  const coName = String(company?.businessName || "").trim() || "MyBusiness";
  return (
    <div className="ips-hdr">
      <div className="ips-hdr-left">
        <div className="ips-hdr-brand">
          <div className="ips-co-name-new">{coName}</div>
          <div className="ips-co-line-new">
            {statement.partyKind === "vendor" ? "Vendor statement" : "Customer statement"}
          </div>
        </div>
      </div>
      <div className="ips-hdr-right">
        <div className="ips-doc-type">ACCOUNT STATEMENT</div>
      </div>
    </div>
  );
}

export function PartyStatementPrintSheet({ statement, company = {} }) {
  if (!statement) return null;
  return (
    <div className="invoice-print-sheet invoice-print-sheet--statement invoice-print-sheet--tpl-premium">
      <StatementHeader company={company} statement={statement} />
      <div className="ips-divider" />
      <div className="ips-meta-2col">
        <div className="ips-billto">
          <div className="ips-section-lbl">{statement.partyKind === "vendor" ? "Vendor" : "Customer"}</div>
          <div className="ips-cust-name">{statement.partyName || "—"}</div>
        </div>
        <div className="ips-invmeta">
          <table className="ips-det-tbl">
            <tbody>
              <tr>
                <th>Closing balance</th>
                <td>
                  <strong>{formatStatementMoney(statement.closingBalance)}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <table className="ips-itm ips-stmt-tbl">
        <thead>
          <tr>
            <th>Date</th>
            <th>Reference</th>
            <th>Detail</th>
            <th className="tr">Debit</th>
            <th className="tr">Credit</th>
            <th className="tr">Balance</th>
          </tr>
        </thead>
        <tbody>
          {statement.rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="tc">
                No transactions in this period.
              </td>
            </tr>
          ) : (
            statement.rows.map((r, i) => (
              <tr key={`${r.date}-${r.reference}-${i}`}>
                <td>{formatStatementDate(r.date)}</td>
                <td>{r.reference || "—"}</td>
                <td>{r.detail || "—"}</td>
                <td className="tr">{r.debit > 0 ? formatStatementMoney(r.debit) : "—"}</td>
                <td className="tr">{r.credit > 0 ? formatStatementMoney(r.credit) : "—"}</td>
                <td className="tr">{formatStatementMoney(r.balance)}</td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3}>
              <strong>Totals</strong>
            </td>
            <td className="tr">
              <strong>{formatStatementMoney(statement.totalDebit)}</strong>
            </td>
            <td className="tr">
              <strong>{formatStatementMoney(statement.totalCredit)}</strong>
            </td>
            <td className="tr">
              <strong>{formatStatementMoney(statement.closingBalance)}</strong>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
