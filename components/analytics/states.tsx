import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Shared loading / empty / error building blocks for every dashboard section. */

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-line bg-surface p-5", className)}>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-faint">{description}</p>}
        </div>
        {actions}
      </header>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-sunken text-ghost">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20 13V7a2 2 0 00-2-2h-4l-2 2h-4a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-3"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4l16 16" />
        </svg>
      </span>
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-faint">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  accountName,
  onRetry,
}: {
  accountName: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center px-4 py-12 text-center"
    >
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-500">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 8v5m0 3.5h.01M10.3 3.9L2.5 17.4A2 2 0 004.2 20.5h15.6a2 2 0 001.7-3.1L13.7 3.9a2 2 0 00-3.4 0z"
          />
        </svg>
      </span>
      <p className="text-sm font-medium text-ink">Could not fetch analytics</p>
      <p className="mt-1 max-w-sm text-xs text-faint">
        {accountName} failed to synchronise. Retry the connection to load its metrics.
      </p>
      <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
        Retry sync
      </Button>
    </div>
  );
}

/** Grid of metric-card skeletons. */
export function MetricGridSkeleton({ count = 7 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-lg border border-line bg-surface p-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-7 w-20" />
          <Skeleton className="mt-3 h-3 w-28" />
          <Skeleton className="mt-4 h-8 w-full" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-56" />
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

export function TableSkeleton({ rows = 6, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-full" />
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 shrink-0" />
          {Array.from({ length: columns }).map((_, cellIndex) => (
            <Skeleton
              key={cellIndex}
              className={cn("h-4", cellIndex === 0 ? "w-40" : "w-16")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ contextual states */

/**
 * Empty-state shell used by every contextual state below so spacing,
 * icon treatment and copy rhythm stay identical across widgets.
 */
function StateShell({
  icon,
  title,
  description,
  action,
  tone = "neutral",
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  tone?: "neutral" | "warning" | "danger";
}) {
  const toneClass =
    tone === "danger"
      ? "bg-red-500/10 text-red-500"
      : tone === "warning"
        ? "bg-amber-500/10 text-amber-500"
        : "bg-sunken text-ghost";
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      <span className={cn("mb-3 flex h-10 w-10 items-center justify-center rounded-full", toneClass)}>
        {icon}
      </span>
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-faint">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

const folderIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
    />
  </svg>
);

const gaugeIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 14l3.5-3.5M5 18a9 9 0 1114 0"
    />
  </svg>
);

const plugIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 3v5M15 3v5M7 8h10v3a5 5 0 01-10 0V8zM12 16v5"
    />
  </svg>
);

const filterIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16l-6 7v6l-4 2v-8L4 5z" />
  </svg>
);

/** No connected / selected accounts. */
export function NoAccountsState({ action }: { action?: ReactNode }) {
  return (
    <StateShell
      icon={folderIcon}
      title="No connected accounts"
      description="Connect a source or open the Connected Apps dropdown to select the accounts you want to analyse."
      action={action}
    />
  );
}

/** Accounts selected, but none of them report this widget's metrics. */
export function NoMetricsState({
  title = "No available metrics",
  description = "None of the selected sources report the metrics this section needs. Pick a supporting source.",
}: {
  title?: string;
  description?: string;
}) {
  return <StateShell icon={gaugeIcon} title={title} description={description} />;
}

/** Sources are fine but there is no data for the active filters. */
export function NoDataState({
  title = "No analytics data",
  description = "There is nothing to show for the selected sources and date range. Try widening the range.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <StateShell
      icon={folderIcon}
      title={title}
      description={description}
      tone="warning"
    />
  );
}

/** The source this widget depends on is disconnected. */
export function DisconnectedState({
  sourceLabel = "This source",
  onReconnect,
}: {
  sourceLabel?: string;
  onReconnect?: () => void;
}) {
  return (
    <StateShell
      icon={plugIcon}
      tone="danger"
      title="Source disconnected"
      description={`${sourceLabel} isn't available in the current selection, so this section cannot load its data.`}
      action={
        onReconnect ? (
          <Button variant="outline" size="sm" onClick={onReconnect}>
            Reconnect
          </Button>
        ) : undefined
      }
    />
  );
}

/** Filters removed every row — distinct from "no data at all". */
export function NoResultsState({
  title = "No results after filtering",
  description = "No entries match the current search or filters. Clear them to see everything again.",
  onClear,
}: {
  title?: string;
  description?: string;
  onClear?: () => void;
}) {
  return (
    <StateShell
      icon={filterIcon}
      title={title}
      description={description}
      action={
        onClear ? (
          <Button variant="outline" size="sm" onClick={onClear}>
            Clear filters
          </Button>
        ) : undefined
      }
    />
  );
}
