import type { ComponentType } from "react";
import type { ConnectedAccount, PlatformId } from "@/lib/analytics/types";
import { CHART_METRIC_ORDER, UNIVERSAL_METRIC_ORDER, supportsMetric } from "@/lib/analytics/registry";
import {
  AudienceWidget,
  ChartWidget,
  ConversionsWidget,
  ContentWidget,
  EngagementWidget,
  MetricsWidget,
  PlatformMetricsWidget,
  VisitorBehaviourWidget,
  WebsiteWidget,
} from "./widgets";

/**
 * Dynamic widget registry.
 *
 * A widget is declared once here and the dashboard derives everything
 * else from it: what can render, whether it is available for the current
 * source selection, and how it is laid out. Adding a widget for a new
 * network or a new category means adding one entry — no changes to the
 * dashboard shell.
 *
 * Availability is *computed* from the live selection rather than stored,
 * because it depends on which accounts are connected, selected and
 * synchronising at render time.
 */

/* ------------------------------------------------------------------ categories */

export type WidgetCategory =
  | "overview"
  | "audience"
  | "engagement"
  | "content"
  | "websiteTraffic"
  | "visitorBehaviour"
  | "conversions"
  | "customMetrics";

export interface WidgetCategoryDef {
  id: WidgetCategory;
  label: string;
  description: string;
}

/** Every category a widget can belong to, in display order. */
export const WIDGET_CATEGORIES: WidgetCategoryDef[] = [
  { id: "overview", label: "Overview", description: "Headline metrics and trends." },
  { id: "audience", label: "Audience", description: "Who follows and visits you." },
  { id: "engagement", label: "Engagement", description: "How people interact with content." },
  { id: "content", label: "Content", description: "Performance of published posts." },
  { id: "websiteTraffic", label: "Website Traffic", description: "Sessions, pages and sources." },
  { id: "visitorBehaviour", label: "Visitor Behaviour", description: "How visitors move on-site." },
  { id: "conversions", label: "Conversions", description: "Tracked goals and revenue." },
  { id: "customMetrics", label: "Custom Metrics", description: "Network-specific measurements." },
];

/* ------------------------------------------------------------------ availability */

/**
 * Runtime availability of a widget for the current selection.
 * - `noAccounts` — nothing is connected or selected.
 * - `disconnected` — the source this widget needs is not selected.
 * - `error` — every in-scope source failed to synchronise.
 * - `noMetrics` — sources are selected but none report the required metrics.
 * - `available` — the widget can render.
 */
export type WidgetAvailability =
  | "available"
  | "noAccounts"
  | "disconnected"
  | "error"
  | "noMetrics";

/* ------------------------------------------------------------------ display */

export interface WidgetDisplayConfig {
  /** Pairs side-by-side with an adjacent compact widget. */
  compact?: boolean;
  /** Hidden until the user enables it in the customizer. */
  defaultHidden?: boolean;
  /** Minimum height in px, applied to the widget cell to avoid layout jump. */
  minHeight?: number;
}

/* ------------------------------------------------------------------ definition */

/**
 * Every widget id the dashboard can render. Adding a widget means adding
 * its id here and an entry to `WIDGET_REGISTRY` — TypeScript then forces
 * every exhaustive switch to handle it.
 */
export type DashboardWidgetId =
  | "metrics"
  | "chart"
  | "audience"
  | "engagement"
  | "website"
  | "visitorBehaviour"
  | "conversions"
  | "platformMetrics"
  | "content";

/** Props every widget component accepts (`preferred` drives the KPI grid). */
export type WidgetComponent = ComponentType<{ preferred?: string[] }>;

export interface WidgetDefinition {
  /** Unique identifier (also the persistence key for order/visibility). */
  id: DashboardWidgetId;
  /** Human-readable title shown in the customizer. */
  title: string;
  /** One-line explanation of what the widget shows. */
  description: string;
  /** Category used to group widgets. */
  category: WidgetCategory;
  /** Platforms that can feed this widget; empty = any platform. */
  platforms: PlatformId[];
  /** Metric ids the widget needs; empty = no metric requirement. */
  requiredMetrics: string[];
  /** Component reference that renders the widget body. */
  component: WidgetComponent;
  /** Layout / presentation hints. */
  display: WidgetDisplayConfig;
}

const SOCIAL_PLATFORMS: PlatformId[] = [
  "instagram",
  "tiktok",
  "facebook",
  "x",
  "youtube",
  "linkedin",
];

/**
 * Every widget the dashboard can render, in default order.
 * The id is stable across releases so saved layouts stay valid.
 */
