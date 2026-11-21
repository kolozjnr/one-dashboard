"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  /**
   * "auto" swaps the two reserved logo slots with the active theme:
   * /images/metrispot-logo-light.svg in light mode,
   * /images/metrispot-logo-dark.svg in dark mode. "dark" pins the
   * dark-mode logo for surfaces that are dark in both themes (e.g. the
   * footer band). Falls back to the Metrispot wordmark if an image fails
   * to load.
   */
  variant?: "auto" | "dark";
}

export function BrandLogo({ className, variant = "auto" }: BrandLogoProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className={cn("text-xl font-semibold", className)}>
        metrispot
      </span>
    );
  }

  const pinDark = variant === "dark";

  return (
    <span
      className={cn("inline-flex items-center", className)}
      aria-label="Metrispot"
    >
      {/* Light-mode logo slot */}
      <img
        src="/images/metrispot-logo-light.svg"
        alt="Metrispot"
        className={cn("h-8 w-auto", pinDark ? "hidden" : "dark:hidden")}
        onError={() => setFailed(true)}
      />
      {/* Dark-mode logo slot */}
      <img
        src="/images/metrispot-logo-dark.svg"
        alt="Metrispot"
        className={cn(
          "h-8 w-auto",
          pinDark ? "block" : "hidden dark:block",
        )}
        onError={() => setFailed(true)}
      />
    </span>
  );
}
