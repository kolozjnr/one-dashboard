"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MetricCard } from "@/components/analytics/metric-card";
import { SectionCard } from "@/components/analytics/states";
import { Dropdown } from "@/components/ui/dropdown";
import { formatCompact, formatNumber, formatPercent } from "@/lib/analytics/format";
import {
  getAudienceData,
  unsupportedAudienceSections,
} from "@/lib/analytics/audience-data";
import { CONNECTED_ACCOUNTS } from "@/lib/analytics/mock-data";
import { PLATFORMS } from "@/lib/analytics/registry";
import type { PlatformId } from "@/lib/analytics/types";
import { cn } from "@/lib/utils";
import { BarList, ChartTooltip, SectionHeading } from "../analytics/shared";

/** Unique platforms that have at least one connected account. */
const SOURCES: PlatformId[] = [
  ...new Set(CONNECTED_ACCOUNTS.map((account) => account.platformId)),
];

const GENDER_COLORS = ["#ff5c39", "#6366f1", "#94a3b8"];

/* ------------------------------------------------------------------ source picker */

function SourcePicker({
  value,
  onChange,
}: {
  value: PlatformId;
  onChange: (id: PlatformId) => void;
}) {
  const [open, setOpen] = useState(false);
  const platform = PLATFORMS[value];

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      align="end"
      panelClassName="w-[16rem]"
      trigger={
        <button
          type="button"
          className="flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-sunken"
        >
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: platform.color }}
            aria-hidden="true"
          />
          {platform.label}
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
      {open && (
        <ul className="py-1">
          {SOURCES.map((id) => {
            const item = PLATFORMS[id];
            const active = id === value;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-sunken",
                    active ? "font-medium text-brand" : "text-muted",
                  )}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                    aria-hidden="true"
                  />
                  {item.label}
                  {active && (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="ml-auto h-4 w-4">
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
  );
}

/* ------------------------------------------------------------------ heatmap */

function ActiveTimesHeatmap({
  days,
  slots,
  values,
}: {
  days: string[];
  slots: string[];
  values: number[][];
}) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[440px]">
        {/* Slot headers */}
        <div className="grid gap-1" style={{ gridTemplateColumns: `44px repeat(${slots.length}, minmax(0, 1fr))` }}>
          <span />
          {slots.map((slot) => (
            <span key={slot} className="text-center text-[10px] text-faint">
              {slot}
            </span>
          ))}
        </div>
        {/* Rows */}
        {days.map((day, dayIndex) => (
          <div
            key={day}
            className="mt-1 grid gap-1"
            style={{ gridTemplateColumns: `44px repeat(${slots.length}, minmax(0, 1fr))` }}
          >
            <span className="self-center text-[11px] text-faint">{day}</span>
            {slots.map((slot, slotIndex) => {
              const value = values[dayIndex][slotIndex];
              return (
                <div
                  key={slot}
                  title={`${day} ${slot}:00 — ${value}% relative activity`}
                  className="h-8 rounded-sm transition-transform hover:scale-105"
                  style={{
                    backgroundColor: `rgba(255, 92, 57, ${(0.08 + (value / 100) * 0.92).toFixed(2)})`,
                  }}
                />
              );
            })}
          </div>
        ))}
        {/* Legend */}
        <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-faint">
          <span>Less active</span>
          <span
            className="h-2 w-24 rounded-full"
            style={{
              background: "linear-gradient(90deg, rgba(255,92,57,0.08), rgba(255,92,57,1))",
            }}
            aria-hidden="true"
          />
          <span>More active</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ page body */

/**
 * Audience insights body — pick a source, then explore only the sections
 * that source supports: headline audience KPIs, growth curve, follower
 * demographics, age/gender splits, geography, active-time heatmap and the
 * hourly online curve. Unsupported sections are hidden behind a single
 * capability note instead of rendering empty panels.
 */
export function AudienceBody() {
  const [platformId, setPlatformId] = useState<PlatformId>("instagram");
  const data = useMemo(() => getAudienceData(platformId), [platformId]);
  const platform = PLATFORMS[platformId];

  const unsupported = unsupportedAudienceSections(platformId);
  const { summary } = data;

  const previousOf = (value: number, changePct: number) =>
    changePct <= -99.9 ? value : value / (1 + changePct / 100);

  const growthTrend = summary.trend.map((value, index) => value * (0.02 + index * 0.002));
  const newTrend = summary.trend.map((value, index) => value * (0.2 + (index % 5) * 0.01));
  const returningTrend = summary.trend.map((value, index) => value * (0.6 - (index % 4) * 0.01));

  const genderData = data.gender.map((row) => ({ name: row.label, value: row.share }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-ink">Audience Insights</h1>
          <p className="mt-1 text-sm text-faint">
            Understand who follows you — demographics, geography and activity patterns
            for each connected source.
          </p>
        </div>
        <SourcePicker value={platformId} onChange={setPlatformId} />
      </header>

      {/* Capability note — what this source cannot report */}
      {unsupported.length > 0 && (
        <div
          role="status"
          className="rounded-lg border border-line bg-sunken px-4 py-3 text-xs text-faint"
        >
          <span className="font-medium text-muted">{platform.label}</span> does not report{" "}
          {unsupported.join(", ").toLowerCase()}. Those sections are hidden for this source.
        </div>
      )}

      {/* Headline KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          metricId="audience.total"
          name="Total audience"
          value={summary.total}
          changePct={summary.totalChangePct}
          previous={previousOf(summary.total, summary.totalChangePct)}
          format="compact"
          trend={summary.trend}
          platform={{ label: platform.label, color: platform.color }}
          description="Followers, subscribers or unique visitors across the selected source."
        />
        <MetricCard
          metricId="audience.growth"
          name="Audience growth"
          value={summary.growth}
          changePct={summary.growthChangePct}
          previous={previousOf(summary.growth, summary.growthChangePct)}
          format="number"
          trend={growthTrend}
          platform={{ label: platform.label, color: platform.color }}
          description="Net audience gained during the selected period."
        />
        <MetricCard
          metricId="audience.new"
          name="New this period"
          value={data.newAudience}
          changePct={summary.growthChangePct}
          previous={previousOf(data.newAudience, summary.growthChangePct)}
          format="number"
          trend={newTrend}
          platform={{ label: platform.label, color: platform.color }}
          description="First-time followers or visitors acquired in the period."
        />
        <MetricCard
          metricId="audience.returning"
          name="Returning"
          value={data.returningAudience}
          changePct={summary.totalChangePct}
          previous={previousOf(data.returningAudience, summary.totalChangePct)}
          format="number"
          trend={returningTrend}
          platform={{ label: platform.label, color: platform.color }}
          description="Existing audience that remained active in the period."
        />
      </div>

      {/* Audience growth curve */}
      <SectionCard
        title="Audience growth"
        description={`Total audience trend · ${platform.label}`}
      >
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={summary.trend.map((value, index) => ({ index, value }))} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="audience-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={platform.color} stopOpacity={0.28} />
                  <stop offset="95%" stopColor={platform.color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis
                dataKey="index"
                tickFormatter={(value: number) => `D-${13 - value}`}
                tick={{ fontSize: 11, fill: "var(--faint)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--line)" }}
                minTickGap={24}
              />
              <YAxis
                tickFormatter={(value: number) => formatCompact(value)}
                tick={{ fontSize: 11, fill: "var(--faint)" }}
                tickLine={false}
                axisLine={false}
                width={56}
              />
              <Tooltip content={<ChartTooltip format="compact" />} />
              <Area
                type="monotone"
                dataKey="value"
                name="Audience"
                stroke={platform.color}
                strokeWidth={2}
                fill="url(#audience-fill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Follower demographics — new vs returning */}
        {data.capabilities.demographics && (
          <SectionCard
            title="Follower demographics"
            description="New vs returning audience in this period"
          >
            <div className="flex items-center gap-6">
              <div className="min-w-0 flex-1">
                <div className="flex h-3 overflow-hidden rounded-full bg-sunken">
                  <div
                    className="bg-brand"
                    style={{ width: `${summary.newShare}%` }}
                    aria-hidden="true"
                  />
                  <div className="flex-1 bg-indigo-500" aria-hidden="true" />
                </div>
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-muted">
                      <span className="h-2 w-2 rounded-full bg-brand" aria-hidden="true" />
                      New followers
                    </span>
                    <span className="font-medium text-ink">
                      {formatNumber(data.newAudience)} · {formatPercent(summary.newShare)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-muted">
                      <span className="h-2 w-2 rounded-full bg-indigo-500" aria-hidden="true" />
                      Returning
                    </span>
                    <span className="font-medium text-ink">
                      {formatNumber(data.returningAudience)} ·{" "}
                      {formatPercent(100 - summary.newShare)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>
        )}

        {/* Age distribution */}
        {data.capabilities.age && (
          <SectionCard title="Age distribution" description="Share of audience by age group">
            <div className="h-[190px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.age} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "var(--faint)" }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--line)" }}
                  />
                  <YAxis
                    tickFormatter={(value: number) => `${value}%`}
                    tick={{ fontSize: 11, fill: "var(--faint)" }}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                  />
                  <Tooltip content={<ChartTooltip format="percent" />} cursor={{ fillOpacity: 0.08 }} />
                  <Bar dataKey="share" name="Share" fill="#ff5c39" radius={[3, 3, 0, 0]} maxBarSize={34} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        )}

        {/* Gender distribution */}
        {data.capabilities.gender && (
          <SectionCard
            title="Gender distribution"
            description="Where the source reports gender data"
          >
            <div className="flex flex-wrap items-center gap-6">
              <div className="h-[170px] w-[170px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={genderData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={48}
                      outerRadius={80}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {genderData.map((_, index) => (
                        <Cell key={index} fill={GENDER_COLORS[index % GENDER_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip format="percent" />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="min-w-[10rem] flex-1 space-y-2.5 text-sm">
                {genderData.map((row, index) => (
                  <li key={row.name} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-muted">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: GENDER_COLORS[index % GENDER_COLORS.length] }}
                        aria-hidden="true"
                      />
                      {row.name}
                    </span>
                    <span className="font-medium text-ink">{formatPercent(row.value)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </SectionCard>
        )}

        {/* Geographic distribution */}
        {data.capabilities.countries && (
          <SectionCard
            title="Geographic distribution"
            description="Top countries by audience share"
          >
            <BarList
              rows={data.countries.slice(0, 7).map((row) => ({
                label: row.label,
                value: row.share,
                share: row.share,
              }))}
              valueFormatter={(row) => formatPercent(row.share)}
            />
          </SectionCard>
        )}

        {/* Top cities */}
        {data.capabilities.cities && (
          <SectionCard title="Top cities" description="Where your audience is based">
            <BarList
              rows={data.cities.slice(0, 7).map((row) => ({
                label: row.label,
                value: row.share,
                share: row.share,
              }))}
              valueFormatter={(row) => formatPercent(row.share)}
            />
          </SectionCard>
        )}
      </div>

      {/* Active audience times */}
      {data.capabilities.activeTimes && (
        <SectionCard
          title="Active audience times"
          description="Relative activity by day and time of day — darker means more of your audience is online"
        >
          <ActiveTimesHeatmap {...data.activeTimes} />
        </SectionCard>
      )}

      {/* Audience online hours */}
      {data.capabilities.onlineHours && (
        <SectionCard
          title="Audience online hours"
          description="Share of the audience typically online each hour"
        >
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.onlineHours} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id="hours-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff5c39" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#ff5c39" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                <XAxis
                  dataKey="label"
                  interval={2}
                  tick={{ fontSize: 11, fill: "var(--faint)" }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--line)" }}
                />
                <YAxis
                  tickFormatter={(value: number) => `${value}%`}
                  tick={{ fontSize: 11, fill: "var(--faint)" }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <Tooltip content={<ChartTooltip format="percent" />} />
                <Area
                  type="monotone"
                  dataKey="share"
                  name="Online"
                  stroke="#ff5c39"
                  strokeWidth={2}
                  fill="url(#hours-fill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-xs text-ghost">
            Peak window:{" "}
            <span className="font-medium text-muted">
              {data.onlineHours.reduce((best, hour) => (hour.share > best.share ? hour : best)).label}
            </span>{" "}
            — best time to publish for {platform.label}.
          </p>
        </SectionCard>
      )}

      {/* Everything hidden fallback — impossible for current capabilities, but safe */}
      {unsupported.length >= 7 && (
        <SectionCard title="No audience data">
          <SectionHeading
            title="Nothing to show"
            description="This source exposes no audience data at all."
          />
        </SectionCard>
      )}
    </div>
  );
}
