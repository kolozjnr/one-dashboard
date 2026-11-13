"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * shadcn-style hover/focus tooltip. Pure CSS so it needs no portal and
 * works inside overflow-hidden containers.
 */
export function Tooltip({
  content,
  children,
  className,
}: {
  content: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("group relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-[15rem] -translate-x-1/2 rounded-md bg-navy px-2 py-1.5 text-left text-xs font-normal text-white opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {content}
      </span>
    </span>
  );
}
