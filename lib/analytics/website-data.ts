import type { MetricFormat } from "./types";

/**
 * Deterministic mock data for the Website Analytics module. Every value is
 * derived from a seeded hash of the website id, so switching websites always
 * renders stable numbers — no backend involved.
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

function pick<T>(r: () => number, items: readonly T[]): T {
  return items[Math.floor(r() * items.length)];
}

function isoMinutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

/* ------------------------------------------------------------------ websites */

export type WebsiteStatus = "connected" | "pending" | "error";

export interface Website {
  id: string;
  name: string;
  url: string;
  platform: string;
  status: WebsiteStatus;
  addedAt: string;
}

export const WEBSITE_PLATFORMS = [
  "WordPress",
  "Shopify",
  "Webflow",
  "Next.js",
  "React",
  "Vue",
  "Custom HTML",
  "Other",
] as const;

export const INITIAL_WEBSITES: Website[] = [
  {
    id: "site-acme",
    name: "Acme Store",
    url: "https://acme-store.com",
    platform: "Shopify",
    status: "connected",
    addedAt: isoMinutesAgo(60 * 24 * 41),
  },
  {
    id: "site-docs",
    name: "Acme Docs",
    url: "https://docs.acme-store.com",
    platform: "Next.js",
    status: "connected",
    addedAt: isoMinutesAgo(60 * 24 * 18),
  },
  {
    id: "site-blog",
    name: "Acme Blog",
    url: "https://blog.acme-store.com",
    platform: "WordPress",
    status: "pending",
    addedAt: isoMinutesAgo(60 * 6),
  },
  {
    id: "site-legacy",
    name: "Legacy Shop",
    url: "https://old-shop.acme-store.com",
    platform: "Custom HTML",
    status: "error",
    addedAt: isoMinutesAgo(60 * 24 * 95),
  },
];

/* ------------------------------------------------------------------ KPI cards */

export interface WebsiteKpi {
  id: string;
  name: string;
  value: number;
  changePct: number;
  previous: number;
  format: MetricFormat;
  trend: number[];
  description?: string;
}

const KPI_BASE: { id: string; name: string; base: number; jitter: number; format: MetricFormat; description?: string }[] = [
  { id: "visitors", name: "Total Visitors", base: 84_200, jitter: 0.35, format: "compact", description: "All visits including repeat visits in the period." },
  { id: "unique", name: "Unique Visitors", base: 61_400, jitter: 0.3, format: "compact", description: "Distinct visitors de-duplicated across sessions." },
  { id: "sessions", name: "Total Sessions", base: 97_800, jitter: 0.32, format: "compact", description: "A session ends after 30 minutes of inactivity." },
  { id: "pageViews", name: "Page Views", base: 312_000, jitter: 0.4, format: "compact" },
  { id: "duration", name: "Avg. Session Duration", base: 214, jitter: 0.15, format: "duration", description: "Mean time from session start to last interaction." },
  { id: "bounce", name: "Bounce Rate", base: 42.6, jitter: 0.18, format: "percent", description: "Sessions with a single interaction and no second page." },
  { id: "pps", name: "Pages Per Session", base: 3.4, jitter: 0.14, format: "decimal" },
  { id: "cvr", name: "Conversion Rate", base: 3.8, jitter: 0.25, format: "percent", description: "Sessions that completed a tracked goal." },
];

/** KPI set for one website — deterministic per website id. */
export function getWebsiteKpis(websiteId: string): WebsiteKpi[] {
  return KPI_BASE.map((kpi) => {
    const r = rand(`${websiteId}|kpi|${kpi.id}`);
    const scale = 0.55 + r() * 1.1;
    const value = kpi.base * scale;
    const changePct = (r() * 22 - 9);
    const previous = kpi.format === "percent" || kpi.format === "decimal"
      ? value / (1 + changePct / 100)
      : value / (1 + changePct / 100);
    const trend = Array.from({ length: 14 }, () => {
      const drift = 1 + (changePct / 100) * (0.2 + r() * 0.8);
      return value * drift * (0.86 + r() * 0.28);
    });
    return { id: kpi.id, name: kpi.name, value, changePct, previous, format: kpi.format, trend, description: kpi.description };
  });
}

