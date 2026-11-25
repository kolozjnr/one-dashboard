import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { persistAccountMetrics } from './analytics-persistence';
import { IntegrationsVaultService } from './integrations-vault.service';
import { metaGet, redactSecrets } from './meta-graph.client';
import { readProfile } from './meta-instagram.adapter';
import {
  IntegrationError,
  MetaGraphError,
  type SocialProduct,
} from './integrations.types';

/**
 * Metrics retrieval for connected Meta accounts.
 *
 * Design rules taken straight from the Meta docs and this chunk's brief:
 *  - availability is discovered, never assumed: every metric is fetched on its
 *    own and a metric the API rejects (deprecated, unsupported for this account
 *    type, or missing its permission) is reported in `unsupported` instead of
 *    failing the sync,
 *  - account-level totals come from Instagram user insights / Facebook Page
 *    insights, content-level totals (stories, reels) from media insights,
 *  - successful metrics become AccountMetricCapability rows so the dashboard
 *    only shows what this specific account can actually report.
 *
 * Graph API v27.0. Metric mappings verified against:
 *  - instagram-platform/api-reference/instagram-user/insights
 *  - graph-api/reference/page/insights
 */

const FB_GRAPH = 'https://graph.facebook.com/v27.0';
const IG_GRAPH = 'https://graph.instagram.com/v27.0';

/** Instagram account-level `impressions` was deprecated (Apr 2025); `views`
 *  is Meta's replacement metric ("played or displayed"). */
const IG_IMPRESSIONS_FALLBACK = 'views';

export interface InsightsRange {
  since: Date;
  until: Date;
}

export interface MetricValue {
  key: string;
  value: number;
  /** Extra structure (demographic breakdowns) stored with the snapshot. */
  dimensions?: Record<string, string | number>;
}

export interface UnsupportedMetric {
  key: string;
  reason: string;
}

export interface InsightsResult {
  metrics: MetricValue[];
  unsupported: UnsupportedMetric[];
  range: InsightsRange;
}

type SpecSource = 'ig-insights' | 'ig-profile' | 'ig-media' | 'ig-count' | 'fb-insights' | 'fb-profile' | 'fb-count';

interface MetricSpec {
  /** Dashboard metric id (lib/analytics/registry.ts METRICS key). */
  key: string;
  source: SpecSource;
  /** Provider metric name; absent for profile/count/media sources. */
  graphMetric?: string;
  period?: 'day' | 'lifetime';
  metricType?: 'total_value' | 'time_series';
  timeframe?: string;
  breakdown?: string;
  aggregation: 'sum' | 'latest' | 'delta';
}

export const METRIC_LABELS: Record<string, string> = {
  followers: 'Total Followers / Subscribers',
  impressions: 'Total Impressions / Views',
  reach: 'Total Reach',
  engagement: 'Total Engagement',
  audienceGrowth: 'Audience Growth',
  postsPublished: 'Posts Published',
  saves: 'Saves',
  profileVisits: 'Profile Visits',
  followerDemographics: 'Follower Demographics',
  storyViews: 'Story Views',
  reelPlays: 'Reel Plays',
  websiteClicks: 'Website Clicks',
  shares: 'Shares',
  comments: 'Comments',
  likes: 'Likes',
  views: 'Views',
  videoViews: 'Video Views',
  pageReactions: 'Page Reactions',
  pageVisits: 'Page Visits',
  linkClicks: 'Link Clicks',
  audienceDemographics: 'Audience Demographics',
};

