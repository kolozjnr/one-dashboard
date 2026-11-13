"use client";

import { useMemo } from "react";
import {
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
import { formatNumber, formatPercent } from "@/lib/analytics/format";
import { getDeviceBreakdown, type Website } from "@/lib/analytics/website-data";
import { BarList, ChartTooltip, SectionHeading } from "./shared";

const DEVICE_COLORS = ["#ff5c39", "#3b82f6", "#f59e0b"];

/**
 * Devices tab — device, browser and operating-system breakdowns plus the
 * geographic distribution of visitors.
 */
export function DevicesTab({ website }: { website: Website }) {
  const data = useMemo(() => getDeviceBreakdown(website.id), [website.id]);

  const deviceData = data.devices.map((row, index) => ({
    ...row,
    fill: DEVICE_COLORS[index % DEVICE_COLORS.length],
  }));

  return (
    <div className="space-y-6">
      {/* Device donut + browser bar */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-line bg-surface p-5">
          <header className="mb-4">
            <SectionHeading title="Device breakdown" description="Share of unique visitors by device" />
          </header>
          <div className="grid items-center gap-4 sm:grid-cols-2">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deviceData}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {deviceData.map((entry) => (
                      <Cell key={entry.label} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-3">
              {deviceData.map((row) => (
                <li key={row.label} className="text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-muted">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.fill }} />
                      {row.label}
                    </span>
                    <span className="tabular-nums text-ink">
                      {formatNumber(row.value)}{" "}
                      <span className="text-xs text-faint">({formatPercent(row.share)})</span>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5">
          <header className="mb-4">
            <SectionHeading title="Browser breakdown" description="Unique visitors per browser" />
          </header>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.browsers} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "var(--faint)" }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--line)" }}
                />
                <YAxis
                  tickFormatter={(value: number) => formatNumber(value)}
                  tick={{ fontSize: 11, fill: "var(--faint)" }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fillOpacity: 0.08 }} />
                <Bar dataKey="value" name="Visitors" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Operating systems + geography */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-line bg-surface p-5">
          <header className="mb-4">
            <SectionHeading title="Operating systems" description="Unique visitors per OS" />
          </header>
          <BarList
            rows={data.operatingSystems}
            valueFormatter={(row) => `${formatNumber(row.value)} · ${formatPercent(row.share)}`}
          />
        </section>

        <section className="rounded-lg border border-line bg-surface p-5">
          <header className="mb-4">
            <SectionHeading
              title="Geographic distribution"
              description="Visitors by country — top 10"
            />
          </header>
          <BarList
            rows={data.countries}
            valueFormatter={(row) => `${formatNumber(row.value)} · ${formatPercent(row.share)}`}
          />
        </section>
      </div>
    </div>
  );
}
