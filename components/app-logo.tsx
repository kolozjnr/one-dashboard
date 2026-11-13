"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface AppLogoProps {
  name: string;
  /** Favicon source; when absent (websites) a globe mark is rendered. */
  domain?: string;
  className?: string;
}

/**
 * Application logo with graceful degradation:
 * favicon -> globe (no domain) -> letter monogram (load error).
 */
export function AppLogo({ name, domain, className }: AppLogoProps) {
  const [failed, setFailed] = useState(false);
  const boxClass = cn("shrink-0 object-contain", className ?? "h-7 w-7");

  if (!domain || failed) {
    if (!domain) {
      return (
        <span
          aria-hidden="true"
          className={cn(
            boxClass,
            "flex items-center justify-center rounded-md border border-line bg-sunken text-faint",
          )}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            className="h-4 w-4"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3c2.5 2.7 3.7 5.7 3.7 9s-1.2 6.3-3.7 9c-2.5-2.7-3.7-5.7-3.7-9S9.5 5.7 12 3z" />
          </svg>
        </span>
      );
    }

    return (
      <span
        aria-hidden="true"
        className={cn(
          boxClass,
          "flex items-center justify-center rounded-md border border-line bg-sunken text-xs font-semibold text-muted",
        )}
      >
        {name.charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
      alt=""
      width={28}
      height={28}
      className={boxClass}
      onError={() => setFailed(true)}
    />
  );
}
