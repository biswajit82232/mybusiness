import {
  additionalChargesLabel,
  amountInWordsInr,
  buildInvoiceGstModel,
  businessAddressLines,
  collapseInvoiceLinesForPrint,
  dateSlash,
  gstStateCode,
  hasSaleAddress,
  invoiceCopyLabel,
  invoiceTemplateClass,
  isGstEnabled,
  num,
  placeOfSupplyLabel,
  saleAddressLines,
} from "@/domain/index.js";
import { normalizeDocType, saleDocLabel } from "@/domain/saleDocuments.js";
import { UpiQrBlock } from "./UpiQrBlock.jsx";
import "./invoice-sheet-base.css";
import "./invoice-template-styles.css";

const AMT = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const QTY = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const RATE = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

function fmtAmt(v) {
  return AMT.format(num(v));
}
function fmtRate(v) {
  const n = num(v);
  return Number.isInteger(n) || Math.abs(n - Math.round(n)) < 0.001 ? RATE.format(n) : AMT.format(n);
}
function fmtBalance(v) {
  return `₹${AMT.format(num(v))}`;
}
function fmtGstPct(v) {
  const n = num(v);
  return n > 0 ? n.toFixed(2) : "—";
}

/** Premium letterhead header — shared by all three invoice types. */
function InvoiceHeader({ coName, coGstin, logo, addrLines, coPhone, coWa, settings, docTitle, copyLabel }) {
  const pan = String(settings.businessPan || "").trim();
  return (
    <div className="ips-hdr">
      <div className="ips-hdr-left">
        {logo ? <img className="ips-logo" src={logo} alt="" /> : null}
        <div className="ips-hdr-brand">
          <div className="ips-co-name-new">{coName}</div>
          {addrLines.map((l) => (
            <div key={l} className="ips-co-line-new">
              {l}
            </div>
          ))}
          {(coPhone || coWa) && (
            <div className="ips-co-line-new">
              {[coPhone ? `Tel: ${coPhone}` : null, coWa ? `WhatsApp: ${coWa}` : null]
                .filter(Boolean)
                .join("  |  ")}
            </div>
          )}
          {coGstin && (
            <div className="ips-co-gstin">
              GSTIN: <strong>{coGstin}</strong>
            </div>
          )}
          {pan && <div className="ips-co-line-new">PAN: {pan}</div>}
        </div>
      </div>
      <div className="ips-hdr-right">
        {docTitle ? <div className="ips-doc-type">{docTitle}</div> : null}
        {copyLabel && docTitle ? <div className="ips-copy-label">{copyLabel}</div> : null}
      </div>
    </div>
  );
}

/** Optional per-line description under the product name on print. */
function ItemDesc({ text }) {
  const desc = String(text || "").trim();
  if (!desc) return null;
  return <div className="ips-item-desc">{desc}</div>;
}

/** Product description cell with serial numbers. */
function ProductCell({ line, saleNotes, showNotes }) {
  const members = Array.isArray(line?.groupMembers) ? line.groupMembers : null;

  if (members && members.length > 1) {
    return (
      <div className="ips-prod-cell ips-prod-cell--grouped">
        {members.map((m, i) => (
          <div key={m.id || i} className="ips-prod-sub">
            <div className="ips-prod-name">{m.item || "—"}</div>
            <ItemDesc text={m.itemDescription} />
            {m.chassisNo ? (
              <div className="ips-serial">
                Chassis No:&nbsp;<span>{m.chassisNo}</span>
              </div>
            ) : null}
            {m.motorNo ? (
              <div className="ips-serial">
                Motor No:&nbsp;<span>{m.motorNo}</span>
              </div>
            ) : null}
            {String(m.batterySerialNo || "")
              .trim()
              .split(/\n+/)
              .map((s) => s.trim())
              .filter(Boolean).length > 0 ? (
              <div className="ips-serial">
                Battery S/No:&nbsp;
                {String(m.batterySerialNo || "")
                  .trim()
                  .split(/\n+/)
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((b, j, arr) => (
                    <span key={j}>
                      {b}
                      {j < arr.length - 1 ? ", " : ""}
                    </span>
                  ))}
              </div>
            ) : null}
          </div>
        ))}
        {showNotes && saleNotes ? <div className="ips-serial">{saleNotes}</div> : null}
      </div>
    );
  }

  const batteryLines = String(line.batterySerialNo || "")
    .trim()
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="ips-prod-cell">
      <div className="ips-prod-name">{line.item || "—"}</div>
      <ItemDesc text={line.itemDescription} />
      {line.chassisNo ? (
        <div className="ips-serial">
          Chassis No:&nbsp;<span>{line.chassisNo}</span>
        </div>
      ) : null}
      {line.motorNo ? (
        <div className="ips-serial">
          Motor No:&nbsp;<span>{line.motorNo}</span>
        </div>
      ) : null}
      {batteryLines.length > 0 ? (
        <div className="ips-serial">
          Battery S/No:&nbsp;
          {batteryLines.map((b, i) => (
            <span key={i}>
              {b}
              {i < batteryLines.length - 1 ? ", " : ""}
            </span>
          ))}
        </div>
      ) : null}
      {showNotes && saleNotes ? <div className="ips-serial">{saleNotes}</div> : null}
    </div>
  );
}

