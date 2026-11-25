import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TenantAccessService } from '../permissions/tenant-access.service';
import {
  SOCIAL_PROVIDER_KEYS,
  SOCIAL_PROVIDER_LABELS,
  SOCIAL_PROVIDER_KEY_LIST,
  SOCIAL_SCOPES,
  IntegrationError,
  indicatesRevocation,
  isSocialProduct,
  type IntegrationCredentialBag,
  type SocialAdapter,
  type SocialProduct,
} from './integrations.types';
import { createOAuthState, verifyOAuthState, type OAuthStatePayload } from './oauth.state';
import { IntegrationsVaultService } from './integrations-vault.service';
import { MetaFacebookAdapter } from './meta-facebook.adapter';
import { MetaInstagramAdapter } from './meta-instagram.adapter';
import { TikTokAdapter } from './tiktok.adapter';
import { TikTokBusinessAdapter } from './tiktok-business.adapter';
import { XAdapter } from './x.adapter';
import { MetaInsightsService, type InsightsRange, type InsightsResult } from './meta-insights.service';
import { SocialInsightsService } from './social-insights.service';

const REFRESH_HEAD_START_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_RANGE_DAYS = 30;
const MAX_RANGE_DAYS = 90;

/** Products whose metrics come from the Meta insights service. */
const META_PRODUCTS: readonly SocialProduct[] = ['instagram', 'facebook'];

export interface AuthorizeStart {
  url: string;
  product: SocialProduct;
  scopes: string[];
}

export interface AccountSummary {
  id: string;
  product: SocialProduct;
  providerAccountId: string;
  displayName: string;
  status: string;
  /** Scopes the person granted — tracked and surfaced, never the token itself. */
  scopes: string[];
  grantedAt: string | null;
  tokenExpiresAt: string | null;
  lastSyncedAt: string | null;
  tasks: string[];
  accountType: string | null;
  linkedInstagram: { id: string; username: string } | null;
}

export interface CallbackOutcome {
  status: 'connected' | 'denied' | 'error';
  workspaceId?: string;
  redirectUrl: string;
  message?: string;
  code?: string;
  accounts?: AccountSummary[];
}

