import { createHash, randomBytes } from 'node:crypto';

/**
 * PKCE (RFC 7636) helpers shared by the OAuth 2.0 adapters.
 *
 * Both X and TikTok require PKCE on the authorization request. TikTok's
 * `www.tiktok.com/v2/auth/authorize/` rejects a request without
 * `code_challenge`/`code_challenge_method=S256` outright with
 * `error=param_error&errCode=10007&error_type=code_challenge`, which the
 * provider turns into its own "Something went wrong" page — the flow never
 * reaches our callback, so it must be correct on the way out.
 */
export function createPkceVerifier(): string {
  // 32 random bytes -> 43 base64url chars, inside RFC 7636's 43-128 window.
  return randomBytes(32).toString('base64url');
}

/** S256 challenge: base64url(SHA256(verifier)). */
export function pkceChallengeS256(verifier: string): string {
  return createHash('sha256').update(verifier, 'utf8').digest('base64url');
}