const INSTAGRAM_SPECS: MetricSpec[] = [
  { key: 'followers', source: 'ig-profile', aggregation: 'latest' },
  { key: 'audienceGrowth', source: 'ig-insights', graphMetric: 'follower_count', period: 'day', metricType: 'time_series', aggregation: 'delta' },
  { key: 'reach', source: 'ig-insights', graphMetric: 'reach', period: 'day', metricType: 'total_value', aggregation: 'sum' },
  { key: 'impressions', source: 'ig-insights', graphMetric: IG_IMPRESSIONS_FALLBACK, period: 'day', metricType: 'total_value', aggregation: 'sum' },
  { key: 'engagement', source: 'ig-insights', graphMetric: 'total_interactions', period: 'day', metricType: 'total_value', aggregation: 'sum' },
  { key: 'likes', source: 'ig-insights', graphMetric: 'likes', period: 'day', metricType: 'total_value', aggregation: 'sum' },
  { key: 'comments', source: 'ig-insights', graphMetric: 'comments', period: 'day', metricType: 'total_value', aggregation: 'sum' },
  { key: 'shares', source: 'ig-insights', graphMetric: 'shares', period: 'day', metricType: 'total_value', aggregation: 'sum' },
  { key: 'saves', source: 'ig-insights', graphMetric: 'saves', period: 'day', metricType: 'total_value', aggregation: 'sum' },
  { key: 'profileVisits', source: 'ig-insights', graphMetric: 'profile_views', period: 'day', metricType: 'total_value', aggregation: 'sum' },
  { key: 'postsPublished', source: 'ig-count', aggregation: 'sum' },
  { key: 'storyViews', source: 'ig-media', aggregation: 'sum' },
  { key: 'reelPlays', source: 'ig-media', aggregation: 'sum' },
  {
    key: 'followerDemographics',
    source: 'ig-insights',
    graphMetric: 'follower_demographics',
    period: 'lifetime',
    metricType: 'total_value',
    timeframe: 'last_30_days',
    breakdown: 'country',
    aggregation: 'latest',
  },
];

const FACEBOOK_SPECS: MetricSpec[] = [
  { key: 'followers', source: 'fb-profile', aggregation: 'latest' },
  { key: 'audienceGrowth', source: 'fb-insights', graphMetric: 'page_follows', period: 'day', aggregation: 'delta' },
  { key: 'impressions', source: 'fb-insights', graphMetric: 'page_impressions', period: 'day', aggregation: 'sum' },
  // page_impressions_unique is deprecated above Graph API v25 — reported as
  // unsupported (not an error) when Meta rejects it.
  { key: 'reach', source: 'fb-insights', graphMetric: 'page_impressions_unique', period: 'day', aggregation: 'sum' },
  { key: 'engagement', source: 'fb-insights', graphMetric: 'page_post_engagements', period: 'day', aggregation: 'sum' },
  { key: 'pageReactions', source: 'fb-insights', graphMetric: 'page_actions_post_reactions_total', period: 'day', aggregation: 'sum' },
  { key: 'pageVisits', source: 'fb-insights', graphMetric: 'page_views_total', period: 'day', aggregation: 'sum' },
  { key: 'linkClicks', source: 'fb-insights', graphMetric: 'page_clicks', period: 'day', aggregation: 'sum' },
  { key: 'videoViews', source: 'fb-insights', graphMetric: 'page_video_views', period: 'day', aggregation: 'sum' },
  { key: 'postsPublished', source: 'fb-count', aggregation: 'sum' },
  { key: 'audienceDemographics', source: 'fb-insights', graphMetric: 'page_fans_country', period: 'day', aggregation: 'latest' },
];

export const KNOWN_METRIC_KEYS: readonly string[] = [
  ...new Set([...INSTAGRAM_SPECS, ...FACEBOOK_SPECS].map((spec) => spec.key)),
];

interface GraphInsightEntry {
  name?: string;
  period?: string;
  values?: Array<{ value: number | Record<string, number>; end_time?: string }>;
  total_value?: {
    value?: number | Record<string, number>;
    breakdowns?: Array<{ dimension_keys?: string[]; results?: Array<{ dimension_values?: string[]; value?: number }> }>;
  };
}

interface PagedBody {
  data?: Array<Record<string, unknown>>;
  paging?: { cursors?: { after?: string } };
}

export interface SyncableAccount {
  id: string;
  workspaceId: string;
  providerId: string;
  providerAccountId: string;
  displayName: string;
  product: SocialProduct;
}

const MAX_RANGE_DAYS = 90;
const PAGE_LIMIT = 100;
const MAX_PAGES = 5;
const MAX_CONTENT_PER_TYPE = 15;

