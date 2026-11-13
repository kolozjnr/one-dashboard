"use client";

import type { ReactNode } from "react";
import { formatCompact, formatNumber, formatPercent } from "@/lib/analytics/format";
import type { BreakdownRow } from "@/lib/analytics/website-data";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ chart tooltip */

interface TooltipEntry {
  dataKey?: string | number;
  value?: number | string;
  color?: string;
  name?: string;
}

/** Shared Recharts tooltip styled with the design-system tokens. */
export function ChartTooltip({
  active,
  payload,
  label,
  format = "number",
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
  format?: "number" | "compact" | "percent" | "duration";
}) {
  if (!active || !payload || payload.length === 0) return null;

  const render = (value: number | string) => {
    if (typeof value !== "number") return value;
    switch (format) {
      case "compact":
        return formatCompact(value);
      case "percent":
        return formatPercent(value);
      case "duration":
        return `${Math.round(value)}s`;
      default:
        return formatNumber(value);
    }
  };

  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2 shadow-lg">
      <p className="mb-1 text-xs font-medium text-faint">{label}</p>
      {payload.map((entry) => (
        <p key={String(entry.dataKey)} className="flex items-center gap-2 text-xs text-ink">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="truncate">{entry.name ?? entry.dataKey}</span>
          <span className="ml-auto font-semibold">{render(entry.value as number)}</span>
        </p>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ bar list */

/**
 * Horizontal ranked bar list (share of total) used for breakdowns such as
 * traffic sources, browsers and countries.
 */
export function BarList({
  rows,
  format = "compact",
  valueFormatter,
  max,
  className,
}: {
  rows: BreakdownRow[];
  format?: "compact" | "number" | "percent" | "duration";
  valueFormatter?: (row: BreakdownRow) => string;
  max?: number;
  className?: string;
}) {
  const peak = max ?? Math.max(...rows.map((row) => row.value), 1);

  const display = (row: BreakdownRow) => {
    if (valueFormatter) return valueFormatter(row);
    switch (format) {
      case "percent":
        return formatPercent(row.share);
      case "duration":
        return `${Math.round(row.value)}s`;
      case "number":
        return formatNumber(row.value);
      default:
        return formatCompact(row.value);
    }
  };

  return (
    <ul className={cn("space-y-3", className)}>
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="truncate text-muted" title={row.label}>
              {row.label}
            </span>
            <span className="shrink-0 font-medium text-ink">{display(row)}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-sunken">
            <div
              className="h-full rounded-full bg-brand transition-all duration-500"
              style={{ width: `${Math.max(2, (row.value / peak) * 100)}%` }}
              aria-hidden="true"
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ stat tile */

export function StatTile({
  label,
  value,
  hint,
  live,
  children,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  live?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <p className="flex items-center gap-2 text-xs font-medium text-faint">
        {live && (
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
        )}
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold leading-none text-ink">{value}</p>
      {hint && <p className="mt-2 text-[11px] text-ghost">{hint}</p>}
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ section heading */

export function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-3">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {description && <p className="mt-0.5 text-xs text-faint">{description}</p>}
    </div>
  );
}
