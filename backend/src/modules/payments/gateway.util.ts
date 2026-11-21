import { createHash, timingSafeEqual } from 'node:crypto';
import { GatewayError } from './gateway.types';

// --- Headers --------------------------------------------------------------------

export function headerValue(headers: Record<string, string | string[] | undefined>, name: string): string | undefined {
  const raw = headers[name.toLowerCase()];
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

/**
 * Constant-time string comparison that tolerates different lengths (signature
 * headers are fixed-ish but never assumed). Both values are hashed first so the
 * digest lengths always match, which is what `timingSafeEqual` requires.
 */
export function safeEquals(a: string | undefined, b: string | undefined): boolean {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length === 0 || b.length === 0) return false;
  const left = createHash('sha256').update(a, 'utf8').digest();
  const right = createHash('sha256').update(b, 'utf8').digest();
  return timingSafeEqual(left, right);
}

/** Stable event id for providers that do not send one: hash of the exact raw body. */
export function bodyDigest(rawBody: Buffer): string {
  return `sha256:${createHash('sha256').update(rawBody).digest('hex')}`;
}

// --- Money ----------------------------------------------------------------------

const ZERO_DECIMAL = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW', 'PYG', 'RWF', 'UGX', 'UYI', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
]);

/** Smallest-unit digits for a currency (2 for USD/NGN, 0 for JPY, ...). */
export function minorUnitDigits(currency: string): number {
  return ZERO_DECIMAL.has(currency.toUpperCase()) ? 0 : 2;
}

/** Major units -> exact minor units as an integer (no floating point compare later). */
export function toMinorUnits(amount: number, currency: string): number {
  return Math.round(amount * 10 ** minorUnitDigits(currency));
}

/** Minor units reported by a provider -> major units with exact decimal places. */
export function fromMinorUnits(minor: number, currency: string): number {
  const digits = minorUnitDigits(currency);
  return digits === 0 ? minor : minor / 10 ** digits;
}

/** Integer-level equality between an expected amount and a provider-reported amount. */
export function sameMoney(expected: number, actual: number, currency: string): boolean {
  return toMinorUnits(expected, currency) === toMinorUnits(actual, currency);
}

export function normalizeCurrency(currency: string | null | undefined): string | null {
  if (typeof currency !== 'string' || currency.trim().length === 0) return null;
  return currency.trim().toUpperCase();
}

// --- Provider JSON helpers -------------------------------------------------------

export function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

export function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function asDate(value: unknown): Date | null {
  if (typeof value === 'string' && value.length > 0) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

/** Reads a nested path like `['data', 'customer', 'email']` out of parsed JSON. */
export function dig(value: unknown, ...path: string[]): unknown {
  let current: unknown = value;
  for (const key of path) {
    const record = asRecord(current);
    if (!record) return undefined;
    current = record[key];
  }
  return current;
}

// --- HTTP -----------------------------------------------------------------------

export interface GatewayRequest {
  method?: 'GET' | 'POST';
  url: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}

/**
 * Single HTTP path for every adapter: bounded timeout, no redirects to unexpected
 * hosts, and a normalized failure. Network/5xx problems surface as GatewayError so
 * the caller can distinguish "provider unreachable" from "provider says failed".
 */
export async function gatewayFetch(request: GatewayRequest): Promise<{ status: number; json: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), request.timeoutMs ?? 15_000);
  try {
    const response = await fetch(request.url, {
      method: request.method ?? 'GET',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(request.headers ?? {}) },
      body: request.body,
      signal: controller.signal,
      redirect: 'error',
    });
    const text = await response.text();
    let json: unknown = null;
    if (text.length > 0) {
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
    }
    return { status: response.status, json };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown network error';
    throw new GatewayError('UPSTREAM_ERROR', `Payment gateway request failed: ${message}`);
  } finally {
    clearTimeout(timer);
  }
}

/** Pulls a provider's own error text out of a non-2xx response without leaking secrets. */
export function gatewayError(status: number, json: unknown, fallback: string): GatewayError {
  const message =
    (typeof dig(json, 'error', 'message') === 'string' ? (dig(json, 'error', 'message') as string) : null) ??
    (typeof dig(json, 'message') === 'string' ? (dig(json, 'message') as string) : null) ??
    fallback;
  return new GatewayError(status === 404 ? 'NOT_FOUND' : 'UPSTREAM_ERROR', message.slice(0, 300), status);
}