@Injectable()
export class MetaInsightsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vault: IntegrationsVaultService,
  ) {}

  /**
   * Fetches every known metric for one account, persists what succeeded and
   * returns the normalized result. Throws REVOKED_PERMISSION only when the
   * token itself is rejected for every metric — a metric Meta simply does not
   * offer for this account lands in `unsupported` instead.
   */
  async syncAccount(account: SyncableAccount, accessToken: string, range: InsightsRange): Promise<InsightsResult> {
    const specs = account.product === 'instagram' ? INSTAGRAM_SPECS : FACEBOOK_SPECS;
    const results = new Map<string, MetricValue>();
    const unsupported: UnsupportedMetric[] = [];
    let authFailures = 0;
    let attempts = 0;
    let mediaAggregates: Promise<{ storyViews: number | null; reelPlays: number | null }> | null = null;

    for (const spec of specs) {
      attempts += 1;
      try {
        let value: MetricValue | null = null;
        if (spec.source === 'ig-media') {
          mediaAggregates ??= this.fetchInstagramMediaAggregates(account.providerAccountId, accessToken, range);
          const aggregates = await mediaAggregates;
          const raw = spec.key === 'storyViews' ? aggregates.storyViews : aggregates.reelPlays;
          value = raw === null ? null : { key: spec.key, value: raw };
        } else {
          value = await this.fetchSpec(spec, account, accessToken, range);
        }
        if (value) results.set(spec.key, value);
        else unsupported.push({ key: spec.key, reason: 'No data returned for this period' });
      } catch (error) {
        if (error instanceof MetaGraphError && error.kind === 'AUTH') authFailures += 1;
        unsupported.push({ key: spec.key, reason: this.safeReason(error) });
      }
    }

    if (authFailures > 0 && results.size === 0 && authFailures === attempts) {
      throw new IntegrationError(
        'REVOKED_PERMISSION',
        'Meta no longer grants access to this account. Please reconnect it.',
        409,
      );
    }

    const metrics = [...results.values()];
    await this.persist(account, range, metrics);
    return { metrics, unsupported, range };
  }

  // --- per-spec fetchers -----------------------------------------------------

  private async fetchSpec(spec: MetricSpec, account: SyncableAccount, token: string, range: InsightsRange): Promise<MetricValue | null> {
    switch (spec.source) {
      case 'ig-profile': {
        const profile = await readProfile(token);
        const followers = Number(profile.followers_count);
        return Number.isFinite(followers) ? { key: spec.key, value: followers } : null;
      }
      case 'ig-insights':
        return this.fetchInstagramInsight(spec, account.providerAccountId, token, range);
      case 'ig-count':
        return this.fetchInstagramPostCount(account.providerAccountId, token, range);
      case 'fb-profile':
        return this.fetchFacebookProfileCount(account.providerAccountId, token);
      case 'fb-insights':
        return this.fetchFacebookInsight(spec, account.providerAccountId, token, range);
      case 'fb-count':
        return this.fetchFacebookPostCount(account.providerAccountId, token, range);
      default:
        return null;
    }
  }

  private async fetchInstagramInsight(spec: MetricSpec, igId: string, token: string, range: InsightsRange): Promise<MetricValue | null> {
    const body = await metaGet<{ data?: GraphInsightEntry[] }>(`${IG_GRAPH}/${igId}/insights`, {
      metric: spec.graphMetric,
      period: spec.period,
      metric_type: spec.metricType,
      timeframe: spec.timeframe,
      breakdown: spec.breakdown,
      since: unix(range.since),
      until: unix(range.until),
      access_token: token,
    });
    const entry = body.data?.[0];
    if (!entry) return null;
    return this.toMetricValue(spec, entry);
  }

  private async fetchFacebookInsight(spec: MetricSpec, pageId: string, token: string, range: InsightsRange): Promise<MetricValue | null> {
    const body = await metaGet<{ data?: GraphInsightEntry[] }>(`${FB_GRAPH}/${pageId}/insights`, {
      metric: spec.graphMetric,
      period: spec.period,
      since: unix(range.since),
      until: unix(range.until),
      access_token: token,
    });
    const entry = body.data?.[0];
    if (!entry) return null;
    return this.toMetricValue(spec, entry);
  }

  /** fan_count needs read_insights on the Page; page_fans insights is the fallback. */
  private async fetchFacebookProfileCount(pageId: string, token: string): Promise<MetricValue | null> {
    try {
      const page = await metaGet<{ fan_count?: number }>(`${FB_GRAPH}/${pageId}`, {
        fields: 'fan_count',
        access_token: token,
      });
      if (typeof page.fan_count === 'number') return { key: 'followers', value: page.fan_count };
    } catch (error) {
      if (error instanceof MetaGraphError && error.kind === 'AUTH') throw error;
      // fall through to the insights metric
    }
    const body = await metaGet<{ data?: GraphInsightEntry[] }>(`${FB_GRAPH}/${pageId}/insights`, {
      metric: 'page_fans',
      period: 'day',
      access_token: token,
    });
    const entry = body.data?.[0];
    if (!entry) return null;
    const values = entry.values ?? [];
    const latest = values[values.length - 1]?.value;
    return typeof latest === 'number' ? { key: 'followers', value: latest } : null;
  }

  private async fetchInstagramPostCount(igId: string, token: string, range: InsightsRange): Promise<MetricValue | null> {
    const items = await collectPages(
      `${IG_GRAPH}/${igId}/media`,
      { fields: 'id,media_type,timestamp', since: unix(range.since), until: unix(range.until), limit: PAGE_LIMIT, access_token: token },
      MAX_PAGES,
      PAGE_LIMIT * MAX_PAGES,
    );
    return { key: 'postsPublished', value: items.length };
  }

  private async fetchFacebookPostCount(pageId: string, token: string, range: InsightsRange): Promise<MetricValue | null> {
    const items = await collectPages(
      `${FB_GRAPH}/${pageId}/published_posts`,
      { fields: 'id,created_time', since: unix(range.since), until: unix(range.until), limit: PAGE_LIMIT, access_token: token },
      MAX_PAGES,
      PAGE_LIMIT * MAX_PAGES,
    );
    return { key: 'postsPublished', value: items.length };
  }

  /**
   * Content-level totals that account insights do not expose: story impressions
   * and reel plays. Lists recent media in the range, then reads insights for a
   * bounded number of each type — media the API refuses is skipped quietly.
   */
  private async fetchInstagramMediaAggregates(
    igId: string,
    token: string,
    range: InsightsRange,
  ): Promise<{ storyViews: number | null; reelPlays: number | null }> {
    const media = await collectPages(
      `${IG_GRAPH}/${igId}/media`,
      { fields: 'id,media_type,timestamp', since: unix(range.since), until: unix(range.until), limit: PAGE_LIMIT, access_token: token },
      MAX_PAGES,
      PAGE_LIMIT * MAX_PAGES,
    );
    const stories = media.filter((item) => item.media_type === 'STORY').slice(0, MAX_CONTENT_PER_TYPE);
    const reels = media.filter((item) => item.media_type === 'REEL').slice(0, MAX_CONTENT_PER_TYPE);

    const [storyViews, reelPlays] = await Promise.all([
      sumMediaInsights(stories, 'impressions', token),
      sumMediaInsights(reels, 'plays', token),
    ]);
    return { storyViews, reelPlays };
  }

  private toMetricValue(spec: MetricSpec, entry: GraphInsightEntry): MetricValue | null {
    // total_value shape (Instagram total_value requests, incl. breakdowns).
    if (entry.total_value) {
      const breakdowns = entry.total_value.breakdowns;
      if (breakdowns?.length) {
        const dimensions: Record<string, string | number> = {};
        let total = 0;
        for (const breakdown of breakdowns) {
          const keys = breakdown.dimension_keys ?? [];
          for (const row of breakdown.results ?? []) {
            const label = (row.dimension_values ?? []).join(' / ');
            const value = Number(row.value ?? 0);
            dimensions[label || keys.join('/') || 'value'] = value;
            total += value;
          }
        }
        if (Object.keys(dimensions).length) return { key: spec.key, value: total, dimensions };
      }
      const totalValue = entry.total_value.value;
      if (typeof totalValue === 'number') return { key: spec.key, value: totalValue };
      if (totalValue && typeof totalValue === 'object') {
        const entries = Object.entries(totalValue);
        const total = entries.reduce((sum, [, value]) => sum + Number(value ?? 0), 0);
        return { key: spec.key, value: total, dimensions: Object.fromEntries(entries) };
      }
      return null;
    }

    // Time-series shape (Facebook Page insights; Instagram time_series).
    const values = (entry.values ?? [])
      .map((point) => point.value)
      .filter((value): value is number => typeof value === 'number');
    if (!values.length) {
      // Demographic metrics put the breakdown object in values[].value.
      const objectPoint = (entry.values ?? []).find((point) => point.value && typeof point.value === 'object');
      if (objectPoint && typeof objectPoint.value === 'object') {
        const dimensions = objectPoint.value as Record<string, number>;
        const total = Object.values(dimensions).reduce((sum, value) => sum + Number(value ?? 0), 0);
        return { key: spec.key, value: total, dimensions };
      }
      return null;
    }
    switch (spec.aggregation) {
      case 'latest':
        return { key: spec.key, value: values[values.length - 1] };
      case 'delta':
        return values.length >= 2 ? { key: spec.key, value: values[values.length - 1] - values[0] } : null;
      case 'sum':
      default:
        return { key: spec.key, value: values.reduce((sum, value) => sum + value, 0) };
    }
  }

  // --- persistence -----------------------------------------------------------

  private async persist(account: SyncableAccount, range: InsightsRange, metrics: MetricValue[]): Promise<void> {
    await persistAccountMetrics(this.prisma, account, range, metrics, {
      jobType: 'meta.insights',
      labelFor: (key) => METRIC_LABELS[key] ?? key,
      aggregationFor: (key) => this.specAggregation(account.product, key),
      redact: redactSecrets,
      loggerLabel: 'MetaInsightsService',
    });
  }

  private specAggregation(product: SocialProduct, key: string): string {
    const specs = product === 'instagram' ? INSTAGRAM_SPECS : FACEBOOK_SPECS;
    return specs.find((spec) => spec.key === key)?.aggregation ?? 'sum';
  }

  private safeReason(error: unknown): string {
    if (error instanceof MetaGraphError) {
      if (error.kind === 'AUTH') return 'Permission not granted or token expired';
      if (error.kind === 'RATE_LIMIT') return 'Rate limited by Meta — try again later';
      return redactSecrets(error.message);
    }
    if (error instanceof Error) return redactSecrets(error.message);
    return 'Unavailable';
  }
}

