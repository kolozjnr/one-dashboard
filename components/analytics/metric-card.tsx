"use client";

import { Tooltip } from "@/components/ui/tooltip";
import { formatMetricValue, formatPercent } from "@/lib/analytics/format";
import type { MetricFormat } from "@/lib/analytics/types";
import { cn } from "@/lib/utils";

export interface MetricCardProps {
  /** Metric identifier (registry key). */
  metricId: string;
  /** Metric name shown as the card title. */
  name: string;
  /** Raw value for the current period. */
  value: number;
  /** Change against the previous period, in percent. */
  changePct: number;
  /** Raw value of the previous period. */
  previous: number;
  /** How the value must be rendered. */
  format: MetricFormat;
  /** Trend points for the sparkline. */
  trend: number[];
  /** Platform the metric came from (platform-specific cards). */
  platform?: { label: string; domain?: string; color: string };
  /** Optional info tooltip copy. */
  description?: string;
  /** Pre-rendered value for `text` metrics. */
  displayValue?: string;
}

/** Tiny inline sparkline (no chart library needed for 14 points). */
function Sparkline({ values, positive, color }: { values: number[]; positive: boolean; color?: string }) {
  if (values.length < 2) return <div className="h-8" aria-hidden="true" />;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const width = 100;
  const height = 32;

  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - 3 - ((value - min) / span) * (height - 6);
    return [x, y] as const;
  });

  const line = points
    .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  const stroke = color ?? (positive ? "#22c55e" : "#ef4444");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-8 w-full"
      aria-hidden="true"
    >
      <path d={area} fill={stroke} fillOpacity={0.12} />
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * Reusable KPI card: title, formatted value, percentage change, previous
 * period comparison, sparkline, optional platform badge and info tooltip.
 */
export function MetricCard({
  metricId,
  name,
  value,
  changePct,
  previous,
  format,
  trend,
  platform,
  description,
  displayValue,
}: MetricCardProps) {
  const positive = changePct >= 0;
  const isText = format === "text";

  return (
    <article
      data-metric={metricId}
      className="flex flex-col rounded-lg border border-line bg-surface p-4"
    >
      <header className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium leading-snug text-faint">{name}</p>
        {description && (
          <Tooltip content={description}>
            <button
              type="button"
              tabIndex={-1}
              aria-label={`About ${name}`}
              className="text-ghost transition-colors hover:text-muted"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v.5a.75.75 0 001.5 0v-.5zM10 9a.75.75 0 00-.75.75v3.5a.75.75 0 001.5 0v-3.5A.75.75 0 0010 9z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </Tooltip>
        )}
      </header>

      <p className="mt-2 truncate text-2xl font-semibold leading-none text-ink">
        {formatMetricValue(value, format, displayValue)}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        {!isText && (
          <>
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-xs font-semibold",
                positive ? "text-green-500" : "text-red-500",
              )}
            >
              <svg viewBox="0 0 12 12" fill="currentColor" className="h-2.5 w-2.5">
                {positive ? (
                  <path d="M6 2l4.5 5.5h-9z" />
                ) : (
                  <path d="M6 10L1.5 4.5h9z" />
                )}
              </svg>
              {formatPercent(changePct, { signed: true })}
            </span>
            <span className="text-[11px] text-ghost">
              vs {formatMetricValue(previous, format)}
            </span>
          </>
        )}
        {isText && <span className="text-[11px] text-ghost">current period</span>}
      </div>

      <div className="mt-3">
        <Sparkline values={trend} positive={positive} color={platform?.color} />
      </div>

      {platform && (
        <footer className="mt-2 flex items-center gap-1.5 text-[11px] text-faint">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: platform.color }}
          />
          {platform.label}
        </footer>
      )}
    </article>
  );
}
