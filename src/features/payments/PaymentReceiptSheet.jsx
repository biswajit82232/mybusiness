import { dateSlash, moneyFull, PAYMENT_KIND_LABEL } from "@/domain/index.js";

/** Printable payment receipt (advance or invoice payment). */
export function PaymentReceiptSheet({ row, settings = {}, bankLabel = "" }) {
  const businessName = (settings.businessName || "").trim() || "My Business";
  const kindLabel = PAYMENT_KIND_LABEL[row?.kind] || "Payment receipt";
  const isOut = row?.dir === "out";

  return (
    <div className="payment-receipt-sheet" role="document">
      <header className="payment-receipt-hdr">
        <div className="payment-receipt-biz">
          <h1 className="payment-receipt-biz-name">{businessName}</h1>
          {settings.businessAddress?.trim() ? <p>{settings.businessAddress.trim()}</p> : null}
          {settings.businessPhone?.trim() ? <p>Phone: {settings.businessPhone.trim()}</p> : null}
          {settings.businessGstin?.trim() ? <p>GSTIN: {settings.businessGstin.trim()}</p> : null}
        </div>
        <div className="payment-receipt-badge-wrap">
          <div className="payment-receipt-badge">{isOut ? "PAYMENT VOUCHER" : "PAYMENT RECEIPT"}</div>
          <div className="payment-receipt-badge-sub">{kindLabel}</div>
        </div>
      </header>

      <div className="payment-receipt-meta">
        <div>
          <span className="payment-receipt-lbl">Receipt / Payment ID</span>
          <strong>{row?.receiptNo || row?.id || "—"}</strong>
        </div>
        <div>
          <span className="payment-receipt-lbl">Date</span>
          <strong>{dateSlash(row?.date)}</strong>
        </div>
      </div>

      <table className="payment-receipt-table">
        <tbody>
          <tr>
            <th>{isOut ? "Paid to" : "Received from"}</th>
            <td>{row?.partyName || "—"}</td>
          </tr>
          <tr>
            <th>Reference</th>
            <td>{row?.reference || "—"}</td>
          </tr>
          <tr>
            <th>{isOut ? "Paid from" : "Deposited to"}</th>
            <td>{bankLabel || "—"}</td>
          </tr>
          <tr>
            <th>Amount</th>
            <td className="payment-receipt-amt">{moneyFull(row?.amount)}</td>
          </tr>
          {row?.note?.trim() ? (
            <tr>
              <th>Note</th>
              <td>{row.note.trim()}</td>
            </tr>
          ) : null}
        </tbody>
      </table>

      <footer className="payment-receipt-footer">
        <p className="payment-receipt-disclaimer">This is a computer-generated receipt.</p>
        <div className="payment-receipt-sign">
          <span>For {businessName}</span>
          <span className="payment-receipt-sign-line" />
          <span>Authorised Signatory</span>
        </div>
      </footer>
    </div>
  );
}
