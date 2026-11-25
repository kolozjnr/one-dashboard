// Social integration contract (Instagram, Facebook, TikTok, TikTok for
// Business, X). Mirrors the payment-gateway pattern: controllers and the
// orchestrating service speak only this vocabulary, and only the adapters
// below know provider host names, endpoints or scope names.
//
// The products intentionally keep SEPARATE permission sets. Instagram Login
// (`instagram_business_*` on graph.instagram.com), Facebook Login
// (`pages_*` / `read_insights` on graph.facebook.com), the TikTok Display API
// (`user.info.*` / `video.list` on open.tiktokapis.com), the TikTok API for
// Business (advertiser-authorized `Access-Token` on business-api.tiktok.com)
// and X OAuth 2.0 (`tweet.read` / `users.read` / `offline.access`) are
// different API flows with different app-review requirements — scopes are
// never combined across products.
export const SOCIAL_PRODUCTS = ['instagram', 'facebook', 'tiktok', 'tiktok_business', 'x'] as const;

export type SocialProduct = (typeof SOCIAL_PRODUCTS)[number];

export function isSocialProduct(value: string): value is SocialProduct {
  return (SOCIAL_PRODUCTS as readonly string[]).includes(value);
}

/**
 * Minimal scope sets for each flow. Requested verbatim from the person
 * connecting — never merged across products, never expanded "just in case".
 */
export const SOCIAL_SCOPES: Record<SocialProduct, readonly string[]> = {
  // Instagram API with Instagram Login — graph.instagram.com
  instagram: ['instagram_business_basic', 'instagram_business_manage_insights'],
  // Facebook Login for Pages — graph.facebook.com
  facebook: ['pages_show_list', 'pages_read_engagement', 'read_insights'],
  // TikTok Login Kit + Display API — open.tiktokapis.com (comma-separated).
  // Basic profile, profile stats and the user's video list only: the Display
  // API carries NO advertising or content analytics, so nothing here can ever
  // be reported as business analytics (see tiktok_business below).
  tiktok: ['user.info.basic', 'user.info.profile', 'user.info.stats', 'video.list'],
  // TikTok API for Business has no OAuth scope list: the advertiser grants
  // account access on ads.tiktok.com/marketing_api/auth and every call is
  // authorized by the resulting Access-Token header.
  tiktok_business: [],
  // X OAuth 2.0 (PKCE). `follows.read` is deliberately NOT requested — this
  // module never calls a follower/following endpoint; add it here (and only
  // here) when such a feature lands.
  x: ['users.read', 'tweet.read', 'offline.access'],
};

/** IntegrationProvider.key used for each product's ConnectedAccount rows. */
export const SOCIAL_PROVIDER_KEYS: Record<SocialProduct, string> = {
  instagram: 'instagram',
  facebook: 'facebook',
  tiktok: 'tiktok',
  tiktok_business: 'tiktok_business',
  x: 'x',
};

/** Every provider key this module owns, for workspace-wide queries. */
export const SOCIAL_PROVIDER_KEY_LIST: readonly string[] = Object.values(SOCIAL_PROVIDER_KEYS);

export const SOCIAL_PROVIDER_LABELS: Record<SocialProduct, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  tiktok_business: 'TikTok for Business',
  x: 'X',
};

/** Decrypted credential bag (all values are strings once sealed as JSON). */
export type IntegrationCredentialBag = Record<string, string>;

export interface SocialToken {
  accessToken: string;
  /** null = provider reports a non-expiring token (Facebook Page tokens). */
  expiresAt: Date | null;
  /** Scopes the person actually granted, as reported by the provider. */
  scopes: string[];
  /** Rotating refresh token (TikTok, X); absent when the provider has none. */
  refreshToken?: string | null;
  refreshTokenExpiresAt?: Date | null;
}

export type SocialAccountKind =
  | 'INSTAGRAM_ACCOUNT'
  | 'FACEBOOK_PAGE'
  | 'TIKTOK_ACCOUNT'
  | 'TIKTOK_BUSINESS_ADVERTISER'
  | 'X_ACCOUNT';

