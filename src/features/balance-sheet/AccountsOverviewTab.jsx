import { dateSlash, moneyFull, num, todayStr } from "@/domain/index.js";
import { IcChevD } from "@/shared/ui/icons/AppIcons.jsx";
import { Field, BsRow, TabPageChrome } from "@/shared/ui/layout/AppChrome.jsx";

function hasAmount(value) {
  return num(value) > 0.005;
}

function BsLineGroup({ title, hint, total, children, defaultOpen = false }) {
  const expandable = Boolean(children);
  if (!expandable) {
    return <BsRow label={title} value={total} />;
  }
  return (
    <details className="bs-line-group" open={defaultOpen}>
      <summary className="bs-line-group-summary">
        <span className="bs-line-group-main">
          <span className="bs-line-group-title">{title}</span>
          {hint ? <span className="bs-line-group-hint">{hint}</span> : null}
        </span>
        <span className="bs-line-group-right">
          <span className="bs-line-group-val">{moneyFull(total)}</span>
          <span className="bs-line-group-chev" aria-hidden>
            <IcChevD />
          </span>
        </span>
      </summary>
      <div className="bs-line-group-body">{children}</div>
    </details>
  );
}

export function AccountsOverviewTab({ state, balSum, saveOtherBalance, onOpenSidebar }) {
  const balance = state.balance || {};
  const bankAccounts = balance.bankAccounts || [];
  const fixedAssetAccounts = balance.fixedAssetAccounts || [];
  const loanSchedule = balance.loanSchedule || [];
  const retainedOps = num(balSum.netCapital) - num(balance.ownerCapitalInvested);
  const hasLoanSchedule = loanSchedule.length > 0;
  const branchStock = (balSum.inventoryByBranch || []).filter((b) => hasAmount(b.stockValue));
  const showBranchStock = branchStock.length > 1;
  const loansLiabManual = hasLoanSchedule
    ? loanSchedule.reduce((s, ln) => s + num(ln?.balance), 0)
    : num(balance.loans);

  return (
    <TabPageChrome title="Balance sheet" onOpenSidebar={onOpenSidebar} className="tab-page--split-scroll tab-page--balance-sheet">
      <div className="nw-live-strip bs-live-strip">
        <span className="nw-live-dot" aria-hidden="true" />
        <span className="nw-live-text">Snapshot from your books</span>
        <span className="nw-live-date">{dateSlash(todayStr())}</span>
      </div>

      <div className="banking-summary bs-summary-strip" aria-label="Balance sheet totals">
        <div className="banking-sum-cell">
          <span className="banking-sum-lbl">What you own</span>
          <span className="banking-sum-val">{moneyFull(balSum.totalAssets)}</span>
          <span className="banking-sum-meta">Total assets</span>
        </div>
        <div className="banking-sum-cell banking-sum-cell--out">
          <span className="banking-sum-lbl">What you owe</span>
          <span className="banking-sum-val">{moneyFull(balSum.totalLiab)}</span>
          <span className="banking-sum-meta">Total liabilities</span>
        </div>
        <div className={`banking-sum-cell${balSum.netCapital >= 0 ? " banking-sum-cell--in" : " banking-sum-cell--out"}`}>
          <span className="banking-sum-lbl">Your stake</span>
          <span className="banking-sum-val">{moneyFull(balSum.netCapital)}</span>
          <span className="banking-sum-meta">Net worth / equity</span>
        </div>
      </div>

      <div className="bs-equation-hint" role="note">
        What you own ({moneyFull(balSum.totalAssets)}) − what you owe ({moneyFull(balSum.totalLiab)}) = your stake (
        {moneyFull(balSum.netCapital)})
      </div>

      <div className="tab-page-scroll">
        <div className="fin-overview">
          <div className="bs-hdr-card">
            <p className="bs-co">{state.settings.businessName || "Business"}</p>
            <p className="bs-doc">Balance sheet · {dateSlash(todayStr())}</p>
          </div>

          <section className="bs-section" aria-labelledby="bs-assets-hd">
            <h2 id="bs-assets-hd" className="bs-section-hd">
              What you own
            </h2>
            <p className="bs-section-intro">Cash, stock, and other things the business holds today.</p>

            <p className="bs-sub-hd">Ready to use</p>
            {bankAccounts.length === 0 ? (
              <BsRow label="Money in bank" value={0} />
            ) : bankAccounts.length === 1 ? (
              <BsRow label={bankAccounts[0].name || "Money in bank"} value={balSum.bankTotal} />
            ) : (
              <BsLineGroup title="Money in bank" hint="All accounts" total={balSum.bankTotal}>
                {bankAccounts.map((a) => (
                  <BsRow key={a.id} indent label={a.name} value={a.amount} />
                ))}
              </BsLineGroup>
            )}

            <BsRow label="Customers owe you" value={balSum.outstanding} />

            {showBranchStock ? (
              <BsLineGroup title="Stock on hand" hint="At purchase cost" total={balSum.stockVal}>
                {branchStock.map((b) => (
                  <BsRow key={b.id} indent label={b.name} value={b.stockValue} />
                ))}
              </BsLineGroup>
            ) : (
              <BsRow label="Stock on hand" value={balSum.stockVal} />
            )}

            {hasAmount(balance.otherAssets) ? <BsRow label="Other assets" value={balance.otherAssets} /> : null}
            <BsRow label="Subtotal — current" value={balSum.curAssets} bold />

            <p className="bs-sub-hd">Long-term</p>
            {fixedAssetAccounts.length === 0 ? (
              <BsRow label="Equipment &amp; property" value={0} />
            ) : fixedAssetAccounts.length === 1 ? (
              <BsRow label={fixedAssetAccounts[0].name || "Equipment & property"} value={balSum.fixedAssets} />
            ) : (
              <BsLineGroup title="Equipment &amp; property" total={balSum.fixedAssets}>
                {fixedAssetAccounts.map((a) => (
                  <BsRow key={a.id} indent label={a.name} value={a.amount} />
                ))}
              </BsLineGroup>
            )}

            <BsRow label="Total assets" value={balSum.totalAssets} grand />
          </section>

          <section className="bs-section" aria-labelledby="bs-liab-hd">
            <h2 id="bs-liab-hd" className="bs-section-hd">
              What you owe
            </h2>
            <p className="bs-section-intro">Money the business still needs to pay suppliers, banks, and others.</p>

            {hasAmount(balance.supplierPayables) ? (
              <BsRow label="Supplier dues (manual)" value={balance.supplierPayables} />
            ) : null}
            {hasAmount(balSum.purchaseCredit) ? (
              <BsRow label="Unpaid purchases" value={balSum.purchaseCredit} />
            ) : null}
            {hasLoanSchedule ? (
              loanSchedule.length === 1 ? (
                <BsRow label={loanSchedule[0].label || "Loan / EMI"} value={loanSchedule[0].balance} />
              ) : (
                <BsLineGroup title="Loans &amp; EMIs" total={loansLiabManual}>
                  {loanSchedule.map((ln) => (
                    <BsRow key={ln.id} indent label={ln.label || "Loan"} value={ln.balance} />
                  ))}
                </BsLineGroup>
              )
            ) : hasAmount(balance.loans) ? (
              <BsRow label="Bank &amp; other loans" value={balance.loans} />
            ) : null}

            {!hasAmount(balance.supplierPayables) &&
            !hasAmount(balSum.purchaseCredit) &&
            !hasAmount(loansLiabManual) ? (
              <BsRow label="No liabilities recorded" value={0} />
            ) : null}

            <BsRow label="Total liabilities" value={balSum.totalLiab} bold />
          </section>

          <section className="bs-section" aria-labelledby="bs-equity-hd">
            <h2 id="bs-equity-hd" className="bs-section-hd">
              Your stake
            </h2>
            <p className="bs-section-intro">What is left for you after paying everyone the business owes.</p>

            {hasAmount(balance.ownerCapitalInvested) ? (
              <BsRow label="Your declared investment" value={balance.ownerCapitalInvested} />
            ) : null}
            <BsRow label="Profit kept in the business" value={retainedOps} signed />
            <BsRow label="Your stake (net worth)" value={balSum.netCapital} grand />
            <p className="bs-footnote">
              Profit kept = total assets minus liabilities minus what you entered as investment. Update investment on the Net
              Worth screen.
            </p>
          </section>

          <details className="form-card form-card-details bs-manual-card">
            <summary className="form-card-details-summary">
              <span className="form-card-title form-card-details-title">Edit manual amounts</span>
              <span className="form-card-details-chev" aria-hidden>
                <IcChevD />
              </span>
            </summary>
            <form className="form-stack form-card-details-body" onSubmit={saveOtherBalance}>
              <Field label="Other assets (₹)">
                <input name="otherAssets" type="number" min="0" step="0.01" key={`oa-${balance.otherAssets}`} defaultValue={balance.otherAssets} />
              </Field>
              <Field label="Supplier dues not in Purchases (₹)">
                <input
                  name="supplierPayables"
                  type="number"
                  min="0"
                  step="0.01"
                  key={`sp-${balance.supplierPayables}`}
                  defaultValue={balance.supplierPayables}
                />
              </Field>
              <p className="form-hint bs-manual-hint">Use this only for payables you have not entered under Purchases.</p>
              <Field label="Loans &amp; other liabilities (₹)">
                <input name="loans" type="number" min="0" step="0.01" key={`ln-${balance.loans}`} defaultValue={balance.loans} />
              </Field>
              <button type="submit" className="primary-btn bs-manual-save">
                Save
              </button>
            </form>
          </details>
        </div>
      </div>
    </TabPageChrome>
  );
}
