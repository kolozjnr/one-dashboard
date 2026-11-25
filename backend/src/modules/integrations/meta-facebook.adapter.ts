import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { metaGet } from './meta-graph.client';
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

const GRAPH = 'https://graph.facebook.com/v27.0';

/**
 * Facebook Login for Pages (Graph API v27.0).
 *
 * Flow:
 *   1. /dialog/oauth            -> authorization code (scope below)
 *   2. /oauth/access_token?code -> short-lived user token
 *   3. grant_type=fb_exchange_token -> ~60-day user token (server-side only)
 *   4. /me/accounts             -> Pages the person manages (one account row
 *                                   per Page; one user may manage many Pages),
 *                                   each with its own Page access token
 *   5. /{page-id}?fields=instagram_business_account -> linked professional
 *                                   Instagram account, when eligible
 *
 * Re-authorization for Facebook is the same fb_exchange_token exchange while
 * the stored user token is still valid; Page tokens derived from a long-lived
 * user token do not expire on their own.
 */
@Injectable()
export class MetaFacebookAdapter implements SocialAdapter {
  readonly product: SocialProduct = 'facebook';
  readonly displayName = 'Facebook';

  private readonly appId: string;
  private readonly appSecret: string;
  private readonly redirect: string;

  constructor(config: ConfigService) {
    this.appId = nonEmpty(config.get<string>('META_APP_ID'));
    this.appSecret = nonEmpty(config.get<string>('META_APP_SECRET'));
    this.redirect = nonEmpty(config.get<string>('META_REDIRECT_URI'));
  }

  get configured(): boolean {
    return Boolean(this.appId && this.appSecret && this.redirect);
  }

  get redirectUri(): string {
    return this.redirect;
  }

  buildAuthorizeUrl(state: string): string {
    this.assertConfigured();
    const url = new URL(`${GRAPH}/dialog/oauth`);
    url.searchParams.set('client_id', this.appId);
    url.searchParams.set('redirect_uri', this.redirect);
    url.searchParams.set('response_type', 'code');
    // Facebook Login scopes only — never merged with instagram_business_*.
    url.searchParams.set('scope', SOCIAL_SCOPES.facebook.join(','));
    url.searchParams.set('state', state);
    return url.toString();
  }

  async exchangeCode(code: string): Promise<SocialToken> {
    this.assertConfigured();
    const shortLived = await metaGet<{ access_token?: string; expires_in?: number; error?: unknown }>(
      `${GRAPH}/oauth/access_token`,
      { client_id: this.appId, client_secret: this.appSecret, redirect_uri: this.redirect, code },
    );
    const shortToken = shortLived.access_token;
    if (!shortToken) {
      throw new IntegrationError('UPSTREAM_ERROR', 'Facebook did not return an access token. Please try again.', 502);
    }
    const scopes = await this.resolveScopes(shortToken);
    try {
      const longLived = await metaGet<{ access_token?: string; expires_in?: number }>(`${GRAPH}/oauth/access_token`, {
        grant_type: 'fb_exchange_token',
        client_id: this.appId,
        client_secret: this.appSecret,
        fb_exchange_token: shortToken,
      });
      if (longLived.access_token) {
        return { accessToken: longLived.access_token, expiresAt: secondsFromNow(longLived.expires_in), scopes };
      }
    } catch {
      // Keep the short-lived token; the connection still works for ~1 hour.
    }
    return { accessToken: shortToken, expiresAt: secondsFromNow(shortLived.expires_in), scopes };
  }

