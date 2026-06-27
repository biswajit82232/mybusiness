import { num, money, sumFixedAssetsGross, sumFixedAssetsNetBook, todayStr } from "@/domain/index.js";
import { IcPlus, IcTrash } from "@/shared/ui/icons/AppIcons.jsx";
import { TabPageChrome } from "@/shared/ui/layout/AppChrome.jsx";

export function FixedAssetsTab({ state, patchFixed, addFixed, removeFixed, saveFixed, onOpenSidebar, requestConfirm }) {
  const fixed = state.balance.fixedAssetAccounts || [];
  const asOf = todayStr();
  const grossTotal = sumFixedAssetsGross(fixed);
  const netTotal = sumFixedAssetsNetBook(fixed, asOf);
  const n = fixed.length;

  const onRemove = (id) => {
    requestConfirm?.({
      title: "Remove this asset?",
      message: "Unsaved register changes are kept until you tap Save.",
      confirmLabel: "Remove",
      danger: true,
      onConfirm: () => removeFixed(id),
    });
  };

  return (
    <TabPageChrome
      title="Fixed Assets"
      onOpenSidebar={onOpenSidebar}
      className="tab-page--split-scroll tab-page--fixed-assets"
      right={n > 0 ? <span className="page-hdr-meta">{n} on register</span> : null}
      footer={
        <div className="tab-page-footer">
          <button type="button" className="primary-btn submit-btn tab-page-footer-save" onClick={saveFixed}>
            Save register
          </button>
        </div>
      }
    >
      <div className="banking-summary" aria-label="Fixed assets overview">
        <div className="banking-sum-cell">
          <span className="banking-sum-lbl">Net book value</span>
          <span className="banking-sum-val">{money(netTotal)}</span>
          {grossTotal > netTotal + 0.01 ? (
            <span className="banking-sum-meta">{money(grossTotal)} gross</span>
          ) : null}
        </div>
        <div className="banking-sum-cell">
          <span className="banking-sum-lbl">On register</span>
          <span className="banking-sum-val banking-sum-val--count">{n}</span>
        </div>
      </div>

      <div className="tab-page-scroll">
        <div className="banking-screen">
          <section className="fin-section banking-accounts-section fixed-assets-section" aria-labelledby="fixed-assets-reg-hd">
            <div className="fixed-assets-section-hd">
              <h2 id="fixed-assets-reg-hd" className="fixed-assets-section-title">
                Asset register
              </h2>
              <button type="button" className="fixed-assets-add-btn" onClick={addFixed}>
                <IcPlus />
                <span>Add asset</span>
              </button>
            </div>

            {n === 0 ? (
              <p className="banking-empty-hint fixed-assets-empty">No assets yet. Tap Add asset to create a row, then Save register.</p>
            ) : (
              <div className="fixed-assets-table-wrap">
                <div className="fixed-assets-table" role="table" aria-label="Fixed asset register">
                  <div className="fixed-assets-table-head" role="row">
                    <span role="columnheader">Asset</span>
                    <span role="columnheader">Book value</span>
                    <span role="columnheader">Purchase</span>
                    <span role="columnheader">Dep. % p.a.</span>
                    <span role="columnheader">Acc. depreciation</span>
                    <span className="fixed-assets-table-head-del" role="columnheader" aria-label="Remove">
                      {/* header spacer for delete column */}
                    </span>
                  </div>
                  <ul className="fixed-assets-table-body" role="list">
                    {fixed.map((acc) => (
                      <li key={acc.id} role="row">
                        <div className="fixed-asset-row" role="group" aria-label={`${acc.name || "Asset"} row`}>
                          <div className="fixed-asset-cell fixed-asset-cell--name">
                            <span className="fixed-asset-cell-lbl">Asset</span>
                            <input
                              type="text"
                              className="fixed-asset-inp fixed-asset-inp--name"
                              value={acc.name}
                              onChange={(e) => patchFixed(acc.id, { name: e.target.value })}
                              placeholder="Asset name"
                              aria-label="Asset name"
                            />
                          </div>
                          <div className="fixed-asset-cell fixed-asset-cell--book">
                            <span className="fixed-asset-cell-lbl">Book value</span>
                            <input
                              type="number"
                              className="fixed-asset-inp fixed-asset-inp--amt"
                              min="0"
                              step="0.01"
                              inputMode="decimal"
                              value={acc.amount}
                              onChange={(e) => patchFixed(acc.id, { amount: num(e.target.value) })}
                              aria-label="Book value"
                            />
                          </div>
                          <div className="fixed-asset-cell fixed-asset-cell--purchase">
                            <span className="fixed-asset-cell-lbl">Purchase</span>
                            <input
                              type="date"
                              className="fixed-asset-inp fixed-asset-inp--date"
                              value={acc.purchaseDate || ""}
                              onChange={(e) => patchFixed(acc.id, { purchaseDate: e.target.value })}
                              aria-label="Purchase date"
                            />
                          </div>
                          <div className="fixed-asset-cell fixed-asset-cell--pct">
                            <span className="fixed-asset-cell-lbl">Dep. % p.a.</span>
                            <input
                              type="number"
                              className="fixed-asset-inp fixed-asset-inp--pct"
                              min="0"
                              max="100"
                              step="0.1"
                              inputMode="decimal"
                              placeholder="0"
                              value={acc.depreciationRatePct ?? ""}
                              onChange={(e) => patchFixed(acc.id, { depreciationRatePct: num(e.target.value) })}
                              aria-label="Depreciation percent per year"
                            />
                          </div>
                          <div className="fixed-asset-cell fixed-asset-cell--depr">
                            <span className="fixed-asset-cell-lbl">Acc. depreciation</span>
                            <input
                              type="number"
                              className="fixed-asset-inp fixed-asset-inp--amt"
                              min="0"
                              step="0.01"
                              inputMode="decimal"
                              placeholder="0"
                              value={acc.accumulatedDepreciation ?? ""}
                              onChange={(e) => patchFixed(acc.id, { accumulatedDepreciation: num(e.target.value) })}
                              aria-label="Accumulated depreciation"
                            />
                          </div>
                          <div className="fixed-asset-cell fixed-asset-cell--del">
                            <span className="fixed-asset-cell-lbl" aria-hidden="true">
                              Remove
                            </span>
                            <button
                              type="button"
                              className="icon-btn icon-btn-sm fixed-asset-del"
                              onClick={() => onRemove(acc.id)}
                              aria-label={`Delete ${(acc.name || "").trim() || "asset"}`}
                            >
                              <IcTrash />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </TabPageChrome>
  );
}
