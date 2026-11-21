import type { MetricFormat, PlatformId } from "./types";

/**
 * Cross-platform comparison mock data.
 *
 * Metrics are declared with their *definitions per platform*: engagement
 * on Instagram (likes + comments + saves + shares) is not the same
 * quantity as engagement on X (likes + reposts + replies), and website
 * "impressions" are page views rather than content serves. Whenever two
 * selected platforms define the metric differently — or the metric mixes
 * social and website semantics — the compare view must render the
 * explanation from `metricCompatibility()` before showing any numbers.
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

/* ------------------------------------------------------------------ metric defs */

export interface CompareMetricDef {
  id: string;
  label: string;
  format: MetricFormat;
  /** Short generic description shown in the picker. */
  description: string;
  /** What one unit counts on each platform that reports it. */
  definitions: Partial<Record<PlatformId, string>>;
  /** Platforms that can report this metric at all. */
  supportedBy: PlatformId[];
  /**
   * True when the per-platform definitions are *different quantities* —
   * comparing raw values across such platforms needs a caveat callout.
   */
  heterogeneous: boolean;
}

export const COMPARE_METRICS: CompareMetricDef[] = [
  {
    id: "engagement",
    label: "Engagement",
    format: "compact",
    description: "Total interactions with your content.",
    heterogeneous: true,
    supportedBy: ["instagram", "tiktok", "facebook", "x", "youtube", "linkedin"],
    definitions: {
      instagram: "Likes + comments + saves + shares.",
      tiktok: "Likes + comments + shares (video interactions).",
      facebook: "Reactions + comments + shares.",
      x: "Likes + reposts + replies + bookmarks.",
      youtube: "Likes + comments (no shares counted).",
      linkedin: "Reactions + comments + shares.",
    },
  },
  {
    id: "engagementRate",
    label: "Engagement rate",
    format: "percent",
    description: "Engagement normalised by audience size or reach.",
    heterogeneous: true,
    supportedBy: ["instagram", "tiktok", "facebook", "x", "youtube", "linkedin"],
    definitions: {
      instagram: "Engagement ÷ reach.",
      tiktok: "Engagement ÷ video views.",
      facebook: "Engagement ÷ reach.",
      x: "Engagement ÷ impressions.",
      youtube: "Engagement ÷ impressions.",
      linkedin: "Engagement ÷ impressions.",
    },
  },
  {
    id: "followers",
    label: "Audience size",
    format: "compact",
    description: "Followers, subscribers or page likes.",
    heterogeneous: true,
    supportedBy: ["instagram", "tiktok", "facebook", "x", "youtube", "linkedin"],
    definitions: {
      instagram: "Followers of the profile.",
      tiktok: "Followers of the account.",
      facebook: "Page likes + follows.",
      x: "Followers of the account.",
      youtube: "Subscribers to the channel.",
      linkedin: "Followers of the company page.",
    },
  },
  {
    id: "impressions",
    label: "Impressions",
    format: "compact",
    description: "Times your content or pages were displayed.",
    heterogeneous: true,
    supportedBy: ["instagram", "tiktok", "facebook", "x", "youtube", "linkedin", "website"],
    definitions: {
      instagram: "Times a post appeared on screen.",
      tiktok: "Times a video started playing.",
      facebook: "Times a post appeared in feed.",
      x: "Times a post appeared on a timeline.",
      youtube: "Times a thumbnail appeared in browse/search.",
      linkedin: "Times a post appeared in feed.",
      website: "Page views — one impression per rendered page, not a content serve.",
    },
  },
  {
    id: "reach",
    label: "Reach",
    format: "compact",
    description: "Unique accounts that saw your content.",
    heterogeneous: false,
    supportedBy: ["instagram", "facebook", "x", "linkedin"],
    definitions: {
      instagram: "Unique accounts that saw any post.",
      facebook: "Unique people who saw any post.",
      x: "Unique accounts that saw a post.",
      linkedin: "Unique members who saw a post.",
    },
  },
  {
    id: "audienceGrowth",
    label: "Audience growth",
    format: "number",
    description: "Net audience gained in the period.",
    heterogeneous: false,
    supportedBy: ["instagram", "tiktok", "facebook", "x", "youtube", "linkedin"],
    definitions: {
      instagram: "New followers minus unfollows.",
      tiktok: "New followers minus unfollows.",
      facebook: "New page follows minus unfollows.",
      x: "New followers minus unfollows.",
      youtube: "New subscribers minus unsubscribes.",
      linkedin: "New followers minus unfollows.",
    },
  },
  {
    id: "postsPublished",
    label: "Posts published",
    format: "number",
    description: "Content items published in the period.",
    heterogeneous: false,
    supportedBy: ["instagram", "tiktok", "facebook", "x", "youtube", "linkedin"],
    definitions: {
      instagram: "Posts, reels and stories.",
      tiktok: "Videos and photo posts.",
      facebook: "Posts, reels and stories.",
      x: "Posts and replies.",
      youtube: "Videos and Shorts.",
      linkedin: "Posts and articles.",
    },
  },
  {
    id: "sessions",
    label: "Website sessions",
    format: "compact",
    description: "Visits to your website in the period.",
    heterogeneous: false,
    supportedBy: ["website"],
    definitions: {
      website: "Sessions end after 30 minutes of inactivity.",
    },
  },
];

