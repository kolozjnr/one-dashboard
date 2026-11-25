import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { persistAccountMetrics } from './analytics-persistence';
import { fetchTikTokBusinessReport } from './tiktok-business.adapter';
import { fetchTikTokVideos, readTikTokProfile, type TikTokVideo } from './tiktok.adapter';
import { fetchXPosts, readXProfile, type XPost } from './x.adapter';
import { redactProviderSecrets } from './social-http.client';
import { IntegrationError, indicatesRevocation, type SocialProduct } from './integrations.types';
import {
  METRIC_LABELS,
  type InsightsRange,
  type InsightsResult,
  type MetricValue,
  type UnsupportedMetric,
} from './meta-insights.service';

/**
 * Metrics retrieval for TikTok and X accounts.
 *
 * Design rules (same as the Meta insights service, plus provider-specific
 * honesty rules):
 *  - availability is discovered, never assumed: every metric is evaluated on
 *    its own and anything the API does not return lands in `unsupported[]`
 *    with a safe reason instead of failing the sync;
 *  - a metric this API structurally cannot provide is declared `unavailable`
 *    up front — the Display API's missing impressions/reach are reported as
 *    "requires the TikTok API for Business", never as a zero;
 *  - owner-only X metrics (non_public / organic) are read only from the
 *    authenticated user's own timeline and only when X actually returns them;
 *  - successful metrics become AccountMetricCapability rows so the dashboard
 *    only shows what this specific account can actually report.
 */

/** Dashboard metric labels are shared with the Meta service. */
const TIKTOK_DISPLAY_UNAVAILABLE = 'Not exposed by the TikTok Display API — requires the TikTok API for Business';
const BUSINESS_UNAVAILABLE = 'Not exposed by the TikTok for Business integrated report';
const X_UNAVAILABLE = 'Not exposed by the X API';

type SpecSource =
  | 'unavailable'
  | 'tiktok-profile'
  | 'tiktok-videos'
  | 'x-profile'
  | 'x-posts'
  | 'x-posts-entitled'
  | 'business-report';

interface MetricSpec {
  /** Dashboard metric id (lib/analytics/registry.ts METRICS key). */
  key: string;
  source: SpecSource;
  /** Field read from the profile object (tiktok-profile). */
  field?: string;
  /** Per-post counter summed across the range (x-posts). */
  postSum?: 'retweetCount' | 'replyCount' | 'likeCount' | 'bookmarkCount';
  /** Per-post aggregation that needs its own rule (x-posts). */
  postAggregate?: 'posts' | 'engagement' | 'impressions' | 'urlClicks' | 'profileClicks';
  /** Provider metric name inside a Business report row. */
  reportMetric?: string;
  /** Why this metric can never be provided (source === 'unavailable'). */
  reason?: string;
  aggregation: 'sum' | 'latest' | 'delta';
}

const TIKTOK_DISPLAY_SPECS: MetricSpec[] = [
  { key: 'followers', source: 'tiktok-profile', field: 'follower_count', aggregation: 'latest' },
  { key: 'views', source: 'tiktok-videos', aggregation: 'sum' },
  { key: 'likes', source: 'tiktok-videos', aggregation: 'sum' },
  { key: 'comments', source: 'tiktok-videos', aggregation: 'sum' },
  { key: 'shares', source: 'tiktok-videos', aggregation: 'sum' },
  { key: 'engagement', source: 'tiktok-videos', aggregation: 'sum' },
  { key: 'postsPublished', source: 'tiktok-videos', aggregation: 'sum' },
  { key: 'impressions', source: 'unavailable', reason: TIKTOK_DISPLAY_UNAVAILABLE, aggregation: 'sum' },
  { key: 'reach', source: 'unavailable', reason: TIKTOK_DISPLAY_UNAVAILABLE, aggregation: 'sum' },
  { key: 'profileVisits', source: 'unavailable', reason: TIKTOK_DISPLAY_UNAVAILABLE, aggregation: 'sum' },
  { key: 'videoCompletionRate', source: 'unavailable', reason: TIKTOK_DISPLAY_UNAVAILABLE, aggregation: 'latest' },
  { key: 'avgWatchTime', source: 'unavailable', reason: TIKTOK_DISPLAY_UNAVAILABLE, aggregation: 'latest' },
  { key: 'audienceRetention', source: 'unavailable', reason: TIKTOK_DISPLAY_UNAVAILABLE, aggregation: 'latest' },
  {
    key: 'audienceGrowth',
    source: 'unavailable',
    reason: 'The Display API returns a single follower total; growth needs stored history across syncs',
    aggregation: 'delta',
  },
];

