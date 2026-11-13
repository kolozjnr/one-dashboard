"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  dateCutoff,
  EVENT_TYPES,
  getEvents,
  getVisitors,
  type ActivityEvent,
  type EventTypeId,
  type VisitorRecord,
  type Website,
} from "@/lib/analytics/website-data";
import { cn } from "@/lib/utils";
import { SectionHeading } from "./shared";
import { VisitorJourneyPanel } from "./visitor-journey-panel";

type DatePreset = "today" | "7d" | "30d" | "all";

const DATE_OPTIONS: { id: DatePreset; label: string; hours: number | null }[] = [
  { id: "today", label: "Today", hours: 24 },
  { id: "7d", label: "Last 7 days", hours: 24 * 7 },
  { id: "30d", label: "Last 30 days", hours: 24 * 30 },
  { id: "all", label: "All time", hours: null },
];

const TYPE_BADGE: Partial<Record<EventTypeId, "default" | "success" | "warning" | "danger" | "neutral">> = {
  page_view: "neutral",
  purchase: "success",
  form_submit: "success",
  checkout_start: "warning",
  custom: "default",
};

const selectClass =
  "rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/40";

function formatEventTime(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  const time = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  if (sameDay) return `Today ${time}`;
  return `${date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} ${time}`;
}

/**
 * Events tab — the user-activity explorer. Filters by event type, date
 * range, page, visitor, device and traffic source; clicking a row opens
 * that visitor's chronological journey panel.
 */
