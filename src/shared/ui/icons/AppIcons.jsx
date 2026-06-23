const svgBase = {viewBox:"0 0 24 24",fill:"none","aria-hidden":"true"};
const sw = {stroke:"currentColor",strokeLinecap:"round",strokeLinejoin:"round"};

export function IcHome()    { return <svg {...svgBase}><path {...sw} strokeWidth="1.8" d="M3 12L12 3l9 9"/><path {...sw} strokeWidth="1.8" d="M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9"/></svg>; }
export function IcSales()   { return <svg {...svgBase}><path {...sw} strokeWidth="1.8" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path {...sw} strokeWidth="1.8" d="M14 2v6h6M8 13h8M8 17h5"/></svg>; }
export function IcBox()     { return <svg {...svgBase}><path {...sw} strokeWidth="1.8" d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><circle cx="7" cy="7" r="1.5" fill="currentColor"/></svg>; }
export function IcFinance() { return <svg {...svgBase}><rect {...sw} strokeWidth="1.8" x="2" y="7" width="20" height="14" rx="2"/><path {...sw} strokeWidth="1.8" d="M16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z"/><path {...sw} strokeWidth="1.8" d="M12 12v6M9 14h6"/></svg>; }
export function IcMore()    { return <svg {...svgBase}><path {...sw} strokeWidth="1.8" d="M4 6h16M4 12h16M4 18h16"/></svg>; }
export function IcPlus()    { return <svg {...svgBase}><path {...sw} strokeWidth="2.2" d="M12 5v14M5 12h14"/></svg>; }
export function IcMinus()   { return <svg {...svgBase}><path {...sw} strokeWidth="2.2" d="M5 12h14"/></svg>; }
export function IcBack()    { return <svg {...svgBase}><path {...sw} strokeWidth="1.8" d="M15 6L9 12l6 6"/></svg>; }
export function IcBell()    { return <svg {...svgBase}><path {...sw} strokeWidth="1.8" d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>; }
export function IcSearch()  { return <svg {...svgBase}><circle {...sw} strokeWidth="1.8" cx="11" cy="11" r="7"/><path {...sw} strokeWidth="1.8" d="M16.5 16.5L21 21"/></svg>; }
export function IcX()       { return <svg {...svgBase}><path {...sw} strokeWidth="1.8" d="M18 6L6 18M6 6l12 12"/></svg>; }
export function IcEdit()    { return <svg {...svgBase}><path {...sw} strokeWidth="1.8" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path {...sw} strokeWidth="1.8" d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>; }
export function IcTrash()   { return <svg {...svgBase}><path {...sw} strokeWidth="1.8" d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path {...sw} strokeWidth="1.8" d="M10 11v6M14 11v6"/></svg>; }
export function IcPrint()   { return <svg {...svgBase}><path {...sw} strokeWidth="1.8" d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect {...sw} strokeWidth="1.8" x="6" y="14" width="12" height="8" rx="1"/></svg>; }
export function IcChevL()   { return <svg {...svgBase}><path {...sw} strokeWidth="1.8" d="M15 18l-6-6 6-6"/></svg>; }
export function IcChevR()   { return <svg {...svgBase}><path {...sw} strokeWidth="1.8" d="M9 18l6-6-6-6"/></svg>; }
export function IcChevD()   { return <svg {...svgBase}><path {...sw} strokeWidth="1.8" d="M6 9l6 6 6-6"/></svg>; }
export function IcChart()   { return <svg {...svgBase}><path {...sw} strokeWidth="1.8" d="M3 3v18h18"/><path {...sw} strokeWidth="1.8" d="M7 16l4-4 4 4 4-6"/></svg>; }
export function IcReport()  { return <svg {...svgBase}><path {...sw} strokeWidth="1.8" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><path {...sw} strokeWidth="1.8" d="M14 2v6h6M8 13h8M8 17h6M8 9h2"/></svg>; }
export function IcEmi()     { return <svg {...svgBase}><rect {...sw} strokeWidth="1.8" x="2" y="5" width="20" height="16" rx="2"/><path {...sw} strokeWidth="1.8" d="M2 10h20M8 14h4M8 17h6"/></svg>; }
export function IcSpend()   { return <svg {...svgBase}><path {...sw} strokeWidth="1.8" d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>; }
export function IcIncome()  { return <svg {...svgBase}><path {...sw} strokeWidth="1.8" d="M12 20V10M8 14l4-4 4 4M4 4h16"/></svg>; }
export function IcSettings(){ return <svg {...svgBase}><circle {...sw} strokeWidth="1.8" cx="12" cy="12" r="3"/><path {...sw} strokeWidth="1.8" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>; }
export function IcPhone()   { return <svg {...svgBase}><path {...sw} strokeWidth="1.8" d="M22 16.92v3a2 2 0 01-2.18 2 19.8 19.8 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.12.86.3 1.7.54 2.51a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.8.24 1.64.42 2.51.54A2 2 0 0122 16.92z"/></svg>; }
export function IcWhatsApp(){ return <svg viewBox="0 0 24 24" aria-hidden="true" className="wa-svg"><path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>; }