const TIKTOK_BUSINESS_SPECS: MetricSpec[] = [
  { key: 'impressions', source: 'business-report', reportMetric: 'impressions', aggregation: 'sum' },
  { key: 'views', source: 'business-report', reportMetric: 'video_views', aggregation: 'sum' },
  { key: 'likes', source: 'business-report', reportMetric: 'likes', aggregation: 'sum' },
  { key: 'comments', source: 'business-report', reportMetric: 'comments', aggregation: 'sum' },
  { key: 'shares', source: 'business-report', reportMetric: 'shares', aggregation: 'sum' },
  { key: 'profileVisits', source: 'business-report', reportMetric: 'profile_visits', aggregation: 'sum' },
  { key: 'followers', source: 'business-report', reportMetric: 'follower_count', aggregation: 'latest' },
  { key: 'engagement', source: 'business-report', reportMetric: 'likes,comments,shares', aggregation: 'sum' },
  { key: 'audienceGrowth', source: 'business-report', reportMetric: 'follower_count', aggregation: 'delta' },
  { key: 'postsPublished', source: 'unavailable', reason: BUSINESS_UNAVAILABLE, aggregation: 'sum' },
  { key: 'reach', source: 'unavailable', reason: BUSINESS_UNAVAILABLE, aggregation: 'sum' },
];

const X_SPECS: MetricSpec[] = [
  { key: 'followers', source: 'x-profile', field: 'followers_count', aggregation: 'latest' },
  { key: 'postsPublished', source: 'x-posts', postAggregate: 'posts', aggregation: 'sum' },
  { key: 'impressions', source: 'x-posts', postAggregate: 'impressions', aggregation: 'sum' },
  { key: 'engagement', source: 'x-posts', postAggregate: 'engagement', aggregation: 'sum' },
  { key: 'reposts', source: 'x-posts', postSum: 'retweetCount', aggregation: 'sum' },
  { key: 'replies', source: 'x-posts', postSum: 'replyCount', aggregation: 'sum' },
  { key: 'likes', source: 'x-posts', postSum: 'likeCount', aggregation: 'sum' },
  { key: 'bookmarkCount', source: 'x-posts', postSum: 'bookmarkCount', aggregation: 'sum' },
  { key: 'linkClicks', source: 'x-posts-entitled', postAggregate: 'urlClicks', aggregation: 'sum' },
  { key: 'profileVisitsX', source: 'x-posts-entitled', postAggregate: 'profileClicks', aggregation: 'sum' },
  { key: 'reach', source: 'unavailable', reason: X_UNAVAILABLE, aggregation: 'sum' },
  {
    key: 'audienceGrowth',
    source: 'unavailable',
    reason: 'X returns a single follower total; growth needs stored history across syncs',
    aggregation: 'delta',
  },
];

const SPECS: Partial<Record<SocialProduct, MetricSpec[]>> = {
  tiktok: TIKTOK_DISPLAY_SPECS,
  tiktok_business: TIKTOK_BUSINESS_SPECS,
  x: X_SPECS,
};

/** Reason strings for owner-only X metrics that came back empty. */
const NOT_ENTITLED = 'Owner-only metrics are returned only for your own posts younger than 30 days';

export interface SyncableSocialAccount {
  id: string;
  workspaceId: string;
  providerId: string;
  providerAccountId: string;
  displayName: string;
  product: SocialProduct;
}

interface Loaded {
  profile?: Record<string, number>;
  videos?: TikTokVideo[];
  posts?: XPost[];
  report?: Array<Record<string, number>>;
}

/** Memoizes one provider call per sync so N specs share a single request. */
function memoize<T>(factory: () => Promise<T>): () => Promise<T> {
  let promise: Promise<T> | null = null;
  return () => (promise ??= factory());
}

