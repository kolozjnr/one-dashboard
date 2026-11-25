import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { metaGet, metaPostForm } from './meta-graph.client';
import {
  SOCIAL_SCOPES,
  IntegrationError,
  MetaGraphError,
  type DiscoveredAccount,
  type IntegrationCredentialBag,
  type SocialAdapter,
  type SocialProduct,
  type SocialToken,
} from './integrations.types';

/**
 * Instagram API with Instagram Login (Business Login for Instagram).
 *
 * Flow (verified against Meta's current docs, Graph API v27.0):
 *   1. https://www.instagram.com/oauth/authorize        -> authorization code
 *   2. POST  https://api.instagram.com/oauth/access_token -> short-lived token
 *   3. GET   https://graph.instagram.com/access_token     -> 60-day token
 *   4. GET   https://graph.instagram.com/refresh_access_token -> +60 days
 *      (refresh requires a token that is >= 24h old, still valid, and the
 *      `instagram_business_basic` grant)
 *
 * Eligible accounts: Instagram professional accounts (Business or Creator).
 * Personal accounts are rejected at discovery — no professional analytics are
 * offered for them.
 */
@Injectable()
export class MetaInstagramAdapter implements SocialAdapter {
  readonly product: SocialProduct = 'instagram';
  readonly displayName = 'Instagram';

  private readonly appId: string;
  private readonly appSecret: string;
  private readonly redirect: string;

  constructor(config: ConfigService) {
    this.appId = nonEmpty(config.get<string>('META_INSTAGRAM_APP_ID'));
    this.appSecret = nonEmpty(config.get<string>('META_INSTAGRAM_APP_SECRET'));
    // The same callback route serves both Meta products (the signed state says
    // which), so the Instagram redirect URI falls back to the shared one.
    this.redirect = nonEmpty(config.get<string>('META_INSTAGRAM_REDIRECT_URI')) || nonEmpty(config.get<string>('META_REDIRECT_URI'));
  }

  get configured(): boolean {
    return Boolean(this.appId && this.appSecret && this.redirect);
  }

  get redirectUri(): string {
    return this.redirect;
  }

  buildAuthorizeUrl(state: string): string {
    this.assertConfigured();
    const url = new URL('https://www.instagram.com/oauth/authorize');
    url.searchParams.set('client_id', this.appId);
    url.searchParams.set('redirect_uri', this.redirect);
    url.searchParams.set('response_type', 'code');
    // Comma-separated list per the Business Login reference. Only the two
    // instagram_business_* scopes this flow needs — never Facebook Login scopes.
    url.searchParams.set('scope', SOCIAL_SCOPES.instagram.join(','));
    url.searchParams.set('state', state);
    return url.toString();
  }

  async exchangeCode(code: string): Promise<SocialToken> {
    this.assertConfigured();
    const shortLived = await metaPostForm<{ access_token?: string; user_id?: string; permissions?: string; error_type?: string; error_message?: string }>(
      'https://api.instagram.com/oauth/access_token',
      {
        client_id: this.appId,
        client_secret: this.appSecret,
        grant_type: 'authorization_code',
        redirect_uri: this.redirect,
        code,
      },
    );
    const shortToken = shortLived.access_token;
    if (!shortToken) {
      throw new IntegrationError('UPSTREAM_ERROR', 'Instagram did not return an access token. Please try again.', 502);
    }
    const scopes = (shortLived.permissions ?? SOCIAL_SCOPES.instagram.join(','))
      .split(',')
      .map((scope) => scope.trim())
      .filter(Boolean);

    // Exchange for the 60-day token server-side (it embeds the app secret).
    // If the exchange fails the short-lived token still works for ~1 hour, so
    // the connection succeeds either way.
    try {
      const longLived = await metaGet<{ access_token?: string; expires_in?: number }>(
        'https://graph.instagram.com/access_token',
        { grant_type: 'ig_exchange_token', client_secret: this.appSecret, access_token: shortToken },
      );
      if (longLived.access_token) {
        return {
          accessToken: longLived.access_token,
          expiresAt: secondsFromNow(longLived.expires_in),
          scopes,
        };
      }
    } catch {
      // Fall through to the short-lived token.
    }
    return { accessToken: shortToken, expiresAt: secondsFromNow(3600), scopes };
  }

