import { NextResponse } from "next/server";

/**
 * POST /api/login — proxies the external API's POST /login
 * (mirrors AuthenticationController::userLoginSubmit).
 * API base matches reference config/api.php: env API_BASE_URL with the
 * http://127.0.0.1:9001/api fallback.
 */

const API_BASE =
  process.env.API_BASE_URL ?? "http://127.0.0.1:9001/api";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  if (!body.email || !body.password) {
    return NextResponse.json(
      { message: "The email and password fields are required." },
      { status: 422 },
    );
  }

  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ email: body.email, password: body.password }),
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      {
        message:
          "An error occurred while communicating with the login service.",
      },
      { status: 502 },
    );
  }
}
