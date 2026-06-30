import { useEffect, useState } from "react";
import { defaultReportPeriod } from "@/domain/reportPeriod.js";
import { TabPageChrome } from "@/shared/ui/layout/AppChrome.jsx";
import { ReportsHub } from "./ReportsHub.jsx";
import { ReportDetailScreen } from "./ReportDetailScreen.jsx";

export function ReportsScreen({
  sales = [],
  expenses = [],
  otherIncomes = [],
  purchases = [],
  inventoryEntries = [],
  invRows = [],
  balSum = {},
  balance = {},
  settings = {},
  fsm,
  fyYear,
  fyStr,
  businessName,
  accountingBasis = "cash",
  onOpenSidebar,
}) {
  const [activeReportId, setActiveReportId] = useState(null);
  const [period, setPeriod] = useState(() => defaultReportPeriod(fsm, fyYear));

  useEffect(() => {
    setPeriod((prev) => {
      if (prev?.mode !== "fy") return prev;
      return defaultReportPeriod(fsm, fyYear);
    });
  }, [fsm, fyYear]);

  const shared = {
    sales,
    expenses,
    otherIncomes,
    purchases,
    inventoryEntries,
    invRows,
    balSum,
    bankTransfers: balance?.bankTransfers || [],
    settings,
    fsm,
    fyYear,
    fyStr,
    businessName,
    accountingBasis,
    period,
    onPeriodChange: setPeriod,
  };

  return (
    <TabPageChrome title={activeReportId ? "Report" : "Reports"} onOpenSidebar={onOpenSidebar} className="tab-page--reports">
      {activeReportId ? (
        <ReportDetailScreen reportId={activeReportId} onBack={() => setActiveReportId(null)} {...shared} />
      ) : (
        <ReportsHub {...shared} onSelectReport={setActiveReportId} />
      )}
    </TabPageChrome>
  );
}
