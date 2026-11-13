"use client";

import { useAnalytics } from "./analytics-context";
import { ConnectedAppsDropdown } from "./connected-apps-dropdown";
import { DateRangeFilter } from "./date-range-filter";
import { cn } from "@/lib/utils";

/**
 * Compact dashboard toolbar. Horizontal on desktop, wraps (never overflows)
 * on mobile, and stays visually lighter than the widgets it controls.
 */
export function FilterToolbar() {
  const { selectedIds, accounts, loading } = useAnalytics();

  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <ConnectedAppsDropdown />
        <DateRangeFilter />
      </div>

      <p className="flex items-center gap-1.5 text-xs text-faint">
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            loading ? "animate-pulse bg-amber-500" : "bg-green-500",
          )}
        />
        {loading
          ? "Refreshing data…"
          : `${selectedIds.length} of ${accounts.length} sources selected`}
      </p>
    </div>
  );
}
