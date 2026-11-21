import type { PlatformId } from "./types";

/**
 * Reports module mock data — five report types, filter resolution and a
 * CSV serialiser. `buildReport()` composes a deterministic report from
 * the selected type + filters; `reportToCsv()` turns the same structure
 * into a downloadable CSV (client-side Blob, no backend).
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

/* ------------------------------------------------------------------ report types */

export type ReportTypeId = "overall" | "social" | "website" | "audience" | "content";

export interface ReportType {
  id: ReportTypeId;
  label: string;
  description: string;
  /** Which filters apply to this report type. */
  usesPlatform: boolean;
  usesAccount: boolean;
  usesWebsite: boolean;
}

export const REPORT_TYPES: ReportType[] = [
  {
    id: "overall",
    label: "Overall analytics report",
    description: "Headline numbers across every connected source in one document.",
    usesPlatform: true,
    usesAccount: true,
    usesWebsite: true,
  },
  {
    id: "social",
    label: "Social media performance",
    description: "Reach, engagement and growth per network for the period.",
    usesPlatform: true,
    usesAccount: true,
    usesWebsite: false,
  },
  {
    id: "website",
    label: "Website analytics",
    description: "Traffic, top pages, sources and conversions for your sites.",
    usesPlatform: false,
    usesAccount: false,
    usesWebsite: true,
  },
  {
    id: "audience",
    label: "Audience report",
    description: "Audience size, growth and demographic highlights per source.",
    usesPlatform: true,
    usesAccount: true,
    usesWebsite: false,
  },
  {
    id: "content",
    label: "Content performance",
    description: "Top-performing content ranked by reach and engagement.",
    usesPlatform: true,
    usesAccount: true,
    usesWebsite: false,
  },
];

/* ------------------------------------------------------------------ report model */

export interface ReportKpi {
  id: string;
  label: string;
  value: number;
  /** How the value renders in preview and CSV. */
  format: "number" | "compact" | "percent" | "duration";
  changePct: number;
}

export interface ReportTableRow {
  [column: string]: string | number;
}

export interface ReportTable {
  title: string;
  columns: { key: string; label: string; align?: "left" | "right" }[];
  rows: ReportTableRow[];
}

export interface ReportChartPoint {
  label: string;
  value: number;
}

export interface ReportScope {
  /** Resolved human-readable filter summary, e.g. "Last 30 days · Instagram". */
  period: string;
  platform: string;
  account: string;
  website: string;
}

export interface GeneratedReport {
  id: string;
  typeId: ReportTypeId;
  title: string;
  /** ISO timestamp the report was generated (mock). */
  generatedAt: string;
  /** Pre-formatted generation stamp — kept out of render for purity lint. */
  generatedLabel: string;
  scope: ReportScope;
  /** Executive summary bullets. */
  summary: string[];
  kpis: ReportKpi[];
  chart: { title: string; points: ReportChartPoint[] };
  table: ReportTable;
}

/* ------------------------------------------------------------------ builders */

const CONTENT_TITLES = [
  "Spring collection teaser",
  "Product deep-dive: workflow automation",
  "Behind the scenes — studio day",
  "Customer story: Northwind Labs",
  "Five tips for faster reporting",
  "Launch week recap",
  "Monthly roundup carousel",
  "Q&A with the founding team",
];

const WEBSITE_PAGES = [
  { path: "/", title: "Home" },
  { path: "/pricing", title: "Pricing" },
  { path: "/blog/launch-week", title: "Launch week recap" },
  { path: "/docs/getting-started", title: "Getting started" },
  { path: "/features/automation", title: "Automation" },
  { path: "/contact", title: "Contact" },
];

type SocialRow = {
  source: string;
  reach: number;
  engagement: number;
  rate: number;
  growth: number;
  posts: number;
};

const SOCIAL_ROWS: SocialRow[] = [
  { source: "Instagram", reach: 284_000, engagement: 18_400, rate: 6.5, growth: 4.8, posts: 42 },
  { source: "TikTok", reach: 512_000, engagement: 46_100, rate: 9.0, growth: 11.4, posts: 36 },
  { source: "Facebook", reach: 146_000, engagement: 7_900, rate: 5.4, growth: 1.2, posts: 28 },
  { source: "X", reach: 88_000, engagement: 4_200, rate: 4.8, growth: -0.9, posts: 61 },
  { source: "YouTube", reach: 301_000, engagement: 21_700, rate: 7.2, growth: 6.1, posts: 12 },
  { source: "LinkedIn", reach: 64_000, engagement: 3_100, rate: 4.9, growth: 3.4, posts: 18 },
];

