"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Modal } from "@/components/ui/modal";
import { UNIVERSAL_METRIC_ORDER, metricDefinition } from "@/lib/analytics/registry";
import { WIDGET_CATEGORY_LABELS, WIDGET_REGISTRY } from "@/components/analytics/widget-registry";
import {
  DEFAULT_LAYOUT,
  useDashboardLayout,
  type DashboardLayout,
  type DashboardWidgetId,
} from "@/lib/analytics/dashboard-layout";
import { cn } from "@/lib/utils";

/**
 * Dashboard customization — a trigger button plus modal for rearranging
 * widgets (up/down), toggling visibility, picking preferred KPI metrics,
 * saving the layout to localStorage and restoring defaults. Edits happen
 * on a draft; Save persists (dashboard re-renders live), Cancel reverts
 * the draft without touching the store.
 */
export function DashboardCustomizer() {
  const [layout, saveLayout] = useDashboardLayout();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DashboardLayout>(layout);

  const handleOpen = () => {
    // Seed the draft from the persisted layout at open time (event handler,
    // not an effect, to satisfy the set-state-in-effect lint rule).
    setDraft(layout);
    setOpen(true);
  };

  const move = (id: DashboardWidgetId, direction: -1 | 1) => {
    setDraft((prev) => {
      const order = [...prev.order];
      const index = order.indexOf(id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= order.length) return prev;
      [order[index], order[target]] = [order[target], order[index]];
      return { ...prev, order };
    });
  };

  const toggleHidden = (id: DashboardWidgetId) => {
    setDraft((prev) => ({
      ...prev,
      hidden: prev.hidden.includes(id)
        ? prev.hidden.filter((item) => item !== id)
        : [...prev.hidden, id],
    }));
  };

  const toggleMetric = (metricId: string) => {
    setDraft((prev) => {
      const next = prev.preferredMetrics.includes(metricId)
        ? prev.preferredMetrics.filter((item) => item !== metricId)
        : [...prev.preferredMetrics, metricId];
      // Keep at least one KPI visible — an empty grid is never useful.
      if (next.length === 0) return prev;
      return { ...prev, preferredMetrics: next };
    });
  };

  const handleSave = () => {
    saveLayout(draft);
    setOpen(false);
  };

  const handleRestore = () => {
    setDraft(DEFAULT_LAYOUT);
  };

  const ordered = draft.order
    .map((id) => WIDGET_REGISTRY.find((widget) => widget.id === id))
    .filter((widget) => widget !== undefined);

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={handleOpen}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 8h10M4 16h6M18 8h2M16 16h4M14 6v4M10 14v4"
          />
        </svg>
        Customize
      </Button>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Customize dashboard"
        description="Rearrange widgets, show or hide them, and pick your preferred KPI cards."
        className="max-w-2xl"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={handleRestore}>
              Restore defaults
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave}>
              Save layout
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          {/* Widgets: order + visibility */}
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-faint">
              Widgets
            </h4>
            <p className="mt-0.5 text-xs text-ghost">
              Use the arrows to rearrange; uncheck to hide a widget.
            </p>
            <ul className="mt-3 space-y-2">
              {ordered.map((widget, index) => {
                const visible = !draft.hidden.includes(widget.id);
                return (
                  <li
                    key={widget.id}
                    className={cn(
                      "flex items-center gap-3 rounded-md border px-3 py-2.5 transition-colors",
                      visible ? "border-line bg-surface" : "border-line bg-sunken",
                    )}
                  >
                    <Checkbox
                      checked={visible}
                      onCheckedChange={() => toggleHidden(widget.id)}
                      ariaLabel={`Show ${widget.title}`}
                    />
                    <span className="flex-1 min-w-0">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span
                          className={cn(
                            "truncate text-sm font-medium",
                            visible ? "text-ink" : "text-faint",
                          )}
                        >
                          {widget.title}
                        </span>
                        <span className="shrink-0 rounded-full bg-sunken px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-ghost">
                          {WIDGET_CATEGORY_LABELS[widget.category]}
                        </span>
                      </span>
                      <span className="block truncate text-xs text-ghost">
                        {widget.description}
                      </span>
                    </span>
                    <span className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => move(widget.id, -1)}
                        disabled={index === 0}
                        aria-label={`Move ${widget.title} up`}
                        className="flex h-7 w-7 items-center justify-center rounded border border-line text-faint transition-colors hover:bg-sunken hover:text-ink disabled:pointer-events-none disabled:opacity-40"
                      >
                        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12.5V3.5m0 0L4 7.5m4-4l4 4" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => move(widget.id, 1)}
                        disabled={index === ordered.length - 1}
                        aria-label={`Move ${widget.title} down`}
                        className="flex h-7 w-7 items-center justify-center rounded border border-line text-faint transition-colors hover:bg-sunken hover:text-ink disabled:pointer-events-none disabled:opacity-40"
                      >
                        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 3.5v9m0 0l4-4m-4 4l-4-4" />
                        </svg>
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Preferred KPI metrics */}
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-faint">
              Preferred KPI metrics
            </h4>
            <p className="mt-0.5 text-xs text-ghost">
              The KPI cards widget shows only the metrics you tick (at least one).
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {UNIVERSAL_METRIC_ORDER.map((metricId) => {
                const definition = metricDefinition(metricId);
                const checked = draft.preferredMetrics.includes(metricId);
                return (
                  <div
                    key={metricId}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md border px-3 py-2 transition-colors",
                      checked
                        ? "border-brand/40 bg-brand/5"
                        : "border-line bg-surface",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleMetric(metricId)}
                      ariaLabel={`Show ${definition.label} card`}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-ink">
                        {definition.label}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </Modal>
    </>
  );
}
