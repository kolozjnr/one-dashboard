"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { formatFullDate, formatNumber } from "@/lib/analytics/format";
import { getVisitors, type VisitorRecord, type Website } from "@/lib/analytics/website-data";
import { cn } from "@/lib/utils";
import { SectionHeading } from "./shared";
import { VisitorJourneyPanel } from "./visitor-journey-panel";

type SortKey = "firstSeen" | "sessions" | "pageViews" | "country";

/**
 * Visitors tab — list of anonymous visitors with their session stats.
 * Selecting a row opens the chronological visitor-journey panel.
 */
export function VisitorsTab({ website }: { website: Website }) {
  const visitors = useMemo(() => getVisitors(website.id), [website.id]);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("firstSeen");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<VisitorRecord | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? visitors.filter(
          (visitor) =>
            visitor.id.toLowerCase().includes(q) ||
            visitor.country.toLowerCase().includes(q) ||
            visitor.source.toLowerCase().includes(q),
        )
      : visitors;
    const sorted = [...matched].sort((a, b) => {
      if (sortKey === "country") return a.country.localeCompare(b.country);
      if (sortKey === "firstSeen") return new Date(a.firstSeen).getTime() - new Date(b.firstSeen).getTime();
      return a[sortKey] - b[sortKey];
    });
    return sortDir === "desc" ? sorted.reverse() : sorted;
  }, [visitors, query, sortKey, sortDir]);

  const convertedCount = visitors.filter((visitor) => visitor.converted).length;

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const columns: { key: SortKey; label: string }[] = [
    { key: "firstSeen", label: "First seen" },
    { key: "sessions", label: "Sessions" },
    { key: "pageViews", label: "Page views" },
    { key: "country", label: "Country" },
  ];

  return (
    <div className="space-y-6">
      {/* Summary tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="text-xs font-medium text-faint">Visitors tracked</p>
          <p className="mt-2 text-2xl font-semibold leading-none text-ink">{formatNumber(visitors.length * 4_380)}</p>
          <p className="mt-2 text-[11px] text-ghost">Anonymous IDs in this period</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="text-xs font-medium text-faint">Returning visitors</p>
          <p className="mt-2 text-2xl font-semibold leading-none text-ink">
            {Math.round((visitors.filter((v) => v.sessions > 1).length / visitors.length) * 100)}%
          </p>
          <p className="mt-2 text-[11px] text-ghost">More than one session</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="text-xs font-medium text-faint">Converted visitors</p>
          <p className="mt-2 text-2xl font-semibold leading-none text-green-500">
            {convertedCount} / {visitors.length}
          </p>
          <p className="mt-2 text-[11px] text-ghost">Completed a tracked goal</p>
        </div>
      </div>

      {/* Visitors table */}
      <section className="rounded-lg border border-line bg-surface p-5">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <SectionHeading
            title="Anonymous visitors"
            description="Select a visitor to open their chronological journey."
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search visitor, country, source…"
            aria-label="Search visitors"
            className="w-full max-w-full rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-ghost focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/40 sm:w-64"
          />
        </header>

        <div className="relative w-full overflow-x-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b [&_tr]:border-line">
              <tr>
                <th className="h-10 whitespace-nowrap px-3 text-left text-xs font-medium text-faint">
                  Visitor ID
                </th>
                {columns.map((column) => (
                  <th key={column.key} className="h-10 whitespace-nowrap px-3 text-left text-xs font-medium text-faint">
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      className="inline-flex items-center gap-1 hover:text-ink"
                    >
                      {column.label}
                      <svg
                        viewBox="0 0 12 12"
                        fill="currentColor"
                        className={cn("h-2.5 w-2.5", sortKey === column.key ? "text-brand" : "text-ghost opacity-40")}
                        aria-hidden="true"
                      >
                        {sortKey === column.key && sortDir === "asc" ? (
                          <path d="M6 2l4 5H2z" />
                        ) : (
                          <path d="M6 10L2 5h8z" />
                        )}
                      </svg>
                    </button>
                  </th>
                ))}
                <th className="h-10 whitespace-nowrap px-3 text-left text-xs font-medium text-faint">Source</th>
                <th className="h-10 whitespace-nowrap px-3 text-left text-xs font-medium text-faint">Device</th>
                <th className="h-10 whitespace-nowrap px-3 text-left text-xs font-medium text-faint">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-sm text-faint">
                    No visitors match “{query}”.
                  </td>
                </tr>
              )}
              {rows.map((visitor) => (
                <tr
                  key={visitor.id}
                  onClick={() => setSelected(visitor)}
                  className="cursor-pointer border-b border-line transition-colors last:border-0 hover:bg-sunken/60"
                >
                  <td className="px-3 py-3 align-middle font-mono text-xs text-muted">{visitor.id}</td>
                  <td className="whitespace-nowrap px-3 py-3 align-middle text-sm text-ink">
                    {formatFullDate(new Date(visitor.firstSeen))}
                  </td>
                  <td className="px-3 py-3 align-middle text-sm tabular-nums text-ink">{visitor.sessions}</td>
                  <td className="px-3 py-3 align-middle text-sm tabular-nums text-ink">{visitor.pageViews}</td>
                  <td className="whitespace-nowrap px-3 py-3 align-middle text-sm text-ink">{visitor.country}</td>
                  <td className="whitespace-nowrap px-3 py-3 align-middle text-sm text-muted">{visitor.source}</td>
                  <td className="whitespace-nowrap px-3 py-3 align-middle text-sm text-muted">
                    {visitor.device} · {visitor.browser}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 align-middle">
                    <Badge variant={visitor.converted ? "success" : "neutral"}>
                      {visitor.converted ? "Converted" : "Active"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selected && <VisitorJourneyPanel visitor={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
