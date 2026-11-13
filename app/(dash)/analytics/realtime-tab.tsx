"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/analytics/format";
import { getRealtimeSnapshot, type Website } from "@/lib/analytics/website-data";
import { ChartTooltip, StatTile } from "./shared";

const REFRESH_MS = 3_000;

/**
 * Real-time tab — simulated live visitor monitoring. The snapshot is
 * re-rolled on a timer so counters, the per-minute chart and the active
 * visitor table keep moving without any backend.
 */
export function RealtimeTab({ website }: { website: Website }) {
  const [tick, setTick] = useState(0);
  // Derived from the tick — pure render, no setState inside effects.
  const snapshot = useMemo(() => getRealtimeSnapshot(website.id, tick), [website.id, tick]);

  // Re-roll the mock snapshot on a timer while the tab is mounted.
  useEffect(() => {
    const id = window.setInterval(() => setTick((value) => value + 1), REFRESH_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="space-y-6">
      {/* Live stat tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Active visitors" value={snapshot.activeVisitors} live hint="Right now on the site" />
        <StatTile label="Visitors per minute" value={snapshot.visitorsPerMinute} live hint="Rolling 60-second window" />
        <StatTile label="Page views per minute" value={snapshot.pageViewsPerMinute} live hint="Rolling 60-second window" />
      </div>

      {/* Real-time chart */}
      <section className="rounded-lg border border-line bg-surface p-5">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-ink">Live visitors</h3>
            <p className="mt-0.5 text-xs text-faint">
              Active visitors per minute · last 30 minutes · updates every {REFRESH_MS / 1000}s
            </p>
          </div>
          <Badge variant="success">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" aria-hidden="true" />
            Live
          </Badge>
        </header>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={snapshot.series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="realtime-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--faint)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--line)" }}
                minTickGap={30}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--faint)" }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--line)" }} />
              <Area
                type="stepAfter"
                dataKey="visitors"
                name="Active visitors"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#realtime-fill)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Active visitors table */}
      <section className="rounded-lg border border-line bg-surface p-5">
        <header className="mb-4">
          <h3 className="text-sm font-semibold text-ink">Active visitors</h3>
          <p className="mt-0.5 text-xs text-faint">
            Anonymous visitors currently browsing — personal information is never shown.
          </p>
        </header>

        <div className="relative w-full overflow-x-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b [&_tr]:border-line">
              <tr>
                {["Visitor", "Country", "Device", "Browser", "Operating system", "Current page", "Source", "On site"].map(
                  (heading) => (
                    <th
                      key={heading}
                      className="h-10 whitespace-nowrap px-3 text-left text-xs font-medium text-faint"
                    >
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {snapshot.visitors.map((visitor) => (
                <tr
                  key={visitor.id}
                  className="border-b border-line transition-colors last:border-0 hover:bg-sunken/60"
                >
                  <td className="px-3 py-3 align-middle text-sm">
                    <span className="font-mono text-xs text-muted">{visitor.id}</span>
                  </td>
                  <td className="px-3 py-3 align-middle text-sm text-ink">{visitor.country}</td>
                  <td className="px-3 py-3 align-middle text-sm text-ink">
                    <Badge variant="neutral">{visitor.device}</Badge>
                  </td>
                  <td className="px-3 py-3 align-middle text-sm text-ink">{visitor.browser}</td>
                  <td className="px-3 py-3 align-middle text-sm text-ink">{visitor.os}</td>
                  <td className="max-w-[14rem] truncate px-3 py-3 align-middle text-sm text-brand" title={visitor.page}>
                    {visitor.page}
                  </td>
                  <td className="px-3 py-3 align-middle text-sm text-muted">{visitor.source}</td>
                  <td className="px-3 py-3 align-middle text-sm text-faint">{formatDuration(visitor.activeSeconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-ghost">
          Showing {snapshot.visitors.length} of {snapshot.activeVisitors} active visitors.
        </p>
      </section>
    </div>
  );
}
