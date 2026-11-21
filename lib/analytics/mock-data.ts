import { eachDay, previousRange } from "./date-ranges";
import { formatDayLabel, formatMonthLabel } from "./format";
import { METRICS, PLATFORMS, metricDefinition, supportsMetric } from "./registry";
import type {
  AccountSeries,
  ConnectedAccount,
  ContentRow,
  DateRange,
  Interval,
  MetricResult,
  PlatformId,
  SeriesPoint,
} from "./types";

/**
 * Deterministic mock data. Every value is derived from a seeded hash of
 * (account, metric, date, period) so the same filters always render the
 * same numbers — on the server, after hydration, and on reload.
 */

/* ------------------------------------------------------------------ seeded RNG */

function hashSeed(input: string): number {
  let h = 1779033703 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(h ^ input.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h ^ (h >>> 16)) >>> 0;
}

function rand(seed: string): () => number {
  let a = hashSeed(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------ connected apps */

function isoMinutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

export const CONNECTED_ACCOUNTS: ConnectedAccount[] = [
  {
    id: "yt-deepcypher",
    platformId: "youtube",
    accountName: "deepcypher10@gmail.com",
    status: "connected",
    lastSyncAt: isoMinutesAgo(12),
    weight: 0.8,
  },
  {
    id: "tt-deepcypher",
    platformId: "tiktok",
    accountName: "@deepcypher",
    status: "connected",
    lastSyncAt: isoMinutesAgo(26),
    weight: 1.4,
  },
  {
    id: "ig-deepcypher",
    platformId: "instagram",
    accountName: "@deepcypher.official",
    status: "connected",
    lastSyncAt: isoMinutesAgo(58),
    weight: 1,
  },
  {
    id: "x-deepcypher",
    platformId: "x",
    accountName: "@deepcypher",
    status: "connected",
    lastSyncAt: isoMinutesAgo(140),
    weight: 0.6,
  },
  {
    id: "web-deepcypher",
    platformId: "website",
    accountName: "deepcypher.com",
    status: "connected",
    lastSyncAt: isoMinutesAgo(4),
    weight: 1.2,
  },
  {
    id: "li-deepcypher",
    platformId: "linkedin",
    accountName: "deepcypher",
    status: "syncing",
    lastSyncAt: isoMinutesAgo(3),
    weight: 0.5,
  },
  {
    id: "fb-deepcypher",
    platformId: "facebook",
    accountName: "Deepcypher Page",
    status: "error",
    lastSyncAt: isoMinutesAgo(190),
    weight: 0.7,
  },
];

/** Accounts selected on first paint (the broken Facebook page is opt-in). */
export const DEFAULT_SELECTED_IDS: string[] = CONNECTED_ACCOUNTS.filter(
  (account) => account.status !== "error",
).map((account) => account.id);

/* ------------------------------------------------------------------ baselines */

/**
 * Per-day baseline per metric, per platform. `followers` is a stock (total
 * audience), rates/durations are averaged, everything else is summed over the
 * period. Metrics absent from a platform are simply never requested.
 */
const BASE: Record<PlatformId, Record<string, number>> = {
  instagram: {
    followers: 48_200,
    impressions: 86_000,
    reach: 61_000,
    engagement: 5_200,
    engagementRate: 6.1,
    audienceGrowth: 148,
    postsPublished: 0.35,
    saves: 420,
    profileVisits: 2_100,
    storyViews: 5_400,
    reelPlays: 31_000,
    websiteClicks: 190,
  },
  tiktok: {
    followers: 128_000,
    impressions: 412_000,
    reach: 268_000,
    engagement: 18_400,
    engagementRate: 4.4,
    audienceGrowth: 620,
    postsPublished: 0.5,
    views: 388_000,
    videoCompletionRate: 62.5,
    avgWatchTime: 17,
    videoViews: 388_000,
    shares: 2_400,
    profileVisits: 8_600,
    audienceRetention: 58.4,
  },
  facebook: {
    followers: 34_500,
    impressions: 54_000,
    reach: 41_000,
    engagement: 2_800,
    engagementRate: 5.4,
    audienceGrowth: 62,
    postsPublished: 0.3,
    pageReactions: 1_600,
    pageVisits: 940,
    linkClicks: 320,
    videoViews: 18_000,
  },
  x: {
    followers: 22_800,
    impressions: 96_000,
    reach: 68_000,
    engagement: 1_900,
    engagementRate: 2.8,
    audienceGrowth: 44,
    postsPublished: 1.2,
    bookmarkCount: 140,
    linkClicks: 260,
    reposts: 210,
    replies: 130,
    profileVisitsX: 780,
  },
  youtube: {
    followers: 18_400,
    impressions: 96_000,
    views: 74_000,
    engagement: 3_100,
    engagementRate: 4.8,
    audienceGrowth: 96,
    postsPublished: 0.2,
    watchHours: 420,
    avgViewDuration: 412,
    clickThroughRate: 6.2,
  },
  linkedin: {
    followers: 9_600,
    impressions: 21_000,
    reach: 15_000,
    engagement: 780,
    engagementRate: 3.6,
    audienceGrowth: 38,
    postsPublished: 0.25,
    pageVisitors: 620,
    clicks: 410,
    reactions: 240,
    followerGrowth: 38,
  },
  website: {
    impressions: 12_800,
    pageViews: 12_800,
    sessions: 3_400,
    visitors: 2_600,
    conversions: 46,
    bounceRate: 38.4,
    avgSessionDuration: 142,
  },
};

/* ------------------------------------------------------------------ aggregation */

type Aggregation = "sum" | "avg" | "last";

function aggregationOf(metricId: string): Aggregation {
  const def = METRICS[metricId];
  if (!def) return "sum";
  if (def.format === "percent" || def.format === "duration") return "avg";
  if (metricId === "followers") return "last";
  return "sum";
}

function aggregate(values: number[], how: Aggregation): number {
  if (values.length === 0) return 0;
  if (how === "avg") return values.reduce((sum, v) => sum + v, 0) / values.length;
  if (how === "last") return values[values.length - 1];
  return values.reduce((sum, v) => sum + v, 0);
}

/** Deterministic fallback baseline for metric ids the model does not know. */
function genericBase(platformId: PlatformId, metricId: string): number {
  const r = rand(`generic|${platformId}|${metricId}`);
  switch (metricDefinition(metricId).format) {
    case "percent":
      return 8 + r() * 44;
    case "duration":
      return 25 + r() * 260;
    case "decimal":
      return 1 + r() * 8;
    default:
      return 400 + r() * 5_200;
  }
}

/** Daily series for one account. Rates ignore the account weight. */
function dailySeries(
  account: ConnectedAccount,
  metricId: string,
  days: Date[],
  periodOffset: 0 | 1,
): number[] {
  // Unknown-but-valid metrics still get a stable, plausible series so the
  // generic renderer can draw them instead of dropping the card.
  const base = BASE[account.platformId][metricId] ?? genericBase(account.platformId, metricId);

  const how = aggregationOf(metricId);
  const scale = how === "avg" ? 1 : account.weight;
  const periodScale =
    periodOffset === 1 ? 0.88 + rand(`${account.id}|${metricId}|prev`)() * 0.24 : 1;
  const growthBase = BASE[account.platformId].audienceGrowth ?? base * 0.002;

  let cumulative = base * scale * (periodOffset === 1 ? 0.96 : 1);
  const values: number[] = [];

  days.forEach((day, index) => {
    const progress = days.length > 1 ? index / (days.length - 1) : 0;
    const trend = 0.92 + progress * 0.16;
    const r = rand(`${account.id}|${metricId}|${dayKey(day)}|${periodOffset}`);
    const weekend = day.getDay() === 0 || day.getDay() === 6;
    const season = weekend ? 1.1 : 1;

    if (how === "last") {
      // followers: opening stock plus net daily growth
      cumulative += growthBase * scale * (0.5 + r() * 1.0);
      values.push(cumulative);
      return;
    }

    if (metricId === "postsPublished") {
      const whole = Math.floor(base * scale);
      const fraction = base * scale - whole;
      values.push(whole + (r() < fraction ? 1 : 0));
      return;
    }

    values.push(base * scale * (0.74 + r() * 0.52) * season * trend * periodScale);
  });

  return values;
}

/** Merges per-account daily series into one portfolio-wide daily series. */
function mergeDaily(series: number[][], how: Aggregation, weights: number[]): number[] {
  const length = series[0]?.length ?? 0;
  const merged: number[] = [];
  for (let i = 0; i < length; i++) {
    if (how === "avg") {
      let total = 0;
      let weightSum = 0;
      series.forEach((values, index) => {
        total += values[i] * weights[index];
        weightSum += weights[index];
      });
      merged.push(weightSum > 0 ? total / weightSum : 0);
    } else {
      merged.push(series.reduce((sum, values) => sum + values[i], 0));
    }
  }
  return merged;
}

/* ------------------------------------------------------------------ text metrics */

const TEXT_OPTIONS: Record<string, string[]> = {
  followerDemographics: [
    "US 34% · IN 19% · BR 12%",
    "US 31% · IN 22% · BR 14%",
    "US 29% · BR 21% · IN 16%",
  ],
  audienceDemographics: [
    "25–34 41% · 18–24 27% · 35–44 19%",
    "25–34 38% · 18–24 31% · 35–44 18%",
    "25–34 44% · 35–44 22% · 18–24 20%",
  ],
  subscriberSources: [
    "Search 46% · Suggested 31% · Browse 15%",
    "Search 42% · Suggested 35% · External 14%",
    "Suggested 40% · Search 38% · Browse 16%",
  ],
};

function textValue(metricId: string, accountIds: string[], periodOffset: 0 | 1): string {
  const options = TEXT_OPTIONS[metricId] ?? ["—"];
  const r = rand(`${metricId}|${accountIds.join(",")}|${periodOffset}`);
  return options[Math.floor(r() * options.length)];
}

/* ------------------------------------------------------------------ metric queries */

/**
 * Computes a metric across the selected accounts for the given range.
 * Returns `null` when no selected source reports the metric — callers hide
 * the card or selector option instead of rendering an empty state.
 */
export function computeMetric(
  metricId: string,
  accounts: ConnectedAccount[],
  range: DateRange,
): MetricResult | null {
  // Unregistered metric ids resolve through the generic fallback rather
  // than being discarded — `supportsMetric` still gates on the platform.
  const def = metricDefinition(metricId);

  const supporting = accounts.filter((account) =>
    supportsMetric(account.platformId, metricId),
  );
  if (supporting.length === 0) return null;

  if (def.format === "text") {
    return {
      value: 0,
      previous: 0,
      changePct: 0,
      sparkline: [],
      displayValue: textValue(
        metricId,
        supporting.map((a) => a.id),
        0,
      ),
    };
  }

  const how = aggregationOf(metricId);
  const weights = supporting.map((account) => account.weight);
  const currentDays = eachDay(range);
  const previousDays = eachDay(previousRange(range));

  const currentDaily = supporting.map((account) =>
    dailySeries(account, metricId, currentDays, 0),
  );
  const previousDaily = supporting.map((account) =>
    dailySeries(account, metricId, previousDays, 1),
  );

  const current = mergeDaily(currentDaily, how, weights);
  const previous = mergeDaily(previousDaily, how, weights);

  const value = aggregate(current, how);
  const previousValue = aggregate(previous, how);
  const changePct =
    Math.abs(previousValue) < 1e-9 ? 0 : ((value - previousValue) / Math.abs(previousValue)) * 100;

  return {
    value,
    previous: previousValue,
    changePct,
    sparkline: current.slice(-14),
  };
}

/* ------------------------------------------------------------------ chart series */

function bucketize(
  days: Date[],
  values: number[],
  interval: Interval,
  how: Aggregation,
): SeriesPoint[] {
  if (interval === "daily") {
    return days.map((day, index) => ({
      label: formatDayLabel(day),
      value: values[index],
    }));
  }

  const buckets: { label: string; values: number[] }[] = [];
  const mondayOf = (date: Date): Date => {
    const offset = (date.getDay() + 6) % 7; // Monday = 0
    const monday = new Date(date);
    monday.setDate(date.getDate() - offset);
    return monday;
  };

  days.forEach((day, index) => {
    const bucketDate = interval === "weekly" ? mondayOf(day) : new Date(day.getFullYear(), day.getMonth(), 1);
    const label =
      interval === "weekly" ? formatDayLabel(bucketDate) : formatMonthLabel(bucketDate);
    const last = buckets[buckets.length - 1];
    if (last && last.label === label) {
      last.values.push(values[index]);
    } else {
      buckets.push({ label, values: [values[index]] });
    }
  });

  return buckets.map((bucket) => ({ label: bucket.label, value: aggregate(bucket.values, how) }));
}

/** One series per selected account that reports the metric. */
export function buildChartSeries(
  metricId: string,
  accounts: ConnectedAccount[],
  range: DateRange,
  interval: Interval,
): AccountSeries[] {
  const supporting = accounts.filter((account) =>
    supportsMetric(account.platformId, metricId),
  );
  const days = eachDay(range);
  const how = aggregationOf(metricId);
  const platformCounts = new Map<PlatformId, number>();
  supporting.forEach((account) => {
    platformCounts.set(account.platformId, (platformCounts.get(account.platformId) ?? 0) + 1);
  });

  return supporting.map((account) => {
    const values = dailySeries(account, metricId, days, 0);
    const platform = PLATFORMS[account.platformId];
    const suffix =
      (platformCounts.get(account.platformId) ?? 0) > 1 ? ` · ${account.accountName}` : "";
    return {
      accountId: account.id,
      label: `${platform.label}${suffix}`,
      platformId: account.platformId,
      color: platform.color,
      points: bucketize(days, values, interval, how),
    };
  });
}

/* ------------------------------------------------------------------ content rows */

const CONTENT_TITLES: Record<PlatformId, string[]> = {
  instagram: [
    "Behind the scenes of launch week",
    "3 hooks that doubled our reach",
    "New drop is live — link in bio",
    "Before / after: our redesign",
    "Ask us anything about analytics",
    "Weekend recap in 10 seconds",
    "Carousel: how we plan content",
    "Customer story: scaling to 1M views",
  ],
  tiktok: [
    "POV: your first viral sound",
    "Day 3 of the 30-day challenge",
    "Wait for the ending…",
    "Things I wish I knew before starting",
    "Testing the newest trend so you don't have to",
    "Studio tour in 20 seconds",
    "Answering the top comment",
    "The edit trick nobody talks about",
  ],
  youtube: [
    "How we built our analytics dashboard in a week",
    "Top 10 reporting mistakes (and fixes)",
    "Full walkthrough: connecting your first source",
    "We analysed 1,000,000 sessions — here's what changed",
    "Dashboards 101: metrics that actually matter",
    "Behind the scenes: our content workflow",
    "Q&A: your analytics questions answered",
    "Case study: doubling engagement in 60 days",
  ],
  x: [
    "Shipping > talking. Here's what we learned 🧵",
    "Hot take: vanity metrics are costing you decisions",
    "We rebuilt the report pipeline. Numbers below.",
    "One chart beat our entire deck. Thread.",
    "Unpopular opinion: daily active users lie",
    "Milestone: 1M sessions tracked this month",
    "Bookmark this before your next board meeting",
    "What we'd do differently launching v2",
  ],
  facebook: [
    "We're hiring — join the analytics team",
    "Live session recap: reporting that ships",
    "New case study is up — link inside",
    "Community milestone: thanks for following",
    "Tips for your Monday reporting routine",
    "Product update: faster exports",
    "Photo dump from the offsite",
    "Poll: which metric do you check first?",
  ],
  linkedin: [
    "Three lessons from scaling a dashboard product",
    "Our Q3 growth report is live",
    "Why we retired our weekly slide deck",
    "Hiring: senior data engineer (remote)",
    "How our customers cut reporting time by 70%",
    "Thoughts on building metric contracts",
    "Announcement: new integrations shipped",
    "Reflection: 12 months of product-led growth",
  ],
  website: [],
};

const CONTENT_BASES: Record<string, number> = {
  likes: 1_200,
  comments: 84,
  shares: 46,
  saves: 130,
  reach: 18_000,
  engagementRate: 5.4,
  views: 42_000,
  avgWatchTime: 21,
  completionRate: 58,
  watchHours: 96,
  subscribersGained: 14,
  avgViewDuration: 380,
  reposts: 42,
  replies: 26,
  bookmarks: 58,
  linkClicks: 120,
  reactions: 340,
  videoViews: 21_000,
  impressions: 14_000,
  clicks: 260,
};

const PLATFORM_SCALE: Record<PlatformId, number> = {
  instagram: 1,
  tiktok: 1.6,
  facebook: 0.9,
  x: 0.6,
  youtube: 1.2,
  linkedin: 0.5,
  website: 1,
};

const RATE_KEYS = new Set(["engagementRate", "completionRate"]);
const DURATION_KEYS = new Set(["avgWatchTime", "avgViewDuration"]);
const TEXT_CONTENT_KEYS = new Set(["thumb", "caption", "video", "title", "content", "publishedAt"]);

/**
 * Content rows for one platform, published inside the given range.
 * Only columns declared for the platform in the registry get values — the
 * table never asks for data a network does not report.
 */
export function buildContentRows(platformId: PlatformId, range: DateRange): ContentRow[] {
  const columns = PLATFORMS[platformId].content.filter(
    (column) => !TEXT_CONTENT_KEYS.has(column.key),
  );
  const titles = CONTENT_TITLES[platformId];
  const types = PLATFORMS[platformId].contentTypes;
  if (titles.length === 0 || columns.length === 0) return [];

  const r = rand(`${platformId}|content|${dayKey(range.from)}|${dayKey(range.to)}`);
  const count = 18 + Math.floor(r() * 12);
  const span = range.to.getTime() - range.from.getTime();
  const scale = PLATFORM_SCALE[platformId];

  const rows: ContentRow[] = [];
  for (let i = 0; i < count; i++) {
    const fraction = (i + r() * 0.8) / count;
    const publishedAt = new Date(range.to.getTime() - fraction * span);
    const metrics: Record<string, number> = {};

    columns.forEach((column) => {
      const base = CONTENT_BASES[column.key] ?? 100;
      if (RATE_KEYS.has(column.key)) {
        metrics[column.key] = Math.min(100, Math.max(0.5, base * (0.6 + r() * 0.8)));
      } else if (DURATION_KEYS.has(column.key)) {
        metrics[column.key] = base * (0.5 + r() * 1.1);
      } else {
        metrics[column.key] = base * scale * (0.35 + r() * 1.7);
      }
    });

    rows.push({
      id: `${platformId}-${i}`,
      platformId,
      type: types.length > 0 ? types[i % types.length] : "Post",
      title: titles[Math.floor(r() * titles.length)],
      publishedAt: publishedAt.toISOString(),
      metrics,
    });
  }
  return rows;
}

/* ------------------------------------------------------------------ engagement */

/**
 * Share of total engagement per interaction type, per network. The
 * engagement statistics section unions the components of the selected
 * sources and weights them by each account's engagement total.
 */
const ENGAGEMENT_MIX: Partial<Record<PlatformId, Record<string, number>>> = {
  instagram: { Likes: 0.62, Comments: 0.11, Shares: 0.09, Saves: 0.12, "Link clicks": 0.06 },
  tiktok: { Likes: 0.58, Comments: 0.13, Shares: 0.16, Saves: 0.08, "Profile views": 0.05 },
  facebook: { Reactions: 0.55, Comments: 0.16, Shares: 0.14, "Link clicks": 0.15 },
  x: { Likes: 0.44, Reposts: 0.24, Replies: 0.2, Bookmarks: 0.12 },
  youtube: { Likes: 0.5, Comments: 0.22, Shares: 0.12, "Watch time": 0.16 },
  linkedin: { Reactions: 0.5, Comments: 0.18, Clicks: 0.32 },
};

export interface EngagementSlice {
  label: string;
  value: number;
  share: number;
}

export function buildEngagementBreakdown(
  accounts: ConnectedAccount[],
  range: DateRange,
): EngagementSlice[] | null {
  const labels: string[] = [];
  const totals: Record<string, number> = {};
  let grandTotal = 0;

  for (const account of accounts) {
    const mix = ENGAGEMENT_MIX[account.platformId];
    if (!mix) continue;
    const engagement = computeMetric("engagement", [account], range)?.value ?? 0;
    grandTotal += engagement;
    for (const [label, share] of Object.entries(mix)) {
      if (!(label in totals)) {
        totals[label] = 0;
        labels.push(label);
      }
      totals[label] += engagement * share;
    }
  }

  if (labels.length === 0 || grandTotal === 0) return null;

  return labels
    .map((label) => ({
      label,
      value: totals[label],
      share: (totals[label] / grandTotal) * 100,
    }))
    .sort((a, b) => b.value - a.value);
}

/* ------------------------------------------------------------------ website */

export interface WebsitePageRow {
  path: string;
  views: number;
  visitors: number;
  avgTime: number;
  exitRate: number;
}

export interface WebsiteSourceRow {
  label: string;
  sessions: number;
  share: number;
}

export interface WebsiteActivity {
  label: string;
  detail: string;
  when: string;
}

export interface WebsiteAnalytics {
  users: number;
  sessions: number;
  pageViews: number;
  conversions: number;
  bounceRate: number;
  avgSessionDuration: number;
  newUsersShare: number;
  pages: WebsitePageRow[];
  sources: WebsiteSourceRow[];
  activities: WebsiteActivity[];
}

const WEBSITE_PATHS = [
  "/",
  "/pricing",
  "/features",
  "/blog/launch-week",
  "/docs/getting-started",
  "/contact",
];

const WEBSITE_SOURCES = ["Google", "Direct", "Social", "Referral", "Email"];

export function buildWebsiteAnalytics(
  accounts: ConnectedAccount[],
  range: DateRange,
): WebsiteAnalytics | null {
  const website = accounts.find((account) => account.platformId === "website");
  if (!website) return null;

  const sessions = computeMetric("sessions", [website], range)?.value ?? 0;
  const visitors = computeMetric("visitors", [website], range)?.value ?? 0;
  const pageViews = computeMetric("pageViews", [website], range)?.value ?? 0;
  const conversions = computeMetric("conversions", [website], range)?.value ?? 0;
  const bounceRate = computeMetric("bounceRate", [website], range)?.value ?? 0;
  const avgSessionDuration = computeMetric("avgSessionDuration", [website], range)?.value ?? 0;

  const r = rand(`website|${dayKey(range.from)}|${dayKey(range.to)}`);

  const pathWeights = WEBSITE_PATHS.map(() => 0.4 + r());
  const pathWeightTotal = pathWeights.reduce((sum, w) => sum + w, 0);
  const pages: WebsitePageRow[] = WEBSITE_PATHS.map((path, index) => {
    const views = Math.round(pageViews * (pathWeights[index] / pathWeightTotal));
    return {
      path,
      views,
      visitors: Math.round(views * (0.55 + r() * 0.3)),
      avgTime: Math.round(14 + r() * 190),
      exitRate: Math.round(18 + r() * 54),
    };
  }).sort((a, b) => b.views - a.views);

  const sourceWeights = WEBSITE_SOURCES.map(() => 0.3 + r());
  const sourceWeightTotal = sourceWeights.reduce((sum, w) => sum + w, 0);
  const sources: WebsiteSourceRow[] = WEBSITE_SOURCES.map((label, index) => {
    const share = (sourceWeights[index] / sourceWeightTotal) * 100;
    return { label, sessions: Math.round((sessions * share) / 100), share };
  }).sort((a, b) => b.sessions - a.sessions);

  const activities: WebsiteActivity[] = [
    { label: "Converted", detail: "Started a free trial from /pricing", when: "4 min ago" },
    { label: "High intent", detail: "Viewed /pricing 3 times in one session", when: "31 min ago" },
    { label: "New visitor", detail: "Landed on /blog/launch-week via Google", when: "1 h ago" },
    { label: "Returning", detail: "Browsed 5 pages, 6m 12s on site", when: "3 h ago" },
  ];

  return {
    users: visitors,
    sessions,
    pageViews,
    conversions,
    bounceRate,
    avgSessionDuration,
    newUsersShare: 48 + r() * 24,
    pages,
    sources,
    activities,
  };
}
