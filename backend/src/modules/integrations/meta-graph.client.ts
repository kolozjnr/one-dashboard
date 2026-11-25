import { MetaGraphError } from './integrations.types';

/**
 * Thin Graph/OAuth transport for Meta APIs. Responsibilities:
 *
 *  - one place that talks to Meta over `fetch` (timeout, JSON parsing),
 *  - normalization of the two error shapes Meta uses (Graph `{error:{...}}`
 *    and the Instagram token endpoint's `{error_type, error_message}`),
 *  - secret hygiene: every message that can reach a log or a response has
 *    access tokens and app secrets redacted before it is built.
 *
 * Tokens are never logged here (or anywhere else in this module).
 */

const REQUEST_TIMEOUT_MS = 15_000;

/** Strips token material from anything that might be logged or surfaced. */
export function redactSecrets(message: string): string {
  return message
    .replace(/([?&](?:access_token|fb_exchange_token|client_secret|code)=)[^&\s]+/gi, '$1[redacted]')
    .replace(/\b(?:EAA[A-Za-z0-9._-]{10,}|EAAC[A-Za-z0-9._-]{10,})\b/g, '[redacted]')
    .slice(0, 300);
}

function classify(graphCode: number | undefined, httpStatus: number | undefined): MetaGraphError['kind'] {
  if (graphCode === 190 || graphCode === 102 || graphCode === 10 || graphCode === 200) return 'AUTH';
  if (graphCode === 4 || graphCode === 17 || graphCode === 32 || graphCode === 613) return 'RATE_LIMIT';
  if (httpStatus && httpStatus >= 500) return 'UPSTREAM';
  return 'UPSTREAM';
}

interface GraphErrorBody {
  error?: { message?: string; type?: string; code?: number; error_subcode?: number; error_data?: unknown };
  error_type?: string;
  error_message?: string;
  code?: number;
}

async function toError(response: Response, body: unknown): Promise<MetaGraphError> {
  const parsed = (typeof body === 'object' && body !== null ? body : {}) as GraphErrorBody;
  const graphError = parsed.error;
  const graphCode = typeof graphError?.code === 'number' ? graphError.code : typeof parsed.code === 'number' ? parsed.code : undefined;
  const subcode = typeof graphError?.error_subcode === 'number' ? graphError.error_subcode : undefined;
  const raw =
    graphError?.message ??
    parsed.error_message ??
    (typeof body === 'string' && body.trim() ? body : undefined) ??
    `Meta responded with HTTP ${response.status}`;
  return new MetaGraphError(
    classify(graphCode, response.status),
    redactSecrets(raw),
    response.status,
    graphCode,
    subcode,
  );
}

async function request(url: string, init: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: { accept: 'application/json', ...(init.headers ?? {}) },
    });
  } catch (error) {
    const message = error instanceof Error && error.name === 'TimeoutError' ? 'Meta did not respond in time' : 'Could not reach Meta';
    throw new MetaGraphError('UPSTREAM', message);
  }
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) throw await toError(response, body);
  if (body && typeof body === 'object' && 'error' in (body as Record<string, unknown>)) {
    // Meta sometimes reports errors with HTTP 200.
    throw await toError(response, body);
  }
  return body;
}

export async function metaGet<T>(
  url: string,
  params: Record<string, string | number | undefined | null>,
): Promise<T> {
  const target = new URL(url);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    target.searchParams.set(key, String(value));
  }
  return (await request(target.toString(), { method: 'GET' })) as T;
}

export async function metaPostForm<T>(url: string, fields: Record<string, string>): Promise<T> {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) body.set(key, value);
  return (await request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })) as T;
}
