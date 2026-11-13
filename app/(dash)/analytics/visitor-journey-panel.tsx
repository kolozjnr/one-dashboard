"use client";

import { Badge } from "@/components/ui/badge";
import { formatDuration, formatFullDate } from "@/lib/analytics/format";
import type { VisitorRecord } from "@/lib/analytics/website-data";
import { cn } from "@/lib/utils";

const KIND_STYLES: Record<VisitorRecord["journey"][number]["kind"], { dot: string; chip: "default" | "success" | "neutral" | "warning" }> = {
  arrival: { dot: "bg-blue-500", chip: "neutral" },
  view: { dot: "bg-gray-400", chip: "neutral" },
  action: { dot: "bg-brand", chip: "default" },
  conversion: { dot: "bg-green-500", chip: "success" },
};

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return `${formatFullDate(date)} · ${date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })}`;
}

/**
 * Slide-over panel showing one anonymous visitor's chronological journey
 * (arrival → page views → actions → conversion) plus session metadata.
 */
export function VisitorJourneyPanel({
  visitor,
  onClose,
}: {
  visitor: VisitorRecord;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/40"
        aria-hidden="true"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Visitor journey for ${visitor.id}`}
        className="relative flex h-full w-full max-w-xl flex-col border-l border-line bg-surface shadow-2xl"
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate font-mono text-sm font-semibold text-ink">{visitor.id}</h2>
              <Badge variant={visitor.converted ? "success" : "neutral"}>
                {visitor.converted ? "Converted" : "Not converted"}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-faint">
              Anonymous visitor — no personal information is collected.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close visitor journey"
            onClick={onClose}
            className="rounded-md p-1 text-ghost transition-colors hover:bg-sunken hover:text-ink"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </header>

        {/* Session summary */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-line px-5 py-4 sm:grid-cols-3">
          {[
            { label: "Sessions", value: visitor.sessions },
            { label: "Page views", value: visitor.pageViews },
            { label: "Country", value: visitor.country },
            { label: "Device", value: visitor.device },
            { label: "Browser / OS", value: `${visitor.browser} · ${visitor.os}` },
            { label: "Traffic source", value: visitor.source },
            { label: "Referrer", value: visitor.referrer },
            { label: "Landed on", value: visitor.landedOn },
            { label: "First seen", value: formatTimestamp(visitor.firstSeen) },
          ].map((item) => (
            <div key={item.label} className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-ghost">{item.label}</p>
              <p className="truncate text-xs font-medium text-ink" title={String(item.value)}>
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* Chronological journey */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-faint">
            Visitor journey
          </h3>
          <ol className="relative space-y-0">
            {visitor.journey.map((step, index) => {
              const styles = KIND_STYLES[step.kind];
              const last = index === visitor.journey.length - 1;
              return (
                <li key={`${step.label}-${index}`} className="relative flex gap-3 pb-5 last:pb-0">
                  {!last && (
                    <span
                      className="absolute left-[7px] top-4 h-full w-px bg-line"
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={cn(
                      "relative mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full ring-4 ring-surface",
                      styles.dot,
                    )}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-ink">{step.label}</p>
                      <Badge variant={styles.chip}>{step.kind}</Badge>
                    </div>
                    <p className="mt-0.5 break-words text-xs text-faint">{step.detail}</p>
                    <p className="mt-1 text-[11px] text-ghost">{formatTimestamp(step.timestamp)}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
          <p className="text-[11px] text-ghost">
            Journey covers the last {formatDuration(visitor.pageViews * 42)} of on-site activity.
          </p>
          <Badge variant="outline">{visitor.id}</Badge>
        </footer>
      </aside>
    </div>
  );
}
