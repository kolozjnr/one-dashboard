"use client";

import { useAnalytics } from "./analytics-context";
import { DisconnectedState, EmptyState, SectionCard, TableSkeleton } from "./states";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCompact, formatDuration, formatPercent } from "@/lib/analytics/format";
import { buildWebsiteAnalytics } from "@/lib/analytics/mock-data";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-sunken px-3 py-2">
      <p className="text-[11px] text-faint">{label}</p>
      <p className="mt-0.5 truncate text-base font-semibold text-ink">{value}</p>
    </div>
  );
}

/**
 * Website analytics for the connected site: audience size, most visited
 * pages, traffic sources and recent activity. When no website source is
 * selected it renders a disconnected state rather than disappearing, so
 * the section always explains itself.
 */
export function WebsiteAnalytics() {
  const { selectedAccounts, range, loading } = useAnalytics();

  if (loading) {
    return (
      <SectionCard title="Website analytics" description="Loading website activity…">
        <TableSkeleton rows={5} columns={4} />
      </SectionCard>
    );
  }

  const analytics = buildWebsiteAnalytics(selectedAccounts, range);
  if (!analytics) {
    return (
      <SectionCard
        title="Website analytics"
        description="Traffic, pages and sources for the connected site"
      >
        <DisconnectedState sourceLabel="Your website" />
      </SectionCard>
    );
  }

  const website = selectedAccounts.find((account) => account.platformId === "website");

  return (
    <SectionCard
      title="Website analytics"
      description={`${website?.accountName ?? "Connected site"} · ${analytics.pages.length} top pages`}
    >
      {!website ? (
        <EmptyState
          title="Website disconnected"
          description="Connect your website to track visitors, sessions and the most visited pages."
        />
      ) : (
        <div className="space-y-5">
          {/* Headline numbers */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Users" value={formatCompact(analytics.users)} />
            <Stat label="Sessions" value={formatCompact(analytics.sessions)} />
            <Stat label="Page views" value={formatCompact(analytics.pageViews)} />
            <Stat label="Conversions" value={formatCompact(analytics.conversions)} />
            <Stat label="Bounce rate" value={formatPercent(analytics.bounceRate)} />
            <Stat label="Avg. session" value={formatDuration(analytics.avgSessionDuration)} />
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
            {/* Most visited pages */}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">
                Most visited pages
              </h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Page</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                    <TableHead className="text-right">Visitors</TableHead>
                    <TableHead className="text-right">Avg. time</TableHead>
                    <TableHead className="text-right">Exit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.pages.map((page) => (
                    <TableRow key={page.path}>
                      <TableCell className="font-medium">{page.path}</TableCell>
                      <TableCell className="text-right">{formatCompact(page.views)}</TableCell>
                      <TableCell className="text-right">
                        {formatCompact(page.visitors)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatDuration(page.avgTime)}
                      </TableCell>
                      <TableCell className="text-right text-faint">
                        {formatPercent(page.exitRate)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Sources + activity */}
            <div className="space-y-5">
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">
                  Traffic sources
                </h4>
                <ul className="space-y-2">
                  {analytics.sources.map((source) => (
                    <li key={source.label} className="flex items-center gap-3 text-xs">
                      <span className="w-16 shrink-0 text-muted">{source.label}</span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-sunken">
                        <span
                          className="block h-full rounded-full bg-brand"
                          style={{ width: `${Math.max(2, source.share)}%` }}
                        />
                      </span>
                      <span className="w-20 shrink-0 text-right font-medium text-ink">
                        {formatCompact(source.sessions)}
                        <span className="ml-1 font-normal text-ghost">
                          {formatPercent(source.share)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">
                  Recent activity
                </h4>
                <ul className="space-y-2.5">
                  {analytics.activities.map((activity) => (
                    <li key={activity.label} className="flex items-start gap-2.5 text-xs">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                      <span className="min-w-0">
                        <span className="font-medium text-ink">{activity.label}</span>
                        <span className="block truncate text-faint">{activity.detail}</span>
                      </span>
                      <span className="ml-auto shrink-0 text-ghost">{activity.when}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
