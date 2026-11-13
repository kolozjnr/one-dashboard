"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MetricCard } from "@/components/analytics/metric-card";
import { Button } from "@/components/ui/button";
import { formatCompact, formatPercent } from "@/lib/analytics/format";
import {
  getPageRows,
  getTrafficSeries,
  getWebsiteKpis,
  type TrafficSourceGroup,
  type Website,
} from "@/lib/analytics/website-data";
import { ChartTooltip, BarList, SectionHeading } from "./shared";

type TrafficMetric = "visitors" | "sessions" | "pageViews";

const METRIC_OPTIONS: { id: TrafficMetric; label: string }[] = [
  { id: "visitors", label: "Visitors" },
  { id: "sessions", label: "Sessions" },
  { id: "pageViews", label: "Page Views" },
];

/**
 * Overview tab — the eight headline KPI cards with trend comparisons,
 * the 28-day traffic chart, plus quick top-pages and traffic-source
 * snapshots with jump links into the dedicated tabs.
 */
export function OverviewTab({
  website,
  sources,
  onNavigate,
}: {
  website: Website;
  sources: TrafficSourceGroup;
  onNavigate: (tab: "pages" | "traffic" | "realtime" | "conversions") => void;
}) {
  const [metric, setMetric] = useState<TrafficMetric>("visitors");

  const kpis = useMemo(() => getWebsiteKpis(website.id), [website.id]);
  const series = useMemo(() => getTrafficSeries(website.id), [website.id]);
  const pages = useMemo(() => getPageRows(website.id).slice(0, 5), [website.id]);

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <MetricCard
            key={kpi.id}
            metricId={kpi.id}
            name={kpi.name}
            value={kpi.value}
            changePct={kpi.changePct}
            previous={kpi.previous}
            format={kpi.format}
            trend={kpi.trend}
            description={kpi.description}
          />
        ))}
      </div>

      {/* Traffic over time */}
      <section className="rounded-lg border border-line bg-surface p-5">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-ink">Traffic over time</h3>
            <p className="mt-0.5 text-xs text-faint">Last 28 days · {website.name}</p>
          </div>
          <div className="flex overflow-hidden rounded-md border border-line">
            {METRIC_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setMetric(option.id)}
                aria-pressed={metric === option.id}
                className={
                  metric === option.id
                    ? "bg-brand px-2.5 py-1.5 text-xs font-medium text-white"
                    : "bg-surface px-2.5 py-1.5 text-xs font-medium text-faint hover:bg-sunken"
                }
              >
                {option.label}
              </button>
            ))}
          </div>
        </header>

        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="overview-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff5c39" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#ff5c39" stopOpacity={0.02} />
                </linearGradient>
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
                tickFormatter={(value: number) => formatCompact(value)}
                tick={{ fontSize: 11, fill: "var(--faint)" }}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <Tooltip content={<ChartTooltip format="compact" />} />
              <Area
                type="monotone"
                dataKey={metric}
                name={METRIC_OPTIONS.find((option) => option.id === metric)?.label}
                stroke="#ff5c39"
                strokeWidth={2}
                fill="url(#overview-fill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Snapshots */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-line bg-surface p-5">
          <header className="mb-4 flex items-center justify-between gap-3">
            <SectionHeading title="Top pages" description="By page views in this period" />
            <Button variant="ghost" size="sm" onClick={() => onNavigate("pages")}>
              View all →
            </Button>
          </header>
          <BarList
            rows={pages.map((page) => ({
              label: page.path,
              value: page.views,
              share: (page.views / pages[0].views) * 100,
            }))}
          />
        </section>

        <section className="rounded-lg border border-line bg-surface p-5">
          <header className="mb-4 flex items-center justify-between gap-3">
            <SectionHeading
              title="Traffic sources"
              description={`${formatCompact(sources.sessions)} sessions by channel`}
            />
            <Button variant="ghost" size="sm" onClick={() => onNavigate("traffic")}>
              View all →
            </Button>
          </header>
          <BarList rows={sources.channels.slice(0, 6)} valueFormatter={(row) => formatPercent(row.share)} />
        </section>
      </div>

      {/* Realtime + conversions teaser */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-line bg-surface p-5">
          <header className="mb-4 flex items-center justify-between">
            <SectionHeading title="Right now" description="Visitors active in the last 5 minutes" />
            <Button variant="ghost" size="sm" onClick={() => onNavigate("realtime")}>
              Open live view →
            </Button>
          </header>
          <div className="flex flex-wrap gap-8">
            <div>
              <p className="text-3xl font-semibold text-ink">38</p>
              <p className="mt-1 text-xs text-faint">Active visitors</p>
            </div>
            <div>
              <p className="text-3xl font-semibold text-ink">17</p>
              <p className="mt-1 text-xs text-faint">Visitors / minute</p>
            </div>
            <div>
              <p className="text-3xl font-semibold text-ink">44</p>
              <p className="mt-1 text-xs text-faint">Page views / minute</p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5">
          <header className="mb-4 flex items-center justify-between">
            <SectionHeading title="Latest conversion" description="Most recent tracked goal completion" />
            <Button variant="ghost" size="sm" onClick={() => onNavigate("conversions")}>
              Conversions →
            </Button>
          </header>
          <div className="space-y-3">
            {[
              { goal: "Purchase completed", detail: "ORD-48213 · $149.00 USD", when: "3 min ago" },
              { goal: "Registration form submitted", detail: "/signup · 42s to complete", when: "11 min ago" },
              { goal: "Newsletter subscribed", detail: "/blog/launch-week", when: "26 min ago" },
            ].map((item) => (
              <div
                key={item.goal}
                className="flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{item.goal}</p>
                  <p className="truncate text-xs text-faint">{item.detail}</p>
                </div>
                <span className="shrink-0 text-xs text-ghost">{item.when}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