/* ------------------------------------------------------------------ traffic series */

export interface TrafficPoint {
  label: string;
  visitors: number;
  sessions: number;
  pageViews: number;
}

const DAY_LABELS = [
  "Oct 14", "Oct 15", "Oct 16", "Oct 17", "Oct 18", "Oct 19", "Oct 20",
  "Oct 21", "Oct 22", "Oct 23", "Oct 24", "Oct 25", "Oct 26", "Oct 27",
  "Oct 28", "Oct 29", "Oct 30", "Oct 31", "Nov 1", "Nov 2", "Nov 3",
  "Nov 4", "Nov 5", "Nov 6", "Nov 7", "Nov 8", "Nov 9", "Nov 10",
];

/** 28-day traffic series for the overview chart. */
export function getTrafficSeries(websiteId: string): TrafficPoint[] {
  const r = rand(`${websiteId}|traffic`);
  const scale = 0.55 + r() * 1.1;
  let visitors = 1_900 * scale;
  return DAY_LABELS.map((label, index) => {
    const weekend = index % 7 === 5 || index % 7 === 6 ? 0.72 : 1;
    visitors *= 0.97 + r() * 0.08;
    const v = Math.round(visitors * weekend * (0.9 + r() * 0.2));
    return {
      label,
      visitors: v,
      sessions: Math.round(v * (1.1 + r() * 0.3)),
      pageViews: Math.round(v * (2.8 + r() * 1.1)),
    };
  });
}

/* ------------------------------------------------------------------ real-time */

export interface LiveVisitor {
  id: string;
  country: string;
  device: "Desktop" | "Mobile" | "Tablet";
  browser: string;
  os: string;
  page: string;
  source: string;
  activeSeconds: number;
}

export interface RealtimeSnapshot {
  activeVisitors: number;
  visitorsPerMinute: number;
  pageViewsPerMinute: number;
  series: { label: string; visitors: number }[];
  visitors: LiveVisitor[];
}

const COUNTRIES = ["United States", "Germany", "India", "United Kingdom", "Canada", "Brazil", "France", "Netherlands", "Japan", "Australia"];
const BROWSERS = ["Chrome", "Safari", "Firefox", "Edge", "Samsung Internet"];
const OSES = ["Windows", "macOS", "iOS", "Android", "Linux"];
const DEVICES: LiveVisitor["device"][] = ["Desktop", "Mobile", "Mobile", "Desktop", "Tablet"];
const SOURCES = ["Google", "Direct", "Twitter / X", "Newsletter", "LinkedIn", "Bing", "Reddit"];
const LIVE_PAGES = ["/", "/pricing", "/features", "/blog/launch-week", "/docs/getting-started", "/contact", "/products/analytics-suite", "/cart"];

function liveVisitor(r: () => number, index: number): LiveVisitor {
  const device = pick(r, DEVICES);
  const browser = device === "Mobile" ? pick(r, ["Safari", "Chrome", "Samsung Internet"]) : pick(r, BROWSERS);
  const os = device === "Mobile" ? pick(r, ["iOS", "Android"]) : pick(r, ["Windows", "macOS", "Linux"]);
  return {
    id: `anon_${Math.floor(r() * 0xfffffff).toString(16).padStart(7, "0")}`,
    country: pick(r, COUNTRIES),
    device,
    browser,
    os,
    page: pick(r, LIVE_PAGES),
    source: pick(r, SOURCES),
    activeSeconds: 15 + Math.floor(r() * 540) + index,
  };
}

