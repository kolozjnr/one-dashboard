import type {
  ChartMetricId,
  ContentColumn,
  MetricDef,
  PlatformId,
  UniversalMetricId,
} from "./types";

/**
 * Metrics registry.
 *
 * A metric is declared once in METRICS and then referenced by id from the
 * platform definitions below. Adding a metric for a new network never
 * requires touching the dashboard layout — the grids, chart selector and
 * content table all derive from this file.
 */

export const METRICS: Record<string, MetricDef> = {
  /* ---------- universal (shown when a selected source supports them) ---------- */
  followers: {
    id: "followers",
    label: "Total Followers / Subscribers",
    format: "number",
    description: "Combined audience size across the selected accounts.",
  },
  impressions: {
    id: "impressions",
    label: "Total Impressions / Views",
    format: "compact",
    description: "How many times your content was served in the selected period.",
  },
  reach: {
    id: "reach",
    label: "Total Reach",
    format: "compact",
    description: "Unique accounts that saw your content at least once.",
  },
  engagement: {
    id: "engagement",
    label: "Total Engagement",
    format: "compact",
    description: "Likes, comments, shares, saves and clicks combined.",
  },
  engagementRate: {
    id: "engagementRate",
    label: "Engagement Rate",
    format: "percent",
    description: "Engagement divided by reach, averaged across accounts.",
  },
  audienceGrowth: {
    id: "audienceGrowth",
    label: "Audience Growth",
    format: "number",
    description: "Net followers gained during the selected period.",
  },
  postsPublished: {
    id: "postsPublished",
    label: "Posts Published",
    format: "number",
    description: "Content pieces published in the selected period.",
  },

  /* ---------- chart-only metrics ---------- */
  views: {
    id: "views",
    label: "Views",
    format: "compact",
    description: "Video plays across the selected accounts.",
  },
  sessions: {
    id: "sessions",
    label: "Website Sessions",
    format: "compact",
    description: "Visits to your website in the selected period.",
  },
  visitors: {
    id: "visitors",
    label: "Website Visitors",
    format: "compact",
    description: "Unique people who visited your website.",
  },
  conversions: {
    id: "conversions",
    label: "Conversions",
    format: "number",
    description: "Completed goals tracked on your website.",
  },

  /* ---------- Instagram ---------- */
  saves: { id: "saves", label: "Saves", format: "number", description: "Times posts were saved." },
  profileVisits: {
    id: "profileVisits",
    label: "Profile Visits",
    format: "number",
    description: "Visits to the account profile.",
  },
  followerDemographics: {
    id: "followerDemographics",
    label: "Follower Demographics",
    format: "text",
    description: "Top follower countries.",
  },
  storyViews: {
    id: "storyViews",
    label: "Story Views",
    format: "compact",
    description: "Plays of the account's stories.",
  },
  reelPlays: {
    id: "reelPlays",
    label: "Reel Plays",
    format: "compact",
    description: "Plays of published reels.",
  },
  websiteClicks: {
    id: "websiteClicks",
    label: "Website Clicks",
    format: "number",
    description: "Link taps pointing at your website.",
  },

  /* ---------- TikTok ---------- */
  videoCompletionRate: {
    id: "videoCompletionRate",
    label: "Video Completion Rate",
    format: "percent",
    description: "Share of viewers that watched a video to the end.",
  },
  avgWatchTime: {
    id: "avgWatchTime",
    label: "Average Watch Time",
    format: "duration",
    description: "Average time spent watching your videos.",
  },
  videoViews: {
    id: "videoViews",
    label: "Video Views",
    format: "compact",
    description: "Plays of published videos.",
  },
  shares: { id: "shares", label: "Shares", format: "number", description: "Times content was shared." },
  audienceRetention: {
    id: "audienceRetention",
    label: "Audience Retention",
    format: "percent",
    description: "Average percentage of each video watched.",
  },

  /* ---------- Facebook ---------- */
  pageReactions: {
    id: "pageReactions",
    label: "Page Reactions",
    format: "number",
    description: "Reactions received by the page.",
  },
  pageVisits: {
    id: "pageVisits",
    label: "Page Visits",
    format: "number",
    description: "Visits to the page profile.",
  },
  linkClicks: {
    id: "linkClicks",
    label: "Link Clicks",
    format: "number",
    description: "Clicks on links you shared.",
  },
  audienceDemographics: {
    id: "audienceDemographics",
    label: "Audience Demographics",
    format: "text",
    description: "Largest age groups of the audience.",
  },

  /* ---------- X ---------- */
  bookmarkCount: {
    id: "bookmarkCount",
    label: "Bookmark Count",
    format: "number",
    description: "Times your posts were bookmarked.",
  },
  reposts: { id: "reposts", label: "Reposts", format: "number", description: "Times your posts were reposted." },
  replies: { id: "replies", label: "Replies", format: "number", description: "Replies received." },
  profileVisitsX: {
    id: "profileVisitsX",
    label: "Profile Visits",
    format: "number",
    description: "Visits to the profile.",
  },

  /* ---------- YouTube ---------- */
  watchHours: {
    id: "watchHours",
    label: "Watch Hours",
    format: "number",
    description: "Total hours watched in the period.",
  },
  subscriberSources: {
    id: "subscriberSources",
    label: "Subscriber Sources",
    format: "text",
    description: "Where new subscribers come from.",
  },
  avgViewDuration: {
    id: "avgViewDuration",
    label: "Average View Duration",
    format: "duration",
    description: "Average length of a view.",
  },
  clickThroughRate: {
    id: "clickThroughRate",
    label: "Click-through Rate",
    format: "percent",
    description: "Impressions that turned into a view.",
  },

  /* ---------- LinkedIn ---------- */
  pageVisitors: {
    id: "pageVisitors",
    label: "Page Visitors",
    format: "number",
    description: "Visits to the company page.",
  },
  clicks: { id: "clicks", label: "Clicks", format: "number", description: "Clicks on page content." },
  followerGrowth: {
    id: "followerGrowth",
    label: "Follower Growth",
    format: "number",
    description: "Net new followers in the period.",
  },

  /* ---------- Website ---------- */
  bounceRate: {
    id: "bounceRate",
    label: "Bounce Rate",
    format: "percent",
    description: "Sessions with a single page view.",
  },
  avgSessionDuration: {
    id: "avgSessionDuration",
    label: "Avg. Session Duration",
    format: "duration",
    description: "Average length of a website session.",
  },
  pageViews: {
    id: "pageViews",
    label: "Page Views",
    format: "compact",
    description: "Total pages viewed on your website.",
  },
};

