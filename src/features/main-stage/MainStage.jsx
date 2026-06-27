import { Suspense, useState } from "react";
import {
  EXPENSE_CATEGORY_ALL,
  directoryRecordToCustomerEntry,
  directoryRecordToVendorEntry,
  formatMonthLabel,
  getExpenseCategoriesList,
  getOtherIncomeCategoriesList,
  todayStr,
} from "@/domain/index.js";
import { isCloudAuthEnabled } from "@/data/auth/auth.js";
import { RecordPaymentModal, DeleteConfirmModal, ActionConfirmModal, SimpleConfirmModal } from "@/features/app-modals/index.js";
import { WelcomeModal } from "@/features/bootstrap/index.js";
import { MainStageScrollParentContext } from "@/features/main-stage/MainStageScrollContext.jsx";
import { HomeTab } from "@/features/home/index.js";
import {
  LazySalesTab,
  LazyNewSaleScreen,
  LazySaleDetailScreen,
  LazyBranchScreen,
  LazyInventoryTab,
  LazyAccountsOverviewTab,
  LazyBankAccountDetailScreen,
  LazyBankingTab,
  LazyFixedAssetsTab,
  LazyNetWorthScreen,
  LazyCapitalGrowthScreen,
  LazyReportsScreen,
  LazyExpenseDetailScreen,
  LazyAddStockScreen,
  LazyInventoryItemDetailScreen,
  LazyEmiDetailScreen,
  LazyEmiListScreen,
  LazyOtherIncomeScreen,
  LazyNewOtherIncomeScreen,
  LazyOtherIncomeDetailScreen,
  LazyExpenseCategoryScreen,
  LazyExpensesScreen,
  LazyNewExpenseScreen,
  LazySettingsScreen,
  LazyNewCustomerScreen,
  LazyCustomersScreen,
  LazyCustomerDetailScreen,
  LazyReceivablesScreen,
  LazyProductCatalogScreen,
  LazyLedgerScreen,
  LazyCashFlowScreen,
  LazySearchScreen,
  LazyPurchaseDetailScreen,
  LazyPurchasesScreen,
  LazyNewPurchaseScreen,
  LazyNewVendorScreen,
  LazyVendorsScreen,
  LazyVendorDetailScreen,
  LazyPayablesScreen,
  LazyServicingScreen,
} from "@/features/main-stage/lazyMainStageScreens.jsx";

/**
 * Tab routes + toasts live in `.main-stage` (`<main>`). Full-screen overlays and modals are siblings (see fragment below).
 */
