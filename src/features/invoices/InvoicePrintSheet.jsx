import {
  amountInWordsInr,
  buildInvoiceGstModel,
  businessAddressLines,
  dateSlash,
  gstStateCode,
  hasSaleAddress,
  invoiceCopyLabel,
  num,
  placeOfSupplyLabel,
  saleAddressLines,
  saleHasGstData,
} from "@/domain/index.js";

const AMT = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const RATE = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const QTY = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function printAmt(v) {
  return AMT.format(num(v));
}

function printRate(v) {
  const n = num(v);
  return Number.isInteger(n) || Math.abs(n - Math.round(n)) < 0.001 ? RATE.format(n) : AMT.format(n);
}

function printBalance(v) {
  return `₹${AMT.format(num(v))}`;
}

function printGstPct(v) {
  const n = num(v);
  return n > 0 ? n.toFixed(2) : "—";
}

/** Product cell — matches reference PDF serial layout. */
function ProductCell({ line, saleNotes, showNotes }) {
  const batteryLines = String(line.batterySerialNo || "")
    .trim()
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="ips-prod-cell">
      <div className="ips-prod-name">{line.item || "—"}</div>
      {line.chassisNo ? (
        <div className="ips-serial-block">
          <span className="ips-serial-lbl">Chassis No -</span>
          <span className="ips-serial-val">{line.chassisNo}</span>
        </div>
      ) : null}
      {line.motorNo ? <div className="ips-serial-inline">Motor No - {line.motorNo}</div> : null}
      {batteryLines.length > 0 ? (
        <div className="ips-serial-block">
          <span className="ips-serial-lbl">Battery Serial No -</span>
          {batteryLines.map((b) => (
            <span key={b} className="ips-serial-val">
              {b}
            </span>
          ))}
        </div>
      ) : null}
      {showNotes && saleNotes ? <div className="ips-serial-val">{saleNotes}</div> : null}
    </div>
  );
}

function TermsBlock({ terms }) {
  const text = String(terms || "").trim();
  if (!text) return null;
  const lines = text.split(/\n+/).filter(Boolean);
  return (
    <div className="ips-notes-block">
      <div className="ips-notes-title">Terms &amp; Condition</div>
      <ol className="ips-terms-ol">
        {lines.map((t, i) => (
          <li key={i}>{t.replace(/^\d+\.\s*/, "")}</li>
        ))}
      </ol>
    </div>
  );
}

function TaxSidePanel({ gstModel, grandTotal, received, outstanding, isInterState }) {
  return (
    <table className="ips-tax-panel">
      <tbody>
        <tr>
          <td>Taxable Amount</td>
          <td>{printAmt(gstModel.taxableTotal)}</td>
        </tr>
        {isInterState ? (
          <tr>
            <td>Add : IGST</td>
            <td>{printAmt(gstModel.igst)}</td>
          </tr>
        ) : (
          <>
            <tr>
              <td>Add : CGST</td>
              <td>{printAmt(gstModel.cgst)}</td>
            </tr>
            <tr>
              <td>Add : SGST</td>
              <td>{printAmt(gstModel.sgst)}</td>
            </tr>
          </>
        )}
        <tr>
          <td>Total Tax</td>
          <td>{printAmt(gstModel.totalTax)}</td>
        </tr>
        <tr className="ips-tax-panel-grand">
          <td>Total Amount After Tax</td>
          <td>{printAmt(grandTotal)}</td>
        </tr>
        <tr>
          <td>Payment Received</td>
          <td>{printAmt(received)}</td>
        </tr>
        <tr>
          <td>Balance</td>
          <td>{printBalance(outstanding)}</td>
        </tr>
      </tbody>
    </table>
  );
}

