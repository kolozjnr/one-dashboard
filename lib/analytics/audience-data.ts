import type { PlatformId } from "./types";

/**
 * Deterministic mock data for the Audience Insights module. Sections are
 * gated by per-source capabilities so a source only ever shows the
 * demographics it actually supports (e.g. a website has no age/gender
 * breakdown, LinkedIn reports no age/gender or active-time data).
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

function toShares(labels: string[], r: () => number, spread: number): { label: string; share: number }[] {
  const raw = labels.map(() => 0.2 + r() * spread);
  const total = raw.reduce((sum, value) => sum + value, 0);
  return labels
    .map((label, index) => ({ label, share: (raw[index] / total) * 100 }))
    .sort((a, b) => b.share - a.share);
}

/* ------------------------------------------------------------------ capabilities */

export interface AudienceCapabilities {
  /** New vs returning audience split. */
  demographics: boolean;
  /** Age distribution. */
  age: boolean;
  /** Gender distribution. */
  gender: boolean;
  /** Geographic distribution + top countries. */
  countries: boolean;
  /** Top cities. */
  cities: boolean;
  /** Active audience heatmap (day × time-of-day). */
  activeTimes: boolean;
  /** Hourly online-audience curve. */
  onlineHours: boolean;
}

export const AUDIENCE_CAPABILITIES: Record<PlatformId, AudienceCapabilities> = {
  instagram: { demographics: true, age: true, gender: true, countries: true, cities: true, activeTimes: true, onlineHours: true },
  tiktok: { demographics: true, age: true, gender: true, countries: true, cities: true, activeTimes: true, onlineHours: true },
  facebook: { demographics: true, age: true, gender: true, countries: true, cities: true, activeTimes: true, onlineHours: true },
  x: { demographics: true, age: true, gender: true, countries: true, cities: true, activeTimes: true, onlineHours: true },
  youtube: { demographics: true, age: true, gender: true, countries: true, cities: true, activeTimes: true, onlineHours: true },
  // LinkedIn company pages expose geography but no age/gender or timing data.
  linkedin: { demographics: true, age: false, gender: false, countries: true, cities: true, activeTimes: false, onlineHours: false },
  // Websites identify geography and timing only — no demographic identity data.
  website: { demographics: true, age: false, gender: false, countries: true, cities: true, activeTimes: true, onlineHours: true },
};

/** Human labels for sections a source does not support (shown as one note). */
export function unsupportedAudienceSections(platformId: PlatformId): string[] {
  const caps = AUDIENCE_CAPABILITIES[platformId];
  const labels: [keyof AudienceCapabilities, string][] = [
    ["age", "Age distribution"],
    ["gender", "Gender distribution"],
    ["cities", "Top cities"],
    ["activeTimes", "Active audience times"],
    ["onlineHours", "Audience online hours"],
    ["countries", "Geographic distribution"],
    ["demographics", "Follower demographics"],
  ];
  return labels.filter(([key]) => !caps[key]).map(([, label]) => label);
}

/* ------------------------------------------------------------------ data model */

export interface ShareRow {
  label: string;
  share: number;
}

export interface AudienceSummary {
  /** Total audience (followers / subscribers / unique visitors). */
  total: number;
  totalChangePct: number;
  /** Net audience gained in the selected period. */
  growth: number;
  growthChangePct: number;
  /** % of the audience that is new in the period. */
  newShare: number;
  trend: number[];
}

export interface ActiveTimesData {
  days: string[];
  slots: string[];
  /** values[day][slot] — 0..100 relative activity. */
  values: number[][];
}

export interface AudienceData {
  platformId: PlatformId;
  capabilities: AudienceCapabilities;
  summary: AudienceSummary;
  newAudience: number;
  returningAudience: number;
  age: ShareRow[];
  gender: ShareRow[];
  countries: ShareRow[];
  cities: ShareRow[];
  activeTimes: ActiveTimesData;
  onlineHours: { label: string; share: number }[];
}

/** Rough relative audience scale per source. */
const AUDIENCE_BASE: Record<PlatformId, number> = {
  instagram: 48_200,
  tiktok: 126_000,
  facebook: 64_700,
  x: 15_400,
  youtube: 121_800,
  linkedin: 22_600,
  website: 61_400,
};

const AGE_BUCKETS = ["13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
const COUNTRIES = ["United States", "Brazil", "India", "United Kingdom", "Germany", "Canada", "France", "Indonesia", "Australia", "Mexico"];
const CITIES = ["New York", "London", "São Paulo", "Berlin", "Toronto", "Paris", "Sydney", "Mumbai", "Amsterdam", "Chicago"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SLOTS = ["00-03", "04-07", "08-11", "12-15", "16-19", "20-23"];

/** Full audience dataset for one source — deterministic per platform id. */
export function getAudienceData(platformId: PlatformId): AudienceData {
  const r = rand(`audience|${platformId}`);
  const base = AUDIENCE_BASE[platformId];
  const total = Math.round(base * (0.9 + r() * 0.2));
  const totalChangePct = r() * 9 - 2.5;
  const growth = Math.round(total * (0.02 + r() * 0.05));
  const growthChangePct = r() * 30 - 8;
  const newShare = 18 + r() * 30;
  const newAudience = Math.round((total * newShare) / 100);
  const trend = Array.from({ length: 14 }, (_, index) =>
    total * (0.9 + (index / 13) * (totalChangePct / 100) + r() * 0.05),
  );

  // Active heatmap: weekdays skew to daytime, weekends to evenings.
  const values = DAYS.map((_, day) =>
    SLOTS.map((_, slot) => {
      const weekend = day >= 5;
      const evening = slot >= 4 ? 1.5 : 1;
      const workday = slot >= 2 && slot <= 3 ? 1.4 : 0.7;
      const base = weekend ? evening : workday;
      return Math.round(Math.min(100, base * (35 + r() * 65)));
    }),
  );

  return {
    platformId,
    capabilities: AUDIENCE_CAPABILITIES[platformId],
    summary: { total, totalChangePct, growth, growthChangePct, newShare, trend },
    newAudience,
    returningAudience: total - newAudience,
    age: AUDIENCE_CAPABILITIES[platformId].age ? toShares(AGE_BUCKETS, r, 4.5) : [],
    gender: AUDIENCE_CAPABILITIES[platformId].gender
      ? toShares(["Female", "Male", "Other / unspecified"], r, 3)
      : [],
    countries: AUDIENCE_CAPABILITIES[platformId].countries ? toShares(COUNTRIES, r, 5) : [],
    cities: AUDIENCE_CAPABILITIES[platformId].cities ? toShares(CITIES, r, 4) : [],
    activeTimes: { days: DAYS, slots: SLOTS, values },
    onlineHours: Array.from({ length: 24 }, (_, hour) => {
      // Curve peaks in the evening, dips overnight.
      const eveningPeak = Math.exp(-Math.pow(hour - 20, 2) / 26);
      const dayPeak = Math.exp(-Math.pow(hour - 13, 2) / 30) * 0.8;
      return { label: `${String(hour).padStart(2, "0")}:00`, share: Math.round((eveningPeak + dayPeak) * (55 + r() * 45)) };
    }),
  };
}
