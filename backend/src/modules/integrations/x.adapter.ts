import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IntegrationError,
  SOCIAL_SCOPES,
  UpstreamHttpError,
  type AuthorizeOptions,
  type DiscoveredAccount,
  type IntegrationCredentialBag,
  type SocialAdapter,
  type SocialProduct,
  type SocialToken,
} from './integrations.types';
import { socialGet, socialPostForm } from './social-http.client';
import { createPkceVerifier, pkceChallengeS256 } from './pkce';
import { XOAuth1Strategy } from './x-oauth1.strategy';

/**
 * X OAuth 2.0 Authorization Code + PKCE (user context).
 *
 * Flow (verified against X's current docs):
 *   1. https://x.com/i/oauth2/authorize -> authorization code
 *      (response_type=code, client_id, redirect_uri, state, space-separated
 *      scope, code_challenge S256). THE AUTHORIZATION CODE EXPIRES IN 30
 *      SECONDS and is single-use, so the exchange happens immediately on the
 *      callback with the PKCE verifier carried inside the signed state.
 *   2. POST https://api.x.com/2/oauth2/token -> access token (+ refresh token
 *      when `offline.access` was granted). Confidential clients authenticate
 *      with HTTP Basic; a public client sends `client_id` in the body.
 *      Access token: 2 hours; refresh token is rotated when used.
 *
 * Rules enforced here:
 *  - user authorization only. `X_BEARER_TOKEN` (app-only) is never used as a
 *    substitute for a person's authorization and never reads private metrics;
 *  - scopes are the minimal set for what this module actually calls
 *    (`users.read`, `tweet.read`, `offline.access`). `follows.read` is not
 *    requested because no follower endpoint is called;
 *  - access tiers, quotas and pricing are X's, not ours: calls are bounded
 *    (page caps below) and a 429 surfaces as RATE_LIMIT, never as zeros.
 *
 * Endpoints that accept only OAuth 1.0a are handled by XOAuth1Strategy — a
 * separate strategy file, never by mixing credentials into this flow.
 */
@Injectable()
export class XAdapter implements SocialAdapter {
  readonly product: SocialProduct = 'x';
  readonly displayName = 'X';

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirect: string;
  private readonly logger = new Logger(XAdapter.name);

  constructor(
    config: ConfigService,
    private readonly oauth1: XOAuth1Strategy,
  ) {
    this.redirect = pick(config.get<string>('X_REDIRECT_URI')) || fallbackRedirect(config.get<string>('APP_BASE_URL'), '/auth/x/callback');
    const explicitClientId = pick(config.get<string>('X_CLIENT_ID'));
    // X issues OAuth 2.0 Client ID/Secret separately from the OAuth 1.0a
    // consumer key/secret. Falling back keeps a consumer-only deployment
    // working when the two happen to be interchangeable, but a wrong
    // client_id makes X render its own opaque error page ("You weren't able
    // to give access to the App") before our callback ever runs — so say so
    // at startup instead of failing silently later.
    // No substitution from the OAuth 1.0a pair: X issues those separately, and
    // a wrong client_id/secret is answered with X's own opaque error page
    // ("You weren't able to give access to the App") before our callback runs,
    // or with `invalid_client` at the token exchange — neither of which says
    // what is actually wrong.
    this.clientId = explicitClientId;
    this.clientSecret = pick(config.get<string>('X_CLIENT_SECRET'));
    if (!this.clientId || !this.clientSecret) {
      this.logger.warn(
        `X OAuth 2.0 is incomplete — X_CLIENT_ID is ${this.clientId ? 'set' : 'MISSING'}, ` +
          `X_CLIENT_SECRET is ${this.clientSecret ? 'set' : 'MISSING'} ` +
          `(X developer portal -> User authentication settings -> OAuth 2.0). ` +
          `X_CONSUMER_KEY / X_SECRET_KEY are the OAuth 1.0a credentials and are not a substitute. ` +
          `Register exactly "${this.redirect}" as the callback URI.`,
      );
    }
  }

  get configured(): boolean {
    return Boolean(this.clientId && this.clientSecret && this.redirect);
  }

  get redirectUri(): string {
    return this.redirect;
  }

  /** PKCE verifier for this attempt; bound into the signed state by the service. */
  prepareAuthorization(): AuthorizeOptions {
    return { codeVerifier: createPkceVerifier() };
  }

  buildAuthorizeUrl(state: string, options?: AuthorizeOptions): string {
    this.assertConfigured();
    const verifier = options?.codeVerifier;
    if (!verifier) {
      throw new IntegrationError('STATE_INVALID', 'The sign-in link is invalid. Please start the connection again.', 400);
    }
    const url = new URL('https://x.com/i/oauth2/authorize');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', this.clientId);
    url.searchParams.set('redirect_uri', this.redirect);
    url.searchParams.set('state', state);
    // Space-separated list (X rule) — never merged with another product's scopes.
    url.searchParams.set('scope', SOCIAL_SCOPES.x.join(' '));
    url.searchParams.set('code_challenge', pkceChallengeS256(verifier));
    url.searchParams.set('code_challenge_method', 'S256');
    return url.toString();
  }