/** Metrics offered for a given platform selection (reported by ≥1 of them). */
export function compareMetricsFor(platformIds: PlatformId[]): CompareMetricDef[] {
  const unique = new Set(platformIds);
  return COMPARE_METRICS.filter((metric) =>
    [...unique].some((pid) => metric.supportedBy.includes(pid)),
  );
}

export interface DefinitionLine {
  platformId: PlatformId;
  label: string;
  color: string;
  definition: string;
}

export interface CompatibilityExplanation {
  /** True when the chart below must be read with the caveat in mind. */
  needsCaveat: boolean;
  headline: string;
  lines: DefinitionLine[];
}

/**
 * Explains how each selected platform defines the metric. Returns
 * `needsCaveat: false` with a single normalising note when the metric is
 * homogeneous (identical definition everywhere).
 */
export function metricCompatibility(
  metric: CompareMetricDef,
  platformIds: PlatformId[],
  platformLabels: Record<PlatformId, { label: string; color: string }>,
): CompatibilityExplanation {
  const relevant = metric.supportedBy.filter((pid) => platformIds.includes(pid));
  const distinct = new Set(relevant.map((pid) => metric.definitions[pid]));

  const lines: DefinitionLine[] = relevant.map((pid) => ({
    platformId: pid,
    label: platformLabels[pid].label,
    color: platformLabels[pid].color,
    definition: metric.definitions[pid] ?? "Not reported.",
  }));

  if (!metric.heterogeneous || distinct.size <= 1) {
    return {
      needsCaveat: false,
      headline: `All selected platforms count “${metric.label}” the same way, so values are directly comparable.`,
      lines,
    };
  }

  const mixesWebsite = relevant.includes("website") && relevant.length > 1;
  return {
    needsCaveat: true,
    headline: mixesWebsite
      ? `“${metric.label}” is measured differently by the selected sources — website figures are page-based while social figures are content-based. Compare the trend and shape of each line, not the raw totals.`
      : `Each platform defines “${metric.label}” differently (different interactions are counted, or the denominator differs). Rankings below are within-platform; treat cross-platform totals as directional only.`,
    lines,
  };
}

/* ------------------------------------------------------------------ series + values */

export interface CompareValue {
  platformId: PlatformId;
  label: string;
  color: string;
  value: number;
  previous: number;
  changePct: number;
  trend: number[];
}

/** Relative scale of each source so mock numbers look plausible side by side. */
const PLATFORM_SCALE: Record<PlatformId, number> = {
  instagram: 1,
  tiktok: 1.9,
  facebook: 1.3,
  x: 0.4,
  youtube: 1.8,
  linkedin: 0.55,
  website: 2.6,
};

const METRIC_BASE: Record<string, number> = {
  engagement: 26_000,
  engagementRate: 4.6,
  followers: 52_000,
  impressions: 340_000,
  reach: 210_000,
  audienceGrowth: 3_400,
  postsPublished: 46,
  sessions: 94_000,
};

function baseFor(metricId: string, platformId: PlatformId): number {
  const base = METRIC_BASE[metricId] ?? 10_000;
  const scale = PLATFORM_SCALE[platformId] ?? 1;
  // Percent metrics scale far more gently than counts.
  if (metricId === "engagementRate") return base * (0.6 + scale * 0.35);
  return base * scale;
}