export const WIDGET_REGISTRY: WidgetDefinition[] = [
  {
    id: "metrics",
    title: "KPI cards",
    description: "Universal metrics reported by the selected sources.",
    category: "overview",
    platforms: [],
    requiredMetrics: [...UNIVERSAL_METRIC_ORDER],
    component: MetricsWidget,
    display: { minHeight: 148 },
  },
  {
    id: "chart",
    title: "Performance chart",
    description: "One multi-series chart for the chosen metric.",
    category: "overview",
    platforms: [],
    requiredMetrics: [...CHART_METRIC_ORDER],
    component: ChartWidget,
    display: { minHeight: 380 },
  },
  {
    id: "audience",
    title: "Audience snapshot",
    description: "Audience size, growth and top countries for a social source.",
    category: "audience",
    platforms: SOCIAL_PLATFORMS,
    requiredMetrics: ["followers"],
    component: AudienceWidget,
    display: { compact: true, minHeight: 260 },
  },
  {
    id: "engagement",
    title: "Engagement statistics",
    description: "Reactions, comments and shares breakdown.",
    category: "engagement",
    platforms: [],
    requiredMetrics: ["engagement"],
    component: EngagementWidget,
    display: { compact: true, minHeight: 260 },
  },
  {
    id: "website",
    title: "Website analytics",
    description: "Traffic, pages and sources for the connected site.",
    category: "websiteTraffic",
    platforms: ["website"],
    requiredMetrics: ["sessions"],
    component: WebsiteWidget,
    display: { compact: true, minHeight: 300 },
  },
  {
    id: "visitorBehaviour",
    title: "Visitor behaviour",
    description: "Bounce rate, session depth and on-site engagement.",
    category: "visitorBehaviour",
    platforms: ["website"],
    requiredMetrics: ["bounceRate", "avgSessionDuration"],
    component: VisitorBehaviourWidget,
    display: { compact: true, minHeight: 240 },
  },
  {
    id: "conversions",
    title: "Conversions",
    description: "Tracked goals, completion rate and revenue.",
    category: "conversions",
    platforms: ["website"],
    requiredMetrics: ["conversions"],
    component: ConversionsWidget,
    display: { compact: true, minHeight: 280 },
  },
  {
    id: "platformMetrics",
    title: "Platform metrics",
    description: "Network-specific metrics from each source.",
    category: "customMetrics",
    platforms: [],
    requiredMetrics: [],
    component: PlatformMetricsWidget,
    display: { minHeight: 148 },
  },
  {
    id: "content",
    title: "Content performance",
    description: "Adaptive table of top-performing content.",
    category: "content",
    platforms: SOCIAL_PLATFORMS,
    requiredMetrics: ["postsPublished"],
    component: ContentWidget,
    display: { minHeight: 360 },
  },
];

/** Widget ids in default order — the persistence key set. */
export const WIDGET_IDS: DashboardWidgetId[] = WIDGET_REGISTRY.map((widget) => widget.id);

const WIDGET_BY_ID = new Map<string, WidgetDefinition>(
  WIDGET_REGISTRY.map((widget) => [widget.id, widget]),
);

/** Looks up a widget definition by id (undefined for unknown ids). */
export function getWidget(id: string): WidgetDefinition | undefined {
  return WIDGET_BY_ID.get(id);
}

/** Fast category-id -> label lookup for UI chrome. */
export const WIDGET_CATEGORY_LABELS: Record<WidgetCategory, string> =
  Object.fromEntries(WIDGET_CATEGORIES.map((entry) => [entry.id, entry.label])) as Record<
    WidgetCategory,
    string
  >;

/* ------------------------------------------------------------------ resolver */

export interface WidgetAvailabilityContext {
  /** Accounts currently filtering the dashboard. */
  selectedAccounts: ConnectedAccount[];
  /** True while mock data is "refetching". */
  loading: boolean;
}

/**
 * Determines whether a widget can render for the current selection.
 * Order matters: account scope first, then connection health, then the
 * metric requirement — so a user always sees the most specific reason a
 * widget is unavailable.
 */
export function resolveWidgetAvailability(
  widget: WidgetDefinition,
  context: WidgetAvailabilityContext,
): WidgetAvailability {
  const { selectedAccounts, loading } = context;
  if (loading) return "available"; // the widget shows its own skeleton

  if (selectedAccounts.length === 0) return "noAccounts";

  const inScope =
    widget.platforms.length === 0
      ? selectedAccounts
      : selectedAccounts.filter((account) => widget.platforms.includes(account.platformId));

  // The widget needs a source the user has not selected. A single-platform
  // widget reports "disconnected"; a multi-platform one has no supported
  // source, which reads better as a missing-metrics state.
  if (inScope.length === 0) {
    return widget.platforms.length === 1 ? "disconnected" : "noMetrics";
  }

  // Every in-scope source failed to synchronise.
  if (inScope.every((account) => account.status === "error")) return "error";

  if (widget.requiredMetrics.length > 0) {
    const reportsAny = widget.requiredMetrics.some((metricId) =>
      inScope.some((account) => supportsMetric(account.platformId, metricId)),
    );
    if (!reportsAny) return "noMetrics";
  }

  return "available";
}

/** Human label for the source a widget depends on (for state copy). */
export function widgetSourceLabel(widget: WidgetDefinition): string {
  if (widget.platforms.length === 1) return `The ${widget.platforms[0]} source`;
  return "A selected source";
}
