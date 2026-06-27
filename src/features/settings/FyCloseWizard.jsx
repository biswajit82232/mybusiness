import { useMemo, useState } from "react";
import { makeId, moneyFull, todayStr, dateSlash } from "@/domain/index.js";
import { IcDownload } from "@/shared/ui/icons/AppIcons.jsx";

const STEPS = [
  "Review balances and P&L for the closing FY.",
  "Download a year-end backup (keep a copy offline).",
  "Save an FY snapshot in Settings for your records.",
  "Start the new FY in the Financial year screen if needed.",
];

export function FyCloseWizard({
  fyStr,
  balSum,
  kpis,
  fyCloseSnapshots = [],
  onExportBackup,
  onSavePartial,
}) {
  const [stepDone, setStepDone] = useState(() => STEPS.map(() => false));
  const [note, setNote] = useState("");

  const snapshotPreview = useMemo(
    () => ({
      fyLabel: fyStr,
      asOfDate: todayStr(),
      totalAssets: balSum?.totalAssets,
      totalLiab: balSum?.totalLiab,
      netCapital: balSum?.netCapital,
      outstanding: balSum?.outstanding,
      stockVal: balSum?.stockVal,
      gstLiability: balSum?.gstLiability,
      revenue: kpis?.revenue,
      netProfit: kpis?.netProfit,
    }),
    [fyStr, balSum, kpis],
  );

  const saveSnapshot = () => {
    const entry = {
      id: makeId(),
      savedAt: new Date().toISOString(),
      note: String(note || "").trim(),
      ...snapshotPreview,
    };
    const prev = Array.isArray(fyCloseSnapshots) ? fyCloseSnapshots : [];
    onSavePartial?.({ fyCloseSnapshots: [entry, ...prev].slice(0, 20) });
    setStepDone((d) => d.map((x, i) => (i === 2 ? true : x)));
  };

  const exportFyBackup = () => {
    onExportBackup?.({ filenameSuffix: `fy-close-${fyStr}-${todayStr()}` });
    setStepDone((d) => d.map((x, i) => (i === 1 ? true : x)));
  };

  return (
    <div className="fy-close-wizard">
      <div className="form-card fy-close-summary-card">
        <div className="form-card-title">FY {fyStr} — closing snapshot</div>
        <p className="settings-inline-hint">As of {dateSlash(todayStr())}. Use this before you roll into a new financial year.</p>
        <div className="fy-close-kpi-grid">
          <div className="fy-close-kpi">
            <span className="fy-close-kpi-l">Revenue (period)</span>
            <span className="fy-close-kpi-v">{moneyFull(kpis?.revenue)}</span>
          </div>
          <div className="fy-close-kpi">
            <span className="fy-close-kpi-l">Net profit</span>
            <span className="fy-close-kpi-v">{moneyFull(kpis?.netProfit)}</span>
          </div>
          <div className="fy-close-kpi">
            <span className="fy-close-kpi-l">Total assets</span>
            <span className="fy-close-kpi-v">{moneyFull(balSum?.totalAssets)}</span>
          </div>
          <div className="fy-close-kpi">
            <span className="fy-close-kpi-l">Net worth</span>
            <span className="fy-close-kpi-v">{moneyFull(balSum?.netCapital)}</span>
          </div>
        </div>
      </div>

      <ol className="fy-close-steps">
        {STEPS.map((text, i) => (
          <li key={text} className={stepDone[i] ? "fy-close-step fy-close-step--done" : "fy-close-step"}>
            <span className="fy-close-step-n">{i + 1}</span>
            <span className="fy-close-step-t">{text}</span>
          </li>
        ))}
      </ol>

      <div className="fy-close-actions">
        <button type="button" className="ghost-btn fy-close-btn" onClick={() => setStepDone((d) => d.map((x, i) => (i === 0 ? true : x)))}>
          Mark review done
        </button>
        <button type="button" className="primary-btn fy-close-btn" onClick={exportFyBackup}>
          <IcDownload />
          <span>Download FY backup</span>
        </button>
      </div>

      <div className="form-card">
        <div className="form-card-title">Save FY snapshot</div>
        <p className="settings-inline-hint">Stores key totals in Settings (syncs with backup). Does not delete or reset transactions.</p>
        <label className="field">
          <span className="field-lbl">Note (optional)</span>
          <input
            type="text"
            className="fy-close-note-inp"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Closed with CA on 31 Mar"
          />
        </label>
        <button type="button" className="primary-btn submit-btn" onClick={saveSnapshot}>
          Save snapshot
        </button>
      </div>

      {fyCloseSnapshots.length > 0 ? (
        <div className="form-card">
          <div className="form-card-title">Saved snapshots</div>
          <ul className="fy-close-snap-list">
            {fyCloseSnapshots.slice(0, 8).map((s) => (
              <li key={s.id} className="fy-close-snap-row">
                <span className="fy-close-snap-fy">FY {s.fyLabel}</span>
                <span className="fy-close-snap-meta">{dateSlash(String(s.asOfDate || s.savedAt || "").slice(0, 10))}</span>
                <span className="fy-close-snap-val">{moneyFull(s.netCapital)}</span>
                {s.note ? <span className="fy-close-snap-note">{s.note}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
