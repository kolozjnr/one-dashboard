"use client";

import { cloneElement, useEffect, useRef, type ReactElement, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DropdownTriggerProps {
  onClick?: (event: React.MouseEvent) => void;
  "aria-expanded"?: boolean;
  "aria-haspopup"?: "menu" | "listbox" | "dialog";
}

interface DropdownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactElement<DropdownTriggerProps>;
  children: ReactNode;
  align?: "start" | "end";
  panelClassName?: string;
}

/**
 * shadcn-style dropdown surface: closes on outside click and Escape,
 * renders a fading panel anchored to its trigger.
 */
export function Dropdown({
  open,
  onOpenChange,
  trigger,
  children,
  align = "start",
  panelClassName,
}: DropdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  const triggerElement = cloneElement(trigger, {
    onClick: (event: React.MouseEvent) => {
      trigger.props.onClick?.(event);
      onOpenChange(!open);
    },
    "aria-expanded": open,
    "aria-haspopup": "dialog",
  });

  return (
    <div ref={containerRef} className="relative">
      {triggerElement}
      <div
        className={cn(
          "absolute z-40 mt-2 min-w-[17rem] overflow-hidden rounded-lg border border-line bg-surface shadow-xl transition-all duration-150",
          align === "end" ? "right-0" : "left-0",
          open
            ? "pointer-events-auto visible opacity-100"
            : "pointer-events-none invisible opacity-0",
          panelClassName,
        )}
        role="dialog"
        aria-hidden={!open}
      >
        {children}
      </div>
    </div>
  );
}
