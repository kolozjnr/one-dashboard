import { useCallback, useSyncExternalStore } from "react";
import { UNIVERSAL_METRIC_ORDER } from "./registry";
import {
  WIDGET_IDS as REGISTRY_WIDGET_IDS,
  WIDGET_REGISTRY,
  type DashboardWidgetId,
} from "@/components/analytics/widget-registry";

/**
 * Dashboard widget layout — order / visibility / KPI preferences on top
 * of the widget registry, persisted in localStorage and consumed through
 * `useSyncExternalStore`.
 *
 * The store pattern (rather than `useState` + an effect that reads
 * localStorage) avoids the hydration mismatch and the `set-state-in-effect`
 * lint: `getServerSnapshot` always returns the default layout, the client
 * snapshot reads the cached parse, and writes notify subscribers.
 */

export type { DashboardWidgetId };

export interface DashboardLayout {
  /** Widget ids in display order. */
  order: DashboardWidgetId[];
  /** Widget ids the user chose to hide. */
  hidden: DashboardWidgetId[];
  /** Preferred KPI metric ids for the metric grid (empty = all). */
  preferredMetrics: string[];
}

/** Widget ids in registry (default) order. */
export const WIDGET_IDS: DashboardWidgetId[] = REGISTRY_WIDGET_IDS;

export const DEFAULT_LAYOUT: DashboardLayout = {
  order: [...WIDGET_IDS],
  // Widgets a registry entry marks as hidden until the user opts in.
  hidden: WIDGET_REGISTRY.filter((widget) => widget.display.defaultHidden === true).map(
    (widget) => widget.id,
  ),
  preferredMetrics: [...UNIVERSAL_METRIC_ORDER],
};

const STORAGE_KEY = "metrispot.dashboard.layout.v1";

/* ------------------------------------------------------------------ store */

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedLayout: DashboardLayout = DEFAULT_LAYOUT;

/** Appends unknown ids and drops unknown entries so old saves stay valid. */
function normalize(raw: unknown): DashboardLayout {
  const parsed = (raw ?? {}) as Partial<DashboardLayout>;
  const order = Array.isArray(parsed.order)
    ? parsed.order.filter((id): id is DashboardWidgetId => WIDGET_IDS.includes(id as DashboardWidgetId))
    : [];
  // Append widgets missing from an older save, preserving saved order.
  const mergedOrder: DashboardWidgetId[] = [
    ...order,
    ...WIDGET_IDS.filter((id) => !order.includes(id)),
  ];

  const hidden = Array.isArray(parsed.hidden)
    ? parsed.hidden.filter((id): id is DashboardWidgetId => mergedOrder.includes(id as DashboardWidgetId))
    : [];

  const universalIds: readonly string[] = UNIVERSAL_METRIC_ORDER;
  const preferredMetrics = Array.isArray(parsed.preferredMetrics)
    ? parsed.preferredMetrics.filter(
        (id): id is string => typeof id === "string" && universalIds.includes(id),
      )
    : [];

  return { order: mergedOrder, hidden, preferredMetrics };
}

function readSnapshot(): DashboardLayout {
  if (typeof window === "undefined") return DEFAULT_LAYOUT;

  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }

  if (raw !== cachedRaw) {
    cachedRaw = raw;
    if (raw === null) {
      cachedLayout = DEFAULT_LAYOUT;
    } else {
      try {
        cachedLayout = normalize(JSON.parse(raw));
      } catch {
        cachedLayout = DEFAULT_LAYOUT;
      }
    }
  }
  return cachedLayout;
}

function getServerSnapshot(): DashboardLayout {
  return DEFAULT_LAYOUT;
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) callback();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

function commit(next: DashboardLayout): void {
  cachedLayout = normalize(next);
  cachedRaw = JSON.stringify(cachedLayout);
  try {
    window.localStorage.setItem(STORAGE_KEY, cachedRaw);
  } catch {
    // Storage may be unavailable (private mode); in-memory copy still applies.
  }
  listeners.forEach((listener) => listener());
}

/**
 * Live dashboard layout plus its writer. The snapshot is stable across
 * renders (parsed once per raw string), so React never loops.
 */
export function useDashboardLayout(): [
  DashboardLayout,
  (next: DashboardLayout) => void,
] {
  const layout = useSyncExternalStore(subscribe, readSnapshot, getServerSnapshot);
  const save = useCallback((next: DashboardLayout) => commit(next), []);
  return [layout, save];
}

/** Visible widgets in saved order. */
export function visibleWidgets(layout: DashboardLayout): DashboardWidgetId[] {
  return layout.order.filter((id) => !layout.hidden.includes(id));
}

/** KPI metric ids to render — empty preference falls back to all. */
export function preferredMetricIds(layout: DashboardLayout): string[] | undefined {
  return layout.preferredMetrics.length > 0 ? layout.preferredMetrics : undefined;
}
