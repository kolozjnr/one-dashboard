"use client";

import type { ReactNode } from "react";
import { FilterToolbar } from "@/components/analytics/filter-toolbar";
import { useAnalytics } from "@/components/analytics/analytics-context";
import {
  DisconnectedState,
  ErrorState,
  NoAccountsState,
  NoMetricsState,
} from "@/components/analytics/states";
import { PLATFORMS } from "@/lib/analytics/registry";
import {
  preferredMetricIds,
  useDashboardLayout,
  visibleWidgets,
  type DashboardWidgetId,
} from "@/lib/analytics/dashboard-layout";
import {
  getWidget,
  resolveWidgetAvailability,
  widgetSourceLabel,
  type WidgetAvailability,
  type WidgetDefinition,
} from "@/components/analytics/widget-registry";
import type { ConnectedAccount } from "@/lib/analytics/types";

/**
 * Dashboard body — every widget below the header is driven by the widget
 * registry. The saved layout decides order and visibility, the registry
 * decides what each widget is and whether it can render for the current
 * source selection, and the widget component owns its loading / empty /
 * error states. Nothing here hard-codes a widget id.
 */
export function DashboardBody() {
  const { selectedAccounts, loading, errorAccount, retryAccount } = useAnalytics();
  const [layout] = useDashboardLayout();
  const preferred = preferredMetricIds(layout);

  // Nothing selected — ask the user to pick connected apps.
  if (!loading && selectedAccounts.length === 0) {
    return (
      <>
        <FilterToolbar />
        <div className="rounded-lg border border-line bg-surface">
          <NoAccountsState />
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

  const renderWidget = (id: DashboardWidgetId): ReactNode => {
    const widget = getWidget(id);
    if (!widget) return null;

    const availability = resolveWidgetAvailability(widget, {
      selectedAccounts,
      loading,
    });

    if (availability !== "available") {
      // Pin the error state to the account inside this widget's own scope
      // so "Retry" always re-syncs the source the widget depends on.
      const scoped =
        widget.platforms.length === 0
          ? selectedAccounts
          : selectedAccounts.filter((account) => widget.platforms.includes(account.platformId));
      const failed = scoped.find((account) => account.status === "error") ?? errorAccount;
      return (
        <WidgetUnavailable
          widget={widget}
          availability={availability}
          errorAccount={failed}
          onRetry={retryAccount}
        />
      );
    }

    const Component = widget.component;
    return <Component preferred={preferred} />;
  };

  /** A single grid/stack cell: content plus the widget's minimum height. */
  const renderSlot = (id: DashboardWidgetId) => {
    const minHeight = getWidget(id)?.display.minHeight;
    return (
      <div key={id} style={minHeight ? { minHeight } : undefined}>
        {renderWidget(id)}
      </div>
    );
  };

  const visible = visibleWidgets(layout);

  // Group runs of adjacent compact widgets so they pair side-by-side;
  // every other widget stacks at full width.
  const groups: { compact: boolean; ids: DashboardWidgetId[] }[] = [];
  for (const id of visible) {
    const compact = getWidget(id)?.display.compact === true;
    const last = groups[groups.length - 1];
    if (compact && last?.compact) last.ids.push(id);
    else groups.push({ compact, ids: [id] });
  }

  return (
    <>
      <FilterToolbar />

      {errorAccount && selectedAccounts.length > 1 && (
        <div className="mb-6 rounded-lg border border-line bg-surface">
          <ErrorState
            accountName={PLATFORMS[errorAccount.platformId].label}
            onRetry={() => retryAccount(errorAccount.id)}
          />
        </div>
      )}

      <div data-tour="dashboard-widgets" className="space-y-6">
        {groups.map((group) =>
          group.compact ? (
            <div key={group.ids.join("-")} className="grid gap-6 lg:grid-cols-2">
              {group.ids.map(renderSlot)}
            </div>
          ) : (
            renderSlot(group.ids[0])
          ),
        )}
      </div>
    </>
  );
}

/** Explains, in words, why a widget cannot render right now. */
function WidgetUnavailable({
  widget,
  availability,
  errorAccount,
  onRetry,
}: {
  widget: WidgetDefinition;
  availability: WidgetAvailability;
  errorAccount: ConnectedAccount | null;
  onRetry: (id: string) => void;
}) {
  let body: ReactNode;
  switch (availability) {
    case "noAccounts":
      body = <NoAccountsState />;
      break;
    case "disconnected":
      body = <DisconnectedState sourceLabel={widgetSourceLabel(widget)} />;
      break;
    case "error":
      body = errorAccount ? (
        <ErrorState
          accountName={PLATFORMS[errorAccount.platformId].label}
          onRetry={() => onRetry(errorAccount.id)}
        />
      ) : (
        <DisconnectedState sourceLabel={widgetSourceLabel(widget)} />
      );
      break;
    case "noMetrics":
    default:
      body = (
        <NoMetricsState
          description={`${widget.title} needs metrics that none of the selected sources report.`}
        />
      );
      break;
  }

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-surface">
      <header className="border-b border-line bg-sunken/40 px-4 py-2.5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-faint">
          {widget.title}
        </h3>
      </header>
      {body}
    </section>
  );
}
