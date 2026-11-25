# Social integrations (TikTok + X)

TikTok and X live in the same module as the Meta flows
(`backend/src/modules/integrations/`) behind the same provider-neutral
contracts (`integrations.types.ts`), but each provider keeps its own adapter,
its own token rules and its own honest answer about which metrics exist.

Read `meta-integrations.md` first — the layering (stateless adapters, signed
state, vault, discovered-not-assumed metrics, no token ever crossing the
browser) is identical. This document only covers what is different.

## TikTok: three different products, never conflated

| Product | Provider key | What it can do | What it must never claim |
| --- | --- | --- | --- |
| TikTok for Business (Display API) | `tiktok` | Login Kit + Display API: `user.info.basic`, `user.info.profile`, `user.info.stats`, `video.list` — profile totals and per-video stats | impressions, reach, watch time, completion rate, profile visits, audience retention |
| TikTok API for Business | `tiktok_business` | `identity/get`, `advertiser/info`, `report/integrated/get` with the `Access-Token` header — advertiser report metrics | content counts, unique reach, anything outside the advertiser report |

**The rule enforced in code:** the Display API and the Business API are two
different apps, two different credential sets (`TIKTOK_CLIENT_KEY` vs
`TIKTOK_BUSINESS_APP_ID`) and two different review processes. When the
Business product is not configured, `tiktok_business` reports
`NOT_CONFIGURED` — it never falls back to Display data, and Display never
invents a business number. Every metric the Display API structurally cannot
return is listed in `unsupported[]` with the reason
*"Not exposed by the TikTok Display API — requires the TikTok API for
Business"* rather than a zero.

- Display authorize: `https://www.tiktok.com/v2/auth/authorize/` (comma-joined
  scopes).
- Display token + refresh: `POST https://open.tiktokapis.com/v2/oauth/token/`
  (access 2 h, refresh 180 d, **refresh tokens rotate** — the bag-based
  `SocialAdapter.refresh` signature exists exactly for this).
- Display profile: `GET /v2/user/info/?fields=…`; videos:
  `POST /v2/video/list/?fields=…` with `{max_count, cursor}`.
- Business authorize: `https://ads.tiktok.com/marketing_api/auth?app_id=…&state=…&redirect_uri=…&user_type=advertiser`.
- Business token: `POST https://business-api.tiktok.com/open_api/v1.3/oauth/token/`
  (form body, POST only). Business data endpoints take the `Access-Token`
  header and answer `200` with `{code, message}` — `code !== 0` is an error,
  so the shared redacting client (`social-http.client.ts`) is told about that
  shape explicitly.

Both products share one Next.js redirect route
(`/auth/tiktok/callback` → `GET /api/v1/integrations/tiktok/callback`); the
signed state carries `p` (product) so the callback knows which adapter to run.

## X: user authorization only

**The app-level Bearer Token (`X_BEARER_TOKEN`) is never used to read user
data.** It cannot see a user's timeline, and it must never stand in for
user authorization or for private metrics. Every read in `x.adapter.ts`
carries the OAuth 2.0 user-access token (or, for the one legacy endpoint,
OAuth 1.0a user context).

- **OAuth 2.0 Authorization Code + PKCE (preferred).** Authorize
  `https://x.com/i/oauth2/authorize` (space-separated scopes), token
  `POST https://api.x.com/2/oauth2/token` with HTTP Basic client auth, S256
  `code_challenge`. Scopes: `users.read tweet.read offline.access`.
  `follows.read` is deliberately **not** requested — follower counts are
  available from `public_metrics`, and asking for more scope than the product
  uses is how review requests get rejected.
- The authorization code is single-use and expires in **30 seconds**, so the
  flow starts the exchange immediately and the PKCE verifier is bound into
  the signed state (`cv`) instead of a cookie (the callback is a cross-site
  `@Public()` redirect).
- Refresh tokens rotate; the returned bag replaces the stored one on every
  successful refresh.
