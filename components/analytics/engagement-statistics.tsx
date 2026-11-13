"use client";

import { useAnalytics } from "./analytics-context";
import { EmptyState, SectionCard, TableSkeleton } from "./states";
import { formatCompact, formatPercent } from "@/lib/analytics/format";
import { buildEngagementBreakdown } from "@/lib/analytics/mock-data";

/**
 * Engagement statistics: unions the interaction types of the selected
 * sources (likes, comments, shares, saves…) and weights them by each
 * account's engagement total for the active date range.
 */
export function EngagementStatistics() {
  const { selectedAccounts, range, loading } = useAnalytics();

  if (loading) {
    return (
      <SectionCard title="Engagement statistics" description="Across the selected sources">
        <TableSkeleton rows={5} columns={2} />
      </SectionCard>
    );
  }

  const slices = buildEngagementBreakdown(selectedAccounts, range);

  if (!slices) {
    return (
      <SectionCard title="Engagement statistics" description="Across the selected sources">
        <EmptyState
          title="No engagement data"
          description="The selected sources do not report engagement. Add a social account to see its interaction breakdown."
        />
      </SectionCard>
    );
  }

  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const top = slices[0];

  return (
    <SectionCard
      title="Engagement statistics"
      description="Across the selected sources"
      bodyClassName="space-y-4"
    >
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-ink">{formatCompact(total)}</span>
        <span className="text-xs text-faint">interactions · {top.label} leads</span>
      </div>

      <ul className="space-y-3">
        {slices.map((slice) => (
          <li key={slice.label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-muted">{slice.label}</span>
              <span className="font-medium text-ink">
                {formatCompact(slice.value)}
                <span className="ml-2 font-normal text-ghost">
                  {formatPercent(slice.share)}
                </span>
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-sunken">
              <div
                className="h-full rounded-full bg-brand transition-all duration-500"
                style={{ width: `${Math.max(2, slice.share)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