export function EventsTab({ website }: { website: Website }) {
  const events = useMemo(() => getEvents(website.id), [website.id]);
  const visitors = useMemo(() => getVisitors(website.id), [website.id]);

  const [type, setType] = useState<EventTypeId | "all">("all");
  const [date, setDate] = useState<DatePreset>("7d");
  const [page, setPage] = useState("all");
  const [visitorQuery, setVisitorQuery] = useState("");
  const [device, setDevice] = useState("all");
  const [source, setSource] = useState("all");
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorRecord | null>(null);

  const pages = useMemo(() => [...new Set(events.map((event) => event.pageUrl))].sort(), [events]);
  const devices = useMemo(() => [...new Set(events.map((event) => event.device))], [events]);
  const sources = useMemo(() => [...new Set(events.map((event) => event.source))].sort(), [events]);

  const filtered = useMemo(() => {
    const preset = DATE_OPTIONS.find((option) => option.id === date)!;
    const cutoff = dateCutoff(preset.hours);
    const q = visitorQuery.trim().toLowerCase();

    return events.filter((event) => {
      if (type !== "all" && event.type !== type) return false;
      if (new Date(event.timestamp).getTime() < cutoff) return false;
      if (page !== "all" && event.pageUrl !== page) return false;
      if (device !== "all" && event.device !== device) return false;
      if (source !== "all" && event.source !== source) return false;
      if (q && !event.visitorId.toLowerCase().includes(q) && !event.sessionId.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [events, type, date, page, visitorQuery, device, source]);

  const resetFilters = () => {
    setType("all");
    setDate("7d");
    setPage("all");
    setVisitorQuery("");
    setDevice("all");
    setSource("all");
  };

  const activeFilters =
    (type !== "all" ? 1 : 0) +
    (date !== "7d" ? 1 : 0) +
    (page !== "all" ? 1 : 0) +
    (visitorQuery ? 1 : 0) +
    (device !== "all" ? 1 : 0) +
    (source !== "all" ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <section className="rounded-lg border border-line bg-surface p-4">
        <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <SectionHeading
            title="Event filters"
            description={`${filtered.length} of ${events.length} events match`}
          />
          {activeFilters > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-medium text-brand hover:underline"
            >
              Reset {activeFilters} filter{activeFilters > 1 ? "s" : ""}
            </button>
          )}
        </header>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-ghost">Event type</span>
            <select className={cn(selectClass, "w-full")} value={type} onChange={(e) => setType(e.target.value as EventTypeId | "all")}>
              <option value="all">All event types</option>
              {EVENT_TYPES.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-ghost">Date range</span>
            <select className={cn(selectClass, "w-full")} value={date} onChange={(e) => setDate(e.target.value as DatePreset)}>
              {DATE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-ghost">Page</span>
            <select className={cn(selectClass, "w-full")} value={page} onChange={(e) => setPage(e.target.value)}>
              <option value="all">All pages</option>
              {pages.map((path) => (
                <option key={path} value={path}>
                  {path}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-ghost">Visitor / session</span>
            <input
              type="search"
              className={cn(selectClass, "w-full")}
              value={visitorQuery}
              onChange={(e) => setVisitorQuery(e.target.value)}
              placeholder="anon_… or sess_…"
            />
          </label>

          <label className="space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-ghost">Device</span>
            <select className={cn(selectClass, "w-full")} value={device} onChange={(e) => setDevice(e.target.value)}>
              <option value="all">All devices</option>
              {devices.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-ghost">Traffic source</span>
            <select className={cn(selectClass, "w-full")} value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="all">All sources</option>
              {sources.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* Events table */}
      <section className="rounded-lg border border-line bg-surface p-5">
        <header className="mb-4">
          <SectionHeading
            title="Activity stream"
            description="Individual visitor activities — select a row to open the visitor's journey."
          />
        </header>

        <div className="relative w-full overflow-x-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b [&_tr]:border-line">
              <tr>
                {["Event", "Timestamp", "Page URL", "Visitor", "Session", "Device", "Browser", "Referrer", "Properties"].map(
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
            <TableBody rows={filtered} visitors={visitors} onOpenVisitor={setSelectedVisitor} />
          </table>
        </div>

        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-faint">
            No events match the current filters.
          </p>
        )}
      </section>

      {selectedVisitor && (
        <VisitorJourneyPanel visitor={selectedVisitor} onClose={() => setSelectedVisitor(null)} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ table body */

function TableBody({
  rows,
  visitors,
  onOpenVisitor,
}: {
  rows: ActivityEvent[];
  visitors: VisitorRecord[];
  onOpenVisitor: (visitor: VisitorRecord) => void;
}) {
  if (rows.length === 0) return <tbody />;

  return (
    <tbody>
      {rows.map((event) => {
        const knownVisitor = visitors.find((visitor) => visitor.id === event.visitorId);
        return (
          <tr
            key={event.id}
            onClick={() => knownVisitor && onOpenVisitor(knownVisitor)}
            className={cn(
              "border-b border-line transition-colors last:border-0 hover:bg-sunken/60",
              knownVisitor && "cursor-pointer",
            )}
            title={knownVisitor ? "Open visitor journey" : undefined}
          >
            <td className="whitespace-nowrap px-3 py-3 align-middle">
              <span className="flex items-center gap-2">
                <Badge variant={TYPE_BADGE[event.type] ?? "neutral"}>
                  {EVENT_TYPES.find((option) => option.id === event.type)?.label ?? event.type}
                </Badge>
                <span className="text-xs text-faint">{event.name}</span>
              </span>
            </td>
            <td className="whitespace-nowrap px-3 py-3 align-middle text-xs text-muted">
              {formatEventTime(event.timestamp)}
            </td>
            <td className="max-w-[13rem] truncate px-3 py-3 align-middle text-xs text-brand" title={event.pageUrl}>
              {event.pageUrl}
            </td>
            <td className="whitespace-nowrap px-3 py-3 align-middle">
              <span className="font-mono text-xs text-muted">{event.visitorId}</span>
              {knownVisitor && (
                <span className="ml-1.5 text-[10px] font-medium text-brand">view →</span>
              )}
            </td>
            <td className="whitespace-nowrap px-3 py-3 align-middle font-mono text-xs text-faint">
              {event.sessionId}
            </td>
            <td className="whitespace-nowrap px-3 py-3 align-middle text-xs text-ink">{event.device}</td>
            <td className="whitespace-nowrap px-3 py-3 align-middle text-xs text-muted">
              {event.browser} · {event.os}
            </td>
            <td className="max-w-[9rem] truncate px-3 py-3 align-middle text-xs text-muted" title={event.referrer}>
              {event.referrer}
            </td>
            <td className="px-3 py-3 align-middle">
              <span className="flex flex-wrap gap-1">
                {Object.entries(event.properties).map(([key, value]) => (
                  <span
                    key={key}
                    className="whitespace-nowrap rounded bg-sunken px-1.5 py-0.5 text-[10px] text-faint"
                    title={`${key}: ${value}`}
                  >
                    {key}=<span className="text-ink">{String(value)}</span>
                  </span>
                ))}
              </span>
            </td>
          </tr>
        );
      })}
    </tbody>
  );
}
