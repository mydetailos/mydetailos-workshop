/** Favourite report href ↔ legacy localStorage key maps + migration helpers. */

export const REPORT_FAVOURITE_EVENT = "mydetailos-report-favourite";

/** Special key: Balance Sheet previously lived in the ledger store. */
export const BALANCE_SHEET_FAV_MARKER = "__balance_sheet_store__";

const BALANCE_SHEET_LOCAL_KEY = "mydetailos-balance-sheet-favourite";

/** href → legacy localStorage key (or balance-sheet marker). */
export const REPORT_FAVOURITE_KEY_BY_HREF: Record<string, string> = {
  "/reports/finance/balance-sheet": BALANCE_SHEET_FAV_MARKER,
  "/reports/finance/profit-loss": "mydetailos-pl-favourite",
  "/reports/gst/gstr-1-sales": "mydetailos-gstr1-favourite",
  "/reports/gst/gstr-2-purchase": "mydetailos-gstr2-favourite",
  "/reports/gst/gstr-3b": "mydetailos-gstr3b-favourite",
  "/reports/gst/gst-purchase-hsn": "mydetailos-gst-purchase-hsn-favourite",
  "/reports/gst/gst-sales-hsn": "mydetailos-gst-sales-hsn-favourite",
  "/reports/gst/hsn-wise-sales-summary": "mydetailos-hsn-wise-sales-favourite",
  "/reports/gst/tds-payable": "mydetailos-tds-payable-fav",
  "/reports/gst/tds-receivable": "mydetailos-tds-receivable-fav",
  "/reports/gst/tcs-payable": "mydetailos-tcs-payable-fav",
  "/reports/gst/tcs-receivable": "mydetailos-tcs-receivable-fav",
  "/reports/sales-summary-staff": "mydetailos-sales-staff-favourite",
  "/reports/analytics": "mydetailos-analytics-favourite",
  "/reports/transaction/bill-wise-profit": "mydetailos-bill-wise-profit-fav",
  "/reports/transaction/cash-bank": "mydetailos-cash-bank-fav",
  "/reports/transaction/daybook": "mydetailos-daybook-fav",
  "/reports/transaction/expense-category": "mydetailos-expense-cat-fav",
  "/reports/transaction/expense-transaction": "mydetailos-expense-txn-fav",
  "/reports/transaction/purchase-summary": "mydetailos-purchase-summary-fav",
  "/reports/item/by-party": "mydetailos-item-by-party-fav",
  "/reports/item/sales-purchase-summary": "mydetailos-item-sp-summary-fav",
  "/reports/item/low-stock-summary": "mydetailos-low-stock-fav",
  "/reports/item/rate-list": "mydetailos-rate-list-fav",
  "/reports/item/stock-detail": "mydetailos-stock-detail-fav",
  "/reports/item/stock-summary": "mydetailos-stock-summary-fav",
  "/reports/party/receivable-ageing": "mydetailos-ageing-fav",
  "/reports/party/by-item": "mydetailos-party-by-item-fav",
  "/reports/party/ledger": "mydetailos-party-ledger-fav",
  "/reports/party/party-wise-outstanding": "mydetailos-party-outstanding-fav",
  "/reports/party/sales-summary-category": "mydetailos-sales-cat-wise-fav",
  "/reports/hr-attendance": "mydetailos-hr-attendance-favourite",
  "/reports/hr-leave": "mydetailos-hr-leave-favourite",
  "/reports/hr-payroll": "mydetailos-hr-payroll-favourite",
  "/reports/hr-rewards": "mydetailos-hr-rewards-favourite",

};

/** Reverse map: storage key → href */
export const REPORT_HREF_BY_FAVOURITE_KEY: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const [href, key] of Object.entries(REPORT_FAVOURITE_KEY_BY_HREF)) {
    out[key] = href;
  }
  out[BALANCE_SHEET_LOCAL_KEY] = "/reports/finance/balance-sheet";
  return out;
})();

export function notifyReportFavouritesChanged(href?: string, value?: boolean): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(REPORT_FAVOURITE_EVENT, { detail: { href, value } })
  );
}

export function getReportFavouriteStorageKey(href: string): string | null {
  return REPORT_FAVOURITE_KEY_BY_HREF[href] ?? null;
}

export function getReportHrefForFavouriteKey(storageKey: string): string | null {
  if (storageKey === BALANCE_SHEET_FAV_MARKER) {
    return "/reports/finance/balance-sheet";
  }
  return REPORT_HREF_BY_FAVOURITE_KEY[storageKey] ?? null;
}

function readLocalFavourite(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

/** Collect favourited hrefs from legacy per-report localStorage flags (one-time migrate). */
export function collectLocalFavouriteHrefs(): string[] {
  if (typeof window === "undefined") return [];
  const hrefs: string[] = [];
  const seen = new Set<string>();
  for (const [href, key] of Object.entries(REPORT_FAVOURITE_KEY_BY_HREF)) {
    const localKey = key === BALANCE_SHEET_FAV_MARKER ? BALANCE_SHEET_LOCAL_KEY : key;
    if (readLocalFavourite(localKey) && !seen.has(href)) {
      seen.add(href);
      hrefs.push(href);
    }
  }
  return hrefs;
}

export function shouldMigrateLocalFavourites(userId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(`mydetailos-fav-migrated-${userId}`) !== "1";
  } catch {
    return false;
  }
}

export function markLocalFavouritesMigrated(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`mydetailos-fav-migrated-${userId}`, "1");
  } catch {
    /* ignore */
  }
}
