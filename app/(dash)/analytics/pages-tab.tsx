"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TableBody, TableCell, TableHead, TableRow } from "@/components/ui/table";
import { formatDuration, formatNumber, formatPercent } from "@/lib/analytics/format";
import { getPageRows, type PageRow, type Website } from "@/lib/analytics/website-data";
import { cn } from "@/lib/utils";
import { ChartTooltip, SectionHeading } from "./shared";

type SortKey = "path" | "views" | "uniqueVisitors" | "avgTime" | "bounceRate" | "exitRate" | "conversions";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "path", label: "Page URL" },
  { key: "views", label: "Total Views" },
  { key: "uniqueVisitors", label: "Unique Visitors" },
  { key: "avgTime", label: "Avg. Time on Page" },
  { key: "bounceRate", label: "Bounce Rate" },
  { key: "exitRate", label: "Exit Rate" },
  { key: "conversions", label: "Conversions" },
];

/**
 * Pages tab — sortable, searchable page-performance table plus a bar chart
 * of the most visited pages.
 */
export function PagesTab({ website }: { website: Website }) {
  const rows = useMemo(() => getPageRows(website.id), [website.id]);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("views");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? rows.filter((row) => row.path.toLowerCase().includes(q) || row.title.toLowerCase().includes(q))
      : rows;
    const sorted = [...matched].sort((a, b) => compare(a, b, sortKey));
    return sortDir === "desc" ? sorted.reverse() : sorted;
  }, [rows, query, sortKey, sortDir]);

  const topPages = useMemo(
    () =>
      [...rows]
        .sort((a, b) => b.views - a.views)
        .slice(0, 8)
        .map((row) => ({ label: row.path, views: row.views })),
    [rows],
  );

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "path" ? "asc" : "desc");
    }
  };

  return (
    <div className="space-y-6">
      {/* Most visited pages chart */}
      <section className="rounded-lg border border-line bg-surface p-5">
        <header className="mb-4">
          <SectionHeading title="Most visited pages" description="Top 8 pages by total views" />
        </header>
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topPages} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={(value: number) => formatNumber(value)}
                tick={{ fontSize: 11, fill: "var(--faint)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--line)" }}
              />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--faint)" }}
                tickLine={false}
                axisLine={false}
                width={150}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fillOpacity: 0.08 }} />
              <Bar dataKey="views" name="Page views" fill="#ff5c39" radius={[0, 4, 4, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Page performance table */}
      <section className="rounded-lg border border-line bg-surface p-5">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <SectionHeading
            title="Page performance"
            description={`${filtered.length} of ${rows.length} pages`}
          />
          <div className="relative">
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ghost"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.45 4.35l4.1 4.1a1 1 0 01-1.41 1.41l-4.1-4.1A7 7 0 012 9z"
                clipRule="evenodd"
              />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search pages…"
              aria-label="Search pages"
              className="w-56 rounded-md border border-line bg-surface py-1.5 pl-8 pr-3 text-sm text-ink placeholder:text-ghost focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/40"
            />
          </div>
        </header>

        <div className="relative w-full overflow-x-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b [&_tr]:border-line">
              <tr>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => toggleSort("path")}
                    className="inline-flex items-center gap-1 hover:text-ink"
                  >
                    Page URL / Title
                    <SortIcon active={sortKey === "path"} dir={sortDir} />
                  </button>
                </TableHead>
                {COLUMNS.slice(1).map((column) => (
                  <TableHead key={column.key}>
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      className="inline-flex items-center gap-1 hover:text-ink"
                    >
                      {column.label}
                      <SortIcon active={sortKey === column.key} dir={sortDir} />
                    </button>
                  </TableHead>
                ))}
              </tr>
            </thead>
            <TableBody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-3 py-8 text-center text-sm text-faint">
                    No pages match “{query}”.
                  </td>
                </tr>
              )}
              {filtered.map((row) => (
                <TableRow key={row.path}>
                  <TableCell className="max-w-[20rem]">
                    <p className="truncate font-medium text-ink" title={row.title}>
                      {row.title}
                    </p>
                    <p className="truncate text-xs text-faint" title={row.path}>
                      {row.path}
                    </p>
                  </TableCell>
                  <TableCell className="font-medium">{formatNumber(row.views)}</TableCell>
                  <TableCell>{formatNumber(row.uniqueVisitors)}</TableCell>
                  <TableCell>{formatDuration(row.avgTime)}</TableCell>
                  <TableCell>
                    <RatePill value={row.bounceRate} />
                  </TableCell>
                  <TableCell>
                    <RatePill value={row.exitRate} />
                  </TableCell>
                  <TableCell className="font-medium">{formatNumber(row.conversions)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </table>
        </div>
      </section>
    </div>
  );
}

function compare(a: PageRow, b: PageRow, key: SortKey): number {
  if (key === "path") return a.path.localeCompare(b.path);
  return a[key] - b[key];
}

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="currentColor"
      className={cn("h-2.5 w-2.5", active ? "text-brand" : "text-ghost", !active && "opacity-40")}
      aria-hidden="true"
    >
      {active && dir === "asc" ? <path d="M6 2l4 5H2z" /> : <path d="M6 10L2 5h8z" />}
    </svg>
  );
}

function RatePill({ value }: { value: number }) {
  return (
    <span
      className={cn(
        "tabular-nums",
        value >= 60 ? "text-red-500" : value >= 40 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400",
      )}
    >
      {formatPercent(value)}
    </span>
  );
}