/** Discount / additional-charge rows before the invoice total (BOS & simple layouts). */
function SimpleTotalRows({ sale, settings, lineSubtotal }) {
  const discount = num(sale?.discount);
  const extra = num(sale?.additionalCharges);
  const extraLabel = additionalChargesLabel(settings);
  const showSubtotal = discount > 0 || extra > 0;
  return (
    <>
      {showSubtotal ? (
        <tr>
          <td>Subtotal</td>
          <td className="tr">{fmtAmt(lineSubtotal)}</td>
        </tr>
      ) : null}
      {discount > 0 ? (
        <tr>
          <td>Discount</td>
          <td className="tr">−{fmtAmt(discount)}</td>
        </tr>
      ) : null}
      {extra > 0 ? (
        <tr>
          <td>{extraLabel}</td>
          <td className="tr">+{fmtAmt(extra)}</td>
        </tr>
      ) : null}
    </>
  );
}

/** GST tax summary panel (right column). */
function TaxPanel({
  gstModel,
  grandTotal,
  received,
  outstanding,
  isInterState,
  extraChargeLabel,
  additionalCharges,
  reverseCharge,
}) {
  const balance = num(outstanding);
  const discount = num(gstModel?.discount);
  const rcm = reverseCharge === true;
  return (
    <table className="ips-txpanel">
      <tbody>
        {discount > 0 ? (
          <>
            <tr>
              <td className="ips-tp-lbl">Subtotal (incl. tax)</td>
              <td className="ips-tp-amt">{fmtAmt(gstModel.subtotalInclusive)}</td>
            </tr>
            <tr>
              <td className="ips-tp-lbl">Less: Discount</td>
              <td className="ips-tp-amt">−{fmtAmt(discount)}</td>
            </tr>
          </>
        ) : null}
        <tr>
          <td className="ips-tp-lbl">Taxable Amount</td>
          <td className="ips-tp-amt">{fmtAmt(gstModel.taxableTotal)}</td>
        </tr>
        {isInterState ? (
          <tr>
            <td className="ips-tp-lbl">Add: IGST</td>
            <td className="ips-tp-amt">{fmtAmt(gstModel.igst)}</td>
          </tr>
        ) : (
          <>
            <tr>
              <td className="ips-tp-lbl">Add: CGST</td>
              <td className="ips-tp-amt">{fmtAmt(gstModel.cgst)}</td>
            </tr>
            <tr>
              <td className="ips-tp-lbl">Add: SGST / UTGST</td>
              <td className="ips-tp-amt">{fmtAmt(gstModel.sgst)}</td>
            </tr>
          </>
        )}
        <tr>
          <td className="ips-tp-lbl">Total Tax</td>
          <td className="ips-tp-amt">{fmtAmt(gstModel.totalTax)}</td>
        </tr>
        {rcm && gstModel.totalTax > 0 ? (
          <tr>
            <td className="ips-tp-lbl" colSpan={2} style={{ fontSize: "0.72rem", fontStyle: "italic" }}>
              GST payable under reverse charge by recipient
            </td>
          </tr>
        ) : null}
        {num(additionalCharges) > 0 ? (
          <tr>
            <td className="ips-tp-lbl">{extraChargeLabel}</td>
            <td className="ips-tp-amt">{fmtAmt(additionalCharges)}</td>
          </tr>
        ) : null}
        <tr className="ips-tp-grand">
          <td className="ips-tp-lbl">Grand Total</td>
          <td className="ips-tp-amt">{fmtAmt(grandTotal)}</td>
        </tr>
        <tr>
          <td className="ips-tp-lbl">Payment Received</td>
          <td className="ips-tp-amt">{fmtAmt(received)}</td>
        </tr>
        <tr className={balance > 0 ? "ips-tp-due" : ""}>
          <td className="ips-tp-lbl">Balance Due</td>
          <td className="ips-tp-amt">{fmtBalance(balance)}</td>
        </tr>
      </tbody>
    </table>
  );
}