/** Initial real-time snapshot; the UI re-rolls it on a timer to feel live. */
export function getRealtimeSnapshot(websiteId: string, tick = 0): RealtimeSnapshot {
  const r = rand(`${websiteId}|realtime|${tick}`);
  const activeVisitors = 24 + Math.floor(r() * 46);
  const visitors = Array.from({ length: Math.min(activeVisitors, 12) }, (_, i) => liveVisitor(r, i));
  const series = Array.from({ length: 30 }, (_, i) => ({
    label: `${29 - i}m`,
    visitors: Math.round(activeVisitors * (0.55 + r() * 0.7)),
  }));
  return {
    activeVisitors,
    visitorsPerMinute: 6 + Math.floor(r() * 22),
    pageViewsPerMinute: 14 + Math.floor(r() * 48),
    series,
    visitors,
  };
}

/* ------------------------------------------------------------------ pages */

export interface PageRow {
  path: string;
  title: string;
  views: number;
  uniqueVisitors: number;
  avgTime: number;
  bounceRate: number;
  exitRate: number;
  conversions: number;
}

const PAGE_CATALOG: { path: string; title: string }[] = [
  { path: "/", title: "Acme Store — Home" },
  { path: "/pricing", title: "Pricing Plans | Acme" },
  { path: "/features", title: "Features | Acme Store" },
  { path: "/blog/launch-week", title: "Launch Week Recap — Acme Blog" },
  { path: "/docs/getting-started", title: "Getting Started — Acme Docs" },
  { path: "/contact", title: "Contact Us | Acme" },
  { path: "/products/analytics-suite", title: "Analytics Suite — Acme Store" },
  { path: "/products/team-plan", title: "Team Plan — Acme Store" },
  { path: "/cart", title: "Your Cart | Acme" },
  { path: "/checkout", title: "Checkout | Acme" },
  { path: "/blog/pricing-explained", title: "Pricing Explained — Acme Blog" },
  { path: "/about", title: "About Acme" },
  { path: "/integrations/slack", title: "Slack Integration | Acme" },
  { path: "/help/billing", title: "Billing Help Center" },
  { path: "/signup", title: "Create your Acme account" },
  { path: "/legal/privacy", title: "Privacy Policy | Acme" },
];

export function getPageRows(websiteId: string): PageRow[] {
  const r = rand(`${websiteId}|pages`);
  const scale = 0.55 + r() * 1.1;
  return PAGE_CATALOG.map(({ path, title }, index) => {
    const weight = Math.pow(0.78, index) * (0.7 + r() * 0.6);
    const views = Math.round(46_000 * scale * weight);
    return {
      path,
      title,
      views,
      uniqueVisitors: Math.round(views * (0.5 + r() * 0.35)),
      avgTime: Math.round(20 + r() * 240),
      bounceRate: 16 + r() * 58,
      exitRate: 12 + r() * 55,
      conversions: Math.round(views * (0.004 + r() * 0.03)),
    };
  });
}

/* ------------------------------------------------------------------ behaviour */

export interface BreakdownRow {
  label: string;
  value: number;
  share: number;
}

function toShares(rows: { label: string; value: number }[]): BreakdownRow[] {
  const total = rows.reduce((sum, row) => sum + row.value, 0) || 1;
  return rows
    .map((row) => ({ ...row, share: (row.value / total) * 100 }))
    .sort((a, b) => b.value - a.value);
}

export interface TrafficSourceGroup {
  /** Channel breakdown (direct / organic / paid / social / referral / email). */
  channels: BreakdownRow[];
  /** Individual referring websites. */
  referrers: BreakdownRow[];
  /** Search engines. */
  searchEngines: BreakdownRow[];
  /** Social networks. */
  social: BreakdownRow[];
  /** Direct-traffic detail. */
  direct: BreakdownRow[];
  /** Landing pages by sessions. */
  landingPages: BreakdownRow[];
  /** Exit pages by sessions. */
  exitPages: BreakdownRow[];
  sessions: number;
}

