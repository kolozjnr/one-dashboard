import { NextResponse } from "next/server";

/**
 * POST /api/logout — proxies the external API's POST /logout with the
 * caller's Bearer token (mirrors AuthenticationController::logout).
 * The token arrives via the Authorization header from the client; it is
 * never persisted server-side.
 */

const API_BASE =
  process.env.API_BASE_URL ?? "http://127.0.0.1:9001/api";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    // Reference behaviour without a session token: no-op on the API side.
    return NextResponse.json(
      { status: "error", message: "No valid token found" },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(`${API_BASE}/logout`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: authHeader,
      },
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { status: "error", message: "Error during logout" },
      { status: 502 },
    );
  }
}