  async exchangeCode(code: string, options?: AuthorizeOptions): Promise<SocialToken> {
    this.assertConfigured();
    const verifier = options?.codeVerifier;
    if (!verifier) {
      throw new IntegrationError('STATE_INVALID', 'The sign-in link is invalid. Please start the connection again.', 400);
    }
    const body = await socialPostForm<{
      access_token?: string;
      expires_in?: number;
      refresh_token?: string;
      scope?: string;
    }>('https://api.x.com/2/oauth2/token', {
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.redirect,
      code_verifier: verifier,
      ...(this.clientSecret ? {} : { client_id: this.clientId }),
    }, this.basicAuth());
    if (!body.access_token) {
      throw new IntegrationError('UPSTREAM_ERROR', 'X did not return an access token. Please try again.', 502);
    }
    return {
      accessToken: body.access_token,
      expiresAt: secondsFromNow(body.expires_in),
      scopes: parseScopes(body.scope, SOCIAL_SCOPES.x),
      refreshToken: body.refresh_token ?? null,
      refreshTokenExpiresAt: null, // X does not report refresh-token expiry
    };
  }

  async refresh(bag: IntegrationCredentialBag): Promise<IntegrationCredentialBag> {
    const refreshToken = bag.refreshToken;
    if (!refreshToken) {
      throw new IntegrationError('NEEDS_REAUTH', 'X must be reconnected to keep syncing.', 409);
    }
    const body = await socialPostForm<{
      access_token?: string;
      expires_in?: number;
      refresh_token?: string;
      scope?: string;
    }>(
      'https://api.x.com/2/oauth2/token',
      {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        ...(this.clientSecret ? {} : { client_id: this.clientId }),
      },
      this.basicAuth(),
    );
    if (!body.access_token) {
      throw new IntegrationError('NEEDS_REAUTH', 'X must be reconnected to keep syncing.', 409);
    }
    return {
      ...bag,
      accessToken: body.access_token,
      tokenExpiresAt: body.expires_in ? secondsFromNow(body.expires_in)!.toISOString() : '',
      tokenIssuedAt: new Date().toISOString(),
      // X rotates refresh tokens — store the new one or the connection dies.
      ...(body.refresh_token ? { refreshToken: body.refresh_token } : {}),
      ...(body.scope ? { scopes: parseScopes(body.scope, bag.scopes?.split(',')).join(',') } : {}),
    };
  }

  async discoverAccounts(accessToken: string): Promise<DiscoveredAccount[]> {
    const me = await readXProfile(accessToken);
    const user = me.data;
    if (!user?.id) {
      throw new IntegrationError('NO_ACCOUNTS', 'X did not return an account for this login.', 422);
    }

    // Optional OAuth 1.0a enrichment (separate strategy; only when the
    // deployment has a complete 1.0a user credential set).
    let statusesCount: number | undefined;
    if (this.oauth1.configured) {
      try {
        const legacy = await this.oauth1.signedGet<{ statuses_count?: number }>('https://api.x.com/1.1/account/verify_credentials.json');
        if (typeof legacy.statuses_count === 'number') statusesCount = legacy.statuses_count;
      } catch {
        // Enrichment only — a 1.0a failure must not break the OAuth 2.0 login.
      }
    }

    return [
      {
        providerAccountId: String(user.id),
        displayName: user.name ? `${user.name} (@${user.username ?? ''})`.trim() : `@${user.username ?? user.id}`,
        kind: 'X_ACCOUNT',
        username: user.username ?? null,
        profileUrl: user.username ? `https://x.com/${user.username}` : null,
        tasks: [],
        linkedInstagram: null,
        ...(typeof user.public_metrics?.tweet_count === 'number'
          ? { accountType: `tweets:${user.public_metrics.tweet_count}` }
          : typeof statusesCount === 'number'
            ? { accountType: `tweets:${statusesCount}` }
            : {}),
        accessToken,
        expiresAt: null, // carried by the token bag, not per-account
      },
    ];
  }

  private basicAuth(): Record<string, string> {
    if (!this.clientSecret) return {};
    const credential = Buffer.from(`${this.clientId}:${this.clientSecret}`, 'utf8').toString('base64');
    return { authorization: `Basic ${credential}` };
  }

  private assertConfigured(): void {
    if (this.configured) return;
    const missing = [
      this.clientId ? null : 'X_CLIENT_ID',
      this.clientSecret ? null : 'X_CLIENT_SECRET',
      this.redirect ? null : 'X_REDIRECT_URI',
    ].filter((name): name is string => Boolean(name));
    throw new IntegrationError(
      'NOT_CONFIGURED',
      missing.length
        ? `X login is not configured on this server: ${missing.join(', ')} ${missing.length > 1 ? 'are' : 'is'} missing in backend/.env.`
        : 'X login is not configured on this server.',
      503,
    );
  }
}