const CHANNEL_LABELS = ["Organic Search", "Direct", "Paid Search", "Social", "Referral", "Email"];
const REFERRER_LABELS = ["google.com", "twitter.com", "reddit.com", "news.ycombinator.com", "producthunt.com", "linkedin.com", "github.com", "bing.com"];
const ENGINE_LABELS = ["Google", "Bing", "DuckDuckGo", "Yahoo", "Yandex"];
const SOCIAL_LABELS = ["Twitter / X", "Reddit", "LinkedIn", "Facebook", "Instagram", "YouTube"];
const DIRECT_LABELS = ["Typed URL", "Bookmark", "No referrer (app)", "Unknown / dark social"];

export function getTrafficSources(websiteId: string): TrafficSourceGroup {
  const r = rand(`${websiteId}|sources`);
  const scale = 0.55 + r() * 1.1;
  const sessions = Math.round(97_800 * scale);

  const build = (labels: string[], min: number, max: number, total: number) =>
    toShares(labels.map((label) => ({ label, value: Math.round(total * (min + r() * (max - min))) })));

  return {
    sessions,
    channels: build(CHANNEL_LABELS, 0.05, 0.38, sessions),
    referrers: build(REFERRER_LABELS, 0.01, 0.14, sessions),
    searchEngines: build(ENGINE_LABELS, 0.02, 0.55, sessions * 0.5),
    social: build(SOCIAL_LABELS, 0.03, 0.3, sessions * 0.18),
    direct: build(DIRECT_LABELS, 0.08, 0.5, sessions * 0.26),
    landingPages: toShares(
      PAGE_CATALOG.slice(0, 8).map(({ path }) => ({ label: path, value: Math.round(sessions * (0.02 + r() * 0.16)) })),
    ),
    exitPages: toShares(
      PAGE_CATALOG.slice(0, 8).map(({ path }) => ({ label: path, value: Math.round(sessions * (0.015 + r() * 0.14)) })),
    ),
  };
}

/* ------------------------------------------------------------------ devices & geo */

export interface DeviceBreakdown {
  devices: BreakdownRow[];
  browsers: BreakdownRow[];
  operatingSystems: BreakdownRow[];
  countries: BreakdownRow[];
}

export function getDeviceBreakdown(websiteId: string): DeviceBreakdown {
  const r = rand(`${websiteId}|devices`);
  const scale = 0.55 + r() * 1.1;
  const users = Math.round(61_400 * scale);

  const build = (labels: string[], weights: number[], total: number) =>
    toShares(labels.map((label, i) => ({ label, value: Math.round(total * weights[i] * (0.85 + r() * 0.3)) })));

  return {
    devices: build(["Desktop", "Mobile", "Tablet"], [0.46, 0.44, 0.1], users),
    browsers: build(BROWSERS, [0.52, 0.22, 0.1, 0.11, 0.05], users),
    operatingSystems: build(OSES, [0.38, 0.24, 0.18, 0.15, 0.05], users),
    countries: build(COUNTRIES, [0.3, 0.12, 0.14, 0.09, 0.07, 0.06, 0.06, 0.05, 0.06, 0.05], users),
  };
}

/* ------------------------------------------------------------------ events */

export type EventTypeId =
  | "page_view" | "button_click" | "link_click" | "form_start" | "form_submit"
  | "file_download" | "product_view" | "search" | "video_play" | "video_complete"
  | "checkout_start" | "purchase" | "custom";

export interface ActivityEvent {
  id: string;
  type: EventTypeId;
  name: string;
  timestamp: string;
  pageUrl: string;
  visitorId: string;
  sessionId: string;
  device: string;
  browser: string;
  os: string;
  referrer: string;
  source: string;
  properties: Record<string, string | number>;
}