export function IcDownload(){ return <svg {...svgBase}><path {...sw} strokeWidth="1.8" d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path {...sw} strokeWidth="1.8" d="M7 10l5 5 5-5M12 15V3"/></svg>; }
export function IcUpload()  { return <svg {...svgBase}><path {...sw} strokeWidth="1.8" d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path {...sw} strokeWidth="1.8" d="M17 8l-5-5-5 5M12 3v12"/></svg>; }
export function IcCloud() {
  return (
    <svg {...svgBase}>
      <path
        {...sw}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
      />
    </svg>
  );
}
export function IcMenu()    { return <svg {...svgBase}><path {...sw} strokeWidth="1.8" d="M4 6h16M4 12h16M4 18h16"/></svg>; }
export function IcMoon()    { return <svg {...svgBase}><path {...sw} strokeWidth="1.8" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>; }
export function IcSun()     { return <svg {...svgBase}><circle {...sw} strokeWidth="1.8" cx="12" cy="12" r="4"/><path {...sw} strokeWidth="1.8" d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>; }
export function IcLogout()  { return <svg {...svgBase}><path {...sw} strokeWidth="1.8" d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path {...sw} strokeWidth="1.8" d="M16 17l5-5-5-5M21 12H9"/></svg>; }
export function IcUsers()   { return <svg {...svgBase}><path {...sw} strokeWidth="1.8" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle {...sw} strokeWidth="1.8" cx="9" cy="7" r="4"/><path {...sw} strokeWidth="1.8" d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>; }
export function IcReceivable(){ return <svg {...svgBase}><path {...sw} strokeWidth="1.8" d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/><path {...sw} strokeWidth="1.8" d="M19 8l-3-3-3 3"/></svg>; }
/** Handshake-style loan icon — visually distinct from receivables. */
export function IcServicing() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

