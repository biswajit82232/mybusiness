import { useEffect, useRef, useState } from "react";
import { IcDownload, IcPrint, IcX } from "@/shared/ui/icons/AppIcons.jsx";
import { downloadInvoicePdf } from "./downloadInvoicePdf.js";
import { InvoicePrintSheet } from "./InvoicePrintSheet.jsx";
import "./invoice-preview.css";

export function InvoicePreviewModal({ sale, settings = {}, docLabel = "Invoice", onClose, onError }) {
  const sheetRef = useRef(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState("");

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleDownloadPdf = async () => {
    const el = sheetRef.current?.querySelector(".invoice-print-sheet");
    if (!el || pdfBusy) return;
    setPdfBusy(true);
    setPdfError("");
    try {
      await downloadInvoicePdf(el, { sale, docLabel });
    } catch (err) {
      console.error("Invoice PDF download failed:", err);
      const msg = onError ? null : "Could not download PDF — try Print instead";
      if (onError) onError("Could not download PDF — try Print instead");
      else setPdfError(msg);
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div
      className="invoice-preview-overlay modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`${docLabel} preview`}
      onClick={onClose}
    >
      <div className="invoice-preview-panel" onClick={(e) => e.stopPropagation()}>
        <div className="invoice-preview-toolbar hdr-print-hide">
          <span className="invoice-preview-title">{docLabel} preview</span>
          <div className="invoice-preview-actions">
            <button
              type="button"
              className="edit-entry-btn invoice-preview-print"
              onClick={handleDownloadPdf}
              disabled={pdfBusy}
              aria-busy={pdfBusy}
            >
              <IcDownload />
              {pdfBusy ? "Saving…" : "Download PDF"}
            </button>
            <button type="button" className="edit-entry-btn invoice-preview-print" onClick={() => window.print()}>
              <IcPrint />
              Print
            </button>
            <button type="button" className="icon-btn icon-btn-sm" onClick={onClose} aria-label="Close preview">
              <IcX />
            </button>
          </div>
        </div>
        {pdfError ? <p className="invoice-preview-error" role="alert">{pdfError}</p> : null}
        <div className="invoice-preview-scroll" ref={sheetRef}>
          <InvoicePrintSheet sale={sale} settings={settings} />
        </div>
      </div>
    </div>
  );
}
