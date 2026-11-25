import { Injectable } from '@nestjs/common';
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
import { socialGet, socialPostForm, socialPostJson } from './social-http.client';
import { createPkceVerifier, pkceChallengeS256 } from './pkce';

/**
 * TikTok Login Kit + Display API (open.tiktokapis.com).
 *
 * Flow (verified against TikTok's current behavior):
 *   1. https://www.tiktok.com/v2/auth/authorize/  -> authorization code
 *      (client_key, comma-separated scope, response_type=code, redirect_uri,
 *      state, AND PKCE code_challenge/code_challenge_method=S256 — TikTok
 *      answers `param_error` errCode=10007 `error_type=code_challenge` and
 *      shows its own error page when the challenge is missing, so the flow
 *      never returns to us)
 *   2. POST https://open.tiktokapis.com/v2/oauth/token/ (form) -> access token
 *      + rotating refresh token. Access token: 2 hours. Refresh token: 180
 *      days and ROTATES on every refresh — the new value must be stored or the
 *      connection dies with it.
 *   3. GET  https://open.tiktokapis.com/v2/user/info/?fields=...  (Bearer)
 *   4. POST https://open.tiktokapis.com/v2/video/list/?fields=... (Bearer)
 *      body {max_count<=20, cursor} — needs the `video.list` scope.
 *
 * SCOPE BOUNDARY (this is the whole point of keeping TikTok separate from
 * TikTok for Business): everything reachable here is basic profile, profile
 * stats and the user's own video list. The Display API does NOT expose
 * impressions, reach, watch-time funnels or any advertising data — those come
 * only from the TikTok API for Business behind a separate app and review
 * (see tiktok-business.adapter.ts). This adapter never pretends otherwise.
 */
@Injectable()
export class TikTokAdapter implements SocialAdapter {
  readonly product: SocialProduct = 'tiktok';
  readonly displayName = 'TikTok';

  private readonly clientKey: string;
  private readonly clientSecret: string;
  private readonly redirect: string;

  constructor(config: ConfigService) {
    this.clientKey = nonEmpty(config.get<string>('TIKTOK_CLIENT_KEY'));
    this.clientSecret = nonEmpty(config.get<string>('TIKTOK_CLIENT_SECRET'));
    // Same callback route serves both TikTok products (the signed state says
    // which), so the Display redirect URI may be omitted.
    this.redirect =
      nonEmpty(config.get<string>('TIKTOK_REDIRECT_URI')) || fallbackRedirect(config.get<string>('APP_BASE_URL'), '/auth/tiktok/callback');
  }

  get configured(): boolean {
    return Boolean(this.clientKey && this.clientSecret && this.redirect);
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
    const url = new URL('https://www.tiktok.com/v2/auth/authorize/');
    url.searchParams.set('client_key', this.clientKey);
    // Comma-separated list, Login Kit rules. Display scopes only — never the
    // Business API's advertiser authorization.
    url.searchParams.set('scope', SOCIAL_SCOPES.tiktok.join(','));
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('redirect_uri', this.redirect);
    url.searchParams.set('state', state);
    // Required by TikTok: without S256 it answers param_error/10007
    // (error_type=code_challenge) and renders its own error page.
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
      refresh_token_expires_in?: number;
      open_id?: string;
      scope?: string;
    }>('https://open.tiktokapis.com/v2/oauth/token/', {
      client_key: this.clientKey,
      client_secret: this.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.redirect,
      code_verifier: verifier,
    });
    if (!body.access_token) {
      throw new IntegrationError('UPSTREAM_ERROR', 'TikTok did not return an access token. Please try again.', 502);
    }
    return {
      accessToken: body.access_token,
      expiresAt: secondsFromNow(body.expires_in),
      scopes: parseScopes(body.scope, SOCIAL_SCOPES.tiktok),
      refreshToken: body.refresh_token ?? null,
      refreshTokenExpiresAt: secondsFromNow(body.refresh_token_expires_in),
    };
  }

  /** Refresh tokens rotate: the returned refresh token replaces the stored one. */
  async refresh(bag: IntegrationCredentialBag): Promise<IntegrationCredentialBag> {
    const refreshToken = bag.refreshToken;
    if (!refreshToken) {
      throw new IntegrationError('NEEDS_REAUTH', 'TikTok must be reconnected to keep syncing.', 409);
    }
    const body = await socialPostForm<{
      access_token?: string;
      expires_in?: number;
      refresh_token?: string;
      refresh_token_expires_in?: number;
      scope?: string;
    }>('https://open.tiktokapis.com/v2/oauth/token/', {
      client_key: this.clientKey,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      redirect_uri: this.redirect,
    });
    if (!body.access_token) {
      throw new IntegrationError('NEEDS_REAUTH', 'TikTok must be reconnected to keep syncing.', 409);
    }
    return {
      ...bag,
      accessToken: body.access_token,
      tokenExpiresAt: body.expires_in ? secondsFromNow(body.expires_in)!.toISOString() : '',
      tokenIssuedAt: new Date().toISOString(),
      ...(body.refresh_token ? { refreshToken: body.refresh_token } : {}),
      ...(body.refresh_token_expires_in
        ? { refreshTokenExpiresAt: secondsFromNow(body.refresh_token_expires_in)!.toISOString() }
        : {}),
      ...(body.scope ? { scopes: parseScopes(body.scope, bag.scopes?.split(',')).join(',') } : {}),
    };
  }

  async discoverAccounts(accessToken: string): Promise<DiscoveredAccount[]> {
    const user = await readTikTokProfile(accessToken);
    const username = user.username ? String(user.username) : '';
    const display = user.display_name ? String(user.display_name) : '';
    if (!user.open_id) {
      throw new IntegrationError('NO_ACCOUNTS', 'TikTok did not return an account for this login.', 422);
    }
    return [
      {
        providerAccountId: String(user.open_id),
        displayName: username ? `@${username}` : display ? `@${display}` : 'TikTok account',
        kind: 'TIKTOK_ACCOUNT',
        username: username || display || null,
        profileUrl: username ? `https://www.tiktok.com/@${username}` : null,
        tasks: [],
        linkedInstagram: null,
        accessToken,
        expiresAt: null, // carried by the token bag, not per-account
      },
    ];
  }

  private assertConfigured(): void {
    if (!this.configured) {
      throw new IntegrationError('NOT_CONFIGURED', 'TikTok login is not configured on this server.', 503);
    }
  }
}

