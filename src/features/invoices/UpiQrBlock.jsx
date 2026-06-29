import { useEffect, useState } from "react";
import { buildUpiPayUri, normalizeUpiVpa } from "@/domain/upi.js";
import { num } from "@/domain/appModel.js";

/**
 * Renders a UPI QR code for invoice print / PDF (static VPA from settings).
 */
export function UpiQrBlock({ settings = {}, amount, note, className = "" }) {
  const vpa = normalizeUpiVpa(settings.businessUpiVpa);
  const [dataUrl, setDataUrl] = useState("");

  useEffect(() => {
    if (!vpa) {
      setDataUrl("");
      return;
    }
    const uri = buildUpiPayUri({
      vpa,
      payeeName: settings.businessUpiPayeeName || settings.businessName,
      amount: num(amount) > 0 ? num(amount) : undefined,
      note,
    });
    if (!uri) {
      setDataUrl("");
      return;
    }
    let cancelled = false;
    import("qrcode")
      .then((mod) => {
        const QR = mod.default ?? mod;
        return QR.toDataURL(uri, { width: 128, margin: 1, errorCorrectionLevel: "M" });
      })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl("");
      });
    return () => {
      cancelled = true;
    };
  }, [vpa, settings.businessUpiPayeeName, settings.businessName, amount, note]);

  if (!vpa || !dataUrl) return null;

  return (
    <div className={`ips-upi-qr${className ? ` ${className}` : ""}`}>
      <img src={dataUrl} alt="Scan to pay via UPI" width={128} height={128} />
      <div className="ips-upi-qr-caption">
        <strong>Pay via UPI</strong>
        <span>{vpa}</span>
      </div>
    </div>
  );
}
