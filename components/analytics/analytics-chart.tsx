"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAnalytics } from "./analytics-context";
import { EmptyState, SectionCard } from "./states";
import { defaultInterval } from "@/lib/analytics/date-ranges";
import { formatCompact, formatMetricValue } from "@/lib/analytics/format";
import { buildChartSeries } from "@/lib/analytics/mock-data";
import { chartMetricsFor, metricDefinition } from "@/lib/analytics/registry";
import type { AccountSeries, ChartMetricId, ChartType, Interval, MetricFormat } from "@/lib/analytics/types";
import { Dropdown } from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";

interface TooltipEntry {
  dataKey?: string | number;
  value?: number | string;
  color?: string;
  name?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
  format: MetricFormat;
}

function ChartTooltip({ active, payload, label, format }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2 shadow-lg">
      <p className="mb-1 text-xs font-medium text-faint">{label}</p>
      {payload.map((entry) => (
        <p key={String(entry.dataKey)} className="flex items-center gap-2 text-xs text-ink">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="truncate">{entry.name}</span>
          <span className="ml-auto font-semibold">
            {typeof entry.value === "number" ? formatMetricValue(entry.value, format) : entry.value}
          </span>
        </p>
      ))}
    </div>
  );
}

const CHART_TYPES: { id: ChartType; label: string; path: string }[] = [
  {
    id: "line",
    label: "Line chart",
    path: "M3 17l5-6 4 3 6-8",
  },
  {
    id: "area",
    label: "Area chart",
    path: "M3 17l5-6 4 3 6-8M3 17h14v3H3z",
  },
  {
    id: "bar",
    label: "Bar chart",
    path: "M4 20V10m5 10V4m5 16v-7m5 7V8",
  },
];