export const UNIVERSAL_METRIC_ORDER: UniversalMetricId[] = [
  "followers",
  "impressions",
  "reach",
  "engagement",
  "engagementRate",
  "audienceGrowth",
  "postsPublished",
];

export const CHART_METRIC_ORDER: ChartMetricId[] = [
  "followers",
  "impressions",
  "reach",
  "engagement",
  "engagementRate",
  "views",
  "sessions",
  "visitors",
  "conversions",
];

export interface PlatformDefinition {
  id: PlatformId;
  label: string;
  /** Series / badge colour used across charts and legends. */
  color: string;
  /** Favicon source; websites use a globe icon instead. */
  domain?: string;
  /** Universal metrics this network reports. */
  universal: UniversalMetricId[];
  /** Platform-specific metric ids (see METRICS). */
  custom: string[];
  /** Metrics offered in the chart selector. */
  chart: ChartMetricId[];
  /** Content table columns — the table renders only these. */
  content: ContentColumn[];
  /** Options for the content type filter. */
  contentTypes: string[];
}

const IG_CONTENT: ContentColumn[] = [
  { key: "thumb", label: "Thumbnail", type: "thumb" },
  { key: "caption", label: "Caption", type: "text" },
  { key: "publishedAt", label: "Published Date", type: "date" },
  { key: "likes", label: "Likes", type: "number", align: "right" },
  { key: "comments", label: "Comments", type: "number", align: "right" },
  { key: "shares", label: "Shares", type: "number", align: "right" },
  { key: "saves", label: "Saves", type: "number", align: "right" },
  { key: "reach", label: "Reach", type: "number", align: "right" },
  { key: "engagementRate", label: "Engagement Rate", type: "rate", align: "right" },
];

