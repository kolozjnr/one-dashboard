import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IntegrationError, UpstreamHttpError, type DiscoveredAccount, type IntegrationCredentialBag, type SocialAdapter, type SocialProduct, type SocialToken } from './integrations.types';
import { socialGet, socialPostForm } from './social-http.client';

/**
 * TikTok API for Business (business-api.tiktok.com) — a DISTINCT, separately
 * gated product from the TikTok Display API in tiktok.adapter.ts.
 *
 * Why separate: the Business API is advertiser analytics (impressions, spend,
 * video insights, watch funnels). It requires its own app in the TikTok for
 * Business developer portal, its own credentials, and an advertiser
 * authorizing that app — nothing about it is interchangeable with the Login
 * Kit / Display API. This module therefore:
 *   - keeps its own env vars (TIKTOK_BUSINESS_*) and provider row
 *     (`tiktok_business`), so Display and Business data can never be mixed in
 *     one account, and
 *   - NEVER serves Display API numbers as business analytics: if this adapter
 *     is not configured, the product reports NOT_CONFIGURED rather than
 *     falling back to profile/video counts.
 *
 * Endpoint note (documentation status): TikTok's Business docs are a
 * client-rendered portal that could not be read programmatically at
 * implementation time. Every endpoint below was verified by probing the live
 * API (method + auth behaviour + error codes), not by reading the portal:
 *   - POST /open_api/v1.3/oauth/token/            (405 on GET; 40002 on bad params)
 *   - GET  /open_api/v1.3/identity/get/           (40105 without Access-Token)
 *   - GET  /open_api/v1.3/advertiser/info/        (40105 without Access-Token)
 *   - GET  /open_api/v1.3/report/integrated/get/  (40105 without Access-Token)
 *   - https://ads.tiktok.com/marketing_api/auth   (200 authorization page,
 *     accepts app_id / state / redirect_uri / user_type=advertiser)
 * Re-verify parameter names against business-api.tiktok.com/portal/docs
 * before enabling this product in production (see backend/docs/
 * social-integrations.md).
 */
@Injectable()
export class TikTokBusinessAdapter implements SocialAdapter {
  readonly product: SocialProduct = 'tiktok_business';
  readonly displayName = 'TikTok for Business';

  private readonly appId: string;
  private readonly secret: string;
  private readonly redirect: string;

  constructor(config: ConfigService) {
    this.appId = nonEmpty(config.get<string>('TIKTOK_BUSINESS_APP_ID'));
    this.secret = nonEmpty(config.get<string>('TIKTOK_BUSINESS_SECRET'));
    // Shares the TikTok callback route; the signed state binds the product.
    this.redirect =
      nonEmpty(config.get<string>('TIKTOK_BUSINESS_REDIRECT_URI')) ||
      fallbackRedirect(config.get<string>('APP_BASE_URL'), '/auth/tiktok/callback');
  }

  get configured(): boolean {
    return Boolean(this.appId && this.secret && this.redirect);
  }

  get redirectUri(): string {
    return this.redirect;
  }

  buildAuthorizeUrl(state: string): string {
    this.assertConfigured();
    const url = new URL('https://ads.tiktok.com/marketing_api/auth');
    url.searchParams.set('app_id', this.appId);
    url.searchParams.set('state', state);
    url.searchParams.set('redirect_uri', this.redirect);
    // The advertiser picks which TikTok for Business account to authorize.
    url.searchParams.set('user_type', 'advertiser');
    return url.toString();
  }

  async exchangeCode(code: string): Promise<SocialToken> {
    this.assertConfigured();
    const body = await socialPostForm<TokenResponse>('https://business-api.tiktok.com/open_api/v1.3/oauth/token/', {
      app_id: this.appId,
      secret: this.secret,
      auth_code: code,
      grant_type: 'authorization_code',
    });
    if (!body.access_token) {
      throw new IntegrationError('UPSTREAM_ERROR', 'TikTok for Business did not return an access token. Please try again.', 502);
    }
    return {
      accessToken: body.access_token,
      expiresAt: secondsFromNow(body.expires_in),
      scopes: [],
      refreshToken: body.refresh_token ?? null,
      refreshTokenExpiresAt: secondsFromNow(body.refresh_token_expires_in),
    };
  }