export function IcLoanGiven(){ return <svg {...svgBase}><path {...sw} strokeWidth="1.8" d="M2 18h3a2 2 0 012 2v2"/><path {...sw} strokeWidth="1.8" d="M22 18h-3a2 2 0 00-2 2v2"/><path {...sw} strokeWidth="1.8" d="M7 18l3-3h4l3 3"/><circle {...sw} strokeWidth="1.8" cx="12" cy="8" r="4"/><path {...sw} strokeWidth="1.8" d="M12 4v8M10 6l2-2 2 2"/></svg>; }
/** Supplier balances owed (mirror of receivables). */
export function IcPayable() {
  return (
    <svg {...svgBase}>
      <path {...sw} strokeWidth="1.8" d="M12 1v22M17 19H9.5a3.5 3.5 0 010-7h5a3.5 3.5 0 000-7H6" />
      <path {...sw} strokeWidth="1.8" d="M19 16l-3 3-3-3" />
    </svg>
  );
}
export function IcBranch() {
  return (
    <svg {...svgBase}>
      <path {...sw} strokeWidth="1.8" d="M6 3h5v18H6zM13 8h5v13h-5z" />
      <path {...sw} strokeWidth="1.8" d="M8.5 8h0M15.5 3h0" />
    </svg>
  );
}
export function IcCatalog() { return <svg {...svgBase}><rect {...sw} strokeWidth="1.8" x="3" y="3" width="7" height="7"/><rect {...sw} strokeWidth="1.8" x="14" y="3" width="7" height="7"/><rect {...sw} strokeWidth="1.8" x="14" y="14" width="7" height="7"/><rect {...sw} strokeWidth="1.8" x="3" y="14" width="7" height="7"/></svg>; }
/** Stacked items — product bundles / kits. */
export function IcBundle() {
  return (
    <svg {...svgBase}>
      <path {...sw} strokeWidth="1.8" d="M4 7h16v12H4z" />
      <path {...sw} strokeWidth="1.8" d="M7 4h10v5H7z" />
      <path {...sw} strokeWidth="1.8" d="M9 11h6" />
    </svg>
  );
}
export function IcLedger()  { return <svg {...svgBase}><path {...sw} strokeWidth="1.8" d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path {...sw} strokeWidth="1.8" d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/><path {...sw} strokeWidth="1.8" d="M8 7h8M8 11h5"/></svg>; }
export function IcCashFlow(){ return <svg {...svgBase}><path {...sw} strokeWidth="1.8" d="M3 3v18h18"/><path {...sw} strokeWidth="1.8" d="M7 12l4-4 4 4 4-4"/></svg>; }
export function IcCalDay()  { return <svg {...svgBase}><rect {...sw} strokeWidth="1.8" x="3" y="4" width="18" height="18" rx="2"/><path {...sw} strokeWidth="1.8" d="M16 2v4M8 2v4M3 10h18"/><path {...sw} strokeWidth="1.8" d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>; }
export function IcBanking() { return <svg {...svgBase}><rect {...sw} strokeWidth="1.8" x="2" y="8" width="20" height="12" rx="2"/><path {...sw} strokeWidth="1.8" d="M6 8V6a2 2 0 012-2h8a2 2 0 012 2v2M12 12v4M9 14h6"/></svg>; }
export function IcLandmark() { return <svg {...svgBase}><path {...sw} strokeWidth="1.8" d="M3 21h18M5 21V10l7-5 7 5v11M9 21v-5h6v5"/></svg>; }
export function IcNetWorth() {
  return (
    <svg {...svgBase}>
      <path {...sw} strokeWidth="1.8" d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      <circle {...sw} strokeWidth="1.8" cx="12" cy="12" r="5" />
    </svg>
  );
}

export function IcBook() {
  return (
    <svg {...svgBase}>
      <path {...sw} strokeWidth="1.8" d="M5 3h11a3 3 0 013 3v13H8a3 3 0 00-3 3z" />
      <path {...sw} strokeWidth="1.8" d="M5 3a3 3 0 013 3v16" />
      <path {...sw} strokeWidth="1.8" d="M10 7h6" />
      <path {...sw} strokeWidth="1.8" d="M10 11h4" />
    </svg>
  );
}

/** Record loan repayment / payment received. */
export function IcPayment() {
  return (
    <svg {...svgBase}>
      <rect {...sw} strokeWidth="1.8" x="2" y="6" width="20" height="12" rx="2" />
      <path {...sw} strokeWidth="1.8" d="M12 10v4M10 12h4" />
      <path {...sw} strokeWidth="1.8" d="M6 3h12" />
    </svg>
  );
}

/** Reset timer / restart period (day 0). */
export function IcTimerReset() {
  return (
    <svg {...svgBase}>
      <path {...sw} strokeWidth="1.8" d="M3 12a9 9 0 0115.36-6.36L21 3v6h-6" />
      <path {...sw} strokeWidth="1.8" d="M21 12a9 9 0 01-15.36 6.36L3 21v-6h6" />
    </svg>
  );
}