function kpi(id: string, label: string, base: number, r: () => number, format: ReportKpi["format"] = "compact"): ReportKpi {
  const value = base * (0.82 + r() * 0.36);
  return {
    id,
    label,
    value: format === "percent" ? Math.round(value * 10) / 10 : Math.round(value),
    format,
    changePct: r() * 20 - 7,
  };
}

function trendPoints(seed: string, base: number, count = 14): ReportChartPoint[] {
  const r = rand(seed);
  return Array.from({ length: count }, (_, index) => ({
    label: `D-${count - 1 - index}`,
    value: Math.round(base * (0.75 + (index / count) * 0.4 + r() * 0.18)),
  }));
}

export interface ReportFilters {
  presetId: string;
  periodLabel: string;
  platformId: PlatformId | "all";
  platformLabel: string;
  accountId: string | "all";
  accountLabel: string;
  websiteId: string | "all";
  websiteLabel: string;
}

/**
 * Builds the report for a type + filter combination. Fully deterministic
 * per (type, filters) so regenerate produces identical output — a
 * "regenerated at" timestamp is the only changing field.
 */
export function buildReport(
  typeId: ReportTypeId,
  filters: ReportFilters,
  generatedAt: Date,
): GeneratedReport {
  const type = REPORT_TYPES.find((item) => item.id === typeId) ?? REPORT_TYPES[0];
  const seed = [
    typeId,
    filters.presetId,
    filters.platformId,
    filters.accountId,
    filters.websiteId,
  ].join("|");
  const r = rand(seed);

  const scope: ReportScope = {
    period: filters.periodLabel,
    platform: filters.platformLabel,
    account: filters.accountLabel,
    website: filters.websiteLabel,
  };

  const scopeSuffix = [scope.period, scope.platform, scope.website]
    .filter((part) => part && part !== "All")
    .join(" · ");

  const base: Omit<
    GeneratedReport,
    "id" | "typeId" | "title" | "generatedAt" | "generatedLabel" | "scope"
  > = {
    summary: [],
    kpis: [],
    chart: { title: "", points: [] },
    table: { title: "", columns: [], rows: [] },
  };

  switch (typeId) {
    case "social": {
      const rows = SOCIAL_ROWS.filter(
        (row) => filters.platformId === "all" || row.source === filters.platformLabel,
      );
      base.summary = [
        `Published ${rows.reduce((sum, row) => sum + row.posts, 0)} posts across ${rows.length} network${rows.length === 1 ? "" : "s"}.`,
        `Combined reach of ${Math.round(rows.reduce((sum, row) => sum + row.reach, 0) / 1000)}K with an average engagement rate of ${(rows.reduce((sum, row) => sum + row.rate, 0) / Math.max(rows.length, 1)).toFixed(1)}%.`,
        rows.length > 0 && rows.every((row) => row.growth >= 0)
          ? "Every network grew its audience this period."
          : "Growth was mixed this period — review the networks that dipped before the next cycle.",
      ];
      base.kpis = [
        kpi("reach", "Total reach", 1_400_000, r),
        kpi("engagement", "Total engagement", 101_000, r),
        kpi("rate", "Avg. engagement rate", 6.4, r, "percent"),
        kpi("followers", "Audience gained", 8_200, r, "number"),
      ];
      base.chart = {
        title: "Engagement trend",
        points: trendPoints(`${seed}|chart`, 7_200),
      };
      base.table = {
        title: "Per-network performance",
        columns: [
          { key: "source", label: "Source" },
          { key: "reach", label: "Reach", align: "right" },
          { key: "engagement", label: "Engagement", align: "right" },
          { key: "rate", label: "Rate", align: "right" },
          { key: "growth", label: "Growth", align: "right" },
          { key: "posts", label: "Posts", align: "right" },
        ],
        rows,
      };
      break;
    }

    case "website": {
      const pageRows: ReportTableRow[] = WEBSITE_PAGES.map((page) => {
        const views = Math.round(4_000 + r() * 46_000);
        return {
          path: page.path,
          title: page.title,
          views,
          uniques: Math.round(views * (0.55 + r() * 0.3)),
          bounce: Math.round((28 + r() * 34) * 10) / 10,
          duration: Math.round(45 + r() * 260),
          conversions: Math.round(r() * 320),
        };
      });
      base.summary = [
        `Recorded ${Math.round(pageRows.reduce((sum, row) => sum + (row.views as number), 0) / 1000)}K page views across ${pageRows.length} key pages.`,
        `Homepage and pricing drive the most traffic; ${pageRows[3].path} converts best at ${((pageRows[3].conversions as number) / Math.max(pageRows[3].uniques as number, 1) * 100).toFixed(1)}% of uniques.`,
        "Bounce rate is highest on blog landing pages — consider stronger internal links.",
      ];
      base.kpis = [
        kpi("visitors", "Visitors", 61_400, r),
        kpi("sessions", "Sessions", 97_800, r),
        kpi("views", "Page views", 312_000, r),
        kpi("bounce", "Bounce rate", 42.6, r, "percent"),
        kpi("duration", "Avg. session", 214, r, "duration"),
        kpi("cvr", "Conversion rate", 3.8, r, "percent"),
      ];
      base.chart = {
        title: "Daily page views",
        points: trendPoints(`${seed}|chart`, 11_400),
      };
      base.table = {
        title: "Top pages",
        columns: [
          { key: "path", label: "Path" },
          { key: "title", label: "Title" },
          { key: "views", label: "Views", align: "right" },
          { key: "uniques", label: "Uniques", align: "right" },
          { key: "bounce", label: "Bounce", align: "right" },
          { key: "duration", label: "Avg. time", align: "right" },
          { key: "conversions", label: "Conversions", align: "right" },
        ],
        rows: pageRows,
      };
      break;
    }

    case "audience": {
      const audienceBase = 40_000 + r() * 90_000;
      const newShare = 18 + r() * 26;
      base.summary = [
        `Audience stands at ${Math.round(audienceBase).toLocaleString("en-US")} across the selected sources.`,
        `${newShare.toFixed(0)}% of the audience is new this period — the strongest acquisition channel remains short-form video.`,
        "25–34 remains the largest age bracket; evening hours (18:00–22:00) show peak activity.",
      ];
      base.kpis = [
        kpi("total", "Total audience", audienceBase, r, "number"),
        kpi("growth", "Audience gained", audienceBase * 0.04, r, "number"),
        kpi("new", "New followers", audienceBase * (newShare / 100), r, "number"),
        kpi("active", "Active audience", audienceBase * 0.31, r, "number"),
      ];
      base.chart = {
        title: "Audience growth",
        points: trendPoints(`${seed}|chart`, audienceBase / 14),
      };
      base.table = {
        title: "Audience by source",
        columns: [
          { key: "source", label: "Source" },
          { key: "audience", label: "Audience", align: "right" },
          { key: "gained", label: "Gained", align: "right" },
          { key: "newShare", label: "New %", align: "right" },
          { key: "topCountry", label: "Top country" },
        ],
        rows: SOCIAL_ROWS.map((row) => ({
          source: row.source,
          audience: Math.round(row.reach * (0.16 + r() * 0.12)),
          gained: Math.round(row.reach * (0.004 + r() * 0.012)),
          newShare: Math.round((14 + r() * 30) * 10) / 10,
          topCountry: ["United States", "Brazil", "India", "United Kingdom", "Germany"][
            Math.floor(r() * 5)
          ],
        })),
      };
      break;
    }

    case "content": {
      const rows: ReportTableRow[] = CONTENT_TITLES.map((title, index) => ({
        rank: index + 1,
        title,
        type: ["Reel", "Video", "Carousel", "Post"][Math.floor(r() * 4)],
        reach: Math.round(12_000 + r() * 180_000),
        engagement: Math.round(800 + r() * 14_000),
        rate: Math.round((2 + r() * 9) * 10) / 10,
      })).sort((a, b) => (b.reach as number) - (a.reach as number));
      rows.forEach((row, index) => {
        row.rank = index + 1;
      });
      base.summary = [
        `Analysed ${rows.length} top-performing pieces of content this period.`,
        `“${rows[0].title}” led with ${Math.round((rows[0].reach as number) / 1000)}K reach — short-form video continues to outperform static posts.`,
        `Average engagement rate across the top list was ${(
          rows.reduce((sum, row) => sum + (row.rate as number), 0) / rows.length
        ).toFixed(1)}%.`,
      ];
      base.kpis = [
        kpi("published", "Pieces published", 197, r, "number"),
        kpi("reach", "Content reach", 1_395_000, r),
        kpi("engagement", "Content engagement", 101_400, r),
        kpi("rate", "Avg. engagement rate", 6.7, r, "percent"),
      ];
      base.chart = {
        title: "Reach trend",
        points: trendPoints(`${seed}|chart`, 99_000),
      };
      base.table = {
        title: "Top content",
        columns: [
          { key: "rank", label: "#", align: "right" },
          { key: "title", label: "Title" },
          { key: "type", label: "Type" },
          { key: "reach", label: "Reach", align: "right" },
          { key: "engagement", label: "Engagement", align: "right" },
          { key: "rate", label: "Rate", align: "right" },
        ],
        rows,
      };
      break;
    }

    case "overall":
    default: {
      base.summary = [
        `All connected sources generated ${Math.round((1.4 + r() * 0.6) * 10) / 10}M impressions this period.`,
        "Engagement is up across four of six social networks; website conversions grew 8% period over-period.",
        "Recommended focus: TikTok and YouTube drove the majority of new audience — keep the cadence.",
      ];
      base.kpis = [
        kpi("impressions", "Impressions", 2_400_000, r),
        kpi("engagement", "Engagement", 101_000, r),
        kpi("audience", "Total audience", 395_000, r),
        kpi("visitors", "Website visitors", 61_400, r),
        kpi("conversions", "Conversions", 2_340, r, "number"),
        kpi("cvr", "Conversion rate", 3.8, r, "percent"),
      ];
      base.chart = {
        title: "Cross-source impressions",
        points: trendPoints(`${seed}|chart`, 171_000),
      };
      base.table = {
        title: "Source contribution",
        columns: [
          { key: "source", label: "Source" },
          { key: "impressions", label: "Impressions", align: "right" },
          { key: "engagement", label: "Engagement", align: "right" },
          { key: "share", label: "Share", align: "right" },
        ],
        rows: SOCIAL_ROWS.map((row) => ({
          source: row.source,
          impressions: row.reach,
          engagement: row.engagement,
          share: Math.round((row.reach / 1_395_000) * 1000) / 10,
        })),
      };
      break;
    }
  }

  return {
    id: `${typeId}-${filters.presetId}-${generatedAt.getTime()}`,
    typeId,
    title: `${type.label}${scopeSuffix ? ` — ${scopeSuffix}` : ""}`,
    generatedAt: generatedAt.toISOString(),
    generatedLabel: generatedAt.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    scope,
    ...base,
  };
}

