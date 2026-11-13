import type { DatePresetId, DateRange, Interval } from "./types";
import { formatRangeSpan } from "./format";

const DAY_MS = 86_400_000;

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Resolves a preset to an inclusive date range relative to `base`. */
export function getPresetRange(preset: DatePresetId, base: Date = new Date()): DateRange {
  const today = startOfDay(base);

  switch (preset) {
    case "today":
      return { preset, from: today, to: endOfDay(base) };
    case "yesterday": {
      const from = new Date(today.getTime() - DAY_MS);
      return { preset, from, to: endOfDay(from) };
    }
    case "last7":
      return { preset, from: new Date(today.getTime() - 6 * DAY_MS), to: endOfDay(base) };
    case "last30":
      return { preset, from: new Date(today.getTime() - 29 * DAY_MS), to: endOfDay(base) };
    case "last90":
      return { preset, from: new Date(today.getTime() - 89 * DAY_MS), to: endOfDay(base) };
    case "thisMonth": {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      return { preset, from, to: endOfDay(base) };
    }
    case "lastMonth": {
      const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const to = new Date(today.getFullYear(), today.getMonth(), 0);
      return { preset, from, to: endOfDay(to) };
    }
    case "custom":
    default:
      return { preset: "custom", from: new Date(today.getTime() - 6 * DAY_MS), to: endOfDay(base) };
  }
}

export const DATE_PRESETS: { id: DatePresetId; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last7", label: "Last 7 days" },
  { id: "last30", label: "Last 30 days" },
  { id: "last90", label: "Last 90 days" },
  { id: "thisMonth", label: "This month" },
  { id: "lastMonth", label: "Last month" },
  { id: "custom", label: "Custom date range" },
];

/** Number of days covered by the range (minimum 1). */
export function rangeDays(range: DateRange): number {
  const span = endOfDay(range.to).getTime() - startOfDay(range.from).getTime();
  return Math.max(1, Math.round(span / DAY_MS) + 1);
}

/** Start of the range shifted back one full period (for comparisons). */
export function previousRange(range: DateRange): DateRange {
  const days = rangeDays(range);
  const to = new Date(startOfDay(range.from).getTime() - 1);
  const from = new Date(startOfDay(range.from).getTime() - days * DAY_MS);
  return { preset: range.preset, from, to: endOfDay(to) };
}

export function rangeLabel(range: DateRange): string {
  if (range.preset === "custom") return formatRangeSpan(range.from, range.to);
  const preset = DATE_PRESETS.find((p) => p.id === range.preset);
  return preset?.label ?? formatRangeSpan(range.from, range.to);
}

/** Sensible default granularity so long ranges do not render 90 daily points. */
export function defaultInterval(range: DateRange): Interval {
  const days = rangeDays(range);
  if (days <= 31) return "daily";
  if (days <= 92) return "weekly";
  return "monthly";
}

/** Every day in the range, ascending, capped so charts stay readable. */
export function eachDay(range: DateRange, cap = 366): Date[] {
  const days: Date[] = [];
  const cursor = startOfDay(range.from);
  const end = startOfDay(range.to);
  while (cursor <= end && days.length < cap) {
    days.push(new Date(cursor));
    cursor.setTime(cursor.getTime() + DAY_MS);
  }
  return days;
}