const TIKTOK_CONTENT: ContentColumn[] = [
  { key: "thumb", label: "Thumbnail", type: "thumb" },
  { key: "video", label: "Video", type: "text" },
  { key: "publishedAt", label: "Published Date", type: "date" },
  { key: "views", label: "Views", type: "number", align: "right" },
  { key: "likes", label: "Likes", type: "number", align: "right" },
  { key: "comments", label: "Comments", type: "number", align: "right" },
  { key: "shares", label: "Shares", type: "number", align: "right" },
  { key: "avgWatchTime", label: "Average Watch Time", type: "duration", align: "right" },
  { key: "completionRate", label: "Completion Rate", type: "rate", align: "right" },
];

const YOUTUBE_CONTENT: ContentColumn[] = [
  { key: "thumb", label: "Thumbnail", type: "thumb" },
  { key: "title", label: "Video Title", type: "text" },
  { key: "publishedAt", label: "Published Date", type: "date" },
  { key: "views", label: "Views", type: "number", align: "right" },
  { key: "watchHours", label: "Watch Hours", type: "number", align: "right" },
  { key: "subscribersGained", label: "Subscribers Gained", type: "number", align: "right" },
  { key: "avgViewDuration", label: "Average View Duration", type: "duration", align: "right" },
];

const X_CONTENT: ContentColumn[] = [
  { key: "content", label: "Post Content", type: "text" },
  { key: "publishedAt", label: "Published Date", type: "date" },
  { key: "likes", label: "Likes", type: "number", align: "right" },
  { key: "reposts", label: "Reposts", type: "number", align: "right" },
  { key: "replies", label: "Replies", type: "number", align: "right" },
  { key: "bookmarks", label: "Bookmarks", type: "number", align: "right" },
  { key: "linkClicks", label: "Link Clicks", type: "number", align: "right" },
];

const FACEBOOK_CONTENT: ContentColumn[] = [
  { key: "thumb", label: "Thumbnail", type: "thumb" },
  { key: "caption", label: "Caption", type: "text" },
  { key: "publishedAt", label: "Published Date", type: "date" },
  { key: "reactions", label: "Reactions", type: "number", align: "right" },
  { key: "comments", label: "Comments", type: "number", align: "right" },
  { key: "shares", label: "Shares", type: "number", align: "right" },
  { key: "reach", label: "Reach", type: "number", align: "right" },
  { key: "videoViews", label: "Video Views", type: "number", align: "right" },
];

const LINKEDIN_CONTENT: ContentColumn[] = [
  { key: "thumb", label: "Thumbnail", type: "thumb" },
  { key: "title", label: "Title", type: "text" },
  { key: "publishedAt", label: "Published Date", type: "date" },
  { key: "impressions", label: "Impressions", type: "number", align: "right" },
  { key: "clicks", label: "Clicks", type: "number", align: "right" },
  { key: "reactions", label: "Reactions", type: "number", align: "right" },
  { key: "engagementRate", label: "Engagement Rate", type: "rate", align: "right" },
];

