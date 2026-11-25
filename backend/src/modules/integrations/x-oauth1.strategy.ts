import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UpstreamHttpError } from './integrations.types';
import { redactProviderSecrets } from './social-http.client';

/**
 * X OAuth 1.0a (three-legged, HMAC-SHA1) — a SEPARATE authentication strategy
 * from the OAuth 2.0 PKCE flow in x.adapter.ts.
 *
 * Why it exists: X still exposes endpoints that accept only OAuth 1.0a user
 * context (API v1.1 and the Ads API). None of the endpoints this module needs
 * today is one of them — profile, posts and metrics all run on OAuth 2.0
 * PKCE — so nothing in the default flow depends on this strategy. It is wired
 * into the X adapter for `GET /1.1/account/verify_credentials.json` when
 * OAuth 1.0a user credentials are configured, which both exercises the signer
 * and enriches the profile, and it is the drop-in path for any future
 * 1.0a-only endpoint.
 *
 * `X_BEARER_TOKEN` (app-only) is deliberately NOT used here or anywhere else:
 * an app-only bearer cannot read a person's metrics and must never stand in
 * for user authorization.
 */
export interface OAuth1Credentials {
  consumerKey: string;
  consumerSecret: string;
  /** User access token from the 1.0a flow; absent for app-only requests. */
  token?: string;
  tokenSecret?: string;
}

/** Percent-encoding per RFC 3986 (the OAuth 1.0a normalization rules). */
function rfc3986(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

/** Builds the `Authorization: OAuth ...` header for one request (RFC 5849 §3.1). */
export function buildOAuth1Header(
  input: {
    method: string;
    url: string;
    /** Extra non-oauth query/body params that must be signed. */
    params?: Record<string, string | number>;
    credentials: OAuth1Credentials;
    nonce?: string;
    timestamp?: string;
  },
): string {
  const target = new URL(input.url);
  const query: Record<string, string> = {};
  target.searchParams.forEach((value, key) => {
    query[key] = value;
  });
  for (const [key, value] of Object.entries(input.params ?? {})) query[key] = String(value);

  const oauth: Record<string, string> = {
    oauth_consumer_key: input.credentials.consumerKey,
    oauth_nonce: input.nonce ?? randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: input.timestamp ?? String(Math.floor(Date.now() / 1000)),
    oauth_version: '1.0',
  };
  if (input.credentials.token) oauth.oauth_token = input.credentials.token;

  const normalize = (record: Record<string, string>): string =>
    Object.entries(record)
      .map(([key, value]) => [rfc3986(key), rfc3986(value)] as const)
      .sort(([ak, av], [bk, bv]) => (ak < bk ? -1 : ak > bk ? 1 : av < bv ? -1 : av > bv ? 1 : 0))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');

  const baseURL = `${target.origin}${target.pathname}`;
  const baseString = [
    input.method.toUpperCase(),
    rfc3986(baseURL),
    rfc3986(normalize({ ...query, ...oauth })),
  ].join('&');
  const signingKey = `${rfc3986(input.credentials.consumerSecret)}&${rfc3986(input.credentials.tokenSecret ?? '')}`;
  const signature = createHmac('sha1', signingKey).update(baseString).digest('base64');
  oauth.oauth_signature = signature;

  const header = `OAuth ${Object.entries(oauth)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, value]) => `${rfc3986(key)}="${rfc3986(value)}"`)
    .join(', ')}`;
  return header;
}

/** Verifies a signature without leaking timing (used by tests/tooling). */
export function oauth1SignatureMatches(expected: string, provided: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}

@Injectable()
export class XOAuth1Strategy {
  private readonly consumerKey: string;
  private readonly consumerSecret: string;
  private readonly token: string;
  private readonly tokenSecret: string;

  constructor(config: ConfigService) {
    this.consumerKey = pick(config.get<string>('X_CONSUMER_KEY'));
    this.consumerSecret = pick(config.get<string>('X_SECRET_KEY'));
    this.token = pick(config.get<string>('X_OAUTH1_ACCESS_TOKEN'));
    this.tokenSecret = pick(config.get<string>('X_OAUTH1_ACCESS_SECRET'));
  }

  /** True only with a complete 1.0a user credential set. */
  get configured(): boolean {
    return Boolean(this.consumerKey && this.consumerSecret && this.token && this.tokenSecret);
  }

  /** Signed GET against a 1.0a-only endpoint; throws UpstreamHttpError. */
  async signedGet<T>(url: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
    if (!this.configured) {
      throw new UpstreamHttpError('BAD_RESPONSE', 'X OAuth 1.0a credentials are not configured.', 400, 'NOT_CONFIGURED');
    }
    const target = new URL(url);
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue;
      target.searchParams.set(key, String(value));
    }
    const authorization = buildOAuth1Header({
      method: 'GET',
      url: target.toString(),
      credentials: {
        consumerKey: this.consumerKey,
        consumerSecret: this.consumerSecret,
        token: this.token,
        tokenSecret: this.tokenSecret,
      },
    });

    let response: Response;
    try {
      response = await fetch(target.toString(), {
        method: 'GET',
        headers: { authorization, accept: 'application/json' },
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new UpstreamHttpError('UPSTREAM', 'Could not reach X');
    }
    const text = await response.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    if (!response.ok) {
      const parsed = (typeof body === 'object' && body !== null ? body : {}) as { errors?: Array<{ message?: string }>; detail?: string; title?: string };
      const raw = parsed.detail ?? parsed.title ?? parsed.errors?.[0]?.message ?? `X responded with HTTP ${response.status}`;
      throw new UpstreamHttpError(
        response.status === 401 || response.status === 403
          ? 'AUTH'
          : response.status === 429
            ? 'RATE_LIMIT'
            : 'UPSTREAM',
        redactProviderSecrets(raw),
        response.status,
      );
    }
    return body as T;
  }
}

function pick(value: string | undefined): string {
  return value && value.trim() ? value.trim() : '';
}