@Injectable()
export class SocialInsightsService {
  private readonly logger = new Logger(SocialInsightsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async syncAccount(account: SyncableSocialAccount, accessToken: string, range: InsightsRange): Promise<InsightsResult> {
    const specs = SPECS[account.product];
    if (!specs) {
      throw new IntegrationError('UPSTREAM_ERROR', 'This account type does not report metrics.', 400);
    }

    const videos = memoize(async () => fetchTikTokVideos(accessToken));
    const posts = memoize(async () => fetchXPosts(accessToken, account.providerAccountId, { since: range.since, until: range.until }));
    const tiktokProfile = memoize(async () => (await readTikTokProfile(accessToken)) as Record<string, number>);
    const xProfile = memoize(async () => {
      const me = await readXProfile(accessToken);
      return (me.data?.public_metrics ?? {}) as Record<string, number>;
    });
    const report = memoize(async () => {
      const rows = await fetchTikTokBusinessReport(accessToken, {
        advertiserId: account.providerAccountId,
        metrics: 'impressions,video_views,likes,comments,shares,profile_visits,follower_count',
        since: range.since,
        until: range.until,
      });
      return rows.map((row) => row.metrics ?? {});
    });

    const results = new Map<string, MetricValue>();
    const unsupported: UnsupportedMetric[] = [];
    let authFailures = 0;
    let attempts = 0;

    for (const spec of specs) {
      if (spec.source === 'unavailable') {
        // Structural gap: reported, never fetched and never invented.
        unsupported.push({ key: spec.key, reason: spec.reason ?? 'Not available from this API' });
        continue;
      }
      attempts += 1;
      try {
        const value = await this.fetchSpec(spec, { videos, posts, tiktokProfile, xProfile, report });
        if (value) results.set(spec.key, value);
        else unsupported.push({ key: spec.key, reason: this.emptyReason(spec) });
      } catch (error) {
        if (isAuthFailure(error)) authFailures += 1;
        unsupported.push({ key: spec.key, reason: this.safeReason(error) });
      }
    }

    if (attempts > 0 && authFailures > 0 && results.size === 0 && authFailures === attempts) {
      throw new IntegrationError(
        'REVOKED_PERMISSION',
        'The provider no longer grants access to this account. Please reconnect it.',
        409,
      );
    }

    const metrics = [...results.values()];
    await this.persistPosts(account, { videos, posts });
    await this.persist(account, range, metrics);
    return { metrics, unsupported, range };
  }

  /**
   * Content rows (TikTok videos / X posts) are stored alongside the metrics —
   * best effort: a post that cannot be written never fails the metric sync.
   */
  private async persistPosts(
    account: SyncableSocialAccount,
    loaders: { videos: () => Promise<TikTokVideo[]>; posts: () => Promise<XPost[]> },
  ): Promise<void> {
    try {
      if (account.product === 'tiktok') {
        const videos = await loaders.videos();
        for (const video of videos) {
          await this.upsertPost(account, {
            providerPostId: video.id,
            postType: 'video',
            text: video.title,
            permalink: null,
            publishedAt: video.createTime,
            providerMetadata: {
              viewCount: video.viewCount,
              likeCount: video.likeCount,
              commentCount: video.commentCount,
              shareCount: video.shareCount,
              coverUrl: video.coverUrl,
            },
          });
        }
      } else if (account.product === 'x') {
        const posts = await loaders.posts();
        for (const post of posts) {
          await this.upsertPost(account, {
            providerPostId: post.id,
            postType: 'post',
            text: post.text.slice(0, 2000),
            permalink: `https://x.com/i/status/${post.id}`,
            publishedAt: post.createdAt,
            providerMetadata: { ...post.metrics, entitledMetrics: post.entitledMetrics },
          });
        }
      }
    } catch (error) {
      // Metric rows already succeeded; content rows are a convenience.
      this.logger.warn(`post persistence failed for account ${account.id}: ${this.safeReason(error)}`);
    }
  }

  private async upsertPost(
    account: SyncableSocialAccount,
    row: {
      providerPostId: string;
      postType: string;
      text: string | null;
      permalink: string | null;
      publishedAt: Date | null;
      providerMetadata: Prisma.InputJsonValue;
    },
  ): Promise<void> {
    if (!row.providerPostId) return;
    const key = {
      workspaceId_accountId_providerPostId: {
        workspaceId: account.workspaceId,
        accountId: account.id,
        providerPostId: row.providerPostId,
      },
    };
    const data = {
      postType: row.postType,
      text: row.text,
      permalink: row.permalink,
      publishedAt: row.publishedAt,
      providerMetadata: row.providerMetadata,
    };
    await this.prisma.socialPost.upsert({
      where: key,
      update: data,
      create: { workspaceId: account.workspaceId, accountId: account.id, providerPostId: row.providerPostId, ...data },
    });
  }

  // --- per-spec evaluation ---------------------------------------------------

  private async fetchSpec(
    spec: MetricSpec,
    loaders: {
      videos: () => Promise<TikTokVideo[]>;
      posts: () => Promise<XPost[]>;
      tiktokProfile: () => Promise<Record<string, number>>;
      xProfile: () => Promise<Record<string, number>>;
      report: () => Promise<Array<Record<string, number>>>;
    },
  ): Promise<MetricValue | null> {
    switch (spec.source) {
      case 'tiktok-profile': {
        const profile = await loaders.tiktokProfile();
        const value = numberOrNull(profile[spec.field ?? '']);
        return value === null ? null : { key: spec.key, value };
      }
      case 'x-profile': {
        const profile = await loaders.xProfile();
        const value = numberOrNull(profile[spec.field ?? '']);
        return value === null ? null : { key: spec.key, value };
      }
      case 'tiktok-videos': {
        const videos = await loaders.videos();
        if (!videos.length) return null;
        switch (spec.key) {
          case 'postsPublished':
            return { key: spec.key, value: videos.length };
          case 'engagement':
            return {
              key: spec.key,
              value: videos.reduce((sum, video) => sum + video.likeCount + video.commentCount + video.shareCount, 0),
            };
          case 'views':
            return { key: spec.key, value: sum(videos.map((video) => video.viewCount)) };
          case 'likes':
            return { key: spec.key, value: sum(videos.map((video) => video.likeCount)) };
          case 'comments':
            return { key: spec.key, value: sum(videos.map((video) => video.commentCount)) };
          case 'shares':
            return { key: spec.key, value: sum(videos.map((video) => video.shareCount)) };
          default:
            return null;
        }
      }
      case 'x-posts':
      case 'x-posts-entitled': {
        const posts = await loaders.posts();
        if (!posts.length) return null;
        switch (spec.postAggregate) {
          case 'posts':
            return { key: spec.key, value: posts.length };
          case 'engagement':
            return {
              key: spec.key,
              value: sum(
                posts.map(
                  (post) =>
                    post.metrics.retweetCount +
                    post.metrics.replyCount +
                    post.metrics.likeCount +
                    post.metrics.quoteCount +
                    post.metrics.bookmarkCount,
                ),
              ),
            };
          case 'impressions':
            // Prefer the owner-only impression count when X returned it.
            return { key: spec.key, value: sum(posts.map((post) => post.metrics.nonPublicImpressions ?? post.metrics.impressionCount)) };
          case 'urlClicks':
          case 'profileClicks': {
            const values = posts.map((post) =>
              spec.postAggregate === 'urlClicks' ? post.metrics.urlClicks : post.metrics.profileClicks,
            );
            const present = values.filter((value): value is number => typeof value === 'number');
            if (!present.length) return null; // -> NOT_ENTITLED reason
            return { key: spec.key, value: sum(present) };
          }
          default:
            return spec.postSum ? { key: spec.key, value: sum(posts.map((post) => post.metrics[spec.postSum!])) } : null;
        }
      }
      case 'business-report': {
        const rows = await loaders.report();
        if (!rows.length) return null;
        const names = (spec.reportMetric ?? '').split(',').filter(Boolean);
        const values = rows.map((row) => names.reduce((total, name) => total + numberOr(row[name]), 0));
        if (!values.length) return null;
        if (spec.aggregation === 'delta') {
          return values.length >= 2 ? { key: spec.key, value: values[values.length - 1] - values[0] } : null;
        }
        if (spec.aggregation === 'latest') return { key: spec.key, value: values[values.length - 1] };
        return { key: spec.key, value: sum(values) };
      }
      default:
        return null;
    }
  }

  private emptyReason(spec: MetricSpec): string {
    if (spec.source === 'x-posts-entitled') return NOT_ENTITLED;
    return 'No data returned for this period';
  }

  // --- persistence -----------------------------------------------------------

  private async persist(account: SyncableSocialAccount, range: InsightsRange, metrics: MetricValue[]): Promise<void> {
    await persistAccountMetrics(this.prisma, account, range, metrics, {
      jobType: 'social.insights',
      labelFor: (key) => METRIC_LABELS[key] ?? key,
      aggregationFor: (key) => SPECS[account.product]?.find((spec) => spec.key === key)?.aggregation ?? 'sum',
      redact: redactProviderSecrets,
      loggerLabel: 'SocialInsightsService',
    });
  }

  private safeReason(error: unknown): string {
    if (error instanceof IntegrationError) return error.message;
    if (isAuthFailure(error)) return 'Permission not granted or token expired';
    if (isRateLimit(error)) return 'Rate limited by the provider — try again later';
    if (error instanceof Error) return redactProviderSecrets(error.message);
    return 'Unavailable';
  }
}

function isAuthFailure(error: unknown): boolean {
  return indicatesRevocation(error) || (error instanceof IntegrationError && error.code === 'NEEDS_REAUTH');
}

function isRateLimit(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'kind' in error && (error as { kind?: string }).kind === 'RATE_LIMIT';
}

function numberOr(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function numberOrNull(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