  /**
   * Bag-based refresh (SocialAdapter contract): re-running fb_exchange_token
   * while the stored user token is still valid yields another ~60-day user
   * token. An expired token cannot be refreshed — that raises NEEDS_REAUTH so
   * the account is surfaced for re-authorization instead of failing silently.
   */
  async refresh(bag: IntegrationCredentialBag): Promise<IntegrationCredentialBag> {
    const token = bag.userToken || bag.accessToken;
    if (!token) return bag;
    try {
      const exchanged = await metaGet<{ access_token?: string; expires_in?: number }>(`${GRAPH}/oauth/access_token`, {
        grant_type: 'fb_exchange_token',
        client_id: this.appId,
        client_secret: this.appSecret,
        fb_exchange_token: token,
      });
      if (!exchanged.access_token) {
        throw new MetaGraphError('AUTH', 'Facebook could not refresh the access token', 401);
      }
      const expiresAt = secondsFromNow(exchanged.expires_in);
      return {
        ...bag,
        userToken: exchanged.access_token,
        tokenExpiresAt: expiresAt ? expiresAt.toISOString() : '',
        tokenIssuedAt: new Date().toISOString(),
        scopes: (await this.resolveScopes(exchanged.access_token)).join(','),
      };
    } catch (error) {
      if (error instanceof MetaGraphError && error.indicatesRevocation) {
        throw new IntegrationError(
          'NEEDS_REAUTH',
          'Facebook no longer grants access to this account. Please reconnect it.',
          409,
        );
      }
      throw error;
    }
  }

  async discoverAccounts(userToken: string): Promise<DiscoveredAccount[]> {
    const pages = await metaGet<{
      data?: Array<{
        id?: string;
        name?: string;
        access_token?: string;
        tasks?: string[];
        category?: string;
      }>;
    }>(`${GRAPH}/me/accounts`, {
      fields: 'id,name,access_token,tasks,category',
      access_token: userToken,
    });

    const entries = pages.data ?? [];
    if (!entries.length) {
      throw new IntegrationError(
        'NO_ACCOUNTS',
        'No Facebook Pages were found for this account. Connect an account that manages a Page.',
        422,
      );
    }

    const accounts: DiscoveredAccount[] = [];
    for (const page of entries.slice(0, 50)) {
      if (!page.id || !page.access_token) continue;
      // Best effort: a Page connected to a professional Instagram account
      // exposes it here (requires pages_read_engagement). Pages without a
      // linked professional account simply carry null.
      let linkedInstagram: DiscoveredAccount['linkedInstagram'] = null;
      try {
        const detail = await metaGet<{ instagram_business_account?: { id?: string; username?: string } }>(
          `${GRAPH}/${page.id}`,
          { fields: 'instagram_business_account{id,username}', access_token: userToken },
        );
        if (detail.instagram_business_account?.id) {
          linkedInstagram = {
            id: detail.instagram_business_account.id,
            username: detail.instagram_business_account.username ?? '',
          };
        }
      } catch {
        // Not every Page has (or may read) a linked Instagram account.
      }
      accounts.push({
        providerAccountId: page.id,
        displayName: page.name ?? `Page ${page.id}`,
        kind: 'FACEBOOK_PAGE',
        username: null,
        profileUrl: `https://www.facebook.com/${page.id}`,
        tasks: page.tasks ?? [],
        linkedInstagram,
        accessToken: page.access_token,
        expiresAt: null, // Page tokens from a long-lived user token do not expire
      });
    }
    if (!accounts.length) {
      throw new IntegrationError('NO_ACCOUNTS', 'No Facebook Pages were found for this account.', 422);
    }
    return accounts;
  }

  /**
   * Granted scopes come from the token debug endpoint; when that is unavailable
   * we fall back to the set we requested (the dialog only grants a subset).
   */
  private async resolveScopes(token: string): Promise<string[]> {
    try {
      const debug = await metaGet<{ data?: { scopes?: string } }>('https://graph.facebook.com/v27.0/debug_token', {
        input_token: token,
        access_token: `${this.appId}|${this.appSecret}`,
      });
      const scopes = debug.data?.scopes;
      if (typeof scopes === 'string' && scopes.trim()) {
        return scopes.split(',').map((scope) => scope.trim()).filter(Boolean);
      }
    } catch {
      // Fall through to the requested scope list.
    }
    return [...SOCIAL_SCOPES.facebook];
  }

  private assertConfigured(): void {
    if (!this.configured) {
      throw new IntegrationError('NOT_CONFIGURED', 'Facebook login is not configured on this server.', 503);
    }
  }
}

function secondsFromNow(seconds?: number): Date | null {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(Date.now() + seconds * 1000);
}

/** Empty env values (VAR=) count as unset. */
function nonEmpty(value: string | undefined): string {
  return value && value.trim() ? value.trim() : '';
}