/** Terms & Conditions block. */
function TermsBlock({ terms }) {
  const text = String(terms || "").trim();
  if (!text) return null;
  const lines = text.split(/\n+/).filter(Boolean);
  return (
    <div className="ips-notebox ips-notebox--nobordertop">
      <div className="ips-notebox-hd">Terms &amp; Conditions</div>
      <ol className="ips-terms-list">
        {lines.map((t, i) => (
          <li key={i}>{t.replace(/^\d+\.\s*/, "")}</li>
        ))}
      </ol>
    </div>
  );
}

/** Centered document title — prominent on print (TAX INVOICE, etc.). */
function DocTitleBanner({ title, copyLabel }) {
  if (!title) return null;
  return (
    <div className="ips-doc-banner">
      <div className="ips-doc-banner-title">{title}</div>
      {copyLabel ? <div className="ips-doc-banner-copy">{copyLabel}</div> : null}
    </div>
  );
}

/** Signature + UPI QR + E&OE footer row. */
function PrintFooter({ sigProps, settings, outstanding, sale }) {
  return (
    <>
      <div className="ips-foot-row">
        <UpiQrBlock settings={settings} amount={outstanding} note={sale?.invoiceNo} />
      </div>
      <SigFooter {...sigProps} />
    </>
  );
}
function SigFooter({ signatory, signatureImage }) {
  const sigImg = String(signatureImage || "").trim();
  return (
    <div className="ips-sig-row">
      <div className="ips-sig-eoe">
        (E &amp; O.E.) — Certified that the particulars given above are true and correct.
      </div>
      <div className="ips-sig-block">
        {signatory ? <div className="ips-sig-name">{signatory}</div> : null}
        {sigImg ? (
          <img className="ips-sig-img" src={sigImg} alt="" />
        ) : (
          <div className="ips-sig-space" />
        )}
        {!sigImg ? <div className="ips-sig-line" /> : null}
        <div className="ips-sig-label">Authorised Signatory</div>
      </div>
    </div>
  );
}