/* ------------------------------------------------------------------ CSV export */

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Serialises a generated report to CSV: metadata header, KPI block,
 * chart series and the main table. Pure string build — the page wraps it
 * in a Blob for download.
 */
export function reportToCsv(report: GeneratedReport): string {
  const lines: string[][] = [];

  lines.push(["Report", report.title]);
  lines.push(["Generated", report.generatedAt]);
  lines.push(["Period", report.scope.period]);
  if (report.scope.platform !== "All") lines.push(["Platform", report.scope.platform]);
  if (report.scope.account !== "All") lines.push(["Account", report.scope.account]);
  if (report.scope.website !== "All") lines.push(["Website", report.scope.website]);
  lines.push([]);

  lines.push(["Summary"]);
  report.summary.forEach((bullet) => lines.push([bullet]));
  lines.push([]);

  lines.push(["Key metrics", "Value", "Change %"]);
  report.kpis.forEach((item) =>
    lines.push([item.label, String(item.value), item.changePct.toFixed(1)]),
  );
  lines.push([]);

  lines.push([report.chart.title, "Value"]);
  report.chart.points.forEach((point) => lines.push([point.label, String(point.value)]));
  lines.push([]);

  lines.push([report.table.title]);
  lines.push(report.table.columns.map((column) => column.label));
  report.table.rows.forEach((row) =>
    lines.push(report.table.columns.map((column) => String(row[column.key] ?? ""))),
  );

  return lines.map((line) => line.map(csvCell).join(",")).join("\r\n");
}
