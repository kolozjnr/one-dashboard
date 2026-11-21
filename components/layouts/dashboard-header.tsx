"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { CONNECTED_ACCOUNTS } from "@/lib/analytics/mock-data";
import { PLATFORMS } from "@/lib/analytics/registry";

/**
 * Dashboard top bar — ported from dashboard/header.blade.php and made
 * responsive: the search box flexes (never overflows), secondary controls
 * collapse on small screens, and the previously decorative search input is
 * now a working combobox over the app's pages and connected accounts.
 */

interface SearchTarget {
  id: string;
  label: string;
  /** Grouped under "Pages" or "Sources" in the results panel. */
  group: "Pages" | "Sources";
  href: string;
  hint?: string;
}

const NAV_ITEMS: { href: string; label: string; keywords: string }[] = [
  { href: "/dashboard", label: "Dashboard", keywords: "overview home kpi widgets" },
  { href: "/source", label: "Source", keywords: "add data connect" },
  { href: "/connection", label: "Connections", keywords: "connected apps accounts" },
  { href: "/analytics", label: "Website Analytics", keywords: "traffic pages visitors realtime" },
  { href: "/audience", label: "Audience Insights", keywords: "demographics followers countries" },
  { href: "/compare", label: "Compare", keywords: "platforms benchmark" },
  { href: "/reports", label: "Reports", keywords: "export generate csv pdf" },
  { href: "/performance", label: "Performance", keywords: "ads campaigns" },
  { href: "/user", label: "Users", keywords: "team members" },
  { href: "/billing", label: "Billing", keywords: "plan invoice subscription" },
  { href: "/support", label: "Support", keywords: "help contact" },
  { href: "/settings", label: "Settings", keywords: "preferences" },
  { href: "/profile", label: "Profile", keywords: "account avatar" },
];

export function DashboardHeader() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const normalized = query.trim().toLowerCase();

  // Close the results panel on outside click (Escape handled on the input).
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const results = useMemo<SearchTarget[]>(() => {
    if (!normalized) return [];
    const pages: SearchTarget[] = NAV_ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(normalized) ||
        item.keywords.includes(normalized),
    ).map((item) => ({
      id: item.href,
      label: item.label,
      group: "Pages",
      href: item.href,
    }));

    const sources: SearchTarget[] = CONNECTED_ACCOUNTS.filter((account) => {
      const platform = PLATFORMS[account.platformId];
      return (
        platform.label.toLowerCase().includes(normalized) ||
        account.accountName.toLowerCase().includes(normalized)
      );
    }).map((account) => {
      const platform = PLATFORMS[account.platformId];
      return {
        id: account.id,
        label: platform.label,
        group: "Sources",
        href: "/connection",
        hint: account.accountName,
      };
    });

    return [...pages, ...sources].slice(0, 8);
  }, [normalized]);

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  const grouped = {
    Pages: results.filter((item) => item.group === "Pages"),
    Sources: results.filter((item) => item.group === "Sources"),
  };

  return (
    <div className="flex h-12 w-full items-center justify-between gap-2 border-b border-line bg-surface px-3 sm:gap-4 sm:px-4">
      {/* Search (flexes to fill; never overflows the bar) */}
      <div ref={containerRef} className="relative min-w-0 flex-1 sm:max-w-xs">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ghost"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
            if (event.key === "Enter" && results.length > 0) go(results[0].href);
          }}
          placeholder="Search…"
          aria-label="Search pages and connected sources"
          className="h-8 w-full rounded-lg border border-line pl-8 pr-3 text-sm text-ink placeholder:text-ghost focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/40"
        />

        {open && normalized && (
          <div
            role="listbox"
            aria-label="Search results"
            className="absolute left-0 top-full z-50 mt-1 max-h-80 w-72 max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-lg border border-line bg-surface shadow-xl"
          >
            {results.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-faint">
                No matches for “{query}”.
              </p>
            ) : (
              <>
                {(["Pages", "Sources"] as const).map(
                  (group) =>
                    grouped[group].length > 0 && (
                      <div key={group}>
                        <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-ghost">
                          {group}
                        </p>
                        <ul>
                          {grouped[group].map((item) => (
                            <li key={`${item.group}-${item.id}`}>
                              <button
                                type="button"
                                onClick={() => go(item.href)}
                                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-sunken"
                              >
                                <span className="min-w-0">
                                  <span className="block truncate text-ink">{item.label}</span>
                                  {item.hint && (
                                    <span className="block truncate text-xs text-faint">
                                      {item.hint}
                                    </span>
                                  )}
                                </span>
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                  className="h-3.5 w-3.5 shrink-0 text-ghost"
                                  aria-hidden="true"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M9 5l7 7-7 7"
                                  />
                                </svg>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ),
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Right section — secondary controls collapse on small screens */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        {/* Demo toggle (hidden below sm so the bar never overflows) */}
        <div className="hidden items-center gap-2 sm:flex">
          <label className="relative inline-flex cursor-pointer items-center">
            <input type="checkbox" className="sr-only peer" aria-label="Live updates" />
            <div className="peer h-5 w-9 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:duration-300 after:content-[''] peer-checked:bg-red-500 peer-checked:after:translate-x-full dark:bg-gray-600"></div>
          </label>
          <span className="text-sm text-muted">Live</span>
        </div>

        <ThemeToggle className="h-8 w-8 text-faint hover:bg-sunken" iconClassName="h-5 w-5" />

        {/* Notification Icon */}
        <button
          type="button"
          aria-label="Notifications"
          className="flex h-8 w-8 items-center justify-center rounded-full text-faint transition-colors hover:bg-sunken"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </button>

        {/* User Icon */}
        <button
          type="button"
          aria-label="Account"
          className="flex h-8 w-8 items-center justify-center rounded-full text-faint transition-colors hover:bg-sunken"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
