"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PinnableMenuItem } from "@/components/navigation/pinnable-menu-item";
import { readPinnedItems, writePinnedItems } from "@/lib/navigation/pins";

const links = [
  ["/workspace", "Overview"],
  ["/workspace/team", "Team Members"],
  ["/workspace/invitations", "Invitations"],
  ["/workspace/roles", "Roles & Permissions"],
  ["/workspace/activity", "Activity Log"],
  ["/workspace/settings", "Workspace Settings"],
] as const;

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [pinned, setPinned] = useState<string[]>([]);
  useEffect(() => setPinned(readPinnedItems("workspace")), []);
  const togglePin = (href: string) => setPinned((current) => {
    const next = current.includes(href) ? current.filter((item) => item !== href) : [...current, href];
    writePinnedItems("workspace", next);
    return next;
  });
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Workspace</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Manage your team and account</h1>
        <p className="mt-1 text-sm text-faint">Your workspace is a shared account, separate from individual member logins.</p>
      </div>
      <div className="grid gap-7 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Workspace navigation" className="flex gap-1 overflow-x-auto border-b border-line pb-2 lg:block lg:overflow-visible lg:border-0 lg:pb-0">
          {[...links].sort(([aHref], [bHref]) => Number(pinned.includes(bHref)) - Number(pinned.includes(aHref))).map(([href, label]) => {
            const active = href === "/workspace" ? pathname === href : pathname.startsWith(href);
            return <PinnableMenuItem key={href} href={href} label={label} pinned={pinned.includes(href)} onToggle={() => togglePin(href)} active={active} className={cn("shrink-0 rounded-lg px-2 py-1 text-sm transition-colors", active ? "bg-brand/10 font-medium text-brand" : "text-muted hover:bg-sunken hover:text-ink")}><span className="sr-only">{label}</span></PinnableMenuItem>;
          })}
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