export interface XUser {
  id?: string;
  name?: string;
  username?: string;
  verified?: boolean;
  public_metrics?: {
    followers_count?: number;
    following_count?: number;
    tweet_count?: number;
    listed_count?: number;
    like_count?: number;
  };
  data?: XUser;
}

/** `GET /2/users/me` — the only profile read this flow performs. */
export async function readXProfile(token: string): Promise<XUser> {
  return socialGet<XUser>(
    'https://api.x.com/2/users/me',
    { 'user.fields': 'id,name,username,verified,public_metrics' },
    bearer(token),
  );
}

export interface XPostMetrics {
  retweetCount: number;
  replyCount: number;
  likeCount: number;
  quoteCount: number;
  bookmarkCount: number;
  impressionCount: number;
  /** Present only when X returns non-public/organic metrics for an owned post < 30 days. */
  nonPublicImpressions: number | null;
  profileClicks: number | null;
  urlClicks: number | null;
}

export interface XPost {
  id: string;
  text: string;
  createdAt: Date | null;
  metrics: XPostMetrics;
  /** True when X returned the entitled (owner-only) metric block. */
  entitledMetrics: boolean;
}

const MAX_X_PAGES = 3;
const MAX_X_POSTS = 100;

/**
 * `GET /2/users/:id/tweets` — posts + public metrics for the range.
 *
 * `non_public_metrics` / `organic_metrics` are only returned for posts the
 * authenticated user owns, younger than 30 days, and only with OAuth 2.0 user
 * context; when absent the post is reported with public metrics alone (never
 * with invented private numbers).
 */
export async function fetchXPosts(token: string, userId: string, options: { since?: Date; until?: Date } = {}): Promise<XPost[]> {
  const posts: XPost[] = [];
  let paginationToken: string | undefined;
  for (let page = 0; page < MAX_X_PAGES && posts.length < MAX_X_POSTS; page += 1) {
    const readPage = (fields: string) =>
      socialGet<{
        data?: Array<{ id?: string; text?: string; created_at?: string; public_metrics?: Record<string, number>; non_public_metrics?: Record<string, number>; organic_metrics?: Record<string, number> }>;
        meta?: { next_token?: string };
      }>(
        `https://api.x.com/2/users/${encodeURIComponent(userId)}/tweets`,
        {
          max_results: 100,
          'tweet.fields': fields,
          sort_order: 'recency',
          ...(paginationToken ? { pagination_token: paginationToken } : {}),
        },
        bearer(token),
      );

    // Owner-only metric blocks are entitlement- and age-gated; when X refuses
    // them (400/403) fall back to public metrics instead of failing the sync.
    const body = await readPage('created_at,public_metrics,non_public_metrics,organic_metrics').catch((error) => {
      if (error instanceof UpstreamHttpError && (error.httpStatus === 400 || error.httpStatus === 403)) {
        return readPage('created_at,public_metrics');
      }
      throw error;
    });

    for (const item of body.data ?? []) {
      if (!item.id) continue;
      const created = item.created_at ? new Date(item.created_at) : null;
      if (options.since && created && created < options.since) continue;
      if (options.until && created && created > options.until) continue;
      const pub = item.public_metrics ?? {};
      const organic = item.organic_metrics ?? {};
      const nonPublic = item.non_public_metrics ?? {};
      const entitled = Object.keys(nonPublic).length > 0 || Object.keys(organic).length > 0;
      posts.push({
        id: item.id,
        text: item.text ?? '',
        createdAt: created,
        entitledMetrics: entitled,
        metrics: {
          retweetCount: num(pub.retweet_count),
          replyCount: num(pub.reply_count),
          likeCount: num(pub.like_count),
          quoteCount: num(pub.quote_count),
          bookmarkCount: num(pub.bookmark_count),
          impressionCount: num(pub.impression_count),
          nonPublicImpressions: entitled ? num(organic.impressions ?? nonPublic.impressions) : null,
          profileClicks: entitled ? num(organic.profile_clicks ?? nonPublic.user_profile_clicks) : null,
          urlClicks: entitled ? num(organic.url_clicks ?? nonPublic.url_clicks) : null,
        },
      });
    }

    const next = body.meta?.next_token;
    if (!next || !body.data?.length) break;
    paginationToken = next;
  }
  return posts;
}

function bearer(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

function num(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseScopes(raw: string | undefined, fallback: readonly string[]): string[] {
  const scopes = (raw ?? '')
    .split(/[\s,]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);
  return scopes.length ? scopes : [...fallback];
}

function secondsFromNow(seconds?: number): Date | null {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(Date.now() + seconds * 1000);
}

function pick(value: string | undefined): string {
  return value && value.trim() ? value.trim() : '';
}

function fallbackRedirect(baseUrl: string | undefined, path: string): string {
  return baseUrl ? `${baseUrl.replace(/\/+$/, '')}${path}` : '';
}
