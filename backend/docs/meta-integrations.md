# Meta integrations (Instagram + Facebook)

Implementation reference for `src/modules/integrations/`. Every flow, scope and
endpoint below was verified against Meta's current documentation (Graph API
**v27.0**) at implementation time — re-verify before changing scopes or adding
metrics, because Meta deprecates them on a schedule.

## Which API for which product

Two separate Meta API products, two separate permission sets. Scopes are **never
combined across products**.

| | Instagram | Facebook |
| --- | --- | --- |
| API product | Instagram API with Instagram Login (Business Login for Instagram) | Facebook Login for Pages |
| Host | `graph.instagram.com` / `api.instagram.com` / `www.instagram.com` | `graph.facebook.com` (v27.0) |
| Scopes requested | `instagram_business_basic`, `instagram_business_manage_insights` | `pages_show_list`, `pages_read_engagement`, `read_insights` |
| Authorization URL | `https://www.instagram.com/oauth/authorize` | `https://graph.facebook.com/v27.0/dialog/oauth` |
| Code → token | `POST https://api.instagram.com/oauth/access_token` | `GET /v27.0/oauth/access_token?code=…` |
| Long-lived exchange | `GET graph.instagram.com/access_token?grant_type=ig_exchange_token` (60 days) | `GET /v27.0/oauth/access_token?grant_type=fb_exchange_token` (~60 days) |
| Refresh | `GET graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token` (+60 days; token must be ≥ 24 h old, valid, and have `instagram_business_basic`) | re-run `fb_exchange_token` while the user token is still valid (an expired token cannot be refreshed — re-login required) |
| Eligible accounts | Instagram **professional** accounts: Business and Creator (`account_type` = `Business` / `Media_Creator`). Personal accounts are rejected at discovery — no professional analytics are promised for them. | Facebook **Pages**: standard/business/creator Pages where the person holds a role. One authorized user may manage **multiple Pages** — one row per Page. |

Docs used:
- Business Login for Instagram — `developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login`
- Instagram Account Insights — `…/instagram-platform/api-reference/instagram-user/insights`
- Long-lived access tokens (Facebook Login) — `developers.facebook.com/docs/facebook-login/access-tokens/refreshing`
- Page Insights — `developers.facebook.com/docs/graph-api/reference/v27.0/page/insights`

### App Dashboard / app-review notes

- A **Business-type** Meta app is required for the Instagram product; add the
  Instagram product and configure *Business login settings* (Instagram App ID,
  Instagram App Secret, OAuth redirect URIs). Facebook Login uses the app's own
  App ID/Secret and *Facebook Login → Settings* redirect URIs.
- **Access level:** *Standard Access* is enough when serving only accounts you
  own/manage and have added to the app; serving other people's accounts
  requires *Advanced Access*, which requires **App Review** for each permission.
  `pages_show_list`, `pages_read_engagement` and `read_insights` are each
  individually reviewed; `instagram_business_basic` and
  `instagram_business_manage_insights` likewise for the Instagram product.
- The redirect URI registered in the dashboard must be exactly
  `{APP_BASE_URL}/auth/meta/callback` (see below); Meta matches it literally.

## Environment

| Variable | Purpose |
| --- | --- |
| `META_APP_ID` / `META_APP_SECRET` | Facebook Login app credentials |
| `META_REDIRECT_URI` | Facebook OAuth redirect URI (e.g. `https://app.example.com/auth/meta/callback`) |
| `META_INSTAGRAM_APP_ID` / `META_INSTAGRAM_APP_SECRET` | Instagram Login app credentials (separate fields in the App Dashboard) |
| `META_INSTAGRAM_REDIRECT_URI` | Instagram OAuth redirect URI (falls back to `META_REDIRECT_URI`) |
| `INTEGRATIONS_ENCRYPTION_KEY` | Optional AES-256-GCM key for tokens at rest; falls back to `PAYMENT_ENCRYPTION_KEY`, then a `JWT_SECRET` derivation |

All are optional: a flow that is not configured reports `NOT_CONFIGURED`
(HTTP 503) instead of failing at boot.

## Flow

1. **Authorize URL** — `POST /workspaces/:workspaceId/integrations/authorize`
   (`integrations.connect`) returns `{ url, product, scopes }`. The URL carries
   a signed `state` (HMAC over `JWT_SECRET`: product + workspace + user + nonce
   + 10-minute expiry).
2. **Callback** — Meta redirects the browser to
   `{APP_BASE_URL}/auth/meta/callback`, a Next.js route that forwards
   `code`/`state`/`error` server-side to `GET /api/v1/integrations/meta/callback`
   (`@Public()` — the browser may arrive without a live session; the signed
   state, not a cookie, proves the flow). The backend validates the state
   (signature, expiry, product binding), exchanges the code, upgrades to a
   long-lived token, discovers accounts, seals tokens and answers with the page
   to redirect to. The browser never sees a token.