// --- helpers -----------------------------------------------------------------

function unix(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

async function collectPages(
  url: string,
  params: Record<string, string | number | undefined>,
  maxPages: number,
  maxItems: number,
): Promise<Array<Record<string, unknown>>> {
  const items: Array<Record<string, unknown>> = [];
  let after: string | undefined;
  for (let page = 0; page < maxPages && items.length < maxItems; page += 1) {
    const body = await metaGet<PagedBody>(url, { ...params, after });
    for (const item of body.data ?? []) {
      items.push(item);
      if (items.length >= maxItems) break;
    }
    after = body.paging?.cursors?.after;
    if (!after || !body.data?.length) break;
  }
  return items;
}

async function sumMediaInsights(media: Array<Record<string, unknown>>, metric: string, token: string): Promise<number | null> {
  if (!media.length) return null;
  let total = 0;
  let found = false;
  await Promise.all(
    media.map(async (item) => {
      const id = typeof item.id === 'string' ? item.id : null;
      if (!id) return;
      try {
        const body = await metaGet<{ data?: GraphInsightEntry[] }>(`${IG_GRAPH}/${id}/insights`, {
          metric,
          access_token: token,
        });
        const entry = body.data?.[0];
        const value = entry?.total_value?.value ?? entry?.values?.[0]?.value;
        if (typeof value === 'number') {
          total += value;
          found = true;
        }
      } catch {
        // Insights unavailable for this media (age, type, permissions) — skip.
      }
    }),
  );
  return found ? total : null;
}