import type { AudienceData } from "./audience-data";
import type { WebsiteAnalytics } from "./mock-data";
import { PLATFORMS, metricDefinition } from "./registry";
import type {
  ConnectedAccount,
  ContentRow,
  DateRange,
  MetricFormat,
  MetricResult,
  PlatformId,
} from "./types";
import type {
  ActivityEvent,
  VisitorRecord,
  Website,
} from "./website-data";

/**
 * Normalized analytics model.
 *
 * Every integration reports a different payload: a social graph returns
 * follower counts, an analytics property returns sessions, an ad platform
 * returns spend. `NormalizedRecord` is the single frontend shape all of
 * them are adapted into, while the original source-specific fields stay
 * reachable through the loosely typed `properties` bag — so no integration
 * has to be modelled exactly for its data to survive the trip.
 *
 * Nothing here fetches or mutates data; adapters are pure functions over
 * the existing mock builders, which keeps the whole layer deterministic.
 */

/* ------------------------------------------------------------------ flexible metadata */

/**
 * Open-ended, platform-specific fields preserved verbatim from the source
 * response. Typed loosely on purpose — integrations are not required to
 * share a schema, and consumers read through the helpers below instead of
 * assuming keys exist.
 */
export type PlatformMetadata = Record<string, unknown>;

