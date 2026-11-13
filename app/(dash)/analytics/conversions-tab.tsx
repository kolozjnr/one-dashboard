"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompact, formatNumber, formatPercent } from "@/lib/analytics/format";
import { getConversions, type Website } from "@/lib/analytics/website-data";
import { ChartTooltip, SectionHeading } from "./shared";

/**
 * Conversions tab — headline conversion stats, a goal funnel, conversions
 * over time, and a table of tracked goals.
 */
export function ConversionsTab({ website }: { website: Website }) {
  const data = useMemo(() => getConversions(website.id), [website.id]);

  const funnelWithDrop = data.funnel.map((stage, index) => {
    const previous = index === 0 ? stage.value : data.funnel[index - 1].value;
    return { ...stage, dropOff: index === 0 ? 100 : (stage.value / previous) * 100 };
  });

  return (
    <div className="space-y-6">
      {/* Headline stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="text-xs font-medium text-faint">Total conversions</p>
          <p className="mt-2 text-2xl font-semibold leading-none text-ink">
            {formatNumber(data.totalConversions)}
          </p>
          <p className="mt-2 text-[11px] text-ghost">All tracked goals combined</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="text-xs font-medium text-faint">Conversion rate</p>
          <p className="mt-2 text-2xl font-semibold leading-none text-green-500">
            {formatPercent(data.conversionRate)}
          </p>
          <p className="mt-2 text-[11px] text-ghost">Conversions ÷ sessions</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="text-xs font-medium text-faint">Revenue</p>
          <p className="mt-2 text-2xl font-semibold leading-none text-ink">
            ${formatNumber(data.revenue)}
          </p>
          <p className="mt-2 text-[11px] text-ghost">Attributed to purchase goals</p>
        </div>
      </div>

      {/* Funnel + trend */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-line bg-surface p-5">
          <header className="mb-4">
            <SectionHeading title="Conversion funnel" description="Stage-to-stage progression" />
          </header>
          <ul className="space-y-4">
            {funnelWithDrop.map((stage, index) => (
              <li key={stage.stage}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium text-ink">{stage.stage}</span>
                  <span className="tabular-nums text-muted">
                    {formatNumber(stage.value)}
                    {index > 0 && (
                      <span className="ml-2 text-xs text-faint">{formatPercent(stage.dropOff)} of previous</span>
                    )}
                  </span>
                </div>
                <div className="mt-1.5 h-6 overflow-hidden rounded-md bg-sunken">
                  <div
                    className="flex h-full items-center justify-end rounded-md px-2 text-[10px] font-semibold text-white transition-all duration-500"
                    style={{
                      width: `${Math.max(4, (stage.value / data.funnel[0].value) * 100)}%`,
                      backgroundColor: index === data.funnel.length - 1 ? "#22c55e" : "#ff5c39",
                    }}
                  >
                    {formatPercent((stage.value / data.funnel[0].value) * 100)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-line bg-surface p-5">
          <header className="mb-4">
            <SectionHeading title="Conversions over time" description="Last 14 days" />
          </header>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "var(--faint)" }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--line)" }}
                  minTickGap={24}
                />
                <YAxis
                  tickFormatter={(value: number) => formatCompact(value)}
                  tick={{ fontSize: 11, fill: "var(--faint)" }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="conversions"
                  name="Conversions"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Goals table */}
      <section className="rounded-lg border border-line bg-surface p-5">
        <header className="mb-4">
          <SectionHeading title="Tracked goals" description="Conversion performance per goal" />
        </header>
        <div className="relative w-full overflow-x-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b [&_tr]:border-line">
              <tr>
                {["Goal", "Completions", "Conversion rate", "Value"].map((heading) => (
                  <th
                    key={heading}
                    className="h-10 whitespace-nowrap px-3 text-left text-xs font-medium text-faint"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.goals.map((goal) => (
                <tr
                  key={goal.name}
                  className="border-b border-line transition-colors last:border-0 hover:bg-sunken/60"
                >
                  <td className="px-3 py-3 align-middle text-sm font-medium text-ink">{goal.name}</td>
                  <td className="px-3 py-3 align-middle text-sm tabular-nums text-ink">
                    {formatNumber(goal.completions)}
                  </td>
                  <td className="px-3 py-3 align-middle text-sm tabular-nums text-green-600 dark:text-green-400">
                    {formatPercent(goal.conversionRate)}
                  </td>
                  <td className="px-3 py-3 align-middle text-sm tabular-nums text-ink">
                    {goal.value > 0 ? `$${formatNumber(goal.value)}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
