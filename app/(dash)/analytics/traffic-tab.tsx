"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
} from "recharts";
import { formatCompact, formatNumber, formatPercent } from "@/lib/analytics/format";
import {
  getTrafficSources,
  type BreakdownRow,
  type TrafficSourceGroup,
  type Website,
} from "@/lib/analytics/website-data";
import { BarList, ChartTooltip, SectionHeading } from "./shared";

const PIE_COLORS = ["#ff5c39", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#ec4899", "#14b8a6", "#64748b"];

function BreakdownCard({
  title,
  description,
  rows,
  format = "compact",
  emptyNote,
}: {
  title: string;
  description: string;
  rows: BreakdownRow[];
  format?: "compact" | "number" | "percent";
  emptyNote?: string;
}) {
  return (
    <section className="rounded-lg border border-line bg-surface p-5">
      <header className="mb-4">
        <SectionHeading title={title} description={description} />
      </header>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-xs text-faint">{emptyNote ?? "No data for this period."}</p>
      ) : (
        <BarList rows={rows} format={format} valueFormatter={format === "percent" ? (row) => formatPercent(row.share) : undefined} />
      )}
    </section>
  );
}

/**
 * Traffic Sources tab — channel donut, plus breakdowns for referring
 * websites, search engines, direct traffic, social media, landing pages
 * and exit pages.
 */
export function TrafficTab({
  website,
  sources: initial,
}: {
  website: Website;
  sources: TrafficSourceGroup;
}) {
  const sources = useMemo(() => initial ?? getTrafficSources(website.id), [initial, website.id]);

  const channelData = sources.channels.map((row, index) => ({
    ...row,
    fill: PIE_COLORS[index % PIE_COLORS.length],
  }));

  return (
    <div className="space-y-6">
      {/* Channel donut + legend */}
      <section className="rounded-lg border border-line bg-surface p-5">
        <header className="mb-4">
          <SectionHeading
            title="Traffic channels"
            description={`${formatNumber(sources.sessions)} sessions by channel`}
          />
        </header>
        <div className="grid items-center gap-6 lg:grid-cols-2">
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={channelData}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={2}
                >
                  {channelData.map((entry) => (
                    <Cell key={entry.label} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="space-y-2.5">
            {channelData.map((row) => (
              <li key={row.label} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 text-muted">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.fill }} />
                  {row.label}
                </span>
                <span className="tabular-nums text-ink">
                  {formatNumber(row.value)} <span className="text-xs text-faint">({formatPercent(row.share)})</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Channels + referrers */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-line bg-surface p-5">
          <header className="mb-4">
            <SectionHeading title="Channel trend" description="Sessions per channel — top 4 channels" />
          </header>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sources.channels.slice(0, 4)} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "var(--faint)" }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--line)" }}
                  interval={0}
                />
                <YAxis
                  tickFormatter={(value: number) => formatCompact(value)}
                  tick={{ fontSize: 11, fill: "var(--faint)" }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fillOpacity: 0.08 }} />
                <Bar dataKey="value" name="Sessions" fill="#ff5c39" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <BreakdownCard
          title="Referring websites"
          description="External sites sending sessions"
          rows={sources.referrers}
        />
      </div>

      {/* Search / social / direct */}
      <div className="grid gap-6 lg:grid-cols-3">
        <BreakdownCard
          title="Search engines"
          description="Organic search split by engine"
          rows={sources.searchEngines}
          format="percent"
        />
        <BreakdownCard
          title="Social media"
          description="Sessions from social networks"
          rows={sources.social}
          format="percent"
        />
        <BreakdownCard
          title="Direct traffic"
          description="How direct visits arrive"
          rows={sources.direct}
          format="percent"
        />
      </div>

      {/* Landing + exit pages */}
      <div className="grid gap-6 lg:grid-cols-2">
        <BreakdownCard
          title="Landing pages"
          description="First page of each session"
          rows={sources.landingPages}
        />
        <BreakdownCard
          title="Exit pages"
          description="Last page before leaving the site"
          rows={sources.exitPages}
        />
      </div>
    </div>
  );
}