  /**
   * Bag-based refresh (SocialAdapter contract). Meta's own rules live here:
   * Instagram only exchanges a token that is at least 24 hours old, still
   * valid, and carries `instagram_business_basic`. A token too young to be
   * exchanged returns the bag unchanged — the caller retries on the next sync.
   */
  async refresh(bag: IntegrationCredentialBag): Promise<IntegrationCredentialBag> {
    const token = bag.accessToken;
    const issuedAt = bag.tokenIssuedAt ? Date.parse(bag.tokenIssuedAt) : NaN;
    if (!token || (Number.isFinite(issuedAt) && Date.now() - issuedAt < 24 * 60 * 60 * 1000)) return bag;
    try {
      const refreshed = await metaGet<{ access_token?: string; expires_in?: number }>(
        'https://graph.instagram.com/refresh_access_token',
        { grant_type: 'ig_refresh_token', access_token: token },
      );
      if (!refreshed.access_token) {
        throw new MetaGraphError('AUTH', 'Instagram could not refresh the access token', 401);
      }
      const expiresAt = secondsFromNow(refreshed.expires_in);
      return {
        ...bag,
        accessToken: refreshed.access_token,
        tokenExpiresAt: expiresAt ? expiresAt.toISOString() : '',
        tokenIssuedAt: new Date().toISOString(),
        scopes: SOCIAL_SCOPES.instagram.join(','), // refresh requires instagram_business_basic
      };
    } catch (error) {
      if (error instanceof MetaGraphError && error.indicatesRevocation) {
        throw new IntegrationError(
          'NEEDS_REAUTH',
          'Instagram no longer grants access to this account. Please reconnect it.',
          409,
        );
      }
      throw error;
    }
  }

  async discoverAccounts(token: string): Promise<DiscoveredAccount[]> {
    const profile = await readProfile(token);
    const accountType = String(profile.account_type ?? '');
    // The login flow only admits professional accounts, and the profile field
    // reports Business / Media_Creator for them. Reject an explicit non-
    // professional type; tolerate a missing field rather than blocking a
    // legitimate professional account.
    if (accountType && accountType !== 'Business' && accountType !== 'Media_Creator') {
      throw new IntegrationError(
        'UNSUPPORTED_ACCOUNT',
        'Only Instagram professional accounts (Business or Creator) can be connected. Personal accounts do not expose insights.',
        422,
      );
    }
    const username = String(profile.username ?? '');
    return [
      {
        providerAccountId: String(profile.user_id ?? profile.id ?? ''),
        displayName: username ? `@${username}` : 'Instagram account',
        kind: 'INSTAGRAM_ACCOUNT',
        username: username || null,
        profileUrl: username ? `https://www.instagram.com/${username}/` : null,
        tasks: [],
        linkedInstagram: null,
        accountType,
        accessToken: token,
        expiresAt: null, // carried by the token bag, not per-account
      },
    ];
  }

  private assertConfigured(): void {
    if (!this.configured) {
      throw new IntegrationError(
        'NOT_CONFIGURED',
        'Instagram login is not configured on this server.',
        503,
      );
    }
  }
}

interface InstagramProfile {
  id?: string;
  user_id?: string;
  username?: string;
  account_type?: string;
  followers_count?: number;
  data?: InstagramProfile[];
}

/** `/me` has been documented both as an object and as a `{data:[...]}` array. */
export async function readProfile(token: string): Promise<InstagramProfile> {
  const body = await metaGet<InstagramProfile>('https://graph.instagram.com/v27.0/me', {
    fields: 'user_id,username,account_type,name,profile_picture_url,followers_count,media_count',
    access_token: token,
  });
  if (Array.isArray(body.data) && body.data.length) return body.data[0];
  return body;
}

function secondsFromNow(seconds?: number): Date | null {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(Date.now() + seconds * 1000);
}

/** Empty env values (VAR=) count as unset. */
function nonEmpty(value: string | undefined): string {
  return value && value.trim() ? value.trim() : '';
}