export const EVENT_TYPES: { id: EventTypeId; label: string }[] = [
  { id: "page_view", label: "Page viewed" },
  { id: "button_click", label: "Button clicked" },
  { id: "link_click", label: "Link clicked" },
  { id: "form_start", label: "Form started" },
  { id: "form_submit", label: "Form submitted" },
  { id: "file_download", label: "File downloaded" },
  { id: "product_view", label: "Product viewed" },
  { id: "search", label: "Search performed" },
  { id: "video_play", label: "Video played" },
  { id: "video_complete", label: "Video completed" },
  { id: "checkout_start", label: "Checkout started" },
  { id: "purchase", label: "Purchase completed" },
  { id: "custom", label: "Custom event" },
];

const EVENT_NAMES: Record<EventTypeId, string[]> = {
  page_view: ["Page viewed"],
  button_click: ["Get Started clicked", "Add to cart clicked", "Subscribe clicked", "Upgrade clicked"],
  link_click: ["Docs link clicked", "Pricing nav clicked", "Blog link clicked"],
  form_start: ["Signup form started", "Contact form started", "Newsletter form started"],
  form_submit: ["Registration form submitted", "Contact form submitted", "Newsletter subscribed"],
  file_download: ["Case study PDF downloaded", "Invoice downloaded", "Export CSV downloaded"],
  product_view: ["Analytics Suite viewed", "Team Plan viewed", "Starter Kit viewed"],
  search: ["Search performed"],
  video_play: ["Product demo video played", "Onboarding video played"],
  video_complete: ["Product demo video completed", "Onboarding video completed"],
  checkout_start: ["Checkout started"],
  purchase: ["Purchase completed"],
  custom: ["scroll_depth_75", "cta_hover", "dark_mode_toggled"],
};

function eventProperties(type: EventTypeId, r: () => number): Record<string, string | number> {
  switch (type) {
    case "page_view":
      return { scrollDepth: Math.round(30 + r() * 70), loadTimeMs: Math.round(400 + r() * 1800) };
    case "button_click":
      return { buttonId: pick(r, ["hero-cta", "nav-cta", "footer-cta"]), position: pick(r, ["above_fold", "below_fold"]) };
    case "link_click":
      return { target: pick(r, ["_blank", "_self"]), text: pick(r, ["Learn more", "Read docs", "See pricing"]) };
    case "form_start":
      return { formId: pick(r, ["signup", "contact", "newsletter"]), fields: Math.round(3 + r() * 5) };
    case "form_submit":
      return { formId: pick(r, ["signup", "contact", "newsletter"]), durationSec: Math.round(20 + r() * 180) };
    case "file_download":
      return { fileName: pick(r, ["case-study.pdf", "invoice.pdf", "report.csv"]), fileSizeKb: Math.round(40 + r() * 4200) };
    case "product_view":
      return { productId: pick(r, ["sku-1041", "sku-2087", "sku-3312"]), priceUsd: Math.round(19 + r() * 300) };
    case "search":
      return { query: pick(r, ["pricing", "api limits", "import csv", "sso setup", "refund"]), results: Math.round(r() * 40) };
    case "video_play":
      return { videoId: pick(r, ["demo-720", "onboarding-1"]), positionSec: 0 };
    case "video_complete":
      return { videoId: pick(r, ["demo-720", "onboarding-1"]), watchedPct: 100 };
    case "checkout_start":
      return { cartValueUsd: Math.round(29 + r() * 470), items: Math.round(1 + r() * 5) };
    case "purchase":
      return { orderId: `ORD-${Math.floor(r() * 90000 + 10000)}`, revenueUsd: Math.round(19 + r() * 390), currency: "USD" };
    default:
      return { category: pick(r, ["engagement", "ui", "experiment"]), value: Math.round(r() * 100) };
  }
}

/** Cutoff timestamp (ms) for a relative event date filter, or 0 for "all". */
export function dateCutoff(hours: number | null): number {
  if (hours === null) return 0;
  return Date.now() - hours * 3_600_000;
}