/** GST tax invoice — layout matched to uploaded BPH reference PDF. */
export function InvoicePrintSheet({ sale, settings = {} }) {
  const isBos = sale?.docType === "billOfSupply";
  const coName = String(settings.businessName || "").trim() || "Invoice";
  const coGstin = String(settings.businessGstin || "").trim();
  const coPhone = String(settings.businessPhone || "").trim();
  const coWa = String(settings.businessWhatsapp || "").trim();
  const logo = String(settings.businessLogo || "").trim();
  const signatory =
    String(settings.invoiceSignatory || "").trim() || (coName ? `For ${coName.toUpperCase()}` : "");
  const notes = String(settings.invoiceNotes || "").trim();
  const saleNotes = String(sale?.description || "").trim();
  const terms = String(settings.invoiceTerms || "").trim();
  const copyLabel = invoiceCopyLabel(sale?.invoiceCopyType);
  const addrLines = businessAddressLines(settings);

  const invoiceLines = (() => {
    const arr = Array.isArray(sale?.lineItems) ? sale.lineItems : [];
    if (arr.length > 0) return arr;
    return [
      {
        id: "legacy-1",
        item: sale?.item || "",
        qty: num(sale?.qty),
        salePrice: num(sale?.salePrice),
        costPrice: num(sale?.costPrice),
      },
    ];
  })();

  const gstModel = buildInvoiceGstModel({
    lineItems: invoiceLines,
    discount: sale?.discount,
    businessState: settings.businessState,
    customerState: sale?.customerState,
    settings,
  });

  const showGst =
    !isBos && saleHasGstData(sale, settings) && !!coGstin && gstModel.hasGst;
  const customerGstin = String(sale?.customerGstin || "").trim();
  const pos =
    placeOfSupplyLabel(sale?.customerState, gstStateCode(sale?.customerState)) ||
    placeOfSupplyLabel(settings.businessState, settings.businessStateCode);
  const reverseCharge = sale?.reverseCharge === true;
  const received = num(sale?.received);
  const outstanding = num(sale?.outstanding);
  const grandTotal = showGst ? gstModel.grandTotal : num(sale?.totalSale);
  const totalQty = gstModel.lines.reduce((s, l) => s + l.qty, 0);

  /* —— Bill of Supply (minimal) —— */
  if (isBos) {
    return (
      <div className="invoice-print-sheet invoice-print-sheet--bos">
        <header className="ips-head ips-head--bos">
          <div className="ips-brand">
            {logo ? <img className="ips-logo" src={logo} alt="" /> : null}
            <h1 className="ips-co-name">{coName}</h1>
            {addrLines.map((l) => (
              <p key={l} className="ips-co-line">
                {l}
              </p>
            ))}
            {(coPhone || coWa) && (
              <p className="ips-co-line">
                {[coPhone ? `Tel: ${coPhone}` : null, coWa ? `WhatsApp: ${coWa}` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>
          <div className="ips-doc-title">
            <h2>BILL OF SUPPLY</h2>
          </div>
        </header>
        <table className="ips-bos-meta">
          <tbody>
            <tr>
              <th>Customer</th>
              <td>{sale?.customerName || "—"}</td>
              <th>Document no.</th>
              <td>{sale?.invoiceNo || "—"}</td>
            </tr>
            <tr>
              <th>Date</th>
              <td colSpan={3}>{dateSlash(sale?.date)}</td>
            </tr>
          </tbody>
        </table>
        <table className="ips-table ips-table--simple">
          <thead>
            <tr>
              <th>Sr.</th>
              <th>Description</th>
              <th>Qty</th>
              <th>Rate (₹)</th>
              <th>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {invoiceLines.map((li, idx) => (
              <tr key={li.id || idx}>
                <td className="tc">{idx + 1}</td>
                <td>
                  <ProductCell line={li} saleNotes="" showNotes={false} />
                </td>
                <td className="tr">{num(li.qty)}</td>
                <td className="tr">{printAmt(li.salePrice)}</td>
                <td className="tr">{printAmt(num(li.qty) * num(li.salePrice))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <table className="ips-tax-panel ips-tax-panel--bos">
          <tbody>
            <tr className="ips-tax-panel-grand">
              <td>Total</td>
              <td>{printAmt(sale?.totalSale)}</td>
            </tr>
            <tr>
              <td>Payment received</td>
              <td>{printAmt(received)}</td>
            </tr>
            <tr>
              <td>Balance</td>
              <td>{printBalance(outstanding)}</td>
            </tr>
          </tbody>
        </table>
        <p className="ips-bos-thanks">Thank you for your business.</p>
      </div>
    );
  }

  /* —— GST Tax Invoice (reference layout) —— */
  if (showGst) {
    return (
      <div className="invoice-print-sheet invoice-print-sheet--gst-ref">
        <table className="ips-ref-top">
          <tbody>
            <tr>
              <td className="ips-ref-top-gstin">GSTIN : {coGstin}</td>
              <td className="ips-ref-top-title">TAX INVOICE</td>
              <td className="ips-ref-top-copy">{copyLabel}</td>
            </tr>
          </tbody>
        </table>

        <table className="ips-ref-customer">
          <thead>
            <tr>
              <th colSpan={4} className="ips-ref-section-hd">
                Customer Detail
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="ips-ref-lbl">Name</td>
              <td colSpan={3}>{sale?.customerName || "—"}</td>
            </tr>
            <tr>
              <td className="ips-ref-lbl">Address</td>
              <td colSpan={3}>
                {hasSaleAddress(sale) ? saleAddressLines(sale).join(", ") : "—"}
              </td>
            </tr>
            <tr>
              <td className="ips-ref-lbl">GSTIN</td>
              <td colSpan={3}>{customerGstin || "-"}</td>
            </tr>
            <tr>
              <td className="ips-ref-lbl">Place of Supply</td>
              <td colSpan={3}>{pos || "—"}</td>
            </tr>
            <tr>
              <td className="ips-ref-lbl">Invoice No.</td>
              <td>{sale?.invoiceNo || "—"}</td>
              <td className="ips-ref-lbl">Invoice Date</td>
              <td>{dateSlash(sale?.date)}</td>
            </tr>
            <tr>
              <td className="ips-ref-lbl">Reverse Charge</td>
              <td colSpan={3}>{reverseCharge ? "Yes" : "No"}</td>
            </tr>
          </tbody>
        </table>

        <table className="ips-ref-lines">
          <thead>
            <tr>
              <th rowSpan={2} className="ips-ref-sno">
                Sr.
                <br />
                No.
              </th>
              <th rowSpan={2} className="ips-ref-desc">
                Name of Product / Service
              </th>
              <th rowSpan={2}>HSN / SAC</th>
              <th rowSpan={2}>Qty</th>
              <th rowSpan={2}>Rate</th>
              <th rowSpan={2}>Taxable Value</th>
              {gstModel.isInterState ? (
                <th colSpan={2}>IGST</th>
              ) : (
                <>
                  <th colSpan={2}>CGST</th>
                  <th colSpan={2}>SGST</th>
                </>
              )}
              <th rowSpan={2}>Total</th>
            </tr>
            <tr>
              <th>%</th>
              <th>Amount</th>
              {gstModel.isInterState ? null : (
                <>
                  <th>%</th>
                  <th>Amount</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {gstModel.lines.map((li) => (
              <tr key={li.id || li.index}>
                <td className="tc">{li.index}</td>
                <td className="ips-ref-desc">
                  <ProductCell line={li} saleNotes={saleNotes} showNotes={li.index === 1} />
                </td>
                <td className="tc">{li.hsn || "—"}</td>
                <td className="tr">{QTY.format(li.qty)} NOS</td>
                <td className="tr">{printRate(li.qty > 0 ? li.taxable / li.qty : 0)}</td>
                <td className="tr">{printAmt(li.taxable)}</td>
                {gstModel.isInterState ? (
                  <>
                    <td className="tr">{printGstPct(li.igstRate)}</td>
                    <td className="tr">{li.igst > 0 ? printAmt(li.igst) : "—"}</td>
                  </>
                ) : (
                  <>
                    <td className="tr">{printGstPct(li.cgstRate)}</td>
                    <td className="tr">{li.cgst > 0 ? printAmt(li.cgst) : "—"}</td>
                    <td className="tr">{printGstPct(li.sgstRate)}</td>
                    <td className="tr">{li.sgst > 0 ? printAmt(li.sgst) : "—"}</td>
                  </>
                )}
                <td className="tr">{printAmt(li.lineTotal)}</td>
              </tr>
            ))}
            <tr className="ips-ref-total-row">
              <td colSpan={3} className="tl">
                <strong>Total</strong>
              </td>
              <td className="tr">{QTY.format(totalQty)} NOS</td>
              <td />
              <td className="tr">{printAmt(gstModel.taxableTotal)}</td>
              {gstModel.isInterState ? (
                <>
                  <td />
                  <td className="tr">{printAmt(gstModel.igst)}</td>
                </>
              ) : (
                <>
                  <td />
                  <td className="tr">{printAmt(gstModel.cgst)}</td>
                  <td />
                  <td className="tr">{printAmt(gstModel.sgst)}</td>
                </>
              )}
              <td className="tr">{printAmt(grandTotal)}</td>
            </tr>
          </tbody>
        </table>

        <div className="ips-ref-bottom">
          <div className="ips-ref-bottom-left">
            <table className="ips-ref-hsn">
              <thead>
                <tr>
                  <th>HSN / SAC</th>
                  <th>Taxable Value</th>
                  {gstModel.isInterState ? (
                    <th colSpan={2}>IGST</th>
                  ) : (
                    <>
                      <th colSpan={2}>CGST</th>
                      <th colSpan={2}>SGST</th>
                    </>
                  )}
                  <th>Total</th>
                </tr>
                <tr>
                  <th />
                  <th />
                  <th>%</th>
                  <th>Amount</th>
                  {gstModel.isInterState ? null : (
                    <>
                      <th>%</th>
                      <th>Amount</th>
                    </>
                  )}
                  <th />
                </tr>
              </thead>
              <tbody>
                {gstModel.hsnSummary.map((row) => (
                  <tr key={`${row.hsn}-${row.gstRate}`}>
                    <td>{row.hsn}</td>
                    <td className="tr">{printAmt(row.taxable)}</td>
                    {gstModel.isInterState ? (
                      <>
                        <td className="tr">{printGstPct(row.igstRate || row.gstRate)}</td>
                        <td className="tr">{printAmt(row.igst)}</td>
                      </>
                    ) : (
                      <>
                        <td className="tr">{printGstPct(row.cgstRate)}</td>
                        <td className="tr">{printAmt(row.cgst)}</td>
                        <td className="tr">{printGstPct(row.sgstRate)}</td>
                        <td className="tr">{printAmt(row.sgst)}</td>
                      </>
                    )}
                    <td className="tr">{printAmt(row.cgst + row.sgst + row.igst)}</td>
                  </tr>
                ))}
                <tr className="ips-ref-total-row">
                  <td className="tl">
                    <strong>Total</strong>
                  </td>
                  <td className="tr">{printAmt(gstModel.taxableTotal)}</td>
                  {gstModel.isInterState ? (
                    <>
                      <td />
                      <td className="tr">{printAmt(gstModel.igst)}</td>
                    </>
                  ) : (
                    <>
                      <td />
                      <td className="tr">{printAmt(gstModel.cgst)}</td>
                      <td />
                      <td className="tr">{printAmt(gstModel.sgst)}</td>
                    </>
                  )}
                  <td className="tr">{printAmt(gstModel.totalTax)}</td>
                </tr>
              </tbody>
            </table>

            <div className="ips-ref-words">
              <div className="ips-ref-words-lbl">Total in words</div>
              <div className="ips-ref-words-val">{amountInWordsInr(grandTotal)}</div>
            </div>

            {(notes || saleNotes) && (
              <div className="ips-notes-block">
                <div className="ips-notes-title">Notes</div>
                <div className="ips-notes-body">{notes || saleNotes}</div>
              </div>
            )}

            <TermsBlock terms={terms} />
          </div>

          <div className="ips-ref-bottom-right">
            <TaxSidePanel
              gstModel={gstModel}
              grandTotal={grandTotal}
              received={received}
              outstanding={outstanding}
              isInterState={gstModel.isInterState}
            />
          </div>
        </div>

        <div className="ips-ref-footer">
          <span className="ips-ref-eoe">(E &amp; O.E.)</span>
          <span className="ips-ref-cert">
            Certified that the particulars given above are true and correct.
          </span>
          <div className="ips-ref-sign">
            {signatory ? <div className="ips-ref-sign-for">{signatory}</div> : null}
            <div>Authorised Signatory</div>
          </div>
        </div>
      </div>
    );
  }

  /* —— Fallback simple invoice (no GST data) —— */
  return (
    <div className="invoice-print-sheet">
      <table className="ips-ref-top">
        <tbody>
          <tr>
            <td className="ips-ref-top-gstin">{coGstin ? `GSTIN : ${coGstin}` : coName}</td>
            <td className="ips-ref-top-title">INVOICE</td>
            <td className="ips-ref-top-copy">{copyLabel}</td>
          </tr>
        </tbody>
      </table>
      <table className="ips-ref-customer">
        <thead>
          <tr>
            <th colSpan={4} className="ips-ref-section-hd">
              Customer Detail
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="ips-ref-lbl">Name</td>
            <td colSpan={3}>{sale?.customerName || "—"}</td>
          </tr>
          {hasSaleAddress(sale) ? (
            <tr>
              <td className="ips-ref-lbl">Address</td>
              <td colSpan={3}>{saleAddressLines(sale).join(", ")}</td>
            </tr>
          ) : null}
          <tr>
            <td className="ips-ref-lbl">Invoice No.</td>
            <td>{sale?.invoiceNo || "—"}</td>
            <td className="ips-ref-lbl">Invoice Date</td>
            <td>{dateSlash(sale?.date)}</td>
          </tr>
        </tbody>
      </table>
      <table className="ips-ref-lines">
        <thead>
          <tr>
            <th>Sr. No.</th>
            <th>Description</th>
            <th>Qty</th>
            <th>Rate</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoiceLines.map((li, idx) => (
            <tr key={li.id || idx}>
              <td className="tc">{idx + 1}</td>
              <td>
                <ProductCell line={li} saleNotes={saleNotes} showNotes={idx === 0} />
              </td>
              <td className="tr">{QTY.format(num(li.qty))}</td>
              <td className="tr">{printAmt(li.salePrice)}</td>
              <td className="tr">{printAmt(num(li.qty) * num(li.salePrice))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="ips-ref-bottom-right ips-ref-bottom-right--solo">
        <table className="ips-tax-panel">
          <tbody>
            <tr className="ips-tax-panel-grand">
              <td>Total</td>
              <td>{printAmt(sale?.totalSale)}</td>
            </tr>
            <tr>
              <td>Payment Received</td>
              <td>{printAmt(received)}</td>
            </tr>
            <tr>
              <td>Balance</td>
              <td>{printBalance(outstanding)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