  async refresh(bag: IntegrationCredentialBag): Promise<IntegrationCredentialBag> {
    const refreshToken = bag.refreshToken;
    if (!refreshToken) {
      throw new IntegrationError('NEEDS_REAUTH', 'TikTok for Business must be reconnected to keep syncing.', 409);
    }
    const body = await socialPostForm<TokenResponse>('https://business-api.tiktok.com/open_api/v1.3/oauth/token/', {
      app_id: this.appId,
      secret: this.secret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });
    if (!body.access_token) {
      throw new IntegrationError('NEEDS_REAUTH', 'TikTok for Business must be reconnected to keep syncing.', 409);
    }
    return {
      ...bag,
      accessToken: body.access_token,
      tokenExpiresAt: body.expires_in ? secondsFromNow(body.expires_in)!.toISOString() : '',
      tokenIssuedAt: new Date().toISOString(),
      ...(body.refresh_token ? { refreshToken: body.refresh_token } : {}),
      ...(body.open_id ? { openId: body.open_id } : {}),
    };
  }

  /**
   * Discovery: the advertiser identities this app may act on. The
   * authorization page grants a specific advertiser, and `identity/get`
   * returns the list the token can see.
   */
  async discoverAccounts(accessToken: string, bag?: IntegrationCredentialBag): Promise<DiscoveredAccount[]> {
    const body = await businessGet<{ data?: { list?: Array<IdentityRow> } }>(
      'https://business-api.tiktok.com/open_api/v1.3/identity/get/',
      accessToken,
    );
    const rows = body.data?.list ?? [];
    const advertiser = rows.find((row) => row.identity_type === 'AUTHED_ADVERTISER') ?? rows[0];
    const providerAccountId = advertiser?.identity_code || bag?.openId || '';
    if (!providerAccountId) {
      throw new IntegrationError(
        'NO_ACCOUNTS',
        'TikTok did not return an advertiser for this authorization. Authorize the app from a TikTok for Business advertiser account.',
        422,
      );
    }
    return [
      {
        providerAccountId: String(providerAccountId),
        displayName: advertiser?.name ? `${advertiser.name} (${advertiser.identity_code ?? providerAccountId})` : `Advertiser ${providerAccountId}`,
        kind: 'TIKTOK_BUSINESS_ADVERTISER',
        username: null,
        profileUrl: null,
        tasks: [],
        linkedInstagram: null,
        accessToken,
        expiresAt: null,
      },
    ];
  }

  private assertConfigured(): void {
    if (!this.configured) {
      throw new IntegrationError('NOT_CONFIGURED', 'TikTok for Business login is not configured on this server.', 503);
    }
  }
}

interface TokenResponse {
  code?: number;
  message?: string;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_token_expires_in?: number;
  open_id?: string;
  scope?: string;
}

interface IdentityRow {
  identity_type?: string;
  identity_code?: string;
  name?: string;
}

/** Business API GET with the `Access-Token` header (HTTP 200 + `code` body). */
async function businessGet<T>(
  url: string,
  token: string,
  params: Record<string, string | number | undefined> = {},
): Promise<T> {
  const body = await socialGet<T & { code?: number; message?: string }>(url, params, { 'Access-Token': token });
  const envelope = body as { code?: number; message?: string };
  if (typeof envelope.code === 'number' && envelope.code !== 0) {
    throw new UpstreamHttpError(
      envelope.code >= 40100 && envelope.code < 40200 ? 'AUTH' : 'UPSTREAM',
      envelope.message || 'TikTok for Business rejected the request',
      200,
      envelope.code,
    );
  }
  return body;
}

export interface BusinessReportParams {
  advertiserId: string;
  /** Comma-separated TikTok metric names (impressions, likes, ...). */
  metrics: string;
  since: Date;
  until: Date;
  page?: number;
}

/**
 * `GET /open_api/v1.3/report/integrated/get/` — the advertiser analytics
 * report. Rows are `{dimensions:{statistic_time}, metrics:{...}}`.
 */
export async function fetchTikTokBusinessReport(
  accessToken: string,
  params: BusinessReportParams,
): Promise<Array<{ dimensions: Record<string, string>; metrics: Record<string, number> }>> {
  const body = await businessGet<{
    data?: { list?: Array<{ dimensions?: Record<string, string>; metrics?: Record<string, number> }> };
    code?: number;
    message?: string;
  }>('https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/', accessToken, {
    advertiser_id: params.advertiserId,
    dimensions: 'statistic_time',
    metrics: params.metrics,
    start_date: yyyymmdd(params.since),
    end_date: yyyymmdd(params.until),
    page: params.page ?? 1,
    page_size: 100,
  });
  return (body.data?.list ?? []) as Array<{ dimensions: Record<string, string>; metrics: Record<string, number> }>;
}

function yyyymmdd(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
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
