import { useEffect } from "react";

/**
 * PWA shortcut / install launch: `?action=<key>` deep-links after auth is ready.
 * Strips the query param from the URL without a full navigation.
 *
 * Supported actions:
 *   new_sale        → open New Sale overlay
 *   customers       → navigate to Customers page
 *   loans_given     → navigate to Loans Given page
 *   balance_sheet   → navigate to Accounts (balance sheet) page
 *   products        → navigate to Products (catalogue) page
 *   new_expense     → open New Expense overlay
 */
export function usePwaLaunchActions(authState, setScreen, setPage, openNewSale) {
  useEffect(() => {
    if (authState !== "ready") return;
    const params = new URLSearchParams(window.location.search);
    const action = params.get("action");
    if (!action) return;

    // Strip the query param cleanly without a navigation
    const clean = window.location.pathname + window.location.hash;
    window.history.replaceState({}, "", clean);

    const t = setTimeout(() => {
      switch (action) {
        case "new_sale":
          if (typeof openNewSale === "function") openNewSale();
          else setScreen("newSale");
          break;
        case "customers":
          setScreen(null);
          setPage("customers");
          break;
        case "loans_given":
          setScreen(null);
          setPage("loansGiven");
          break;
        case "balance_sheet":
          setScreen(null);
          setPage("accounts");
          break;
        case "products":
          setScreen(null);
          setPage("products");
          break;
        case "new_expense":
          setScreen("newExpense");
          break;
        default:
          break;
      }
    }, 0);

    return () => clearTimeout(t);
  }, [authState, setScreen, setPage, openNewSale]);
}
