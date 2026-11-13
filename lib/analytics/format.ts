import type { MetricFormat } from "./types";

const numberFormatter = new Intl.NumberFormat("en-US");

/** 12480 -> "12,480" · 1248000 -> "1,248,000". */
export function formatNumber(value: number): string {
  return numberFormatter.format(Math.round(value));
}

/** 12480 -> "12.5K" · 1248000 -> "1.2M" · 4200000000 -> "4.2B". */
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return trim(value / 1_000_000_000) + "B";
  if (abs >= 1_000_000) return trim(value / 1_000_000) + "M";
  if (abs >= 1_000) return trim(value / 1_000) + "K";
  return numberFormatter.format(Math.round(value));
}

function trim(value: number): string {
  const rounded = Math.abs(value) >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
  return rounded.toFixed(rounded % 1 === 0 ? 0 : 1);
}

/** 6.42 -> "+6.4%" / "-2.1%". */
export function formatPercent(value: number, { signed = false } = {}): string {
  const body = `${Math.abs(value).toFixed(1)}%`;
  if (!signed) return body;
  return `${value >= 0 ? "+" : "-"}${body}`;
}

/** Seconds -> "3m 24s" / "48s" / "1h 12m". */
export function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  if (total < 60) return `${total}s`;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${rest}s`;
}

/** Formats a raw value with the metric's declared format. */
export function formatMetricValue(
  value: number,
  format: MetricFormat,
  displayValue?: string,
): string {
  if (format === "text") return displayValue ?? "—";
  switch (format) {
    case "compact":
      return formatCompact(value);
    case "percent":
      return formatPercent(value);
    case "decimal":
      return (Math.round(value * 10) / 10).toFixed(1);
    case "duration":
      return formatDuration(value);
    case "number":
    default:
      return formatNumber(value);
  }
}

/** "5 Nov" — chart axis labels. */
export function formatDayLabel(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** "Nov 2026" — monthly axis labels. */
export function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

/** "4 May 2024" — content published dates. */
export function formatFullDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "1 Oct – 30 Oct 2026" — custom range labels. */
export function formatRangeSpan(from: Date, to: Date): string {
  const sameYear = from.getFullYear() === to.getFullYear();
  const left = from.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "numeric",
  });
  const right = to.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${left} – ${right}`;
}

/** "12 min ago" — last synchronisation stamps. */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const diff = Math.max(0, now.getTime() - new Date(iso).getTime());
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return `${days} d ago`;
}