/** ~90 recent events, newest first, deterministic per website. */
export function getEvents(websiteId: string): ActivityEvent[] {
  const r = rand(`${websiteId}|events`);
  const events: ActivityEvent[] = [];
  let minutesAgo = 2;

  for (let i = 0; i < 90; i++) {
    minutesAgo += 1 + Math.floor(r() * 55);
    const type = pick(r, EVENT_TYPES).id;
    const page = pick(r, PAGE_CATALOG);
    const device = pick(r, DEVICES);
    events.push({
      id: `evt_${(i + 1).toString().padStart(4, "0")}`,
      type,
      name: pick(r, EVENT_NAMES[type]),
      timestamp: isoMinutesAgo(minutesAgo),
      pageUrl: page.path,
      visitorId: `anon_${Math.floor(r() * 0xfffffff).toString(16).padStart(7, "0")}`,
      sessionId: `sess_${Math.floor(r() * 0xffffff).toString(16).padStart(6, "0")}`,
      device,
      browser: device === "Mobile" ? pick(r, ["Safari", "Chrome", "Samsung Internet"]) : pick(r, BROWSERS),
      os: device === "Mobile" ? pick(r, ["iOS", "Android"]) : pick(r, ["Windows", "macOS", "Linux"]),
      referrer: r() > 0.45 ? pick(r, REFERRER_LABELS) : "(direct)",
      source: pick(r, SOURCES),
      properties: eventProperties(type, r),
    });
  }
  return events;
}

/* ------------------------------------------------------------------ visitors & journeys */

export interface JourneyStep {
  label: string;
  detail: string;
  timestamp: string;
  kind: "arrival" | "view" | "action" | "conversion";
}

export interface VisitorRecord {
  id: string;
  firstSeen: string;
  lastSeen: string;
  sessions: number;
  pageViews: number;
  country: string;
  device: string;
  browser: string;
  os: string;
  source: string;
  referrer: string;
  landedOn: string;
  converted: boolean;
  journey: JourneyStep[];
}

const JOURNEY_TEMPLATES: Omit<JourneyStep, "timestamp">[][] = [
  [
    { label: "Arrived from Google", detail: "Organic search — query: “acme pricing”", kind: "arrival" },
    { label: "Viewed homepage", detail: "/", kind: "view" },
    { label: "Opened pricing page", detail: "/pricing", kind: "view" },
    { label: "Clicked Get Started", detail: "hero-cta button on /pricing", kind: "action" },
    { label: "Opened registration page", detail: "/signup", kind: "view" },
    { label: "Submitted registration form", detail: "signup form — 5 fields, 42s to complete", kind: "conversion" },
  ],
  [
    { label: "Arrived from Twitter / X", detail: "Referral — tweet about launch week", kind: "arrival" },
    { label: "Viewed blog post", detail: "/blog/launch-week", kind: "view" },
    { label: "Clicked Docs link", detail: "In-article link", kind: "action" },
    { label: "Viewed getting started", detail: "/docs/getting-started", kind: "view" },
    { label: "Searched the docs", detail: "query: “api limits” — 12 results", kind: "action" },
    { label: "Left via exit page", detail: "/docs/getting-started", kind: "view" },
  ],
  [
    { label: "Arrived directly", detail: "Typed URL / bookmark", kind: "arrival" },
    { label: "Viewed homepage", detail: "/", kind: "view" },
    { label: "Viewed product page", detail: "/products/analytics-suite", kind: "view" },
    { label: "Added to cart", detail: "Add to cart clicked — sku-1041", kind: "action" },
    { label: "Started checkout", detail: "/checkout — cart value $149", kind: "action" },
    { label: "Completed purchase", detail: "ORD-48213 — $149.00 USD", kind: "conversion" },
  ],
  [
    { label: "Arrived from LinkedIn", detail: "Referral — company page post", kind: "arrival" },
    { label: "Viewed features page", detail: "/features", kind: "view" },
    { label: "Watched product demo", detail: "video_play → video_complete (100%)", kind: "action" },
    { label: "Opened contact page", detail: "/contact", kind: "view" },
    { label: "Started contact form", detail: "form_start — 4 fields", kind: "action" },
    { label: "Submitted contact form", detail: "form_submit — 1m 08s to complete", kind: "conversion" },
  ],
];

