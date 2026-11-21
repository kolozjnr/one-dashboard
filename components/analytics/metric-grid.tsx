"use client";

import { useAnalytics } from "./analytics-context";
import { MetricCard } from "./metric-card";
import { MetricGridSkeleton, NoMetricsState, SectionCard } from "./states";
import { computeMetric } from "@/lib/analytics/mock-data";
import {
  PLATFORMS,
  customMetricsFor,
  metricDefinition,
  universalMetricsFor,
} from "@/lib/analytics/registry";
import type { PlatformId } from "@/lib/analytics/types";

const GRID = "grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4";

/**
 * Universal KPI cards, derived from the registry: a card only exists when
 * at least one selected source reports the metric (no empty placeholders).
 * `preferred` narrows the set to the user's dashboard preference; when it
 * is undefined every supported metric renders. Metric ids the registry does
 * not model are still rendered through the generic definition fallback.
 */
export function UniversalMetricGrid({ preferred }: { preferred?: string[] }) {
  const { selectedAccounts, loading } = useAnalytics();
  const supported = universalMetricsFor(selectedAccounts.map((account) => account.platformId));
  const metricIds = preferred
    ? supported.filter((metricId) => preferred.includes(metricId))
    : supported;

  if (loading) return <MetricGridSkeleton count={Math.max(metricIds.length, 4)} />;
  if (metricIds.length === 0) {
    return (
      <NoMetricsState description="No universal metrics are reported by the selected sources, or none match your preferred KPI selection." />
    );
  }

  return (
    <div className={GRID}>
      {metricIds.map((metricId) => (
        <UniversalMetricCell key={metricId} metricId={metricId} />
      ))}
    </div>
  );
}

function UniversalMetricCell({ metricId }: { metricId: string }) {
  const { selectedAccounts, range } = useAnalytics();
  const result = computeMetric(metricId, selectedAccounts, range);
  if (!result) return null;

  const definition = metricDefinition(metricId);
  return (
    <MetricCard
      metricId={metricId}
      name={definition.label}
      value={result.value}
      changePct={result.changePct}
      previous={result.previous}
      format={definition.format}
      trend={result.sparkline}
      description={definition.description}
      displayValue={result.displayValue}
    />
  );
}

/**
 * Platform-specific metrics (Instagram Saves, TikTok completion rate,
 * Website sessions…). Cards are scoped to the accounts of their own
 * platform and carry a source badge.
 */
export function PlatformMetricGrid() {
  const { selectedAccounts, loading } = useAnalytics();
  const refs = customMetricsFor(selectedAccounts.map((account) => account.platformId));

  if (loading) return <MetricGridSkeleton count={Math.min(Math.max(refs.length, 4), 8)} />;
  if (refs.length === 0) {
    return (
      <SectionCard
        title="Platform metrics"
        description="Network-specific metrics from the selected sources"
      >
        <NoMetricsState description="None of the selected sources expose platform-specific metrics." />
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Platform metrics"
      description="Network-specific metrics from the selected sources"
      bodyClassName={GRID}
    >
      {refs.map((ref) => (
        <PlatformMetricCell
          key={`${ref.platformId}:${ref.metricId}`}
          platformId={ref.platformId}
          metricId={ref.metricId}
        />
      ))}
    </SectionCard>
  );
}

function PlatformMetricCell({
  platformId,
  metricId,
}: {
  platformId: PlatformId;
  metricId: string;
}) {
  const { selectedAccounts, range } = useAnalytics();
  const accounts = selectedAccounts.filter((account) => account.platformId === platformId);
  const result = computeMetric(metricId, accounts, range);
  if (!result) return null;

  const definition = metricDefinition(metricId);
  const platform = PLATFORMS[platformId];
  return (
    <MetricCard
      metricId={`${platformId}.${metricId}`}
      name={definition.label}
      value={result.value}
      changePct={result.changePct}
      previous={result.previous}
      format={definition.format}
      trend={result.sparkline}
      description={definition.description}
      displayValue={result.displayValue}
      platform={{
        label: platform.label,
        domain: platform.domain,
        color: platform.color,
      }}
    />
  );
}
