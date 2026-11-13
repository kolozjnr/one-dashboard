"use client";

import { AnalyticsChart } from "@/components/analytics/analytics-chart";
import { ContentPerformanceTable } from "@/components/analytics/content-performance-table";
import { EngagementStatistics } from "@/components/analytics/engagement-statistics";
import { FilterToolbar } from "@/components/analytics/filter-toolbar";
import { useAnalytics } from "@/components/analytics/analytics-context";
import { UniversalMetricGrid, PlatformMetricGrid } from "@/components/analytics/metric-grid";
import {
  ChartSkeleton,
  EmptyState,
  ErrorState,
  MetricGridSkeleton,
} from "@/components/analytics/states";
import { WebsiteAnalytics } from "@/components/analytics/website-analytics";
import { PLATFORMS } from "@/lib/analytics/registry";

/**
 * Dashboard body — everything below the header is driven by the shared
 * analytics state (selected apps + date range). Loading, empty and error
 * states are handled per section.
 */
export function DashboardBody() {
  const { selectedAccounts, loading, errorAccount, retryAccount } = useAnalytics();
  const hasWebsite = selectedAccounts.some((account) => account.platformId === "website");

  // Nothing selected — ask the user to pick connected apps.
  if (!loading && selectedAccounts.length === 0) {
    return (
      <>
        <FilterToolbar />
        <div className="rounded-lg border border-line bg-surface">
          <EmptyState
            title="No sources selected"
            description="Open the Connected Apps dropdown above and select one or more accounts to filter the analytics."
          />
        </div>
      </>
    );
  }

  // The only selected account failed to sync — show the error state alone.
  if (!loading && errorAccount && selectedAccounts.length === 1) {
    return (
      <>
        <FilterToolbar />
        <div className="rounded-lg border border-line bg-surface">
          <ErrorState
            accountName={PLATFORMS[errorAccount.platformId].label}
            onRetry={() => retryAccount(errorAccount.id)}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <FilterToolbar />

      {errorAccount && (
        <div className="mb-6 rounded-lg border border-line bg-surface">
          <ErrorState
            accountName={PLATFORMS[errorAccount.platformId].label}
            onRetry={() => retryAccount(errorAccount.id)}
          />
        </div>
      )}

      <div className="space-y-6">
        {/* Universal KPIs */}
        {loading ? <MetricGridSkeleton count={7} /> : <UniversalMetricGrid />}

        {/* One universal chart for every platform */}
        {loading ? <ChartSkeleton /> : <AnalyticsChart />}

        {/* Engagement + website analytics */}
        <div className={hasWebsite ? "grid gap-6 lg:grid-cols-2" : ""}>
          <EngagementStatistics />
          {hasWebsite && <WebsiteAnalytics />}
        </div>

        {/* Platform-specific metrics from the registry */}
        <PlatformMetricGrid />

        {/* Adaptive content table */}
        <ContentPerformanceTable />
      </div>
    </>
  );
}