- **OAuth 1.0a** exists only as a separate provider strategy
  (`x-oauth1.strategy.ts`, RFC 5849 HMAC-SHA1) for `GET
  /1.1/account/verify_credentials.json`, which enriches the profile with
  fields v2 does not expose. It is config-gated on
  `X_OAUTH1_ACCESS_TOKEN` / `X_OAUTH1_ACCESS_SECRET` and is not a
  replacement for the OAuth 2.0 user flow.
- Reads: `GET /2/users/me`, `GET /2/users/:id/tweets` with
  `tweet.fields=created_at,public_metrics,non_public_metrics,organic_metrics`.
  Owner-only blocks are entitlement- and age-gated (own timeline, posts < 30
  days, OAuth 2.0 user context). When X refuses them (400/403) the adapter
  retries with public metrics only — it never fabricates private numbers.
- **Tiers, quotas and pricing:** X's metrics endpoints are tiered. Free-tier
  apps get public metrics only; non-public/organic blocks and higher volumes
  require a paid tier. Volume here is bounded in code (`MAX_X_PAGES`,
  `MAX_X_POSTS`, `max_results=100`), rate limits surface as
  `RATE_LIMIT` → an `unsupported` reason *"Rate limited by the provider —
  try again later"* instead of a failed sync, and no paid-tier assumption is
  made anywhere: entitlement is read from what X actually returns.

## Environment

See `backend/.env.example`. All variables are optional; an unset product is
`NOT_CONFIGURED` at runtime (the connect button is disabled with a tooltip).

```
TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET / TIKTOK_REDIRECT_URI
TIKTOK_BUSINESS_APP_ID / TIKTOK_BUSINESS_SECRET / TIKTOK_BUSINESS_REDIRECT_URI
X_CLIENT_ID / X_CLIENT_SECRET / X_REDIRECT_URI      (X_CONSUMER_KEY/X_SECRET_KEY are accepted as aliases)
X_BEARER_TOKEN                                      (app-only; never for user reads)
X_OAUTH1_ACCESS_TOKEN / X_OAUTH1_ACCESS_SECRET      (optional strategy)
```

Redirect URIs (absolute, on `APP_BASE_URL`):

- `{APP_BASE_URL}/auth/tiktok/callback` — Display **and** Business
- `{APP_BASE_URL}/auth/x/callback`

## Flow

Identical shape to Meta: `POST /workspaces/:id/integrations/authorize`
returns the provider URL, the browser comes back to `/auth/{tiktok,x}/callback`,
and only `code`/`state`/`error*` are forwarded to
`GET /api/v1/integrations/{tiktok,x}/callback`. That endpoint verifies the
signed state (workspace, user, product, PKCE verifier), exchanges the code,
discovers accounts, seals the bag in the vault and returns a same-origin
`redirectUrl` carrying `?socialOAuth=…&product=…&code=…` — which
`lib/integrations/social.ts` turns into the banner copy. No token, in any
form, is ever written to the browser.

## Metrics

`social-insights.service.ts` drives all three products. Specs declare
`unavailable` up front for structural gaps (Display impressions/reach/watch
time, X reach, content counts in a Business report); everything else is
evaluated per metric and lands in `unsupported[]` with a safe, redacted reason
when the provider says no. Successful values are written through
`analytics-persistence.ts` as `AccountMetricCapability` rows, so the dashboard
only ever offers metrics this specific account can report.

Content is persisted too: TikTok videos and X posts are upserted into
`SocialPost` (best effort — a row that will not write never fails the metric
sync).

## Security rules (enforced in code)

- Tokens are AES-256-GCM sealed in the vault; disconnect deletes them.
- State is HMAC-signed and single-use; expected failures return a safe
  redirect instead of a 500.
- X's app bearer token is never used for user-authorized reads or private
  metrics.
- Display API data is never presented as business analytics, and a missing
  metric is reported as missing — never as `0`.
- Error messages are redacted (`social-http.client.ts`) before they reach a
  client, and a revoked token marks the account `NEEDS_REAUTH`.
