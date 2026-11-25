import { UpstreamHttpError } from './integrations.types';

/**
 * Thin, provider-neutral transport for the non-Meta social APIs (TikTok
 * Display, TikTok API for Business, X). Responsibilities:
 *
 *  - one place that talks to those providers over `fetch` (timeout, JSON),
 *  - normalization of the three error shapes they use (TikTok Display
 *    `{error:{code,message}}`, TikTok Business `{code,message}` returned with
 *    HTTP 200, X OAuth `{error,error_description}` / v2 `{title,detail}`),
 *  - secret hygiene: every message that can reach a log or a response has
 *    tokens, secrets and authorization codes redacted before it is built.
 *
 * Tokens are never logged here (or anywhere else in this module).
 */

const REQUEST_TIMEOUT_MS = 15_000;

/** Strips token material from anything that might be logged or surfaced. */
export function redactProviderSecrets(message: string): string {
  return message
    .replace(
      /([?&](?:access_token|refresh_token|client_secret|client_key|code|code_verifier|auth_code|state)=)[^&\s]+/gi,
      '$1[redacted]',
    )
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, 'Bearer [redacted]')
    .replace(/\bAAAA[A-Za-z0-9%_-]{8,}\b/g, '[redacted]')
    .slice(0, 300);
}

function classify(httpStatus: number | undefined, providerCode: string | number | undefined): UpstreamHttpError['kind'] {
  if (httpStatus === 401 || httpStatus === 403) return 'AUTH';
  if (httpStatus === 429) return 'RATE_LIMIT';
  if (httpStatus && httpStatus >= 500) return 'UPSTREAM';

  // TikTok Display: string codes on a 200/4xx body.
  if (providerCode === 'access_token_invalid' || providerCode === 'invalid_token' || providerCode === 'scope_not_authorized') {
    return 'AUTH';
  }
  if (providerCode === 'rate_limit_exceeded') return 'RATE_LIMIT';
  // TikTok Business: numeric 401xx family = token problems, 400xx = bad request.
  if (typeof providerCode === 'number' && providerCode >= 40100 && providerCode < 40200) return 'AUTH';
  // X OAuth token endpoint: string grant errors.
  if (
    providerCode === 'invalid_grant' ||
    providerCode === 'invalid_client' ||
    providerCode === 'unauthorized_client' ||
    providerCode === 'invalid_token'
  ) {
    return 'AUTH';
  }
  if (providerCode === 'rate_limit_exceeded' || providerCode === 'too_many_requests') return 'RATE_LIMIT';
  return 'UPSTREAM';
}

interface ProviderErrorBody {
  error?: { code?: string | number; message?: string; log_id?: string } | string;
  error_description?: string;
  code?: number | string;
  message?: string;
  title?: string;
  detail?: string;
  errors?: Array<{ message?: string; detail?: string; type?: string }>;
}

function extract(response: Response, body: unknown): UpstreamHttpError | null {
  const parsed = (typeof body === 'object' && body !== null ? body : {}) as ProviderErrorBody;
  const inner = typeof parsed.error === 'object' && parsed.error !== null ? parsed.error : undefined;
  const providerCode = inner?.code ?? (typeof parsed.error === 'string' ? parsed.error : undefined) ?? parsed.code;

  const hasTikTokDisplayError = inner !== undefined;
  const hasXOAuthError = typeof parsed.error === 'string' || typeof parsed.error_description === 'string';
  const hasBusinessError = typeof parsed.code === 'number' && parsed.code !== 0;
  const hasV2Error = typeof parsed.title === 'string' && response.status >= 400;
  const failed = !response.ok;

  if (!failed && !hasTikTokDisplayError && !hasXOAuthError && !hasBusinessError && !hasV2Error) return null;

  const raw =
    inner?.message ??
    parsed.error_description ??
    (typeof parsed.error === 'string' ? parsed.error : undefined) ??
    parsed.message ??
    parsed.detail ??
    parsed.title ??
    parsed.errors?.[0]?.detail ??
    parsed.errors?.[0]?.message ??
    (typeof body === 'string' && body.trim() ? body : undefined) ??
    `Provider responded with HTTP ${response.status}`;

  return new UpstreamHttpError(
    classify(response.status, providerCode),
    redactProviderSecrets(raw),
    response.status,
    providerCode,
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
    const message =
      error instanceof Error && error.name === 'TimeoutError' ? 'The provider did not respond in time' : 'Could not reach the provider';
    throw new UpstreamHttpError('UPSTREAM', message);
  }
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  const failure = extract(response, body);
  if (failure) throw failure;
  return body;
}

/** GET with query params; `headers` carries provider auth (Bearer / Access-Token). */
export async function socialGet<T>(
  url: string,
  params: Record<string, string | number | undefined | null> = {},
  headers: Record<string, string> = {},
): Promise<T> {
  const target = new URL(url);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    target.searchParams.set(key, String(value));
  }
  return (await request(target.toString(), { method: 'GET', headers })) as T;
}

/** `application/x-www-form-urlencoded` POST (OAuth token endpoints). */
export async function socialPostForm<T>(
  url: string,
  fields: Record<string, string>,
  headers: Record<string, string> = {},
): Promise<T> {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) body.set(key, value);
  return (await request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', ...headers },
    body: body.toString(),
  })) as T;
}

/** JSON POST (TikTok video list, X API writes). */
export async function socialPostJson<T>(url: string, payload: unknown, headers: Record<string, string> = {}): Promise<T> {
  return (await request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  })) as T;
}
