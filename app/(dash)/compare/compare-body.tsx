"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MetricCard } from "@/components/analytics/metric-card";
import { EmptyState, SectionCard } from "@/components/analytics/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/ui/dropdown";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCompact, formatMetricValue, formatPercent } from "@/lib/analytics/format";
import { PLATFORMS } from "@/lib/analytics/registry";
import type { PlatformId } from "@/lib/analytics/types";
import {
  COMPARISON_PRESETS,
  COMPARE_METRICS,
  compareMetricsFor,
  getCompareSeries,
  getCompareValues,
  getGrowthComparison,
  getRanking,
  metricCompatibility,
  type CompareMetricDef,
} from "@/lib/analytics/compare-data";
import { cn } from "@/lib/utils";
import { ChartTooltip, SectionHeading } from "../analytics/shared";

const PLATFORM_LABELS = Object.fromEntries(
  (Object.keys(PLATFORMS) as PlatformId[]).map((id) => [
    id,
    { label: PLATFORMS[id].label, color: PLATFORMS[id].color },
  ]),
) as Record<PlatformId, { label: string; color: string }>;

const ALL_SOURCES = Object.keys(PLATFORMS) as PlatformId[];

const CHART_TYPES = [
  { id: "line", label: "Line chart" },
  { id: "area", label: "Area chart" },
  { id: "bar", label: "Bar chart" },
] as const;

type ChartType = (typeof CHART_TYPES)[number]["id"];

/* ------------------------------------------------------------------ platform chips */