export const PLATFORMS: Record<PlatformId, PlatformDefinition> = {
  instagram: {
    id: "instagram",
    label: "Instagram",
    color: "#E1306C",
    domain: "instagram.com",
    universal: [
      "followers",
      "impressions",
      "reach",
      "engagement",
      "engagementRate",
      "audienceGrowth",
      "postsPublished",
    ],
    custom: [
      "saves",
      "profileVisits",
      "followerDemographics",
      "storyViews",
      "reelPlays",
      "websiteClicks",
    ],
    chart: ["followers", "impressions", "reach", "engagement", "engagementRate"],
    content: IG_CONTENT,
    contentTypes: ["Reel", "Story", "Image", "Carousel"],
  },
  tiktok: {
    id: "tiktok",
    label: "TikTok",
    color: "#0F766E",
    domain: "tiktok.com",
    universal: [
      "followers",
      "impressions",
      "reach",
      "engagement",
      "engagementRate",
      "audienceGrowth",
      "postsPublished",
    ],
    custom: [
      "videoCompletionRate",
      "avgWatchTime",
      "videoViews",
      "shares",
      "profileVisits",
      "audienceRetention",
    ],
    chart: ["followers", "views", "reach", "engagement", "engagementRate"],
    content: TIKTOK_CONTENT,
    contentTypes: ["Video", "Photo", "Live"],
  },
  facebook: {
    id: "facebook",
    label: "Facebook",
    color: "#1877F2",
    domain: "facebook.com",
    universal: [
      "followers",
      "impressions",
      "reach",
      "engagement",
      "engagementRate",
      "audienceGrowth",
      "postsPublished",
    ],
    custom: ["pageReactions", "pageVisits", "linkClicks", "videoViews", "audienceDemographics"],
    chart: ["followers", "impressions", "reach", "engagement", "engagementRate"],
    content: FACEBOOK_CONTENT,
    contentTypes: ["Post", "Video", "Story"],
  },
  x: {
    id: "x",
    label: "X",
    color: "#111827",
    domain: "x.com",
    universal: [
      "followers",
      "impressions",
      "reach",
      "engagement",
      "engagementRate",
      "audienceGrowth",
      "postsPublished",
    ],
    custom: ["bookmarkCount", "linkClicks", "reposts", "replies", "profileVisitsX"],
    chart: ["followers", "impressions", "reach", "engagement", "engagementRate"],
    content: X_CONTENT,
    contentTypes: ["Post", "Reply", "Thread"],
  },
  youtube: {
    id: "youtube",
    label: "YouTube",
    color: "#FF0000",
    domain: "youtube.com",
    // YouTube reports no reach metric — the card is hidden for it.
    universal: [
      "followers",
      "impressions",
      "engagement",
      "engagementRate",
      "audienceGrowth",
      "postsPublished",
    ],
    custom: ["watchHours", "subscriberSources", "avgViewDuration", "clickThroughRate"],
    chart: ["followers", "views", "impressions", "engagement", "engagementRate"],
    content: YOUTUBE_CONTENT,
    contentTypes: ["Video", "Short", "Live"],
  },
  linkedin: {
    id: "linkedin",
    label: "LinkedIn",
    color: "#0A66C2",
    domain: "linkedin.com",
    universal: [
      "followers",
      "impressions",
      "reach",
      "engagement",
      "engagementRate",
      "audienceGrowth",
      "postsPublished",
    ],
    custom: ["pageVisitors", "clicks", "reactions", "followerGrowth"],
    chart: ["followers", "impressions", "reach", "engagement", "engagementRate"],
    content: LINKEDIN_CONTENT,
    contentTypes: ["Post", "Article", "Video"],
  },
  website: {
    id: "website",
    label: "Website",
    color: "#F97316",
    // Websites have no audience metrics; only impressions (page views).
    universal: ["impressions"],
    custom: ["sessions", "visitors", "conversions", "bounceRate", "avgSessionDuration", "pageViews"],
    chart: ["sessions", "visitors", "conversions", "impressions"],
    content: [],
    contentTypes: [],
  },
};

/** Does the platform report this metric at all? */
export function supportsMetric(platformId: PlatformId, metricId: string): boolean {
  const def = PLATFORMS[platformId];
  return (
    def.universal.includes(metricId as UniversalMetricId) ||
    def.custom.includes(metricId) ||
    def.chart.includes(metricId as ChartMetricId)
  );
}

/** Universal cards in display order, filtered to what the sources support. */
export function universalMetricsFor(platformIds: PlatformId[]): string[] {
  const unique = new Set(platformIds);
  return UNIVERSAL_METRIC_ORDER.filter((id) =>
    [...unique].some((pid) => PLATFORMS[pid].universal.includes(id)),
  );
}

export interface CustomMetricRef {
  platformId: PlatformId;
  metricId: string;
}

/** Platform-specific cards: one entry per (platform, metric), in registry order. */
export function customMetricsFor(platformIds: PlatformId[]): CustomMetricRef[] {
  const unique = [...new Set(platformIds)];
  return unique.flatMap((pid) => PLATFORMS[pid].custom.map((metricId) => ({ platformId: pid, metricId })));
}

/** Chart selector options supported by at least one selected platform. */
export function chartMetricsFor(platformIds: PlatformId[]): ChartMetricId[] {
  const unique = new Set(platformIds);
  return CHART_METRIC_ORDER.filter((id) =>
    [...unique].some((pid) => PLATFORMS[pid].chart.includes(id)),
  );
}