/** Display API user object; only the fields the granted scopes allow are present. */
export interface TikTokUser {
  open_id?: string;
  union_id?: string;
  display_name?: string;
  username?: string;
  avatar_url?: string;
  bio_description?: string;
  follower_count?: number;
  following_count?: number;
  likes_count?: number;
  video_count?: number;
  data?: { user?: TikTokUser; error?: { code?: string; message?: string } };
  error?: { code?: string; message?: string };
}

const BASIC_FIELDS = 'open_id,union_id,display_name,avatar_url';
const ALL_FIELDS = `${BASIC_FIELDS},username,bio_description,profile_url,follower_count,following_count,likes_count,video_count`;

/**
 * `/v2/user/info/` with graceful scope degradation: request every Display
 * field first, then fall back to the basic set when TikTok rejects the call
 * (a person who denied `user.info.stats` must still connect).
 */
export async function readTikTokProfile(token: string): Promise<TikTokUser> {
  try {
    return unwrap(await socialGet<TikTokUser>('https://open.tiktokapis.com/v2/user/info/', { fields: ALL_FIELDS }, bearer(token)));
  } catch (error) {
    if (error instanceof UpstreamHttpError && error.kind === 'RATE_LIMIT') throw error;
    return unwrap(await socialGet<TikTokUser>('https://open.tiktokapis.com/v2/user/info/', { fields: BASIC_FIELDS }, bearer(token)));
  }
}

/** A video as the Display API reports it (no impressions, no watch funnels). */
export interface TikTokVideo {
  id: string;
  title: string | null;
  createTime: Date | null;
  coverUrl: string | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
}

const VIDEO_FIELDS = 'id,title,cover_url,create_time,like_count,comment_count,share_count,view_count';

/**
 * Paginates `POST /v2/video/list/` (max_count <= 20, cursor). Returns at most
 * `maxPages` pages so one sync can never burn a Display API quota.
 */
export async function fetchTikTokVideos(token: string, maxPages = 3): Promise<TikTokVideo[]> {
  const videos: TikTokVideo[] = [];
  let cursor = '';
  for (let page = 0; page < maxPages; page += 1) {
    const body = await socialPostJson<{
      data?: { cursor?: string; has_more?: boolean; list?: Array<Record<string, unknown>>; error?: { code?: string; message?: string } };
      error?: { code?: string; message?: string };
    }>(
      `https://open.tiktokapis.com/v2/video/list/?fields=${VIDEO_FIELDS}`,
      { max_count: 20, ...(cursor ? { cursor } : {}) },
      bearer(token),
    );
    const data = body.data ?? {};
    if (data.error) throw new UpstreamHttpError('UPSTREAM', data.error.message ?? 'TikTok rejected the video list request');
    for (const item of data.list ?? []) {
      videos.push({
        id: String(item.id ?? ''),
        title: typeof item.title === 'string' && item.title ? item.title : null,
        createTime: typeof item.create_time === 'number' ? new Date(item.create_time * 1000) : null,
        coverUrl: typeof item.cover_url === 'string' ? item.cover_url : null,
        viewCount: numberOr(item.view_count),
        likeCount: numberOr(item.like_count),
        commentCount: numberOr(item.comment_count),
        shareCount: numberOr(item.share_count),
      });
    }
    if (!data.has_more || !data.cursor || !data.list?.length) break;
    cursor = String(data.cursor);
  }
  return videos.filter((video) => video.id);
}

/** TikTok reports failures inside a 200 body — surface them as errors. */
function unwrap<T extends { data?: { error?: { code?: string; message?: string } }; error?: { code?: string; message?: string } }>(
  body: T,
): T {
  const failure = body.data?.error ?? body.error;
  if (failure) throw new UpstreamHttpError('UPSTREAM', failure.message ?? 'TikTok rejected the request', undefined, failure.code);
  return body;
}

function bearer(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

export function parseScopes(raw: string | undefined, fallback: readonly string[] | undefined): string[] {
  const scopes = (raw ?? '')
    .split(/[,\s]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);
  return scopes.length ? scopes : [...(fallback ?? [])];
}

function numberOr(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function secondsFromNow(seconds?: number): Date | null {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(Date.now() + seconds * 1000);
}

/** Empty env values (VAR=) count as unset. */
function nonEmpty(value: string | undefined): string {
  return value && value.trim() ? value.trim() : '';
}

function fallbackRedirect(baseUrl: string | undefined, path: string): string {
  return baseUrl ? `${baseUrl.replace(/\/+$/, '')}${path}` : '';
}