3. **Discovery**
   - Instagram: `GET graph.instagram.com/v27.0/me?fields=user_id,username,account_type,…`
     → one connected account (professional only).
   - Facebook: `GET /v27.0/me/accounts?fields=id,name,access_token,tasks`
     → one connected account **per Page**, plus a best-effort
     `/{page-id}?fields=instagram_business_account{id,username}` to surface a
     linked professional Instagram account.
4. **Permission tracking** — granted scopes are stored in the sealed credential
   bag (`scopes`), read back through `GET /workspaces/:workspaceId/integrations`,
   and shown as chips in the UI. Facebook scopes come from the token debug
   endpoint (`/debug_token`) so a partial grant is recorded accurately.
5. **Token refresh / expiry** — `credentialsExpiresAt` mirrors the user-token
   expiry. Before each sync: Instagram refreshes when within 7 days of expiry
   and the token is ≥ 24 h old; Facebook re-runs `fb_exchange_token` while the
   token is still valid. A revoked/expired token marks the account
   `NEEDS_REAUTH` (surfaced in the UI) instead of failing silently.
6. **Disconnect** — `POST /workspaces/:workspaceId/integrations/:accountId/disconnect`
   (`integrations.disconnect`) sets `DISCONNECTED`, soft-deletes the row and
   **nulls the ciphertext** (tokens are destroyed, not just hidden), and writes
   an `integration.disconnected` audit entry.

## Metrics

`GET /workspaces/:workspaceId/integrations/:accountId/insights`
(`analytics.view`, optional `?since=&until=&metrics=`) fetches every known
metric for the account, persists what succeeded, and returns both sides:

- `metrics[]` — values that were actually returned (also written to
  `AnalyticsSnapshot`, with an `AccountMetricCapability` row so the dashboard
  only offers metrics this account demonstrably reports);
- `unsupported[]` — metrics Meta did not return, with a safe reason
  (deprecated for this API version, no data in range, missing permission…).

Availability is **discovered, never assumed** — each metric is requested
individually, so one deprecated metric cannot fail the sync.

| Dashboard metric | Instagram (user insights unless noted) | Facebook (Page insights) |
| --- | --- | --- |
| `followers` | `GET /me` → `followers_count` | `GET /{page}` → `fan_count` (fallback: `page_fans`) |
| `audienceGrowth` | `follower_count` time-series delta (needs ≥ 100 followers) | `page_follows` delta |
| `reach` | `reach` (day, total) | `page_impressions_unique` — **deprecated above v25**, reported unsupported if rejected |
| `impressions` | `views` (Meta's replacement for the account `impressions` metric, deprecated Apr 2025) | `page_impressions` |
| `engagement` | `total_interactions` | `page_post_engagements` |
| `likes` / `comments` / `shares` / `saves` | account-level `likes`, `comments`, `shares`, `saves` (day, total) | — |
| `profileVisits` | `profile_views` | — |
| `postsPublished` | count of `/me/media` in range | count of `/{page}/published_posts` in range |
| `storyViews` | media insights `impressions` summed over STORY media | — |
| `reelPlays` | media insights `plays` summed over REEL media | — |
| `pageReactions` / `pageVisits` / `linkClicks` / `videoViews` | — | `page_actions_post_reactions_total`, `page_views_total`, `page_clicks`, `page_video_views` |
| `followerDemographics` | `follower_demographics` (lifetime, `last_30_days`, breakdown country) | — |
| `audienceDemographics` | — | `page_fans_country` |

Caveats enforced by the implementation (all from Meta's docs):

- Insights require a **professional** Instagram account and a Page with ≥ 100
  likes; below that (and for accounts with < 100 followers) some metrics return
  empty rather than `0` — reported as "no data", never as a zero.
- Demographic metrics only return when there is enough data (top 45 rows).
- Data can be delayed up to 48 h; user metrics are stored ~90 days; Page
  insights keep ~2 years but only 90 days per query (range is clamped to 90
  days). Every range here is UTC.
- Not every metric exists for every account/content type — that is exactly what
  `unsupported[]` and `AccountMetricCapability` record.

## Security rules (enforced in code)

- Tokens are sealed with AES-256-GCM (`IntegrationsVaultService`, envelope
  `v1:<iv>.<tag>.<ciphertext>`) before touching `ConnectedAccount.credentialsCiphertext`;
  read paths never return token material — only scopes, expiry and metadata.
- **Access tokens are never logged.** The Graph client redacts
  `access_token=…`, `client_secret=…`, `code=…` and token-shaped strings from
  every error message before it can reach a log or a response.
- State is validated with `timingSafeEqual`; the authorization code is
  single-use at Meta, closing the replay window.
- Permissions are minimal per flow and are tracked as granted; a revoked grant
  is detected from Graph error 190/458/463/467/490 and 10/102/200 and moves the
  account to `NEEDS_REAUTH`.
