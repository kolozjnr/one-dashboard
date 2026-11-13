"use client";

import { useState } from "react";
import { useAnalytics } from "./analytics-context";
import { AppLogo } from "@/components/app-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dropdown } from "@/components/ui/dropdown";
import { formatRelativeTime } from "@/lib/analytics/format";
import { PLATFORMS } from "@/lib/analytics/registry";
import type { ConnectionStatus } from "@/lib/analytics/types";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<ConnectionStatus, { label: string; variant: "success" | "warning" | "danger" }> = {
  connected: { label: "Connected", variant: "success" },
  syncing: { label: "Syncing", variant: "warning" },
  error: { label: "Error", variant: "danger" },
};

/**
 * "Connected Apps" dropdown — lists only the accounts the user connected,
 * with logo, name, account, status and last sync. Search + multi-select;
 * the selection drives every widget on the dashboard.
 */
export function ConnectedAppsDropdown() {
  const {
    accounts,
    selectedIds,
    toggleAccount,
    selectAll,
    clearSelection,
    loading,
  } = useAnalytics();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const normalized = query.trim().toLowerCase();
  const visible = accounts.filter((account) => {
    const platform = PLATFORMS[account.platformId];
    return (
      !normalized ||
      platform.label.toLowerCase().includes(normalized) ||
      account.accountName.toLowerCase().includes(normalized)
    );
  });

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      panelClassName="w-[21rem] max-w-[calc(100vw-2rem)]"
      trigger={
        <Button variant="outline" className="justify-between gap-3">
          <span className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 7h16M4 12h16M4 17h10"
              />
            </svg>
            Connected Apps
            <span className="rounded-full bg-brand/10 px-1.5 py-0.5 text-[11px] font-semibold text-brand">
              {selectedIds.length}
            </span>
          </span>
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-ghost">
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </Button>
      }
    >
      {open && (
        <div className="flex max-h-[24rem] flex-col">
          {/* Search */}
          <div className="border-b border-line p-2">
            <div className="relative">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ghost"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search connected apps"
                className="w-full rounded-md border border-line bg-sunken py-1.5 pl-8 pr-3 text-sm text-ink placeholder:text-ghost focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>
          </div>

          {/* Selection controls */}
          <div className="flex items-center justify-between border-b border-line px-3 py-2 text-xs">
            <span className="text-faint">
              {selectedIds.length} of {accounts.length} selected
            </span>
            <span className="flex gap-3">
              <button
                type="button"
                onClick={selectAll}
                className="font-medium text-brand hover:underline"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="font-medium text-faint hover:underline"
              >
                Clear
              </button>
            </span>
          </div>

          {/* Accounts */}
          <ul className="flex-1 overflow-y-auto">
            {visible.map((account) => {
              const platform = PLATFORMS[account.platformId];
              const checked = selectedIds.includes(account.id);
              const status = STATUS_LABEL[account.status];
              return (
                <li key={account.id}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-start gap-2.5 px-3 py-2.5 transition-colors hover:bg-sunken",
                      loading && "opacity-60",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleAccount(account.id)}
                      ariaLabel={`Select ${platform.label} ${account.accountName}`}
                      className="mt-0.5"
                    />
                    <AppLogo name={platform.label} domain={platform.domain} className="h-6 w-6" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-ink">
                          {platform.label}
                        </span>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </span>
                      <span className="mt-0.5 flex items-center justify-between gap-2">
                        <span className="truncate text-xs text-faint">{account.accountName}</span>
                        <span className="shrink-0 text-[11px] text-ghost">
                          {formatRelativeTime(account.lastSyncAt)}
                        </span>
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
            {visible.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-faint">
                No connected apps match &quot;{query}&quot;
              </li>
            )}
          </ul>
        </div>
      )}
    </Dropdown>
  );
}
