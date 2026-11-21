"use client";

import { useAnalytics } from "./analytics-context";
import { AnalyticsChart } from "./analytics-chart";
import { ContentPerformanceTable } from "./content-performance-table";
import { EngagementStatistics } from "./engagement-statistics";
import { PlatformMetricGrid, UniversalMetricGrid } from "./metric-grid";
import {
  ChartSkeleton,
  DisconnectedState,
  MetricGridSkeleton,
  NoAccountsState,
  NoDataState,
  NoMetricsState,
  SectionCard,
  TableSkeleton,
} from "./states";
import { WebsiteAnalytics } from "./website-analytics";
import { computeMetric } from "@/lib/analytics/mock-data";
import { getAudienceData } from "@/lib/analytics/audience-data";
import { normalizeAudience } from "@/lib/analytics/normalized";
import { getConversions } from "@/lib/analytics/website-data";
import { formatCompact, formatDuration, formatPercent } from "@/lib/analytics/format";
import { PLATFORMS, supportsMetric } from "@/lib/analytics/registry";
import type { ConnectedAccount } from "@/lib/analytics/types";

/**
 * Widget layer — one component per registry entry. Each widget owns its
 * loading, empty and disconnected states so the dashboard shell only has
 * to decide *whether* to render a widget, not *how* it behaves.
 *
 * The six original widgets delegate to the existing analytics components
 * (nothing is reimplemented); the audience, visitor-behaviour and
 * conversions widgets are new compact sections that reuse the shared
 * mock builders.
 */

/* ------------------------------------------------------------------ shared */

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md border border-line bg-sunken px-3 py-2">
      <p className="text-[11px] text-faint">{label}</p>
      <p className="mt-0.5 truncate text-base font-semibold text-ink">{value}</p>
      {hint && <p className="mt-0.5 truncate text-[11px] text-ghost">{hint}</p>}
    </div>
  );
}

/** First social (non-website) account in the current selection. */
function primarySocial(accounts: ConnectedAccount[]) {
  return accounts.find((account) => account.platformId !== "website") ?? null;
}

function websiteOf(accounts: ConnectedAccount[]) {
  return accounts.find((account) => account.platformId === "website") ?? null;
}

/* ------------------------------------------------------------------ overview */

export function MetricsWidget({ preferred }: { preferred?: string[] }) {
  const { loading, selectedAccounts } = useAnalytics();
  if (loading) return <MetricGridSkeleton count={7} />;
  if (selectedAccounts.length === 0) return <NoAccountsState />;
  return <UniversalMetricGrid preferred={preferred} />;
}

export function ChartWidget() {
  const { loading, selectedAccounts } = useAnalytics();
  if (loading) return <ChartSkeleton />;
  if (selectedAccounts.length === 0) {
    return (
      <SectionCard title="Performance over time">
        <NoAccountsState />
      </SectionCard>
    );
  }
  return <AnalyticsChart />;
}

/* ------------------------------------------------------------------ audience */

/**
 * Audience snapshot for the leading social source: total size, net growth,
 * share of new audience and the top countries.
 */
