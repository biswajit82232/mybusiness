import { useRef } from "react";
import { moneyFull, num, digitsOnly, waHref } from "@/domain/index.js";
import { useFocusTrap } from "@/shared/hooks/useFocusTrap.js";
import { IcBack, IcMenu, IcPhone, IcWhatsApp } from "@/shared/ui/icons/AppIcons.jsx";

export function Field({ label, children }) {
  return (
    <label className="field">
      <span className="field-lbl">{label}</span>
      {children}
    </label>
  );
}

export function BsRow({ label, value, bold, grand, indent, signed }) {
  const n = num(value);
  const valCls =
    signed && n < -0.005 ? " bs-row__val--neg" : signed && n > 0.005 ? " bs-row__val--pos" : "";
  return (
    <div className={`bs-row${bold ? " bs-bold" : ""}${grand ? " bs-grand" : ""}${indent ? " bs-row--branch" : ""}`}>
      <span className="bs-row__label">{label}</span>
      <span className={`bs-row__val${valCls}`}>{moneyFull(value)}</span>
    </div>
  );
}

export function ContactIcons({ phone }) {
  const d = digitsOnly(phone);
  if (!d) return null;
  const wa = waHref(phone);
  return (
    <span className="contact-icons">
      <a href={`tel:${d}`} className="contact-ic" aria-label="Call">
        <IcPhone />
      </a>
      {wa && (
        <a href={wa} target="_blank" rel="noopener noreferrer" className="contact-ic contact-ic-wa" aria-label="WhatsApp">
          <IcWhatsApp />
        </a>
      )}
    </span>
  );
}

export function PageHeader({ title, onBack, right }) {
  return (
    <header className="page-hdr">
      <button type="button" className="icon-btn" onClick={onBack} aria-label="Back">
        <IcBack />
      </button>
      <span className="page-hdr-title">{title}</span>
      <div className="page-hdr-end">{right ?? <div style={{ width: 44 }} />}</div>
    </header>
  );
}

/** Main-stage shell (desktop tab bar + mobile title via parent `mobile-appbar`). */
export function TabPageChrome({ title, right, onOpenSidebar, onBack, children, className = "", footer }) {
  return (
    <div className={`tab-page${className ? ` ${className}` : ""}`}>
      <div className="tab-appbar">
        {typeof onBack === "function" && (
          <button type="button" className="icon-btn tab-appbar-back" onClick={onBack} aria-label="Back">
            <IcBack />
          </button>
        )}
        {onOpenSidebar && (
          <button type="button" className="hamburger-btn" onClick={onOpenSidebar} aria-label="Open menu">
            <IcMenu />
          </button>
        )}
        <h1 className="tab-title">{title}</h1>
        {right != null && right !== false ? <div className="tab-appbar-extra">{right}</div> : null}
      </div>
      {children}
      {footer}
    </div>
  );
}

export function EmptyState({ icon, title, sub }) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-icon">{icon}</div>}
      <p className="empty-title">{title}</p>
      {sub && <p className="empty-sub">{sub}</p>}
    </div>
  );
}

/** Full-screen overlay with keyboard focus contained for accessibility. */
export function OverlayScreen({ className = "", children, ...rest }) {
  const rootRef = useRef(null);
  useFocusTrap(rootRef, true);
  const cn = ["overlay-screen", className].filter(Boolean).join(" ");
  return (
    <div ref={rootRef} className={cn} role="dialog" aria-modal="true" {...rest}>
      {children}
    </div>
  );
}
