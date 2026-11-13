import { setFlash } from "@/lib/flash";

/**
 * Auth helpers — mirrors the reference Laravel session flow
 * (AuthenticationController: session `api_token` from the external API).
 * Phase 8 wires login/register against the API through Next route handlers;
 * this module owns client-side token storage and logout.
 */

const TOKEN_KEY = "api_token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage unavailable */
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
}

/** Reference: POST /logout (Bearer token) then redirect to /login with the
 * success flash "Successfully logged out." The API call is best-effort — the
 * local token is always cleared. */
export async function logout(): Promise<void> {
  const token = getToken();
  if (token) {
    try {
      await fetch("/api/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      /* API unreachable — still log out locally */
    }
  }
  clearToken();
  try {
    localStorage.removeItem("user");
  } catch {
    /* storage unavailable */
  }
  setFlash("Successfully logged out.");
  window.location.href = "/login";
}
