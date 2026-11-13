"use client";

/**
 * Light/dark theme toggle (additive feature — the reference has no theme
 * switcher). Visibility of the two icons is driven purely by CSS via the
 * `dark:` variant (keyed to [data-theme] on <html>), so there is no
 * server/client hydration mismatch.
 */
export function ThemeToggle({
  className = "",
  iconClassName = "h-5 w-5",
}: {
  className?: string;
  iconClassName?: string;
}) {
  const toggle = () => {
    const root = document.documentElement;
    const next =
      root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("bitz-theme", next);
    } catch {
      /* storage unavailable — keep in-memory theme */
    }
    window.dispatchEvent(new CustomEvent("bitz-theme-change", { detail: next }));
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle color theme"
      className={`inline-flex items-center justify-center rounded-full transition duration-200 focus:outline-none focus:ring-2 focus:ring-brand/60 ${className}`}
    >
      {/* Sun — shown in dark mode (click returns to light) */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={`${iconClassName} dark:block hidden`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
      {/* Moon — shown in light mode (click switches to dark) */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={`${iconClassName} dark:hidden block`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
        />
      </svg>
    </button>
  );
}