@Injectable()
export class IntegrationsService {
  private readonly adapters: Record<SocialProduct, SocialAdapter>;
  private readonly jwtSecret: string;
  private readonly baseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly vault: IntegrationsVaultService,
    private readonly access: TenantAccessService,
    private readonly audit: AuditService,
    private readonly insights: MetaInsightsService,
    private readonly socialInsights: SocialInsightsService,
    instagram: MetaInstagramAdapter,
    facebook: MetaFacebookAdapter,
    tiktok: TikTokAdapter,
    tiktokBusiness: TikTokBusinessAdapter,
    x: XAdapter,
    config: ConfigService,
  ) {
    this.adapters = { instagram, facebook, tiktok, tiktok_business: tiktokBusiness, x };
    this.jwtSecret = config.getOrThrow<string>('JWT_SECRET');
    this.baseUrl = config.getOrThrow<string>('APP_BASE_URL').replace(/\/+$/, '');
  }

  /** Which products this deployment can actually start a login for. */
  availableProducts(): Array<{
    product: SocialProduct;
    label: string;
    configured: boolean;
    scopes: string[];
    /** Must be registered verbatim with the provider — shown in the UI. */
    redirectUri: string;
  }> {
    return (Object.keys(this.adapters) as SocialProduct[]).map((product) => ({
      product,
      label: SOCIAL_PROVIDER_LABELS[product],
      configured: this.adapters[product].configured,
      scopes: [...SOCIAL_SCOPES[product]],
      redirectUri: this.adapters[product].redirectUri,
    }));
  }

  // --- authorization ---------------------------------------------------------

  /** Step 1: build the provider authorization URL with a signed `state`. */
  async authorize(actor: { userId: string }, workspaceId: string, product: SocialProduct): Promise<AuthorizeStart> {
    await this.access.requireWorkspacePermission(actor, workspaceId, 'integrations.connect');
    const adapter = this.adapters[product];
    if (!adapter.configured) {
      throw new IntegrationError('NOT_CONFIGURED', `${adapter.displayName} login is not configured on this server.`, 503);
    }
    // Flows that need extra material (X's PKCE verifier) bind it into the
    // signed state so the callback can prove it started this attempt.
    const options = adapter.prepareAuthorization?.() ?? {};
    const state = createOAuthState(
      { product, workspaceId, userId: actor.userId, nonce: randomUUID(), codeVerifier: options.codeVerifier },
      this.jwtSecret,
    );
    return { url: adapter.buildAuthorizeUrl(state, options), product, scopes: [...SOCIAL_SCOPES[product]] };
  }

  /**
   * Step 2: the redirect target. `@Public()` — the browser arrives here from
   * the provider without going through our session, so the signed state (not
   * the cookie) proves which workspace/user started the flow. Expected
   * failures are returned as an outcome with a safe redirect URL; the Next.js
   * routes at /auth/{meta,tiktok,x}/callback turn it into the browser
   * redirect.
   */
  async handleCallback(params: {
    code?: string;
    state?: string;
    error?: string;
    error_description?: string;
  }): Promise<CallbackOutcome> {
    let payload: OAuthStatePayload;
    try {
      payload = verifyOAuthState(params.state, this.jwtSecret);
    } catch (error) {
      return this.errorOutcome('STATE_INVALID', error instanceof Error ? error.message : 'Invalid state');
    }

    const label = SOCIAL_PROVIDER_LABELS[payload.p];
    if (params.error) {
      // The person denied the request (error=access_denied) or the provider
      // reported a failure — either way no token exists and nothing was stored.
      const denied = params.error === 'access_denied';
      return {
        status: denied ? 'denied' : 'error',
        workspaceId: payload.w,
        code: denied ? 'ACCESS_DENIED' : 'UPSTREAM_ERROR',
        message: denied ? 'Authorization was cancelled.' : `${label} did not complete the authorization.`,
        redirectUrl: `${this.baseUrl}/connection?socialOAuth=${denied ? 'denied' : 'error'}&product=${payload.p}&code=${denied ? 'ACCESS_DENIED' : 'UPSTREAM_ERROR'}`,
      };
    }

    if (!params.code) {
      return this.errorOutcome('UPSTREAM_ERROR', `${label} did not return an authorization code.`);
    }

    const adapter = this.adapters[payload.p];
    try {
      const token = await adapter.exchangeCode(params.code, payload.cv ? { codeVerifier: payload.cv } : undefined);
      const discovered = await adapter.discoverAccounts(token.accessToken, {
        accessToken: token.accessToken,
        ...(token.refreshToken ? { refreshToken: token.refreshToken } : {}),
      });
      const provider = await this.ensureProvider(payload.p);

      const now = new Date();
      const scopes = token.scopes.length ? token.scopes : [...SOCIAL_SCOPES[payload.p]];
      for (const account of discovered) {
        const bag: IntegrationCredentialBag = {
          accessToken: account.accessToken,
          userToken: token.accessToken,
          tokenExpiresAt: token.expiresAt?.toISOString() ?? '',
          tokenIssuedAt: now.toISOString(),
          grantedAt: now.toISOString(),
          scopes: scopes.join(','),
          ...(token.refreshToken ? { refreshToken: token.refreshToken } : {}),
          ...(token.refreshTokenExpiresAt ? { refreshTokenExpiresAt: token.refreshTokenExpiresAt.toISOString() } : {}),
          ...(payload.p === 'facebook'
            ? {
                pageTasks: account.tasks.join(','),
                ...(account.linkedInstagram
                  ? { linkedIgId: account.linkedInstagram.id, linkedIgUsername: account.linkedInstagram.username }
                  : {}),
              }
            : { ...(account.accountType ? { accountType: account.accountType } : {}) }),
        };
        await this.prisma.connectedAccount.upsert({
          where: {
            workspaceId_providerId_providerAccountId: {
              workspaceId: payload.w,
              providerId: provider.id,
              providerAccountId: account.providerAccountId,
            },
          },
          update: {
            displayName: account.displayName,
            status: 'CONNECTED',
            credentialsCiphertext: this.vault.seal(bag),
            credentialsExpiresAt: token.expiresAt,
            deletedAt: null,
            lastSyncedAt: null,
          },
          create: {
            workspaceId: payload.w,
            providerId: provider.id,
            providerAccountId: account.providerAccountId,
            displayName: account.displayName,
            status: 'CONNECTED',
            credentialsCiphertext: this.vault.seal(bag),
            credentialsExpiresAt: token.expiresAt,
          },
        });
      }

      await this.audit.record({
        action: 'integration.connected',
        targetType: 'integration',
        targetId: provider.id,
        workspaceId: payload.w,
        actorId: payload.u,
        metadata: {
          product: payload.p,
          providerAccountIds: discovered.map((account) => account.providerAccountId),
          scopes,
        },
      });

      const summaries = await this.summariesForWorkspace(payload.w, payload.p);
      return {
        status: 'connected',
        workspaceId: payload.w,
        redirectUrl: `${this.baseUrl}/connection?socialOAuth=connected&product=${payload.p}`,
        accounts: summaries,
      };
    } catch (error) {
      if (error instanceof IntegrationError) return this.errorOutcome(error.code, error.message, payload.w);
      if (indicatesRevocation(error)) {
        return this.errorOutcome('REVOKED_PERMISSION', `${label} rejected the authorization. Please try again.`, payload.w);
      }
      return this.errorOutcome('UPSTREAM_ERROR', 'The connection could not be completed. Please try again.', payload.w);
    }
  }

  private errorOutcome(code: string, message: string, workspaceId?: string): CallbackOutcome {
    return {
      status: 'error',
      workspaceId,
      code,
      message,
      redirectUrl: `${this.baseUrl}/connection?socialOAuth=error&code=${encodeURIComponent(code)}`,
    };
  }

  // --- reading / disconnecting ----------------------------------------------

  async list(actor: { userId: string }, workspaceId: string) {
    await this.access.requireWorkspacePermission(actor, workspaceId, 'integrations.view');
    return { accounts: await this.summariesForWorkspace(workspaceId), available: this.availableProducts() };
  }

  async disconnect(actor: { userId: string }, workspaceId: string, accountId: string) {
    await this.access.requireWorkspacePermission(actor, workspaceId, 'integrations.disconnect');
    const account = await this.findSocialAccount(workspaceId, accountId);
    // Tokens are destroyed on disconnect — not just hidden behind a flag.
    await this.prisma.connectedAccount.update({
      where: { id: account.id },
      data: {
        status: 'DISCONNECTED',
        deletedAt: new Date(),
        credentialsCiphertext: null,
        credentialsExpiresAt: null,
      },
    });
    await this.audit.record({
      action: 'integration.disconnected',
      targetType: 'integration',
      targetId: account.providerId,
      workspaceId,
      actorId: actor.userId,
      metadata: { product: account.provider.key, providerAccountId: account.providerAccountId },
    });
    return { id: account.id, status: 'DISCONNECTED' };
  }

  // --- metrics ---------------------------------------------------------------

  async syncInsights(
    actor: { userId: string },
    workspaceId: string,
    accountId: string,
    query: { since?: string; until?: string; metrics?: string },
  ): Promise<InsightsResult & { requested?: string[] }> {
    await this.access.requireWorkspacePermission(actor, workspaceId, 'analytics.view');
    const account = await this.findSocialAccount(workspaceId, accountId);
    const product = account.provider.key as SocialProduct;
    if (!isSocialProduct(product)) {
      throw new IntegrationError('UPSTREAM_ERROR', 'This account is not a social connection.', 400);
    }

    const bag = this.vault.open(account.credentialsCiphertext);
    if (!bag.accessToken && !bag.userToken) {
      throw new IntegrationError('NEEDS_REAUTH', 'This account must be reconnected before syncing.', 409);
    }

    let credentialsChanged = false;
    try {
      const refreshed = await this.ensureFreshToken(product, bag);
      if (refreshed !== bag) {
        credentialsChanged = true;
        Object.assign(bag, refreshed);
      }
    } catch (error) {
      if (error instanceof IntegrationError && error.code === 'NEEDS_REAUTH') {
        await this.markNeedsReauth(account.id);
      }
      throw error;
    }

    if (credentialsChanged) {
      await this.prisma.connectedAccount.update({
        where: { id: account.id },
        data: {
          credentialsCiphertext: this.vault.seal(bag),
          credentialsExpiresAt: bag.tokenExpiresAt ? new Date(bag.tokenExpiresAt) : null,
        },
      });
    }

    const range = resolveRange(query.since, query.until);
    const isMeta = META_PRODUCTS.includes(product);
    const token = isMeta ? (product === 'facebook' ? bag.accessToken || bag.userToken : bag.accessToken) : bag.accessToken;
    try {
      const result = isMeta
        ? await this.insights.syncAccount(
            {
              id: account.id,
              workspaceId: account.workspaceId,
              providerId: account.providerId,
              providerAccountId: account.providerAccountId,
              displayName: account.displayName,
              product,
            },
            token,
            range,
          )
        : await this.socialInsights.syncAccount(
            {
              id: account.id,
              workspaceId: account.workspaceId,
              providerId: account.providerId,
              providerAccountId: account.providerAccountId,
              displayName: account.displayName,
              product,
            },
            token,
            range,
          );
      if (account.status === 'NEEDS_REAUTH') {
        await this.prisma.connectedAccount.update({ where: { id: account.id }, data: { status: 'CONNECTED' } });
      }
      const requested = parseRequestedMetrics(query.metrics);
      if (!requested) return result;
      const wanted = new Set(requested);
      return {
        ...result,
        metrics: result.metrics.filter((metric) => wanted.has(metric.key)),
        unsupported: result.unsupported.filter((metric) => wanted.has(metric.key)),
        requested,
      };
    } catch (error) {
      const revocation =
        (error instanceof IntegrationError && (error.code === 'REVOKED_PERMISSION' || error.code === 'NEEDS_REAUTH')) ||
        indicatesRevocation(error);
      if (revocation) await this.markNeedsReauth(account.id);
      throw error;
    }
  }

  // --- helpers ---------------------------------------------------------------

  private async ensureProvider(product: SocialProduct) {
    const key = SOCIAL_PROVIDER_KEYS[product];
    return this.prisma.integrationProvider.upsert({
      where: { key },
      update: {},
      create: {
        key,
        name: SOCIAL_PROVIDER_LABELS[product],
        category: 'Social',
        isEnabled: true,
        config: { flow: flowName(product), scopes: [...SOCIAL_SCOPES[product]] },
      },
    });
  }

  private async findSocialAccount(workspaceId: string, accountId: string) {
    const account = await this.prisma.connectedAccount.findFirst({
      where: { id: accountId, workspaceId, deletedAt: null, provider: { key: { in: [...SOCIAL_PROVIDER_KEY_LIST] } } },
      include: { provider: { select: { key: true } } },
    });
    if (!account) throw new IntegrationError('UPSTREAM_ERROR', 'Connected account not found.', 404);
    return account;
  }

  private async summariesForWorkspace(workspaceId: string, product?: SocialProduct): Promise<AccountSummary[]> {
    const rows = await this.prisma.connectedAccount.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        status: { not: 'DISCONNECTED' },
        provider: { key: product ? SOCIAL_PROVIDER_KEYS[product] : { in: [...SOCIAL_PROVIDER_KEY_LIST] } },
      },
      include: { provider: { select: { key: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => {
      const bag = this.vault.open(row.credentialsCiphertext);
      const linkedId = bag.linkedIgId;
      const linkedUsername = bag.linkedIgUsername;
      return {
        id: row.id,
        product: row.provider.key as SocialProduct,
        providerAccountId: row.providerAccountId,
        displayName: row.displayName,
        status: row.status,
        scopes: bag.scopes ? bag.scopes.split(',').filter(Boolean) : [],
        grantedAt: bag.grantedAt || null,
        tokenExpiresAt: bag.tokenExpiresAt || null,
        lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
        tasks: bag.pageTasks ? bag.pageTasks.split(',').filter(Boolean) : [],
        accountType: bag.accountType || null,
        linkedInstagram: linkedId ? { id: linkedId, username: linkedUsername ?? '' } : null,
      };
    });
  }

  /**
   * Proactive token maintenance (handle expiration / refresh where supported).
   * Every adapter implements `refresh(bag)` with its own provider rules —
   * Instagram's 24-hour rule, Facebook's fb_exchange_token re-run, TikTok's
   * and X's rotating refresh tokens. Returns a NEW bag when something changed,
   * the same object otherwise. A revoked/expired token raises NEEDS_REAUTH;
   * transient failures keep the current token (it may still be valid).
   */
  private async ensureFreshToken(product: SocialProduct, bag: IntegrationCredentialBag): Promise<IntegrationCredentialBag> {
    const expiresAt = bag.tokenExpiresAt ? Date.parse(bag.tokenExpiresAt) : NaN;
    if (!Number.isFinite(expiresAt)) return bag;
    if (expiresAt - Date.now() > REFRESH_HEAD_START_MS) return bag;

    const adapter = this.adapters[product];
    if (!bag.accessToken && !bag.userToken && !bag.refreshToken) return bag;
    try {
      return await adapter.refresh(bag);
    } catch (error) {
      if (error instanceof IntegrationError && error.code === 'NEEDS_REAUTH') throw error;
      if (indicatesRevocation(error)) {
        throw new IntegrationError(
          'NEEDS_REAUTH',
          `${SOCIAL_PROVIDER_LABELS[product]} no longer grants access to this account. Please reconnect it.`,
          409,
        );
      }
      // Transient failure: keep using the current token; it may still be valid.
      return bag;
    }
  }

  private async markNeedsReauth(accountId: string): Promise<void> {
    await this.prisma.connectedAccount.updateMany({
      where: { id: accountId, status: { not: 'DISCONNECTED' } },
      data: { status: 'NEEDS_REAUTH' },
    });
  }
}

function flowName(product: SocialProduct): string {
  switch (product) {
    case 'instagram':
      return 'instagram_login';
    case 'facebook':
      return 'facebook_login';
    case 'tiktok':
      return 'tiktok_login_kit_display';
    case 'tiktok_business':
      return 'tiktok_business_advertiser';
    case 'x':
    default:
      return 'x_oauth2_pkce';
  }
}

function resolveRange(since?: string, until?: string): InsightsRange {
  const end = until && !Number.isNaN(Date.parse(until)) ? new Date(until) : new Date();
  let start =
    since && !Number.isNaN(Date.parse(since))
      ? new Date(since)
      : new Date(end.getTime() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000);
  const maxStart = new Date(end.getTime() - MAX_RANGE_DAYS * 24 * 60 * 60 * 1000);
  if (start < maxStart) start = maxStart;
  if (start > end) start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  return { since: start, until: end };
}

function parseRequestedMetrics(raw?: string): string[] | null {
  if (!raw) return null;
  const keys = raw
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean);
  return keys.length ? keys : null;
}