export function AudienceWidget() {
  const { loading, selectedAccounts, range } = useAnalytics();
  const social = primarySocial(selectedAccounts);

  if (loading) {
    return (
      <SectionCard title="Audience" description="Across the selected sources">
        <TableSkeleton rows={4} columns={2} />
      </SectionCard>
    );
  }
  if (selectedAccounts.length === 0) {
    return (
      <SectionCard title="Audience" description="Across the selected sources">
        <NoAccountsState />
      </SectionCard>
    );
  }
  if (!social) {
    return (
      <SectionCard title="Audience" description="Across the selected sources">
        <NoMetricsState description="Audience demographics are only reported by social accounts. Select a social source to see them." />
      </SectionCard>
    );
  }

  const data = getAudienceData(social.platformId);
  // Normalized view of the source payload: dimension records plus a
  // flexible `metadata` bag for anything source-specific.
  const audience = normalizeAudience(social, data, range);
  const countrySegments =
    audience.rows.find((row) => row.audience?.dimension === "country")?.audience?.segments ?? [];
  const platform = PLATFORMS[social.platformId];

  return (
    <SectionCard
      title="Audience"
      description={`${platform.label} · ${social.accountName}`}
      bodyClassName="space-y-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Total audience" value={formatCompact(data.summary.total)} />
        <StatTile
          label="Net growth"
          value={`+${formatCompact(data.summary.growth)}`}
          hint={formatPercent(data.summary.totalChangePct, { signed: true })}
        />
        <StatTile
          label="New audience"
          value={formatPercent(data.summary.newShare)}
          hint={`${formatCompact(data.newAudience)} new`}
        />
        <StatTile
          label="Returning"
          value={formatCompact(data.returningAudience)}
          hint="Seen before this period"
        />
      </div>

      {countrySegments.length > 0 ? (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">
            Top countries
          </h4>
          <ul className="space-y-2.5">
            {countrySegments.slice(0, 4).map((row) => (
              <li key={row.label}>
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="truncate text-muted" title={row.label}>
                    {row.label}
                  </span>
                  <span className="shrink-0 font-medium text-ink">
                    {formatPercent(row.share)}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-sunken">
                  <div
                    className="h-full rounded-full bg-brand transition-all duration-500"
                    style={{ width: `${Math.max(2, row.share)}%` }}
                    aria-hidden="true"
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <NoDataState
          title="No geographic data"
          description={`${platform.label} does not report follower locations for this account.`}
        />
      )}
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ engagement */

export function EngagementWidget() {
  return <EngagementStatistics />;
}

/* ------------------------------------------------------------------ website traffic */

export function WebsiteWidget() {
  const { loading, selectedAccounts } = useAnalytics();
  if (loading) {
    return (
      <SectionCard title="Website analytics" description="Loading website activity…">
        <TableSkeleton rows={5} columns={4} />
      </SectionCard>
    );
  }
  if (selectedAccounts.length === 0) {
    return (
      <SectionCard title="Website analytics">
        <NoAccountsState />
      </SectionCard>
    );
  }
  const website = websiteOf(selectedAccounts);
  if (!website) {
    return (
      <SectionCard title="Website analytics">
        <DisconnectedState sourceLabel="Your website" />
      </SectionCard>
    );
  }
  return <WebsiteAnalytics />;
}

/* ------------------------------------------------------------------ visitor behaviour */

/** Behavioural website metrics: bounce, duration, depth and exits. */
export function VisitorBehaviourWidget() {
  const { loading, selectedAccounts, range } = useAnalytics();
  const website = websiteOf(selectedAccounts);

  if (loading) {
    return (
      <SectionCard title="Visitor behaviour" description="How visitors move through your site">
        <TableSkeleton rows={4} columns={2} />
      </SectionCard>
    );
  }
  if (selectedAccounts.length === 0) {
    return (
      <SectionCard title="Visitor behaviour">
        <NoAccountsState />
      </SectionCard>
    );
  }
  if (!website) {
    return (
      <SectionCard title="Visitor behaviour">
        <DisconnectedState sourceLabel="Your website" />
      </SectionCard>
    );
  }

  const bounce = computeMetric("bounceRate", [website], range);
  const duration = computeMetric("avgSessionDuration", [website], range);
  const pageViews = computeMetric("pageViews", [website], range);
  const sessions = computeMetric("sessions", [website], range);

  if (!bounce && !duration) {
    return (
      <SectionCard title="Visitor behaviour">
        <NoMetricsState description="The selected website does not report behavioural metrics." />
      </SectionCard>
    );
  }

  const pagesPerSession =
    pageViews && sessions && sessions.value > 0 ? pageViews.value / sessions.value : null;

  return (
    <SectionCard
      title="Visitor behaviour"
      description="How visitors move through your site"
      bodyClassName="grid grid-cols-2 gap-3"
    >
      <StatTile label="Bounce rate" value={bounce ? formatPercent(bounce.value) : "—"} />
      <StatTile
        label="Avg. session"
        value={duration ? formatDuration(duration.value) : "—"}
      />
      <StatTile
        label="Pages / session"
        value={pagesPerSession !== null ? (Math.round(pagesPerSession * 10) / 10).toFixed(1) : "—"}
      />
      <StatTile
        label="Page views"
        value={pageViews ? formatCompact(pageViews.value) : "—"}
        hint={sessions ? `${formatCompact(sessions.value)} sessions` : undefined}
      />
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ conversions */

/** Conversion goals for the connected website. */
export function ConversionsWidget() {
  const { loading, selectedAccounts } = useAnalytics();
  const website = websiteOf(selectedAccounts);

  if (loading) {
    return (
      <SectionCard title="Conversions" description="Tracked goals on your website">
        <TableSkeleton rows={4} columns={2} />
      </SectionCard>
    );
  }
  if (selectedAccounts.length === 0) {
    return (
      <SectionCard title="Conversions">
        <NoAccountsState />
      </SectionCard>
    );
  }
  if (!website) {
    return (
      <SectionCard title="Conversions">
        <DisconnectedState sourceLabel="Your website" />
      </SectionCard>
    );
  }

  const data = getConversions(website.id);
  const goals = data.goals.slice(0, 4);

  if (goals.length === 0) {
    return (
      <SectionCard title="Conversions">
        <NoDataState
          title="No conversions yet"
          description="No tracked goals have completed in this period."
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Conversions"
      description={`${data.totalConversions.toLocaleString("en-US")} completions · ${formatPercent(data.conversionRate)} rate`}
      bodyClassName="space-y-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Conversions" value={formatCompact(data.totalConversions)} />
        <StatTile label="Revenue" value={`$${formatCompact(data.revenue)}`} />
      </div>
      <ul className="space-y-2">
        {goals.map((goal) => (
          <li
            key={goal.name}
            className="flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2"
          >
            <span className="min-w-0 truncate text-xs font-medium text-ink" title={goal.name}>
              {goal.name}
            </span>
            <span className="shrink-0 text-xs text-faint">
              {formatCompact(goal.completions)}
              <span className="ml-1.5 font-normal text-ghost">
                {formatPercent(goal.conversionRate)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ custom metrics */

export function PlatformMetricsWidget() {
  const { loading, selectedAccounts } = useAnalytics();
  if (loading) return <MetricGridSkeleton count={6} />;
  if (selectedAccounts.length === 0) {
    return (
      <SectionCard title="Platform metrics">
        <NoAccountsState />
      </SectionCard>
    );
  }
  return <PlatformMetricGrid />;
}

/* ------------------------------------------------------------------ content */

export function ContentWidget() {
  const { loading, selectedAccounts } = useAnalytics();
  if (loading) return <TableSkeleton rows={6} columns={6} />;
  if (selectedAccounts.length === 0) {
    return (
      <SectionCard title="Content performance">
        <NoAccountsState />
      </SectionCard>
    );
  }
  const hasContent = selectedAccounts.some((account) =>
    supportsMetric(account.platformId, "postsPublished"),
  );
  if (!hasContent) {
    return (
      <SectionCard title="Content performance">
        <NoMetricsState description="None of the selected sources publish trackable content." />
      </SectionCard>
    );
  }
  return <ContentPerformanceTable />;
}
