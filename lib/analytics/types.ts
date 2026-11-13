/** Shared types for the dynamic analytics system. */

export type PlatformId =
  | "instagram"
  | "tiktok"
  | "facebook"
  | "x"
  | "youtube"
  | "linkedin"
  | "website";

/** How a metric value is rendered. */
export type MetricFormat =
  | "number" // whole numbers, 12,480
  | "compact" // abbreviated, 1.2M
  | "percent" // 6.4%
  | "decimal" // 4.2
  | "duration" // seconds -> 3m 24s
  | "text"; // categorical breakdown, "US 34% · IN 19%"

export interface MetricDef {
  id: string;
  label: string;
  format: MetricFormat;
  /** Shown in the card's info tooltip. */
  description?: string;
}

export type UniversalMetricId =
  | "followers"
  | "impressions"
  | "reach"
  | "engagement"
  | "engagementRate"
  | "audienceGrowth"
  | "postsPublished";

/** Every metric id that can appear in the chart selector. */
export type ChartMetricId =
  | UniversalMetricId
  | "views"
  | "sessions"
  | "visitors"
  | "conversions";

export type ContentColumnType =
  | "thumb"
  | "text"
  | "number"
  | "date"
  | "rate"
  | "duration";

/** One column of the adaptive content performance table. */
export interface ContentColumn {
  key: string;
  label: string;
  type: ContentColumnType;
  align?: "left" | "right";
}

export type ConnectionStatus = "connected" | "syncing" | "error";

export interface ConnectedAccount {
  id: string;
  platformId: PlatformId;
  /** Handle, e-mail or domain shown under the app name. */
  accountName: string;
  status: ConnectionStatus;
  /** ISO timestamp of the last successful synchronisation. */
  lastSyncAt: string;
  /** Relative scale of the account's mock data. */
  weight: number;
}

export type DatePresetId =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "last90"
  | "thisMonth"
  | "lastMonth"
  | "custom";

export interface DateRange {
  preset: DatePresetId;
  /** Inclusive, start of day. */
  from: Date;
  /** Inclusive, end of day. */
  to: Date;
}

export type Interval = "daily" | "weekly" | "monthly";
export type ChartType = "line" | "area" | "bar";

export interface MetricResult {
  value: number;
  previous: number;
  changePct: number;
  sparkline: number[];
  /** Pre-rendered value for `text` metrics (categorical breakdowns). */
  displayValue?: string;
}

export interface SeriesPoint {
  label: string;
  value: number;
}

export interface AccountSeries {
  accountId: string;
  label: string;
  platformId: PlatformId;
  color: string;
  points: SeriesPoint[];
}

export interface ContentRow {
  id: string;
  platformId: PlatformId;
  /** Content type used by the type filter (Reel, Video, Tweet…). */
  type: string;
  title: string;
  /** ISO date the content was published. */
  publishedAt: string;
  /** Column key -> numeric value. Columns without a value are simply absent. */
  metrics: Record<string, number>;
}
