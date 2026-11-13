import { NextResponse } from "next/server";

/**
 * POST /api/register — proxies the external API's POST /register
 * (mirrors AuthenticationController::userRegisterSubmit, including the
 * default role of "user").
 */

const API_BASE =
  process.env.API_BASE_URL ?? "http://127.0.0.1:9001/api";

export async function POST(request: Request) {
  let body: {
    name?: string;
    email?: string;
    password?: string;
    password_confirmation?: string;
    role?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  if (
    !body.name ||
    !body.email ||
    !body.password ||
    !body.password_confirmation
  ) {
    return NextResponse.json(
      { message: "The name, email, password and confirmation are required." },
      { status: 422 },
    );
  }

  try {
    const response = await fetch(`${API_BASE}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        name: body.name,
        email: body.email,
        password: body.password,
        password_confirmation: body.password_confirmation,
        role: body.role ?? "user",
      }),
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      {
        message:
          "An error occurred while communicating with the registration service.",
      },
      { status: 502 },
    );
  }
}