export interface DiscoveredAccount {
  /** Provider's stable id: IG user id, Facebook Page id, TikTok open_id, ... */
  providerAccountId: string;
  displayName: string;
  kind: SocialAccountKind;
  username: string | null;
  profileUrl: string | null;
  /** Page tasks the person holds (ANALYZE, CREATE_CONTENT, ...); empty otherwise. */
  tasks: string[];
  /** Professional Instagram account linked to a Facebook Page, when eligible. */
  linkedInstagram: { id: string; username: string } | null;
  /** Instagram account_type (Business / Media_Creator) when known. */
  accountType?: string;
  /** Token to use for this account's API calls (Page token for Facebook). */
  accessToken: string;
  expiresAt: Date | null;
}

/** Extra material some flows must carry through the signed `state`. */
export interface AuthorizeOptions {
  /** PKCE code_verifier (X OAuth 2.0); bound into the signed state. */
  codeVerifier?: string;
}

export interface SocialAdapter {
  readonly product: SocialProduct;
  readonly displayName: string;
  /** True when the required client id/secret/redirect env vars are present. */
  readonly configured: boolean;
  /** Absolute redirect URI registered with the provider for this flow. */
  readonly redirectUri: string;
  /** Optional PKCE/extra material to bind into the signed state. */
  prepareAuthorization?(): AuthorizeOptions;
  buildAuthorizeUrl(state: string, options?: AuthorizeOptions): string;
  exchangeCode(code: string, options?: AuthorizeOptions): Promise<SocialToken>;
  /**
   * Proactive refresh from the stored credential bag. Rotating providers
   * (TikTok, X) MUST return the new refresh token in the returned bag.
   * Throws IntegrationError NEEDS_REAUTH when the token can no longer be
   * refreshed; other failures are treated as transient by the caller.
   */
  refresh(bag: IntegrationCredentialBag): Promise<IntegrationCredentialBag>;
  discoverAccounts(accessToken: string, bag?: IntegrationCredentialBag): Promise<DiscoveredAccount[]>;
}

/**
 * Integration-level failure. `message` is always safe to surface to the person
 * connecting: it never contains tokens, app secrets or raw provider payloads.
 */
export class IntegrationError extends Error {
  constructor(
    readonly code:
      | 'NOT_CONFIGURED'
      | 'STATE_INVALID'
      | 'ACCESS_DENIED'
      | 'UPSTREAM_ERROR'
      | 'BAD_RESPONSE'
      | 'NO_ACCOUNTS'
      | 'UNSUPPORTED_ACCOUNT'
      | 'REVOKED_PERMISSION'
      | 'NEEDS_REAUTH',
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = 'IntegrationError';
  }
}

/** Provider-facing Graph/OAuth failure, normalized by meta-graph.client. */
export class MetaGraphError extends Error {
  constructor(
    readonly kind: 'AUTH' | 'RATE_LIMIT' | 'UPSTREAM' | 'BAD_RESPONSE',
    message: string,
    readonly httpStatus?: number,
    readonly graphCode?: number,
    readonly graphSubcode?: number,
  ) {
    super(message);
    this.name = 'MetaGraphError';
  }

  /**
   * True when the provider says the token or its permissions are gone
   * (revoked, expired or invalidated) — the account needs re-authorization.
   * Codes verified against Meta's error reference: 190/458, 190/463,
   * 190/467, 190/490 (token problems), 10/102/200 (permission or session loss).
   */
  get indicatesRevocation(): boolean {
    if (this.kind !== 'AUTH') return false;
    if (this.graphCode === 190 && [458, 463, 467, 490].includes(this.graphSubcode ?? -1)) return true;
    return [10, 102, 200].includes(this.graphCode ?? -1);
  }
}

/**
 * Provider-facing failure for the non-Meta HTTP clients (TikTok, X). Same
 * four kinds as MetaGraphError so the orchestrating service can treat every
 * provider uniformly, plus the provider's own error code when it has one.
 */
export class UpstreamHttpError extends Error {
  constructor(
    readonly kind: 'AUTH' | 'RATE_LIMIT' | 'UPSTREAM' | 'BAD_RESPONSE',
    message: string,
    readonly httpStatus?: number,
    readonly providerCode?: string | number,
  ) {
    super(message);
    this.name = 'UpstreamHttpError';
  }

  /** An AUTH failure means the token is gone — re-authorization required. */
  get indicatesRevocation(): boolean {
    return this.kind === 'AUTH';
  }
}

/** True when *any* provider says the stored grant is gone. */
export function indicatesRevocation(error: unknown): boolean {
  if (error instanceof MetaGraphError) return error.indicatesRevocation;
  if (error instanceof UpstreamHttpError) return error.indicatesRevocation;
  return false;
}