export function MainStage(props) {
  const {
    screen,
    page,
    goPage,
    state,
    setScreen,
    setSidebarOpen,
    setSelCustomerName,
    setSelBankAccountId,
    setEditingCustomerId,
    setCustomerEntry,
    setSelVendorName,
    setEditingVendorId,
    setVendorEntry,
    setDelConfirm,
    setPayModal,
    setPayPurchaseModal,
    setPayBankAccountId,
    setPayAmt,
    setActionConfirm,
    requestConfirm,
    kpis,
    kpiSparklines = { revenue: [], netProfit: [], receivables: [] },
    fyStr,
    fyYear,
    fsm,
    balSum,
    businessMonth,
    setBusinessMonth,
    dashSales,
    dashPurchases,
    dashExp,
    dashOtherIncome,
    filteredSales,
    saleView,
    setSaleView,
    searchTerm,
    setSearchTerm,
    showSearch,
    setShowSearch,
    safeSales,
    safeExpenses,
    safeInventory,
    safeOtherIncomes,
    invRows,
    saleStockPickRows = [],
    saleDefaultBranchLabel = "",
    notifications,
    effectiveNotifOpen,
    setNotifOpen,
    payModal,
    payPurchaseModal,
    delConfirm,
    actionConfirm,
    simpleConfirm,
    welcomeOpen,
    payBankAccountId,
    payAmt,
    payDate,
    dismissAlert,
    dismissAllAlerts,
    onNotificationClick,
    notifPerm,
    requestNotifPermission,
    openNewSale,
    openSaleDetail,
    saleDraftResume,
    onResumeSaleDraft,
    onDiscardSaleDraft,
    openNewExpense,
    openNewCustomer,
    openNewVendor,
    openAddStock,
    invItemDetail,
    openInventoryItemDetail,
    openInventoryItemDetailFromSearch,
    closeInventoryItemDetail,
    openNewOtherIncome,
    openNewPurchase,
    openEditPurchase,
    openPurchaseDetail,
    closePurchaseDetail,
    closeNewPurchase,
    selPurchase,
    editingPurchaseId,
    openEditOtherIncome,
    openOtherIncomeDetail,
    closeOtherIncomeDetail,
    openExpenseCategory,
    openSaleDetailFromInvoice,
    saveBranchesList,
    removeBranchById,
    addBank,
    addBankTransfer,
    patchFixed,
    addFixed,
    removeFixed,
    saveFixed,
    patchInventoryProductCategory,
    patchInventoryProductTaxMeta,
    renameInventoryProduct,
    saveOtherBalance,
    saveOwnerCapitalInvested,
    exportBackup,
    importBackupFile,
    requestResetAllData,
    executeCloudSync,
    cloudSyncMeta,
    resolveSyncConflict,
    restoreSyncConflict,
    clearResolvedConflicts,
    darkMode,
    setDarkMode,
    editingSaleId,
    editingCustomerId,
    editingExpenseId,
    editingOtherIncomeId,
    saleEntry,
    updSale,
    emi2,
    emi3,
    emi4,
    customerEntry,
    updCustomer,
    stockEntry,
    updStock,
    purchaseEntry,
    updPurchase,
    expEntry,
    updExp,
    oiEntry,
    updOi,
    addStockBranchInvRows,
    stockCategorySuggestions,
    selCustomerName,
    selExpenseCategory,
    selEmiDetail,
    selSale,
    selEmi,
    selExpense,
    selOtherIncome,
    selBankAccount,
    expensesInSelCategory,
    onSaveSale,
    closeNewSale,
    onSaveCustomer,
    closeNewCustomer,
    vendorEntry,
    updVendor,
    onSaveVendor,
    closeNewVendor,
    editingVendorId,
    selVendorName,
    toggleEmiDuePaid,
    closeSaleDetailNav,
    openEmiDetail,
    closeEmiDetailNav,
    openEditSale,
    openPayModal,
    openPayPurchaseModal,
    onStockProductPick,
    onStockTypeChange,
    onSaveStock,
    closeAddStock,
    editingInventoryId,
    openEditInventoryEntry,
    onSavePurchase,
    closeBankAccountDetail,
    openBankAccountFromSearch,
    openCustomerDetailFromSearch,
    closeCustomerDetailNav,
    openVendorDetailFromSearch,
    closeVendorDetailNav,
    requestDeleteBankActivity,
    patchBank,
    saveBank,
    openExpenseDetail,
    removeBankTransfer,
    onSaveOtherIncome,
    closeNewOtherIncome,
    markServicingComplete,
    undoServicingComplete,
    markServicingWaSent,
    closeExpenseCategory,
    closeExpenseDetail,
    openEditExpense,
    onSaveExpense,
    closeNewExpense,
    onRecordPayment,
    onRecordPurchasePayment,
    setPayDate,
    onDeleteConfirmed,
    confirmImportBackup,
    completeResetAllData,
    dismissWelcome,
    payModalTrapRef,
    delModalTrapRef,
    actionConfirmTrapRef,
    simpleConfirmTrapRef,
    cancelSimpleConfirm,
    onSimpleConfirm,
    swUpdateReady,
    reloadWithNewVersion,
    toast,
    saveSettingsPartial,
    auditEvents = [],
  } = props;

  const [mainScrollEl, setMainScrollEl] = useState(null);

  return (
    <>
      <MainStageScrollParentContext.Provider value={mainScrollEl}>
      <main ref={setMainScrollEl} className="main-stage" tabIndex={-1}>
        {!screen && page === "dashboard" && (
          <HomeTab
            state={state}
            kpis={kpis}
            kpiSparklines={kpiSparklines}
            accountingBasis={props.accountingBasis === "accrual" ? "accrual" : "cash"}
            onToggleAccountingBasis={() =>
              saveSettingsPartial?.({
                accountingBasis: props.accountingBasis === "accrual" ? "cash" : "accrual",
              })
            }
            fyStr={fyStr}
            businessMonth={businessMonth}
            setBusinessMonth={setBusinessMonth}
            dashSales={dashSales}
            dashPurchases={dashPurchases}
            safeSales={safeSales}
            openNewSale={openNewSale}
            openSaleDetail={openSaleDetail}
            saleDraftSummary={saleDraftResume}
            onResumeSaleDraft={onResumeSaleDraft}
            onDiscardSaleDraft={onDiscardSaleDraft}
            openPurchaseDetail={openPurchaseDetail}
            openNewExpense={openNewExpense}
            openSearch={() => setScreen("search")}
            alertItems={notifications}
            notifOpen={effectiveNotifOpen}
            setNotifOpen={setNotifOpen}
            notifBlocked={!!(payModal || payPurchaseModal || delConfirm || actionConfirm || welcomeOpen)}
            onDismissAlert={dismissAlert}
            onDismissAllAlerts={dismissAllAlerts}
            onNotificationClick={onNotificationClick}
            notifPerm={notifPerm}
            onRequestNotifPerm={requestNotifPermission}
          />
        )}
        <Suspense
          fallback={
            <div className="main-stage-suspense-fallback" role="status" aria-live="polite" aria-busy="true">
              <span className="sr-only">Loading…</span>
            </div>
          }
        >
        {!screen && page === "invoices" && (
          <LazySalesTab
            filteredSales={filteredSales}
            saleView={saleView}
            setSaleView={setSaleView}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            showSearch={showSearch}
            setShowSearch={setShowSearch}
            businessMonth={businessMonth}
            setBusinessMonth={setBusinessMonth}
            defaultDueDays={state.settings?.defaultDueDays}
            openNewSale={openNewSale}
            openSaleDetail={openSaleDetail}
            saleDraftSummary={saleDraftResume}
            onResumeSaleDraft={onResumeSaleDraft}
            onDiscardSaleDraft={onDiscardSaleDraft}
            onOpenSidebar={() => setSidebarOpen(true)}
          />
        )}
        {!screen && page === "customers" && (
          <LazyCustomersScreen
            sales={safeSales}
            customerDirectory={state.customerDirectory || []}
            onOpenCustomer={(name) => {
              setSelCustomerName(name);
              setScreen("customerDetail");
            }}
            onAddCustomer={openNewCustomer}
            onOpenSidebar={() => setSidebarOpen(true)}
          />
        )}
        {!screen && page === "vendors" && (
          <LazyVendorsScreen
            purchases={state.purchases || []}
            vendorDirectory={state.vendorDirectory || []}
            onOpenVendor={(name) => {
              setSelVendorName(name);
              setScreen("vendorDetail");
            }}
            onAddVendor={openNewVendor}
            onOpenSidebar={() => setSidebarOpen(true)}
          />
        )}
        {!screen && page === "receivables" && (
          <LazyReceivablesScreen
            sales={safeSales}
            defaultDueDays={state.settings?.defaultDueDays}
            onOpenSale={openSaleDetail}
            onOpenSidebar={() => setSidebarOpen(true)}
          />
        )}
        {!screen && page === "payables" && (
          <LazyPayablesScreen
            purchases={state.purchases || []}
            defaultDueDays={state.settings?.defaultDueDays}
            onOpenPurchase={openPurchaseDetail}
            onOpenSidebar={() => setSidebarOpen(true)}
          />
        )}
        {!screen && page === "emi" && (
          <LazyEmiListScreen
            emiEntries={state.emiEntries}
            onOpenEmi={(emi) => openEmiDetail(emi)}
            onOpenSidebar={() => setSidebarOpen(true)}
          />
        )}
        {!screen && page === "branch" && (
          <LazyBranchScreen
            branches={state.settings?.branches}
            inventoryEntries={safeInventory}
            onSaveBranches={saveBranchesList}
            onRemoveBranch={removeBranchById}
            openAddStock={openAddStock}
            onDeleteBranchProduct={(key, branchId) => setDelConfirm({ type: "inventory-item-branch", id: key, branchId })}
            openInventoryItemDetail={openInventoryItemDetail}
            onOpenSidebar={() => setSidebarOpen(true)}
            requestConfirm={requestConfirm}
          />
        )}
        {!screen && page === "inventory" && (
          <LazyInventoryTab
            invRows={invRows}
            inventoryEntries={safeInventory}
            branches={state.settings?.branches}
            openAddStock={openAddStock}
            onDeleteItem={(key) => setDelConfirm({ type: "inventory-item", id: key })}
            openInventoryItemDetail={openInventoryItemDetail}
            onOpenSidebar={() => setSidebarOpen(true)}
          />
        )}
        {!screen && page === "products" && (
          <LazyProductCatalogScreen
            invRows={invRows}
            onOpenSidebar={() => setSidebarOpen(true)}
            onOpenProduct={(row) => openInventoryItemDetail(row, "")}
          />
        )}
        {!screen && page === "servicing" && (
          <LazyServicingScreen
            sales={safeSales}
            servicingCompletions={state.servicingCompletions || []}
            servicingWaSent={state.servicingWaSent || []}
            businessName={state.settings?.businessName}
            onMarkComplete={markServicingComplete}
            onUndoComplete={undoServicingComplete}
            onMarkWaSent={markServicingWaSent}
            onOpenSale={openSaleDetail}
            onOpenSidebar={() => setSidebarOpen(true)}
          />
        )}
        {!screen && page === "accounts" && (
          <LazyAccountsOverviewTab state={state} saveOtherBalance={saveOtherBalance} onOpenSidebar={() => setSidebarOpen(true)} />
        )}
        {!screen && page === "banking" && (
          <LazyBankingTab
            state={state}
            expenses={state.expenses || []}
            sales={state.sales || []}
            businessMonth={businessMonth}
            onOpenAccount={(id) => {
              setSelBankAccountId(String(id));
              setScreen("bankAccountDetail");
            }}
            onAddAccount={addBank}
            onTransfer={addBankTransfer}
            onOpenSidebar={() => setSidebarOpen(true)}
          />
        )}
        {!screen && page === "fixedAssets" && (
          <LazyFixedAssetsTab
            state={state}
            patchFixed={patchFixed}
            addFixed={addFixed}
            removeFixed={removeFixed}
            saveFixed={saveFixed}
            onOpenSidebar={() => setSidebarOpen(true)}
            requestConfirm={requestConfirm}
          />
        )}
        {!screen && page === "cashFlow" && (
          <LazyCashFlowScreen
            sales={safeSales}
            expenses={safeExpenses}
            inventoryEntries={safeInventory}
            otherIncomes={safeOtherIncomes}
            purchases={state.purchases || []}
            loansGiven={state.loansGiven || []}
            bankTransfers={state.balance?.bankTransfers || []}
            fsm={fsm}
            fyYear={fyYear}
            fyStr={fyStr}
            onOpenSidebar={() => setSidebarOpen(true)}
          />
        )}
        {!screen && page === "ledger" && (
          <LazyLedgerScreen
            sales={safeSales}
            expenses={safeExpenses}
            inventoryEntries={safeInventory}
            otherIncomes={safeOtherIncomes}
            purchases={state.purchases || []}
            loansGiven={state.loansGiven || []}
            bankAccounts={state.balance?.bankAccounts || []}
            fsm={fsm}
            fyYear={fyYear}
            fyStr={fyStr}
            onOpenSale={openSaleDetail}
            onOpenOtherIncome={(id) => openOtherIncomeDetail(id, "ledger")}
            onOpenExpense={(id) => openExpenseDetail(id, "ledger", null)}
            onOpenInventoryEntry={(id) => openEditInventoryEntry(id, "ledger")}
            onOpenPurchase={openPurchaseDetail}
            onOpenSidebar={() => setSidebarOpen(true)}
          />
        )}
        {!screen && page === "expenses" && (
          <LazyExpensesScreen
            expenses={dashExp}
            recurring={state.recurringExpenses || []}
            businessMonth={businessMonth}
            setBusinessMonth={setBusinessMonth}
            onOpenSidebar={() => setSidebarOpen(true)}
            onAdd={() => openNewExpense()}
            onOpenCategory={openExpenseCategory}
            onDeleteRecurring={(id) => setDelConfirm({ type: "recurring", id })}
          />
        )}
        {!screen && page === "otherIncome" && (
          <LazyOtherIncomeScreen
            rows={dashOtherIncome}
            businessMonth={businessMonth}
            setBusinessMonth={setBusinessMonth}
            onOpenSidebar={() => setSidebarOpen(true)}
            onAdd={openNewOtherIncome}
            onOpenRow={(r) => openOtherIncomeDetail(r.id, "list")}
            onDelete={(id) => setDelConfirm({ type: "otherIncome", id })}
          />
        )}
        {!screen && page === "reports" && (
          <LazyReportsScreen
            sales={state.sales}
            expenses={state.expenses}
            otherIncomes={state.otherIncomes || []}
            purchases={state.purchases || []}
            emiEntries={state.emiEntries}
            invRows={invRows}
            balSum={balSum}
            balance={state.balance}
            fsm={fsm}
            fyYear={fyYear}
            fyStr={fyStr}
            businessName={state.settings.businessName}
            accountingBasis={state.settings?.accountingBasis ?? "cash"}
            defaultDueDays={state.settings?.defaultDueDays}
            onOpenSidebar={() => setSidebarOpen(true)}
          />
        )}
        {!screen && page === "capitalGrowth" && (
          <LazyCapitalGrowthScreen
            sales={state.sales}
            expenses={state.expenses}
            otherIncomes={state.otherIncomes || []}
            fsm={fsm}
            fyYear={fyYear}
            fyStr={fyStr}
            onOpenSidebar={() => setSidebarOpen(true)}
          />
        )}
        {!screen && page === "netWorth" && (
          <LazyNetWorthScreen
            balSum={balSum}
            balance={state.balance}
            onSaveInvested={saveOwnerCapitalInvested}
            onOpenSidebar={() => setSidebarOpen(true)}
          />
        )}
        {!screen && page === "settings" && (
          <LazySettingsScreen
            settings={state.settings}
            fyStr={fyStr}
            balSum={balSum}
            kpis={kpis}
            onSavePartial={saveSettingsPartial}
            onOpenSidebar={() => setSidebarOpen(true)}
            onExportBackup={exportBackup}
            onImportBackup={importBackupFile}
            onResetAllData={requestResetAllData}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            cloudSyncEnabled={isCloudAuthEnabled()}
            cloudSyncMeta={cloudSyncMeta}
            onManualCloudSync={executeCloudSync}
            syncConflictQueue={state.syncConflictQueue || []}
            onResolveSyncConflict={resolveSyncConflict}
            onRestoreSyncConflict={restoreSyncConflict}
            onClearResolvedConflicts={clearResolvedConflicts}
          />
        )}
        {!screen && page === "purchases" && (
          <LazyPurchasesScreen
            purchases={state.purchases || []}
            businessMonth={businessMonth}
            setBusinessMonth={setBusinessMonth}
            fsm={fsm}
            fyYear={fyYear}
            onNew={openNewPurchase}
            onOpenPurchase={openPurchaseDetail}
            onOpenSidebar={() => setSidebarOpen(true)}
          />
        )}
        </Suspense>
      </main>
      </MainStageScrollParentContext.Provider>

      <Suspense
        fallback={
          <div className="overlay-suspense-fallback" role="status" aria-live="polite" aria-busy="true">
            <span className="sr-only">Loading…</span>
          </div>
        }
      >
      {screen === "newSale" && (
        <LazyNewSaleScreen
          isEdit={!!editingSaleId}
          editingSaleId={editingSaleId}
          entry={saleEntry}
          upd={updSale}
          emi2={emi2}
          emi3={emi3}
          emi4={emi4}
          financeCompanies={state.settings.financeCompanies}
          sales={safeSales}
          customerDirectory={state.customerDirectory || []}
          bankAccounts={state.balance?.bankAccounts || []}
          autoStockOutOnSale={!!state.settings?.autoStockOutOnSale}
          stockPickRows={saleStockPickRows}
          defaultBranchLabel={saleDefaultBranchLabel}
          invRows={invRows}
          invoicePrefix={state.settings?.invoicePrefix}
          billOfSupplyPrefix={state.settings?.billOfSupplyPrefix}
          invoiceNextNumber={state.settings?.invoiceNextNumber}
          billOfSupplyNextNumber={state.settings?.billOfSupplyNextNumber}
          defaultProductHsn={state.settings?.defaultProductHsn}
          defaultProductGstRate={state.settings?.defaultProductGstRate}
          gstEnabled={state.settings?.gstEnabled}
          onSubmit={onSaveSale}
          onClose={closeNewSale}
          draftSavedAt={!editingSaleId ? state.settings?.saleDraft?.savedAt : null}
          onDiscardDraft={!editingSaleId ? onDiscardSaleDraft : undefined}
        />
      )}
      {screen === "newCustomer" && (
        <LazyNewCustomerScreen
          isEdit={!!editingCustomerId}
          entry={customerEntry}
          upd={updCustomer}
          onSubmit={onSaveCustomer}
          onClose={closeNewCustomer}
        />
      )}
      {screen === "newVendor" && (
        <LazyNewVendorScreen
          isEdit={!!editingVendorId}
          entry={vendorEntry}
          upd={updVendor}
          onSubmit={onSaveVendor}
          onClose={closeNewVendor}
        />
      )}
      {screen === "emiDetail" && selEmiDetail && (
        <LazyEmiDetailScreen
          emi={selEmiDetail}
          businessName={state.settings?.businessName || ""}
          customerPhone={(safeSales || []).find((s) => String(s?.invoiceNo || "") === String(selEmiDetail?.invoiceNo || ""))?.customerNo1 || ""}
          customerPhone2={(safeSales || []).find((s) => String(s?.invoiceNo || "") === String(selEmiDetail?.invoiceNo || ""))?.customerNo2 || ""}
          onToggleDuePaid={toggleEmiDuePaid}
          onClose={closeEmiDetailNav}
          onOpenInvoice={openSaleDetailFromInvoice}
        />
      )}
      {screen === "saleDetail" && selSale && (
        <LazySaleDetailScreen
          sale={selSale}
          emi={selEmi}
          defaultDueDays={state.settings?.defaultDueDays}
          auditEvents={auditEvents.filter((e) => e && e.entityType === "sales" && String(e.recordId) === String(selSale.id))}
          bankAccounts={state.balance?.bankAccounts || []}
          invoiceCompany={state.settings}
          servicingCompletions={state.servicingCompletions || []}
          businessName={state.settings?.businessName || ""}
          onClose={closeSaleDetailNav}
          onEdit={() => openEditSale(selSale, selEmi)}
          onPayment={() => openPayModal(selSale.id)}
          onDelete={() => setDelConfirm({ type: "sale", id: selSale.id })}
          onOpenServicing={() => {
            closeSaleDetailNav();
            goPage("servicing");
          }}
          onMarkServicingComplete={markServicingComplete}
          onUndoServicingComplete={undoServicingComplete}
        />
      )}
      {screen === "purchaseDetail" && selPurchase && (
        <LazyPurchaseDetailScreen
          purchase={selPurchase}
          auditEvents={auditEvents.filter((e) => e && e.entityType === "purchases" && String(e.recordId) === String(selPurchase.id))}
          branches={state.settings?.branches}
          bankAccounts={state.balance?.bankAccounts || []}
          printCompany={state.settings}
          onClose={closePurchaseDetail}
          onEdit={() => openEditPurchase(selPurchase)}
          onRecordPayment={() => openPayPurchaseModal(selPurchase.id)}
          onRemovePayment={(paymentEntryId) =>
            setDelConfirm({
              type: "purchasePayment",
              purchaseId: selPurchase.id,
              paymentEntryId,
            })
          }
          onDelete={() => setDelConfirm({ type: "purchase", id: selPurchase.id })}
        />
      )}
      {screen === "inventoryItemDetail" && invItemDetail && (
        <LazyInventoryItemDetailScreen
          key={`${invItemDetail.itemKey}|${invItemDetail.branchId || ""}`}
          itemKey={invItemDetail.itemKey}
          displayName={invItemDetail.displayName}
          branchId={invItemDetail.branchId}
          inventoryEntries={safeInventory}
          branches={state.settings?.branches}
          stockCategorySuggestions={stockCategorySuggestions}
          onSaveProductCategory={patchInventoryProductCategory}
          onSaveProductTaxMeta={patchInventoryProductTaxMeta}
          gstEnabled={state.settings?.gstEnabled}
          onRenameProduct={renameInventoryProduct}
          onClose={closeInventoryItemDetail}
          onEditEntry={(id) => openEditInventoryEntry(id, "inventoryItem")}
          openAddStock={(type, item, br) => openAddStock(type, item, br, "inventoryItem")}
        />
      )}
      {screen === "addStock" && (
        <LazyAddStockScreen
          entry={stockEntry}
          upd={updStock}
          invRows={invRows}
          branchInvRows={addStockBranchInvRows}
          branches={state.settings?.branches}
          bankAccounts={state.balance?.bankAccounts || []}
          stockCategorySuggestions={stockCategorySuggestions}
          onProductPick={onStockProductPick}
          onTypeChange={onStockTypeChange}
          onSubmit={onSaveStock}
          onClose={closeAddStock}
          isEdit={!!editingInventoryId}
          onRequestDelete={
            editingInventoryId
              ? () => setDelConfirm({ type: "stock", id: editingInventoryId })
              : undefined
          }
        />
      )}
      {screen === "newPurchase" && (
        <LazyNewPurchaseScreen
          key={editingPurchaseId || "new-purchase"}
          isEdit={!!editingPurchaseId}
          entry={purchaseEntry}
          upd={updPurchase}
          branches={state.settings?.branches}
          bankAccounts={state.balance?.bankAccounts || []}
          purchases={state.purchases || []}
          vendorDirectory={state.vendorDirectory || []}
          invRows={invRows}
          onSubmit={onSavePurchase}
          onClose={closeNewPurchase}
        />
      )}
      {screen === "bankAccountDetail" && selBankAccount && (
        <LazyBankAccountDetailScreen
          account={selBankAccount}
          allBankAccounts={state.balance?.bankAccounts || []}
          bankTransfers={state.balance?.bankTransfers || []}
          expenses={state.expenses || []}
          sales={state.sales || []}
          inventoryEntries={state.inventoryEntries || []}
          otherIncomes={state.otherIncomes || []}
          purchases={state.purchases || []}
          loansGiven={state.loansGiven || []}
          activityMonthKey={
            businessMonth && String(businessMonth).length >= 7 ? String(businessMonth).slice(0, 7) : undefined
          }
          onOpenPurchase={openPurchaseDetail}
          onClose={closeBankAccountDetail}
          onPatch={(patch) => patchBank(selBankAccount.id, patch)}
          onSave={saveBank}
          onRequestRemove={() => setDelConfirm({ type: "bankAccount", id: selBankAccount.id })}
          onOpenExpense={(id) => openExpenseDetail(id, "banking", null)}
          onOpenOtherIncome={(id) => openOtherIncomeDetail(id, "banking")}
          onOpenSale={(saleId) => openSaleDetail(saleId, "banking")}
          onOpenInventoryEntry={(id) => openEditInventoryEntry(id, "banking")}
          onRequestDeleteActivity={requestDeleteBankActivity}
          onDeleteTransfer={removeBankTransfer}
          requestConfirm={requestConfirm}
        />
      )}
      {screen === "newOtherIncome" && (
        <LazyNewOtherIncomeScreen
          isEdit={!!editingOtherIncomeId}
          entry={oiEntry}
          upd={updOi}
          incomeCategories={getOtherIncomeCategoriesList(state.settings)}
          bankAccounts={state.balance?.bankAccounts || []}
          onSubmit={onSaveOtherIncome}
          onClose={closeNewOtherIncome}
        />
      )}
      {screen === "otherIncomeDetail" && selOtherIncome && (
        <LazyOtherIncomeDetailScreen
          row={selOtherIncome}
          bankAccounts={state.balance?.bankAccounts || []}
          onClose={closeOtherIncomeDetail}
          onEdit={() => openEditOtherIncome(selOtherIncome, "detail")}
          onDelete={() => setDelConfirm({ type: "otherIncome", id: selOtherIncome.id })}
        />
      )}
      {screen === "expenseCategory" && selExpenseCategory && (
        <LazyExpenseCategoryScreen
          category={selExpenseCategory}
          expenses={expensesInSelCategory}
          businessMonth={businessMonth}
          setBusinessMonth={setBusinessMonth}
          periodHint={businessMonth ? formatMonthLabel(businessMonth) : `FY ${fyStr}`}
          onClose={closeExpenseCategory}
          onOpenDetail={(id) => openExpenseDetail(id, "expenseCategory", selExpenseCategory)}
          onAdd={() =>
            openNewExpense(
              selExpenseCategory === EXPENSE_CATEGORY_ALL
                ? { returnTo: "expenseCategory" }
                : { presetCategory: selExpenseCategory, returnTo: "expenseCategory" }
            )
          }
          onDelete={(id) => setDelConfirm({ type: "expense", id })}
        />
      )}
      {screen === "expenseDetail" && selExpense && (
        <LazyExpenseDetailScreen
          expense={selExpense}
          recurringRule={(state.recurringExpenses || []).find((r) => r && r.id === selExpense.recurringFromId)}
          bankAccounts={state.balance?.bankAccounts || []}
          onClose={closeExpenseDetail}
          onEdit={() => openEditExpense(selExpense)}
          onDelete={() => setDelConfirm({ type: "expense", id: selExpense.id })}
        />
      )}
      {screen === "newExpense" && (
        <LazyNewExpenseScreen
          isEdit={!!editingExpenseId}
          entry={expEntry}
          upd={updExp}
          expenseCategories={getExpenseCategoriesList(state.settings)}
          bankAccounts={state.balance?.bankAccounts || []}
          onSubmit={onSaveExpense}
          onClose={closeNewExpense}
        />
      )}
      {screen === "customerDetail" && (
        <LazyCustomerDetailScreen
          customerName={selCustomerName}
          sales={safeSales}
          defaultDueDays={state.settings?.defaultDueDays}
          customerDirectory={state.customerDirectory || []}
          onClose={closeCustomerDetailNav}
          onOpenSale={openSaleDetail}
          onEditDirectoryCustomer={(rec) => {
            setEditingCustomerId(rec.id);
            setCustomerEntry(directoryRecordToCustomerEntry(rec));
            setScreen("newCustomer");
          }}
          onDeleteDirectoryCustomer={(dirId) => setDelConfirm({ type: "customerDirectory", id: dirId })}
        />
      )}
      {screen === "vendorDetail" && (
        <LazyVendorDetailScreen
          vendorName={selVendorName}
          purchases={state.purchases || []}
          vendorDirectory={state.vendorDirectory || []}
          onClose={closeVendorDetailNav}
          onOpenPurchase={openPurchaseDetail}
          onEditDirectoryVendor={(rec) => {
            setEditingVendorId(rec.id);
            setVendorEntry(directoryRecordToVendorEntry(rec));
            setScreen("newVendor");
          }}
          onDeleteDirectoryVendor={(dirId) => setDelConfirm({ type: "vendorDirectory", id: dirId })}
        />
      )}
      {screen === "search" && (
        <LazySearchScreen
          sales={safeSales}
          purchases={state.purchases || []}
          expenses={safeExpenses}
          otherIncomes={safeOtherIncomes}
          invRows={invRows}
          customerDirectory={state.customerDirectory || []}
          vendorDirectory={state.vendorDirectory || []}
          emiEntries={state.emiEntries || []}
          bankAccounts={state.balance?.bankAccounts || []}
          onClose={() => setScreen(null)}
          onOpenSale={(id) => openSaleDetail(id, "search")}
          onOpenPurchase={(id) => openPurchaseDetail(id, "search")}
          onOpenExpense={(id) => openExpenseDetail(id, "search")}
          onOpenOtherIncome={(id) => openOtherIncomeDetail(id, "search")}
          onOpenProduct={openInventoryItemDetailFromSearch}
          onOpenCustomer={openCustomerDetailFromSearch}
          onOpenVendor={openVendorDetailFromSearch}
          onOpenEmi={(id) => openEmiDetail(id, "search")}
          onOpenBankAccount={openBankAccountFromSearch}
        />
      )}
      </Suspense>

      {payModal || payPurchaseModal ? (
        <RecordPaymentModal
          modalRef={payModalTrapRef}
          sale={payModal ? state.sales.find((x) => x.id === payModal) ?? null : null}
          purchase={payPurchaseModal ? state.purchases?.find((x) => x.id === payPurchaseModal) ?? null : null}
          bankAccounts={state.balance?.bankAccounts || []}
          payBankAccountId={payBankAccountId}
          onPayBankAccountChange={setPayBankAccountId}
          payAmt={payAmt}
          onPayAmtChange={setPayAmt}
          payDate={payDate}
          onPayDateChange={setPayDate}
          onSubmit={payPurchaseModal ? onRecordPurchasePayment : onRecordPayment}
          onDismiss={() => {
            setPayModal(null);
            setPayPurchaseModal(null);
            setPayBankAccountId("");
            setPayDate(todayStr());
          }}
        />
      ) : null}

      {delConfirm ? (
        <DeleteConfirmModal modalRef={delModalTrapRef} onCancel={() => setDelConfirm(null)} onConfirm={onDeleteConfirmed} />
      ) : null}

      {actionConfirm ? (
        <ActionConfirmModal
          modalRef={actionConfirmTrapRef}
          actionConfirm={actionConfirm}
          onCancel={() => setActionConfirm(null)}
          onConfirmImportBackup={confirmImportBackup}
          onContinueResetStep2={() =>
            setActionConfirm((prev) => ({
              kind: "reset",
              step: 2,
              backupDownloaded: !!prev?.backupDownloaded,
            }))
          }
          onDownloadBackupBeforeReset={() => {
            exportBackup();
            setActionConfirm((prev) =>
              prev?.kind === "reset" ? { ...prev, backupDownloaded: true } : prev,
            );
          }}
          onCompleteReset={completeResetAllData}
        />
      ) : null}

      {simpleConfirm ? (
        <SimpleConfirmModal
          modalRef={simpleConfirmTrapRef}
          confirm={simpleConfirm}
          onCancel={cancelSimpleConfirm}
          onConfirm={onSimpleConfirm}
        />
      ) : null}

      {welcomeOpen && <WelcomeModal onDismiss={dismissWelcome} />}

      {swUpdateReady && (
        <div className="sw-update-banner" role="status" aria-live="polite">
          <span>Update available</span>
          <button type="button" className="sw-update-btn" onClick={reloadWithNewVersion}>
            Reload
          </button>
        </div>
      )}
      {toast && <div className="toast" role="alert">{toast}</div>}
    </>
  );
}
