import type { NextRequest } from "next/server";

/**
 * X OAuth 2.0 (PKCE) landing route. Register exactly this path (absolute, on
 * APP_BASE_URL) as the OAuth 2.0 callback URI in the X developer portal:
 *
 *   {APP_BASE_URL}/auth/x/callback
 *
 * X redirects the person's browser here with `code`/`state` (or `error` when
 * they cancel). This handler forwards those parameters server-side to the
 * backend's signed-state callback (`GET /api/v1/integrations/x/callback`),
 * which validates the signed state (including the bound PKCE verifier),
 * exchanges the code, encrypts the tokens and discovers the account, then
 * answers with the page to return to. The browser itself never sees a token —
 * only the final same-origin redirect.
 */

const backendApiBase = (process.env.BACKEND_API_URL ?? "http://127.0.0.1:4100/api/v1").replace(/\/+$/, "");
const FORWARDED_PARAMS = ["code", "state", "error", "error_reason", "error_description"] as const;

export async function GET(request: NextRequest): Promise<Response> {
  const incoming = request.nextUrl.searchParams;
  const forwarded = new URLSearchParams();
  for (const key of FORWARDED_PARAMS) {
    const value = incoming.get(key);
    if (value) forwarded.set(key, value);
  }

  let redirectPath = "/connection?socialOAuth=error&code=UPSTREAM_ERROR";
  try {
    const response = await fetch(`${backendApiBase}/integrations/x/callback?${forwarded.toString()}`, {
      headers: { accept: "application/json" },
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(20_000),
    });
    const body = (await response.json().catch(() => null)) as {
      success?: boolean;
      data?: { redirectUrl?: string };
    } | null;
    if (response.ok && body?.success && typeof body.data?.redirectUrl === "string") {
      redirectPath = body.data.redirectUrl;
    }
  } catch {
    // Network failure talking to the backend — keep the error landing page.
  }

  let target: URL;
  try {
    target = new URL(redirectPath, request.url);
  } catch {
    target = new URL("/connection?socialOAuth=error&code=UPSTREAM_ERROR", request.url);
  }
  // Never leave the app's own origin, whatever the backend returned.
  if (target.origin !== request.nextUrl.origin) {
    target = new URL("/connection?socialOAuth=error&code=UPSTREAM_ERROR", request.url);
  }
  return Response.redirect(target, 302);
}
