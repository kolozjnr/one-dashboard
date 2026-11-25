import { createHmac, timingSafeEqual } from 'node:crypto';
import { IntegrationError, isSocialProduct, type SocialProduct } from './integrations.types';

/**
 * Signed OAuth `state` parameter (CSRF protection for every provider redirect
 * — Meta, TikTok and X all reuse it).
 *
 * Stateless by design: the payload carries the workspace, the initiating user,
 * the product, an optional PKCE code_verifier and an expiry, all bound by an
 * HMAC over the JWT_SECRET key material. The authorization code the provider
 * returns is single-use at the provider, which closes the replay window on the
 * callback itself. No server-side state store means a lost Redis or cleaned
 * table can never strand a login flow.
 *
 * The PKCE verifier travels inside the signature-protected payload rather than
 * in a cookie because the callback is a cross-site redirect handled by a
 * `@Public()` endpoint: X's authorization code is single-use and expires in
 * 30 seconds, and the verifier alone (or the code alone) cannot exchange a
 * token — both are useless without the other.
 */
export interface OAuthStatePayload {
  v: 1;
  /** Product this authorization was started for — the callback must match. */
  p: SocialProduct;
  /** Workspace the accounts will be connected to. */
  w: string;
  /** User who started the flow (state is not a session; this is binding only). */
  u: string;
  /** Random nonce so two flows from the same user are never interchangeable. */
  n: string;
  /** PKCE code_verifier for flows that use it (X); absent for the others. */
  cv?: string;
  /** Unix millis after which the state is rejected. */
  exp: number;
}

const STATE_TTL_MS = 10 * 60 * 1000;

function sign(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('base64url');
}

export function createOAuthState(
  input: { product: SocialProduct; workspaceId: string; userId: string; nonce: string; codeVerifier?: string },
  secret: string,
): string {
  const payload: OAuthStatePayload = {
    v: 1,
    p: input.product,
    w: input.workspaceId,
    u: input.userId,
    n: input.nonce,
    ...(input.codeVerifier ? { cv: input.codeVerifier } : {}),
    exp: Date.now() + STATE_TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body, secret)}`;
}

/** Verifies signature, expiry and shape. Throws STATE_INVALID on any mismatch. */
export function verifyOAuthState(state: string | undefined, secret: string): OAuthStatePayload {
  const invalid = new IntegrationError(
    'STATE_INVALID',
    'The sign-in link is invalid or has expired. Please start the connection again.',
    400,
  );
  if (!state) throw invalid;
  const [body, signature] = state.split('.');
  if (!body || !signature) throw invalid;

  const expected = Buffer.from(sign(body, secret));
  const provided = Buffer.from(signature);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) throw invalid;

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    throw invalid;
  }
  if (typeof payload !== 'object' || payload === null) throw invalid;
  const candidate = payload as Partial<OAuthStatePayload>;
  if (
    candidate.v !== 1 ||
    typeof candidate.p !== 'string' ||
    !isSocialProduct(candidate.p) ||
    typeof candidate.w !== 'string' ||
    !candidate.w ||
    typeof candidate.u !== 'string' ||
    !candidate.u ||
    typeof candidate.n !== 'string' ||
    !candidate.n ||
    typeof candidate.exp !== 'number' ||
    candidate.exp < Date.now()
  ) {
    throw invalid;
  }
  return candidate as OAuthStatePayload;
}