/** One value + trend per platform for the chosen metric. */
export function getCompareValues(
  metricId: string,
  platformIds: PlatformId[],
  labels: Record<PlatformId, { label: string; color: string }>,
): CompareValue[] {
  return platformIds.map((platformId) => {
    const r = rand(`compare|${metricId}|${platformId}`);
    const base = baseFor(metricId, platformId);
    const value = base * (0.85 + r() * 0.35);
    const changePct = r() * 24 - 8;
    const previous = value / (1 + changePct / 100);
    const trend = Array.from({ length: 14 }, (_, index) =>
      value * (0.82 + (index / 13) * (0.9 + changePct / 100) + r() * 0.12),
    );
    return {
      platformId,
      label: labels[platformId].label,
      color: labels[platformId].color,
      value,
      previous,
      changePct,
      trend,
    };
  });
}

export interface CompareSeriesPoint {
  label: string;
  [platformId: string]: string | number;
}

/** Aligned daily points for the multi-series comparison chart. */
export function getCompareSeries(
  metricId: string,
  platformIds: Array<{ platformId: PlatformId; label: string; color: string }>,
): { data: CompareSeriesPoint[]; series: Array<{ platformId: PlatformId; label: string; color: string }> } {
  const days = Array.from({ length: 14 }, (_, index) => `D-${13 - index}`);
  const data: CompareSeriesPoint[] = days.map((label) => ({ label }));

  platformIds.forEach(({ platformId }) => {
    const r = rand(`series|${metricId}|${platformId}`);
    const base = baseFor(metricId, platformId);
    const drift = r() * 0.18 + 0.04;
    days.forEach((_, index) => {
      const shape = 0.8 + (index / 13) * drift;
      data[index][platformId] = Math.round(base * shape * (0.9 + r() * 0.2) * 10) / 10;
    });
  });

  return { data, series: platformIds };
}

/* ------------------------------------------------------------------ rankings + presets */

export interface RankingRow {
  rank: number;
  platformId: PlatformId;
  label: string;
  color: string;
  value: number;
  changePct: number;
  /** Share of the compared total (only meaningful for additive metrics). */
  share: number;
}

/** Performance ranking for the chosen metric, best first. */
export function getRanking(values: CompareValue[]): RankingRow[] {
  const total = values.reduce((sum, item) => sum + Math.max(item.value, 0), 0) || 1;
  return [...values]
    .sort((a, b) => b.value - a.value)
    .map((item, index) => ({
      rank: index + 1,
      platformId: item.platformId,
      label: item.label,
      color: item.color,
      value: item.value,
      changePct: item.changePct,
      share: (Math.max(item.value, 0) / total) * 100,
    }));
}

export interface GrowthRow {
  platformId: PlatformId;
  label: string;
  color: string;
  /** Period-over-period growth in percent (can be negative). */
  growthPct: number;
  /** Absolute audience gained (can be negative). */
  gained: number;
}

/** Growth comparison — audience gained and rate, best first. */
export function getGrowthComparison(
  platformIds: PlatformId[],
  labels: Record<PlatformId, { label: string; color: string }>,
): GrowthRow[] {
  return platformIds
    .map((platformId) => {
      const r = rand(`growth|${platformId}`);
      const growthPct = r() * 18 - 5;
      const audience = baseFor("followers", platformId);
      return {
        platformId,
        label: labels[platformId].label,
        color: labels[platformId].color,
        growthPct,
        gained: Math.round((audience * growthPct) / 100),
      };
    })
    .sort((a, b) => b.growthPct - a.growthPct);
}

export interface ComparisonPreset {
  id: string;
  label: string;
  platformIds: PlatformId[];
  metricId: string;
}

/** Suggested comparisons matching the common questions. */
export const COMPARISON_PRESETS: ComparisonPreset[] = [
  {
    id: "ig-tt-engagement",
    label: "Instagram vs TikTok engagement",
    platformIds: ["instagram", "tiktok"],
    metricId: "engagement",
  },
  {
    id: "fb-ig-growth",
    label: "Facebook vs Instagram audience growth",
    platformIds: ["facebook", "instagram"],
    metricId: "audienceGrowth",
  },
  {
    id: "li-x-impressions",
    label: "LinkedIn vs X impressions",
    platformIds: ["linkedin", "x"],
    metricId: "impressions",
  },
  {
    id: "social-website",
    label: "Social media vs website traffic",
    platformIds: ["instagram", "facebook", "website"],
    metricId: "impressions",
  },
];
