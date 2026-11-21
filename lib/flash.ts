/**
 * One-shot flash messages — mirrors the reference's Laravel session flash
 * (`->with('success', ...)` rendered by session('success') on the next page).
 * sessionStorage is used so the message survives the redirect and is consumed
 * exactly once.
 */

const FLASH_KEY = "metrispot-flash";

export function setFlash(message: string): void {
  try {
    sessionStorage.setItem(FLASH_KEY, message);
  } catch {
    /* storage unavailable */
  }
}

export function consumeFlash(): string | null {
  try {
    const message = sessionStorage.getItem(FLASH_KEY);
    if (message !== null) sessionStorage.removeItem(FLASH_KEY);
    return message;
  } catch {
    return null;
  }
}