const INTERVALS: { id: Interval; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

/**
 * One universal analytics chart for every platform. The metric selector
 * only offers metrics reported by the selected sources, series are drawn
 * per connected account (never merged into a misleading total), and the
 * interval / date range flow through the shared analytics state.
 */
export function AnalyticsChart() {
  const { selectedAccounts, range, loading } = useAnalytics();
  const [metricId, setMetricId] = useState<ChartMetricId>("followers");
  const [chartType, setChartType] = useState<ChartType>("area");
  const [metricMenuOpen, setMetricMenuOpen] = useState(false);

  const rangeKey = `${range.from.getTime()}|${range.to.getTime()}`;
  // The interval choice is scoped to the range it was picked for: switching
  // the date range falls back to the sensible default granularity.
  const [intervalState, setIntervalState] = useState<{
    rangeKey: string;
    value: Interval;
  } | null>(null);
  const setIntervalOverride = (value: Interval) => setIntervalState({ rangeKey, value });

  const available = useMemo(
    () => chartMetricsFor(selectedAccounts.map((account) => account.platformId)),
    [selectedAccounts],
  );

  // Fall back to the first supported metric when the selection changes.
  const activeMetric = (available.includes(metricId) ? metricId : available[0]) as
    ChartMetricId | undefined;
  const interval =
    intervalState?.rangeKey === rangeKey ? intervalState.value : defaultInterval(range);

  const series: AccountSeries[] = useMemo(() => {
    if (!activeMetric || loading) return [];
    return buildChartSeries(activeMetric, selectedAccounts, range, interval);
  }, [activeMetric, selectedAccounts, range, interval, loading]);

  const chartData = useMemo(() => {
    if (series.length === 0) return [];
    const labels = series[0].points.map((point) => point.label);
    return labels.map((label, index) => {
      const row: Record<string, string | number> = { label };
      series.forEach((entry) => {
        row[entry.accountId] = entry.points[index]?.value ?? 0;
      });
      return row;
    });
  }, [series]);

  if (!loading && available.length === 0) {
    return (
      <SectionCard title="Performance over time">
        <EmptyState
          title="No chartable metrics"
          description="The selected sources do not share any compatible metric for this chart."
        />
      </SectionCard>
    );
  }

  const definition = activeMetric ? metricDefinition(activeMetric) : null;
  const format: MetricFormat = definition?.format ?? "number";
  const axisFormatter = (value: number) =>
    format === "percent" ? `${Math.round(value)}%` : formatCompact(value);

  return (
    <SectionCard
      title="Performance over time"
      description={
        definition
          ? `${definition.label} · ${interval} · compared across accounts`
          : undefined
      }
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {/* Metric selector */}
          <Dropdown
            open={metricMenuOpen}
            onOpenChange={setMetricMenuOpen}
            align="end"
            panelClassName="w-[15rem]"
            trigger={
              <button
                type="button"
                className="flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-sunken"
              >
                <span className="max-w-[9rem] truncate sm:max-w-none">
                  {definition?.label ?? "Metric"}
                </span>
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-ghost">
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            }
          >
            {metricMenuOpen && (
              <ul className="max-h-72 overflow-y-auto py-1">
                {available.map((id) => {
                  const option = metricDefinition(id);
                  const active = id === activeMetric;
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => {
                          setMetricId(id);
                          setMetricMenuOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-sunken",
                          active ? "font-medium text-brand" : "text-muted",
                        )}
                      >
                        {option.label}
                        {active && (
                          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                            <path
                              fillRule="evenodd"
                              d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 111.4-1.4l3.3 3.3 6.8-6.8a1 1 0 011.4 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Dropdown>

          {/* Chart type */}
          <div className="flex overflow-hidden rounded-md border border-line">
            {CHART_TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => setChartType(type.id)}
                aria-label={type.label}
                aria-pressed={chartType === type.id}
                className={cn(
                  "flex h-[34px] w-9 items-center justify-center transition-colors",
                  chartType === type.id
                    ? "bg-brand text-white"
                    : "bg-surface text-faint hover:bg-sunken",
                )}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-4 w-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d={type.path}
                    fill={type.id === "area" ? "currentColor" : "none"}
                    fillOpacity={type.id === "area" ? 0.25 : 0}
                  />
                </svg>
              </button>
            ))}
          </div>

          {/* Interval */}
          <div className="flex overflow-hidden rounded-md border border-line">
            {INTERVALS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setIntervalOverride(option.id)}
                aria-pressed={interval === option.id}
                className={cn(
                  "h-[34px] px-2.5 text-xs font-medium transition-colors",
                  interval === option.id
                    ? "bg-brand text-white"
                    : "bg-surface text-faint hover:bg-sunken",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      }
    >
      {loading ? (
        <div className="h-[300px] w-full animate-pulse rounded-md bg-sunken" />
      ) : series.length === 0 ? (
        <EmptyState
          title="No data for this metric"
          description="None of the selected accounts report this metric. Pick another metric or add a supporting source."
        />
      ) : (
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "bar" ? (
              <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "var(--faint)" }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--line)" }}
                  minTickGap={28}
                />
                <YAxis
                  tickFormatter={axisFormatter}
                  tick={{ fontSize: 11, fill: "var(--faint)" }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                />
                <Tooltip content={<ChartTooltip format={format} />} cursor={{ fillOpacity: 0.08 }} />
                {series.length > 1 && (
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                )}
                {series.map((entry) => (
                  <Bar
                    key={entry.accountId}
                    dataKey={entry.accountId}
                    name={entry.label}
                    fill={entry.color}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={28}
                  />
                ))}
              </BarChart>
            ) : chartType === "line" ? (
              <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "var(--faint)" }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--line)" }}
                  minTickGap={28}
                />
                <YAxis
                  tickFormatter={axisFormatter}
                  tick={{ fontSize: 11, fill: "var(--faint)" }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                />
                <Tooltip content={<ChartTooltip format={format} />} />
                {series.length > 1 && (
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                )}
                {series.map((entry) => (
                  <Line
                    key={entry.accountId}
                    dataKey={entry.accountId}
                    name={entry.label}
                    stroke={entry.color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    type="monotone"
                  />
                ))}
              </LineChart>
            ) : (
              <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  {series.map((entry) => (
                    <linearGradient
                      key={entry.accountId}
                      id={`fill-${entry.accountId}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor={entry.color} stopOpacity={0.28} />
                      <stop offset="95%" stopColor={entry.color} stopOpacity={0.02} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "var(--faint)" }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--line)" }}
                  minTickGap={28}
                />
                <YAxis
                  tickFormatter={axisFormatter}
                  tick={{ fontSize: 11, fill: "var(--faint)" }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                />
                <Tooltip content={<ChartTooltip format={format} />} />
                {series.length > 1 && (
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                )}
                {series.map((entry) => (
                  <Area
                    key={entry.accountId}
                    dataKey={entry.accountId}
                    name={entry.label}
                    stroke={entry.color}
                    strokeWidth={2}
                    fill={`url(#fill-${entry.accountId})`}
                    type="monotone"
                  />
                ))}
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {/* Selected sources that do not report the chosen metric */}
      {!loading && series.length > 0 && series.length < selectedAccounts.length && (
        <p className="mt-3 text-xs text-ghost">
          Showing {series.length} of {selectedAccounts.length} selected accounts — the
          others do not report {definition?.label.toLowerCase()}.
        </p>
      )}
    </SectionCard>
  );
}