function PlatformChips({
  selected,
  onToggle,
}: {
  selected: PlatformId[];
  onToggle: (id: PlatformId) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {ALL_SOURCES.map((id) => {
        const platform = PLATFORMS[id];
        const active = selected.includes(id);
        return (
          <button
            key={id}
            type="button"
            onClick={() => onToggle(id)}
            aria-pressed={active}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "border-transparent text-white"
                : "border-line bg-surface text-muted hover:bg-sunken hover:text-ink",
            )}
            style={active ? { backgroundColor: platform.color } : undefined}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: active ? "rgba(255,255,255,0.85)" : platform.color }}
              aria-hidden="true"
            />
            {platform.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ page body */

/**
 * Cross-platform comparison body. Two or more sources are compared on one
 * metric at a time: metric cards per source, an aligned multi-series
 * chart, a performance ranking table and a growth comparison. When the
 * selected platforms define the metric differently, an amber callout
 * explains each definition *before* the numbers are shown.
 */
export function CompareBody() {
  const [selected, setSelected] = useState<PlatformId[]>(["instagram", "tiktok"]);
  const [metricId, setMetricId] = useState("engagement");
  const [chartType, setChartType] = useState<ChartType>("line");
  const [metricMenuOpen, setMetricMenuOpen] = useState(false);

  const metrics = useMemo(() => compareMetricsFor(selected), [selected]);
  const metric: CompareMetricDef =
    metrics.find((item) => item.id === metricId) ?? metrics[0];

  const togglePlatform = (id: PlatformId) => {
    setSelected((prev) => {
      if (prev.includes(id)) {
        // Keep at least two sources — a comparison needs a pair.
        if (prev.length <= 2) return prev;
        return prev.filter((item) => item !== id);
      }
      return [...prev, id];
    });
  };

  const applyPreset = (preset: (typeof COMPARISON_PRESETS)[number]) => {
    setSelected(preset.platformIds);
    setMetricId(preset.metricId);
  };

  // No metric for this selection (e.g. website sessions with social only).
  if (!metric) {
    return (
      <div className="space-y-6">
        <CompareHeader />
        <div className="rounded-lg border border-line bg-surface">
          <EmptyState
            title="No comparable metric"
            description="The selected sources share no metric. Add a social source or include the website to compare traffic."
          />
        </div>
      </div>
    );
  }

  const compatibility = metricCompatibility(metric, selected, PLATFORM_LABELS);
  // Only sources that actually report the metric take part in the chart,
  // cards and ranking — the rest would be fabricated numbers.
  const compared = selected.filter((id) => metric.supportedBy.includes(id));
  const values = getCompareValues(metric.id, compared, PLATFORM_LABELS);
  const ranking = getRanking(values);
  // Growth is audience growth — websites don't have an audience to grow.
  const growthMetric = COMPARE_METRICS.find((item) => item.id === "audienceGrowth");
  const growthPlatforms = selected.filter((id) =>
    growthMetric ? growthMetric.supportedBy.includes(id) : true,
  );
  const growth = getGrowthComparison(growthPlatforms, PLATFORM_LABELS);
  const { data, series } = getCompareSeries(
    metric.id,
    compared.map((id) => ({ platformId: id, ...PLATFORM_LABELS[id] })),
  );

  const axisFormatter = (value: number) =>
    metric.format === "percent" ? `${Math.round(value)}%` : formatCompact(value);

  const renderChart = () => {
    const common = (
      <>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "var(--faint)" }}
          tickLine={false}
          axisLine={{ stroke: "var(--line)" }}
          minTickGap={24}
        />
        <YAxis
          tickFormatter={axisFormatter}
          tick={{ fontSize: 11, fill: "var(--faint)" }}
          tickLine={false}
          axisLine={false}
          width={56}
        />
        <Tooltip content={<ChartTooltip format={metric.format === "percent" ? "percent" : "compact"} />} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
      </>
    );

    if (chartType === "bar") {
      return (
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          {common}
          {series.map((entry) => (
            <Bar
              key={entry.platformId}
              dataKey={entry.platformId}
              name={entry.label}
              fill={entry.color}
              radius={[3, 3, 0, 0]}
              maxBarSize={22}
            />
          ))}
        </BarChart>
      );
    }
    if (chartType === "area") {
      return (
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          {common}
          {series.map((entry) => (
            <Area
              key={entry.platformId}
              type="monotone"
              dataKey={entry.platformId}
              name={entry.label}
              stroke={entry.color}
              strokeWidth={2}
              fillOpacity={0.12}
              fill={entry.color}
            />
          ))}
        </AreaChart>
      );
    }
    return (
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        {common}
        {series.map((entry) => (
          <Line
            key={entry.platformId}
            type="monotone"
            dataKey={entry.platformId}
            name={entry.label}
            stroke={entry.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    );
  };

  return (
    <div className="space-y-6">
      <CompareHeader />

      {/* Suggested comparisons */}
      <section className="rounded-lg border border-line bg-surface p-4">
        <SectionHeading
          title="Suggested comparisons"
          description="Jump straight to the questions teams ask most often"
        />
        <div className="flex flex-wrap gap-2">
          {COMPARISON_PRESETS.map((preset) => {
            const active =
              preset.metricId === metric.id &&
              preset.platformIds.length === selected.length &&
              preset.platformIds.every((id) => selected.includes(id));
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "border-brand/40 bg-brand/10 text-brand"
                    : "border-line bg-surface text-muted hover:bg-sunken hover:text-ink",
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Controls: sources + metric + chart type */}
      <section className="rounded-lg border border-line bg-surface p-4">
        <div className="space-y-4">
          <div>
            <SectionHeading
              title="Sources to compare"
              description="Pick two or more connected sources (minimum 2)"
            />
            <PlatformChips selected={selected} onToggle={togglePlatform} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-faint">Metric</span>
              <Dropdown
                open={metricMenuOpen}
                onOpenChange={setMetricMenuOpen}
                panelClassName="w-[17rem]"
                trigger={
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-sunken"
                  >
                    <span className="max-w-[10rem] truncate sm:max-w-none">{metric.label}</span>
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
                    {metrics.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setMetricId(item.id);
                            setMetricMenuOpen(false);
                          }}
                          className={cn(
                            "flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm transition-colors hover:bg-sunken",
                            item.id === metric.id ? "font-medium text-brand" : "text-muted",
                          )}
                        >
                          <span>{item.label}</span>
                          <span className="text-[11px] text-ghost">{item.description}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Dropdown>
            </div>

            <div className="flex overflow-hidden rounded-md border border-line">
              {CHART_TYPES.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setChartType(type.id)}
                  aria-pressed={chartType === type.id}
                  className={cn(
                    "px-2.5 py-1.5 text-xs font-medium transition-colors",
                    chartType === type.id
                      ? "bg-brand text-white"
                      : "bg-surface text-faint hover:bg-sunken",
                  )}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Compatibility explanation — before any numbers */}
      <section
        role="note"
        className={cn(
          "rounded-lg border px-4 py-3",
          compatibility.needsCaveat
            ? "border-amber-500/30 bg-amber-500/10"
            : "border-line bg-sunken",
        )}
      >
        <p
          className={cn(
            "text-sm",
            compatibility.needsCaveat ? "text-amber-700 dark:text-amber-400" : "text-muted",
          )}
        >
          <span className="font-semibold">
            {compatibility.needsCaveat ? "Definition differences: " : "Comparable definitions: "}
          </span>
          {compatibility.headline}
        </p>
        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {compatibility.lines.map((line) => (
            <li key={line.platformId} className="flex items-start gap-2 text-xs text-faint">
              <span
                className="mt-1 h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: line.color }}
                aria-hidden="true"
              />
              <span>
                <span className="font-medium text-muted">{line.label}</span> — {line.definition}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Sources excluded because they cannot report the chosen metric */}
      {compared.length < selected.length && (
        <p className="text-xs text-ghost">
          Excluded from this comparison:{" "}
          {selected
            .filter((id) => !compared.includes(id))
            .map((id) => PLATFORM_LABELS[id].label)
            .join(", ")}{" "}
          — {compared.length === 1 ? "it does not report" : "they do not report"}{" "}
          {metric.label.toLowerCase()}.
        </p>
      )}

      {/* Metric cards, one per source */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {values.map((item) => (
          <MetricCard
            key={item.platformId}
            metricId={`${item.platformId}.${metric.id}`}
            name={`${metric.label} · ${item.label}`}
            value={item.value}
            changePct={item.changePct}
            previous={item.previous}
            format={metric.format}
            trend={item.trend}
            platform={{ label: item.label, color: item.color }}
            description={metric.definitions[item.platformId]}
          />
        ))}
      </div>

      {/* Multi-series comparison chart */}
      <SectionCard
        title={`${metric.label} over time`}
        description={`${compared.length} of ${selected.length} sources · daily · last 14 days`}
      >
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Performance ranking */}
        <SectionCard
          title="Performance ranking"
          description={`Sources ranked by ${metric.label.toLowerCase()}`}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">Change</TableHead>
                <TableHead className="text-right">Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking.map((row) => (
                <TableRow key={row.platformId}>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                        row.rank === 1 ? "bg-brand/10 text-brand" : "bg-sunken text-faint",
                      )}
                    >
                      {row.rank}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-2 font-medium">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: row.color }}
                        aria-hidden="true"
                      />
                      {row.label}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatMetricValue(row.value, metric.format)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-medium",
                      row.changePct >= 0 ? "text-green-500" : "text-red-500",
                    )}
                  >
                    {formatPercent(row.changePct, { signed: true })}
                  </TableCell>
                  <TableCell className="text-right text-faint">
                    {formatPercent(row.share)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {metric.heterogeneous && (
            <p className="mt-3 text-xs text-ghost">
              Share is each source&apos;s portion of the summed comparison total — because
              definitions differ, treat it as a rough weight, not an exact split.
            </p>
          )}
        </SectionCard>

        {/* Growth comparison */}
        <SectionCard
          title="Growth comparison"
          description="Audience gained and period-over-period growth rate"
        >
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={growth}
                layout="vertical"
                margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(value: number) => `${value}%`}
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
                  width={84}
                />
                <Tooltip content={<ChartTooltip format="percent" />} cursor={{ fillOpacity: 0.08 }} />
                <Bar dataKey="growthPct" name="Growth" radius={[0, 3, 3, 0]} maxBarSize={22}>
                  {growth.map((row) => (
                    <Cell key={row.platformId} fill={row.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <ul className="mt-4 space-y-2">
            {growth.map((row) => (
              <li
                key={row.platformId}
                className="flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2 text-muted">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: row.color }}
                    aria-hidden="true"
                  />
                  {row.label}
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-medium text-ink">
                    {row.gained >= 0 ? "+" : ""}
                    {formatCompact(row.gained)}
                  </span>
                  <Badge variant={row.growthPct >= 0 ? "success" : "danger"}>
                    {formatPercent(row.growthPct, { signed: true })}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      {/* Read-with-care footer for heterogeneous metrics */}
      {compatibility.needsCaveat && (
        <p className="text-xs text-ghost">
          Numbers above are mock values for design review. In production, cross-platform
          totals for this metric are only shown with the definition note attached — raw
          sums across differently-defined metrics would be misleading.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ header */

function CompareHeader() {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold text-ink">Compare Platforms</h1>
        <p className="mt-1 text-sm text-faint">
          Put multiple connected sources side by side — charts, rankings and growth
          comparisons with metric definitions spelled out.
        </p>
      </div>
      <Button variant="outline" size="sm" type="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h13m0 0l-4-4m4 4l-4 4M20 16H7m0 0l4-4m-4 4l4 4" />
        </svg>
        Swap sides
      </Button>
    </header>
  );
}