export function InvoicePrintSheet({ sale, settings = {} }) {
  const docType = normalizeDocType(sale?.docType);
  const isBos = docType === "billOfSupply";
  const docTitle = saleDocLabel(docType).toUpperCase();
  const linkedInvoiceNo = String(sale?.linkedInvoiceNo || "").trim();
  const coName = String(settings.businessName || "").trim() || "Invoice";
  const coGstin = String(settings.businessGstin || "").trim();
  const coPhone = String(settings.businessPhone || "").trim();
  const coWa = String(settings.businessWhatsapp || "").trim();
  const logo = String(settings.businessLogo || "").trim();
  const signatureImage = String(settings.invoiceSignature || "").trim();
  const signatory =
    String(settings.invoiceSignatory || "").trim() || (coName ? `For ${coName.toUpperCase()}` : "");
  const notes = String(settings.invoiceNotes || "").trim();
  const saleNotes = String(sale?.description || "").trim();
  const terms = String(settings.invoiceTerms || "").trim();
  const copyLabel = invoiceCopyLabel(sale?.invoiceCopyType);
  const addrLines = businessAddressLines(settings);

  const invoiceLines = (() => {
    const arr = Array.isArray(sale?.lineItems) ? sale.lineItems : [];
    const raw =
      arr.length > 0
        ? arr
        : [
            {
              id: "legacy-1",
              item: sale?.item || "",
              qty: num(sale?.qty),
              salePrice: num(sale?.salePrice),
              costPrice: num(sale?.costPrice),
            },
          ];
    return collapseInvoiceLinesForPrint(raw);
  })();

  const gstModel = buildInvoiceGstModel({
    lineItems: invoiceLines,
    discount: sale?.discount,
    additionalCharges: sale?.additionalCharges,
    businessState: settings.businessState,
    customerState: sale?.customerState,
    reverseCharge: sale?.reverseCharge === true,
    settings,
  });

  const lineSubtotal = invoiceLines.reduce((s, li) => s + num(li.qty) * num(li.salePrice), 0);
  const extraChargeLabel = additionalChargesLabel(settings);

  const isTaxInvoice = isGstEnabled(settings) && !isBos;
  const showGst = isTaxInvoice && !!coGstin;

  const customerGstin = String(sale?.customerGstin || "").trim();
  const pos =
    placeOfSupplyLabel(sale?.customerState, gstStateCode(sale?.customerState)) ||
    placeOfSupplyLabel(settings.businessState, settings.businessStateCode);
  const reverseCharge = sale?.reverseCharge === true;
  const received = num(sale?.received);
  const outstanding = num(sale?.outstanding);
  const grandTotal = showGst ? gstModel.grandTotal : num(sale?.totalSale);
  const totalQty = gstModel.lines.reduce((s, l) => s + l.qty, 0);
  const linesMerchTotal = showGst
    ? gstModel.lines.reduce((s, l) => s + num(l.lineTotal), 0)
    : grandTotal;

  const headerProps = { coName, coGstin, logo, addrLines, coPhone, coWa, settings };
  const sigProps = { signatory, signatureImage };
  const footProps = { sigProps, settings, outstanding, sale };
  const tpl = invoiceTemplateClass(settings);
  const sheetCls = (doc) => `invoice-print-sheet invoice-print-sheet--${doc} invoice-print-sheet--tpl-${tpl}`;

  /* ─────────────────────────── Bill of Supply ─────────────────────────── */
  if (isBos) {
    return (
      <div className={sheetCls("bos")}>
        <InvoiceHeader {...headerProps} docTitle="BILL OF SUPPLY" copyLabel={copyLabel} />
        <div className="ips-divider" />
        <DocTitleBanner title="BILL OF SUPPLY" />

        <div className="ips-meta-2col">
          <div className="ips-billto">
            <div className="ips-section-lbl">Bill To</div>
            <div className="ips-cust-name">{sale?.customerName || "—"}</div>
            {hasSaleAddress(sale) ? (
              <div className="ips-cust-addr">{saleAddressLines(sale).join(", ")}</div>
            ) : null}
          </div>
          <div className="ips-invmeta">
            <table className="ips-det-tbl">
              <tbody>
                <tr>
                  <th>Document No.</th>
                  <td>
                    <strong>{sale?.invoiceNo || "—"}</strong>
                  </td>
                </tr>
                <tr>
                  <th>Date</th>
                  <td>{dateSlash(sale?.date)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <table className="ips-itm">
          <thead>
            <tr>
              <th className="ips-c-sno">Sr.</th>
              <th className="ips-c-desc">Description of Goods / Services</th>
              <th className="ips-c-qty">Qty</th>
              <th className="ips-c-rate">Rate (₹)</th>
              <th className="ips-c-amt">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {invoiceLines.map((li, idx) => (
              <tr key={li.id || idx}>
                <td className="tc">{idx + 1}</td>
                <td>
                  <ProductCell line={li} saleNotes="" showNotes={false} />
                </td>
                <td className="tr">{QTY.format(num(li.qty))}</td>
                <td className="tr">{fmtAmt(li.salePrice)}</td>
                <td className="tr">{fmtAmt(num(li.qty) * num(li.salePrice))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ips-floor">
          <div className="ips-floor-l">
            <div className="ips-words">
              <span className="ips-words-lbl">Amount in Words:</span>
              <span className="ips-words-val">&nbsp;{amountInWordsInr(num(sale?.totalSale))}</span>
            </div>
            {(notes || saleNotes) ? (
              <div className="ips-notebox ips-notebox--nobordertop">
                <div className="ips-notebox-hd">Notes</div>
                <div className="ips-notebox-body">{notes || saleNotes}</div>
              </div>
            ) : null}
            <TermsBlock terms={terms} />
          </div>
          <div className="ips-floor-r">
            <table className="ips-simpletot">
              <tbody>
                <SimpleTotalRows sale={sale} settings={settings} lineSubtotal={lineSubtotal} />
                <tr className="ips-st-grand">
                  <td>Total</td>
                  <td className="tr">{fmtAmt(sale?.totalSale)}</td>
                </tr>
                <tr>
                  <td>Payment Received</td>
                  <td className="tr">{fmtAmt(received)}</td>
                </tr>
                <tr className={num(outstanding) > 0 ? "ips-st-due" : ""}>
                  <td>Balance Due</td>
                  <td className="tr">{fmtBalance(outstanding)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <PrintFooter {...footProps} />
      </div>
    );
  }

  /* ──────────────────────────── GST Tax Invoice ───────────────────────── */
  if (showGst) {
    return (
      <div className={sheetCls("gst")}>
        <InvoiceHeader {...headerProps} docTitle="" copyLabel="" />
        <div className="ips-divider" />
        <DocTitleBanner title={docType === "invoice" ? "TAX INVOICE" : docTitle} copyLabel={copyLabel} />

        {/* Customer block + Invoice meta (two-column) */}
        <div className="ips-meta-2col">
          <div className="ips-billto">
            <div className="ips-section-lbl">Bill To</div>
            <div className="ips-cust-name">{sale?.customerName || "—"}</div>
            {hasSaleAddress(sale) ? (
              <div className="ips-cust-addr">{saleAddressLines(sale).join(", ")}</div>
            ) : null}
            {customerGstin ? (
              <div className="ips-cust-gstin">
                GSTIN:&nbsp;<strong>{customerGstin}</strong>
              </div>
            ) : null}
            {pos ? <div className="ips-cust-pos">Place of Supply:&nbsp;{pos}</div> : null}
          </div>
          <div className="ips-invmeta">
            <table className="ips-det-tbl">
              <tbody>
                <tr>
                  <th>Invoice No.</th>
                  <td>
                    <strong>{sale?.invoiceNo || "—"}</strong>
                  </td>
                </tr>
                <tr>
                  <th>Invoice Date</th>
                  <td>{dateSlash(sale?.date)}</td>
                </tr>
                {linkedInvoiceNo ? (
                  <tr>
                    <th>Against Invoice</th>
                    <td>{linkedInvoiceNo}</td>
                  </tr>
                ) : null}
                {sale?.dueDate ? (
                  <tr>
                    <th>Due Date</th>
                    <td>{dateSlash(sale.dueDate)}</td>
                  </tr>
                ) : null}
                <tr>
                  <th>Reverse Charge</th>
                  <td>{reverseCharge ? "Yes" : "No"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Line items table */}
        <table className="ips-itm ips-itm--gst">
          <thead>
            <tr>
              <th rowSpan={2} className="ips-c-sno">
                Sr.
              </th>
              <th rowSpan={2} className="ips-c-desc">
                Description of Goods / Services
              </th>
              <th rowSpan={2} className="ips-c-hsn">
                HSN /
                <br />
                SAC
              </th>
              <th rowSpan={2} className="ips-c-qty">
                Qty
              </th>
              <th rowSpan={2} className="ips-c-rate">
                Rate
                <br />
                (₹)
              </th>
              <th rowSpan={2} className="ips-c-tx">
                Taxable
                <br />
                Value
              </th>
              {gstModel.isInterState ? (
                <th colSpan={2} className="ips-c-taxgrp">
                  IGST
                </th>
              ) : (
                <>
                  <th colSpan={2} className="ips-c-taxgrp">
                    CGST
                  </th>
                  <th colSpan={2} className="ips-c-taxgrp">
                    SGST / UTGST
                  </th>
                </>
              )}
              <th rowSpan={2} className="ips-c-tot">
                Total (₹)
              </th>
            </tr>
            <tr>
              <th className="ips-c-taxpct">%</th>
              <th className="ips-c-taxamt">₹</th>
              {gstModel.isInterState ? null : (
                <>
                  <th className="ips-c-taxpct">%</th>
                  <th className="ips-c-taxamt">₹</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {gstModel.lines.map((li) => (
              <tr key={li.id || li.index}>
                <td className="tc">{li.index}</td>
                <td>
                  <ProductCell line={li} saleNotes={saleNotes} showNotes={li.index === 1} />
                </td>
                <td className="tc">{li.hsn || "—"}</td>
                <td className="tr">{QTY.format(li.qty)}</td>
                <td className="tr">{fmtRate(li.qty > 0 ? li.taxable / li.qty : 0)}</td>
                <td className="tr">{fmtAmt(li.taxable)}</td>
                {gstModel.isInterState ? (
                  <>
                    <td className="tc">{fmtGstPct(li.igstRate)}</td>
                    <td className="tr">{li.igst > 0 ? fmtAmt(li.igst) : "—"}</td>
                  </>
                ) : (
                  <>
                    <td className="tc">{fmtGstPct(li.cgstRate)}</td>
                    <td className="tr">{li.cgst > 0 ? fmtAmt(li.cgst) : "—"}</td>
                    <td className="tc">{fmtGstPct(li.sgstRate)}</td>
                    <td className="tr">{li.sgst > 0 ? fmtAmt(li.sgst) : "—"}</td>
                  </>
                )}
                <td className="tr">
                  <strong>{fmtAmt(li.lineTotal)}</strong>
                </td>
              </tr>
            ))}
            <tr className="ips-itm-tot">
              <td colSpan={3} className="tl">
                <strong>Total</strong>
              </td>
              <td className="tr">
                <strong>{QTY.format(totalQty)}</strong>
              </td>
              <td />
              <td className="tr">
                <strong>{fmtAmt(gstModel.taxableTotal)}</strong>
              </td>
              {gstModel.isInterState ? (
                <>
                  <td />
                  <td className="tr">
                    <strong>{fmtAmt(gstModel.igst)}</strong>
                  </td>
                </>
              ) : (
                <>
                  <td />
                  <td className="tr">
                    <strong>{fmtAmt(gstModel.cgst)}</strong>
                  </td>
                  <td />
                  <td className="tr">
                    <strong>{fmtAmt(gstModel.sgst)}</strong>
                  </td>
                </>
              )}
              <td className="tr">
                <strong>{fmtAmt(linesMerchTotal)}</strong>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Bottom section: HSN + words + notes (left) | Tax panel (right) */}
        <div className="ips-floor">
          <div className="ips-floor-l">
            <table className="ips-hsn">
              <thead>
                <tr>
                  <th
                    colSpan={gstModel.isInterState ? 5 : 7}
                    className="tl ips-hsn-title"
                  >
                    HSN / SAC Summary
                  </th>
                </tr>
                <tr>
                  <th>HSN / SAC</th>
                  <th className="tr">Taxable Value</th>
                  {gstModel.isInterState ? (
                    <>
                      <th className="tc">IGST %</th>
                      <th className="tr">IGST ₹</th>
                    </>
                  ) : (
                    <>
                      <th className="tc">CGST %</th>
                      <th className="tr">CGST ₹</th>
                      <th className="tc">SGST %</th>
                      <th className="tr">SGST ₹</th>
                    </>
                  )}
                  <th className="tr">Total Tax</th>
                </tr>
              </thead>
              <tbody>
                {gstModel.hsnSummary.map((row) => (
                  <tr key={`${row.hsn}-${row.gstRate}`}>
                    <td>{row.hsn}</td>
                    <td className="tr">{fmtAmt(row.taxable)}</td>
                    {gstModel.isInterState ? (
                      <>
                        <td className="tc">{fmtGstPct(row.igstRate || row.gstRate)}</td>
                        <td className="tr">{fmtAmt(row.igst)}</td>
                      </>
                    ) : (
                      <>
                        <td className="tc">{fmtGstPct(row.cgstRate)}</td>
                        <td className="tr">{fmtAmt(row.cgst)}</td>
                        <td className="tc">{fmtGstPct(row.sgstRate)}</td>
                        <td className="tr">{fmtAmt(row.sgst)}</td>
                      </>
                    )}
                    <td className="tr">{fmtAmt(row.cgst + row.sgst + row.igst)}</td>
                  </tr>
                ))}
                <tr className="ips-hsn-tot">
                  <td>
                    <strong>Total</strong>
                  </td>
                  <td className="tr">
                    <strong>{fmtAmt(gstModel.taxableTotal)}</strong>
                  </td>
                  {gstModel.isInterState ? (
                    <>
                      <td />
                      <td className="tr">
                        <strong>{fmtAmt(gstModel.igst)}</strong>
                      </td>
                    </>
                  ) : (
                    <>
                      <td />
                      <td className="tr">
                        <strong>{fmtAmt(gstModel.cgst)}</strong>
                      </td>
                      <td />
                      <td className="tr">
                        <strong>{fmtAmt(gstModel.sgst)}</strong>
                      </td>
                    </>
                  )}
                  <td className="tr">
                    <strong>{fmtAmt(gstModel.totalTax)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="ips-words">
              <span className="ips-words-lbl">Amount in Words:</span>
              <span className="ips-words-val">&nbsp;{amountInWordsInr(grandTotal)}</span>
            </div>

            {(notes || saleNotes) ? (
              <div className="ips-notebox ips-notebox--nobordertop">
                <div className="ips-notebox-hd">Notes</div>
                <div className="ips-notebox-body">{notes || saleNotes}</div>
              </div>
            ) : null}

            <TermsBlock terms={terms} />
          </div>

          <div className="ips-floor-r">
            <TaxPanel
              gstModel={gstModel}
              grandTotal={grandTotal}
              received={received}
              outstanding={outstanding}
              isInterState={gstModel.isInterState}
              extraChargeLabel={extraChargeLabel}
              additionalCharges={sale?.additionalCharges}
              reverseCharge={reverseCharge}
            />
          </div>
        </div>

        <PrintFooter {...footProps} />
      </div>
    );
  }

  /* ───────────── Tax invoice title when GST on but GSTIN missing ─────── */
  if (isTaxInvoice) {
    return (
      <div className={sheetCls("simple")}>
        <InvoiceHeader {...headerProps} docTitle="" copyLabel="" />
        <div className="ips-divider" />
        <DocTitleBanner title={docType === "invoice" ? "TAX INVOICE" : docTitle} copyLabel={copyLabel} />

        <div className="ips-meta-2col">
          <div className="ips-billto">
            <div className="ips-section-lbl">Bill To</div>
            <div className="ips-cust-name">{sale?.customerName || "—"}</div>
            {hasSaleAddress(sale) ? (
              <div className="ips-cust-addr">{saleAddressLines(sale).join(", ")}</div>
            ) : null}
            {customerGstin ? (
              <div className="ips-cust-gstin">
                GSTIN:&nbsp;<strong>{customerGstin}</strong>
              </div>
            ) : null}
          </div>
          <div className="ips-invmeta">
            <table className="ips-det-tbl">
              <tbody>
                <tr>
                  <th>Invoice No.</th>
                  <td>
                    <strong>{sale?.invoiceNo || "—"}</strong>
                  </td>
                </tr>
                <tr>
                  <th>Invoice Date</th>
                  <td>{dateSlash(sale?.date)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <table className="ips-itm">
          <thead>
            <tr>
              <th className="ips-c-sno">Sr.</th>
              <th className="ips-c-desc">Description of Goods / Services</th>
              <th className="ips-c-qty">Qty</th>
              <th className="ips-c-rate">Rate (₹)</th>
              <th className="ips-c-amt">Amount (₹)</th>
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
                <td className="tr">{fmtAmt(li.salePrice)}</td>
                <td className="tr">{fmtAmt(num(li.qty) * num(li.salePrice))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ips-floor">
          <div className="ips-floor-l">
            <div className="ips-words">
              <span className="ips-words-lbl">Amount in Words:</span>
              <span className="ips-words-val">&nbsp;{amountInWordsInr(num(sale?.totalSale))}</span>
            </div>
            {(notes || saleNotes) ? (
              <div className="ips-notebox ips-notebox--nobordertop">
                <div className="ips-notebox-hd">Notes</div>
                <div className="ips-notebox-body">{notes || saleNotes}</div>
              </div>
            ) : null}
            <TermsBlock terms={terms} />
          </div>
          <div className="ips-floor-r">
            <table className="ips-simpletot">
              <tbody>
                <SimpleTotalRows sale={sale} settings={settings} lineSubtotal={lineSubtotal} />
                <tr className="ips-st-grand">
                  <td>Total Amount</td>
                  <td className="tr">{fmtAmt(sale?.totalSale)}</td>
                </tr>
                <tr>
                  <td>Payment Received</td>
                  <td className="tr">{fmtAmt(received)}</td>
                </tr>
                <tr className={num(outstanding) > 0 ? "ips-st-due" : ""}>
                  <td>Balance Due</td>
                  <td className="tr">{fmtBalance(outstanding)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <PrintFooter {...footProps} />
      </div>
    );
  }

  /* ───────────────────── Simple Invoice (GST disabled) ───────────────── */
  return (
    <div className={sheetCls("simple")}>
      <InvoiceHeader {...headerProps} docTitle="INVOICE" copyLabel={copyLabel} />
      <div className="ips-divider" />
      <DocTitleBanner title="INVOICE" />

      <div className="ips-meta-2col">
        <div className="ips-billto">
          <div className="ips-section-lbl">Bill To</div>
          <div className="ips-cust-name">{sale?.customerName || "—"}</div>
          {hasSaleAddress(sale) ? (
            <div className="ips-cust-addr">{saleAddressLines(sale).join(", ")}</div>
          ) : null}
        </div>
        <div className="ips-invmeta">
          <table className="ips-det-tbl">
            <tbody>
              <tr>
                <th>Invoice No.</th>
                <td>
                  <strong>{sale?.invoiceNo || "—"}</strong>
                </td>
              </tr>
              <tr>
                <th>Invoice Date</th>
                <td>{dateSlash(sale?.date)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <table className="ips-itm">
        <thead>
          <tr>
            <th className="ips-c-sno">Sr.</th>
            <th className="ips-c-desc">Description of Goods / Services</th>
            <th className="ips-c-qty">Qty</th>
            <th className="ips-c-rate">Rate (₹)</th>
            <th className="ips-c-amt">Amount (₹)</th>
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
              <td className="tr">{fmtAmt(li.salePrice)}</td>
              <td className="tr">{fmtAmt(num(li.qty) * num(li.salePrice))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ips-floor">
        <div className="ips-floor-l">
          <div className="ips-words">
            <span className="ips-words-lbl">Amount in Words:</span>
            <span className="ips-words-val">&nbsp;{amountInWordsInr(num(sale?.totalSale))}</span>
          </div>
          {(notes || saleNotes) ? (
            <div className="ips-notebox ips-notebox--nobordertop">
              <div className="ips-notebox-hd">Notes</div>
              <div className="ips-notebox-body">{notes || saleNotes}</div>
            </div>
          ) : null}
          <TermsBlock terms={terms} />
        </div>
        <div className="ips-floor-r">
          <table className="ips-simpletot">
            <tbody>
              <tr className="ips-st-grand">
                <td>Total Amount</td>
                <td className="tr">{fmtAmt(sale?.totalSale)}</td>
              </tr>
              <tr>
                <td>Payment Received</td>
                <td className="tr">{fmtAmt(received)}</td>
              </tr>
              <tr className={num(outstanding) > 0 ? "ips-st-due" : ""}>
                <td>Balance Due</td>
                <td className="tr">{fmtBalance(outstanding)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <PrintFooter {...footProps} />
    </div>
  );
}