/** Anonymous visitors with chronological journeys for the detail panel. */
export function getVisitors(websiteId: string): VisitorRecord[] {
  const r = rand(`${websiteId}|visitors`);
  return Array.from({ length: 14 }, (_, i) => {
    const sessions = 1 + Math.floor(r() * 5);
    const firstSeenMinutes = 60 * (2 + Math.floor(r() * 90));
    const lastSeenMinutes = Math.floor(r() * firstSeenMinutes);
    const template = JOURNEY_TEMPLATES[i % JOURNEY_TEMPLATES.length];
    const base = Date.now() - firstSeenMinutes * 60_000;

    return {
      id: `anon_${Math.floor(r() * 0xfffffff).toString(16).padStart(7, "0")}`,
      firstSeen: isoMinutesAgo(firstSeenMinutes),
      lastSeen: isoMinutesAgo(lastSeenMinutes),
      sessions,
      pageViews: sessions * (2 + Math.floor(r() * 7)),
      country: pick(r, COUNTRIES),
      device: pick(r, DEVICES),
      browser: pick(r, BROWSERS),
      os: pick(r, OSES),
      source: pick(r, SOURCES),
      referrer: r() > 0.4 ? pick(r, REFERRER_LABELS) : "(direct)",
      landedOn: template[0].kind === "arrival" && template[0].detail.includes("Google") ? "/" : pick(r, PAGE_CATALOG).path,
      converted: r() > 0.55,
      journey: template.map((step, stepIndex) => ({
        ...step,
        timestamp: new Date(base + stepIndex * (60_000 * (1 + Math.floor(r() * 6)))).toISOString(),
      })),
    };
  });
}

/* ------------------------------------------------------------------ conversions */

export interface ConversionGoal {
  name: string;
  completions: number;
  conversionRate: number;
  value: number;
}

export interface ConversionData {
  totalConversions: number;
  conversionRate: number;
  revenue: number;
  funnel: { stage: string; value: number }[];
  goals: ConversionGoal[];
  trend: { label: string; conversions: number }[];
}

export function getConversions(websiteId: string): ConversionData {
  const r = rand(`${websiteId}|conversions`);
  const scale = 0.55 + r() * 1.1;
  const sessions = Math.round(97_800 * scale);
  const funnel = [
    { stage: "Sessions", value: sessions },
    { stage: "Product viewed", value: Math.round(sessions * (0.34 + r() * 0.12)) },
    { stage: "Checkout started", value: Math.round(sessions * (0.07 + r() * 0.05)) },
    { stage: "Purchase completed", value: Math.round(sessions * (0.024 + r() * 0.018)) },
  ];
  const goals: ConversionGoal[] = [
    { name: "Registration form submitted", completions: Math.round(1_400 * scale), conversionRate: 1.4 + r() * 1.6, value: 0 },
    { name: "Purchase completed", completions: funnel[3].value, conversionRate: funnel[3].value / sessions * 100, value: Math.round(48_000 * scale) },
    { name: "Newsletter subscribed", completions: Math.round(2_100 * scale), conversionRate: 1.8 + r() * 2.4, value: 0 },
    { name: "Contact form submitted", completions: Math.round(640 * scale), conversionRate: 0.5 + r() * 0.9, value: 0 },
    { name: "Demo video completed", completions: Math.round(3_300 * scale), conversionRate: 3.1 + r() * 3.2, value: 0 },
  ];
  const trend = Array.from({ length: 14 }, (_, i) => ({
    label: DAY_LABELS[DAY_LABELS.length - 14 + i],
    conversions: Math.round(funnel[3].value / 14 * (0.6 + r() * 0.9)),
  }));

  return {
    totalConversions: funnel[3].value,
    conversionRate: (funnel[3].value / sessions) * 100,
    revenue: Math.round(48_000 * scale),
    funnel,
    goals,
    trend,
  };
}