/** Reads a numeric field defensively; missing/NaN values become `fallback`. */
export function readNumber(
  metadata: PlatformMetadata | undefined,
  key: string,
  fallback = 0,
): number {
  const value = metadata?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** Reads a string field defensively; missing values become `fallback`. */
export function readString(
  metadata: PlatformMetadata | undefined,
  key: string,
  fallback = "",
): string {
  const value = metadata?.[key];
  return typeof value === "string" ? value : fallback;
}

/* ------------------------------------------------------------------ identity refs */

/** The connected account a record originated from. */
export interface AccountRef {
  id: string;
  name: string;
  status: ConnectedAccount["status"];
  /** Relative scale the source contributes to blended totals. */
  weight: number;
}

/** The website property a record originated from, when there is one. */
export interface WebsiteRef {
  id: string;
  name: string;
  url: string;
  status: Website["status"];
}

/** Where a record came from: platform + account (+ website when relevant). */
export interface AnalyticsSourceRef {
  platform: PlatformId;
  platformLabel: string;
  account: AccountRef;
  website?: WebsiteRef;
}

/* ------------------------------------------------------------------ payloads */

/** Metric type — how a value is interpreted and rendered. */
export type MetricType = MetricFormat;

/** A single content item, normalised across networks. */
export interface NormalizedContent {
  id: string;
  /** Content kind used by type filters (Reel, Video, Tweet…). */
  type: string;
  title: string;
  publishedAt: string;
  /** Column key -> numeric value; columns a network omits are absent. */
  metrics: Record<string, number>;
}

/** An audience/demographics slice. */
export interface NormalizedAudience {
  /** e.g. "age", "gender", "country", "city". */
  dimension: string;
  segments: { label: string; share: number }[];
}

/** An anonymous website visitor. */
export interface NormalizedVisitor {
  id: string;
  sessions: number;
  pageViews: number;
  country: string;
  source: string;
  device: string;
  browser: string;
  converted: boolean;
}

/** A tracked event / goal completion. */
export interface NormalizedEvent {
  /** Event type id, or a free-form name for unknown events. */
  type: string;
  label: string;
  detail: string;
  /** ISO timestamp (or relative label when the source only has one). */
  occurredAt: string;
  value?: number;
}

/* ------------------------------------------------------------------ the record */

/**
 * One normalized analytics record. Fields mirror the model the dashboard
 * renders — platform, account, website, metric identity/value/type,
 * timestamp, comparison value — plus whichever payload applies. Unused
 * payloads are simply absent rather than faked.
 */
export interface NormalizedRecord {
  platform: PlatformId;
  account: AccountRef;
  website?: WebsiteRef;
  metricId: string;
  metricLabel: string;
  metricValue: number;
  metricType: MetricType;
  /** ISO timestamp of the observation (range end for period metrics). */
  timestamp: string;
  /** Value from the comparison period, when the source reports one. */
  comparisonValue?: number;
  /** Signed percent change against `comparisonValue`. */
  changePct?: number;
  content?: NormalizedContent;
  audience?: NormalizedAudience;
  visitor?: NormalizedVisitor;
  event?: NormalizedEvent;
  /** Additional platform-specific properties, preserved verbatim. */
  properties: PlatformMetadata;
}

/** A batch of records produced by one adapter run. */
export interface NormalizedDataset<T = NormalizedRecord> {
  source: AnalyticsSourceRef;
  /** ISO time the batch was produced. */
  generatedAt: string;
  range: { from: string; to: string };
  rows: T[];
  /** Response envelope / adapter-specific details kept for round-trips. */
  metadata: PlatformMetadata;
}

/* ------------------------------------------------------------------ adapters */

function accountRef(account: ConnectedAccount): AccountRef {
  return {
    id: account.id,
    name: account.accountName,
    status: account.status,
    weight: account.weight,
  };
}

function sourceRef(account: ConnectedAccount): AnalyticsSourceRef {
  const platform = PLATFORMS[account.platformId];
  return {
    platform: account.platformId,
    platformLabel: platform.label,
    account: accountRef(account),
  };
}

function rangeStamp(range: DateRange): { from: string; to: string } {
  return { from: range.from.toISOString(), to: range.to.toISOString() };
}

/**
 * Adapts a source-specific metric result into a `NormalizedRecord`.
 * Unknown metric ids are still normalised — the label and format come from
 * the registry's generic fallback instead of dropping the value.
 */
export function normalizeMetric(
  metricId: string,
  account: ConnectedAccount,
  result: MetricResult,
  range: DateRange,
  extraProperties: PlatformMetadata = {},
): NormalizedRecord {
  const definition = metricDefinition(metricId);
  return {
    platform: account.platformId,
    account: accountRef(account),
    metricId,
    metricLabel: definition.label,
    metricValue: result.value,
    metricType: definition.format,
    timestamp: range.to.toISOString(),
    comparisonValue: result.previous,
    changePct: result.changePct,
    properties: {
      sparkline: result.sparkline,
      displayValue: result.displayValue,
      registered: definition.registered,
      ...extraProperties,
    },
  };
}

/** Adapts registry-shaped content rows into normalized content records. */
export function normalizeContentRows(
  account: ConnectedAccount,
  rows: ContentRow[],
  range: DateRange,
): NormalizedDataset<NormalizedRecord> {
  const source = sourceRef(account);
  return {
    source,
    generatedAt: new Date().toISOString(),
    range: rangeStamp(range),
    rows: rows.map((row) => ({
      platform: row.platformId,
      account: source.account,
      metricId: "content",
      metricLabel: "Content item",
      metricValue: Object.values(row.metrics).reduce((sum, value) => sum + value, 0),
      metricType: "number" as MetricFormat,
      timestamp: row.publishedAt,
      content: {
        id: row.id,
        type: row.type,
        title: row.title,
        publishedAt: row.publishedAt,
        metrics: row.metrics,
      },
      properties: { columnCount: Object.keys(row.metrics).length },
    })),
    metadata: {
      adapter: "content",
      platform: account.platformId,
      rowCount: rows.length,
    },
  };
}

/** Adapts the website analytics aggregate into normalized records. */
export function normalizeWebsiteAnalytics(
  website: Website,
  analytics: WebsiteAnalytics,
  range: DateRange,
): NormalizedDataset<NormalizedRecord> {
  const source: AnalyticsSourceRef = {
    platform: "website",
    platformLabel: PLATFORMS.website.label,
    account: { id: website.id, name: website.name, status: "connected", weight: 1 },
    website: { id: website.id, name: website.name, url: website.url, status: website.status },
  };

  const headline: [string, number, MetricFormat][] = [
    ["users", analytics.users, "compact"],
    ["sessions", analytics.sessions, "compact"],
    ["pageViews", analytics.pageViews, "compact"],
    ["conversions", analytics.conversions, "number"],
    ["bounceRate", analytics.bounceRate, "percent"],
    ["avgSessionDuration", analytics.avgSessionDuration, "duration"],
  ];

  const rows: NormalizedRecord[] = headline.map(([metricId, value, metricType]) => ({
    platform: "website",
    account: source.account,
    website: source.website,
    metricId,
    metricLabel: metricDefinition(metricId).label,
    metricValue: value,
    metricType,
    timestamp: range.to.toISOString(),
    properties: { newUsersShare: analytics.newUsersShare },
  }));

  return {
    source,
    generatedAt: new Date().toISOString(),
    range: rangeStamp(range),
    rows,
    metadata: {
      adapter: "website-analytics",
      pages: analytics.pages,
      sources: analytics.sources,
      activities: analytics.activities,
    },
  };
}

/** Adapts anonymous visitor records into normalized visitor records. */
export function normalizeVisitors(
  website: Website,
  visitors: VisitorRecord[],
  range: DateRange,
): NormalizedDataset<NormalizedRecord> {
  const source: AnalyticsSourceRef = {
    platform: "website",
    platformLabel: PLATFORMS.website.label,
    account: { id: website.id, name: website.name, status: "connected", weight: 1 },
    website: { id: website.id, name: website.name, url: website.url, status: website.status },
  };

  return {
    source,
    generatedAt: new Date().toISOString(),
    range: rangeStamp(range),
    rows: visitors.map((visitor) => ({
      platform: "website" as PlatformId,
      account: source.account,
      website: source.website,
      metricId: "visitor",
      metricLabel: "Visitor",
      metricValue: visitor.pageViews,
      metricType: "number" as MetricFormat,
      timestamp: visitor.firstSeen,
      visitor: {
        id: visitor.id,
        sessions: visitor.sessions,
        pageViews: visitor.pageViews,
        country: visitor.country,
        source: visitor.source,
        device: visitor.device,
        browser: visitor.browser,
        converted: visitor.converted,
      },
      properties: {
        os: visitor.os,
        referrer: visitor.referrer,
        landedOn: visitor.landedOn,
        journey: visitor.journey,
      },
    })),
    metadata: { adapter: "visitors", rowCount: visitors.length },
  };
}

/** Adapts tracked events into normalized event records. */
export function normalizeEvents(
  website: Website,
  events: ActivityEvent[],
  range: DateRange,
): NormalizedDataset<NormalizedRecord> {
  const source: AnalyticsSourceRef = {
    platform: "website",
    platformLabel: PLATFORMS.website.label,
    account: { id: website.id, name: website.name, status: "connected", weight: 1 },
    website: { id: website.id, name: website.name, url: website.url, status: website.status },
  };

  return {
    source,
    generatedAt: new Date().toISOString(),
    range: rangeStamp(range),
    rows: events.map((event) => ({
      platform: "website" as PlatformId,
      account: source.account,
      website: source.website,
      // Unknown / custom event types keep their raw id instead of being discarded.
      metricId: event.type,
      metricLabel: event.name,
      metricValue: 1,
      metricType: "number" as MetricFormat,
      timestamp: event.timestamp,
      event: {
        type: event.type,
        label: event.name,
        detail: event.pageUrl,
        occurredAt: event.timestamp,
      },
      properties: {
        pageUrl: event.pageUrl,
        visitorId: event.visitorId,
        sessionId: event.sessionId,
        device: event.device,
        browser: event.browser,
        os: event.os,
        referrer: event.referrer,
        source: event.source,
        ...event.properties,
      },
    })),
    metadata: { adapter: "events", rowCount: events.length },
  };
}

/** Adapts an audience dataset into one normalized record per dimension. */
export function normalizeAudience(
  account: ConnectedAccount,
  audience: AudienceData,
  range: DateRange,
): NormalizedDataset<NormalizedRecord> {
  const dimensions: [string, { label: string; share: number }[]][] = [
    ["age", audience.age],
    ["gender", audience.gender],
    ["country", audience.countries],
    ["city", audience.cities],
  ];

  const rows: NormalizedRecord[] = dimensions
    .filter(([, segments]) => segments.length > 0)
    .map(([dimension, segments]) => ({
      platform: account.platformId,
      account: accountRef(account),
      metricId: `audience.${dimension}`,
      metricLabel: `Audience · ${dimension}`,
      metricValue: segments.reduce((sum, segment) => sum + segment.share, 0),
      metricType: "percent" as MetricFormat,
      timestamp: range.to.toISOString(),
      audience: { dimension, segments },
      properties: { capabilities: audience.capabilities },
    }));

  return {
    source: sourceRef(account),
    generatedAt: new Date().toISOString(),
    range: rangeStamp(range),
    rows,
    metadata: {
      adapter: "audience",
      total: audience.summary.total,
      growth: audience.summary.growth,
      capabilities: audience.capabilities,
    },
  };
}
