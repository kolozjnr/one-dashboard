"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { PinnableMenuItem } from "@/components/navigation/pinnable-menu-item";
import { readPinnedItems, writePinnedItems } from "@/lib/navigation/pins";

const groups = [
  ["Overview", [["Dashboard", "/admin", "⌂"]]],
  ["Customer Management", [["Users", "/admin/users", "♙"], ["Subscribers", "/admin/subscribers", "♧"], ["Team Workspaces", "/admin/team-workspaces", "▦"]]],
  ["Revenue", [["Payments", "/admin/payments", "$"], ["Subscriptions", "/admin/subscriptions", "↻"], ["Coupons", "/admin/coupons", "%"], ["Pricing Plans", "/admin/pricing", "◇"]]],
  ["Platform Management", [["Social Integrations", "/admin/integrations", "◎"], ["Branding & Appearance", "/admin/branding", "✦"], ["Announcements", "/admin/announcements", "◉"], ["Feature Management", "/admin/features", "☷"]]],
  ["Communication", [["Email Notifications", "/admin/email-notifications", "✉"], ["Support Messages", "/admin/support", "▤"]]],
  ["System", [["Activity Logs", "/admin/activity-logs", "◷"], ["System Health", "/admin/system-health", "⌁"], ["Usage Monitoring", "/admin/usage", "▤"], ["Help Center", "/admin/help-center", "?"], ["Admin Users", "/admin/admin-users", "♟"], ["Settings", "/admin/settings", "⚙"]]],
] as const;

const titles: Record<string, string> = Object.fromEntries(groups.flatMap(([, items]) => items.map(([label, href]) => [href, label])));

export function AdminShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [menu, setMenu] = useState<"notifications" | "profile" | null>(null);
  const [pinned, setPinned] = useState<string[]>([]);
  useEffect(() => setPinned(readPinnedItems("admin")), []);
  const togglePin = (href: string) => setPinned((current) => {
    const next = current.includes(href) ? current.filter((item) => item !== href) : [...current, href];
    writePinnedItems("admin", next);
    return next;
  });
  const title = titles[pathname] ?? "Dashboard";
  return <div className="min-h-screen bg-page text-ink">
    {mobileOpen && <button aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-black/40 lg:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-line bg-sidebar transition-all ${collapsed ? "w-[76px]" : "w-[264px]"} ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
      <div className="flex h-[76px] items-center gap-3 border-b border-line px-5"><Link href="/" aria-label="Metrispot home" className="min-w-0">{!collapsed && <BrandLogo className="max-w-full"/>}{collapsed && <span className="grid h-9 w-9 place-items-center overflow-hidden"><BrandLogo/></span>}</Link>{!collapsed && <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[.14em] text-faint">Admin</span>}<button onClick={() => setCollapsed(!collapsed)} className="ml-auto hidden rounded-lg p-2 text-faint hover:bg-sunken lg:block" aria-label="Collapse sidebar">{collapsed ? "›" : "‹"}</button></div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">{groups.map(([group, items]) => <section key={group}><div className={`mb-2 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-faint ${collapsed ? "sr-only" : ""}`}>{group}</div><div className="space-y-1">{[...items].sort(([aLabel, aHref], [bLabel, bHref]) => Number(pinned.includes(bHref)) - Number(pinned.includes(aHref))).map(([label, href, icon]) => { const active = pathname === href; return <PinnableMenuItem key={href} href={href} label={label} pinned={pinned.includes(href)} onToggle={() => togglePin(href)} onNavigate={() => setMobileOpen(false)} active={active} className={`rounded-xl px-3 py-1.5 text-[13px] font-medium transition-colors ${active ? "bg-brand/10 text-brand" : "text-muted hover:bg-sunken hover:text-ink"}`}>{<span className="mr-3 grid h-5 w-5 shrink-0 place-items-center text-[17px]">{icon}</span>}</PinnableMenuItem>; })}</div></section>)}</nav>
      {!collapsed && <div className="m-3 rounded-2xl border border-line bg-sunken p-3"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500"/><span className="text-xs font-semibold">All systems operational</span></div><p className="mt-1 pl-4 text-[11px] text-faint">Platform health is good</p></div>}
      <div className="border-t border-line p-3"><div className="flex items-center gap-3 rounded-xl p-2"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#eee8ff] text-xs font-bold text-[#7556cf]">JD</div>{!collapsed && <div className="min-w-0"><p className="truncate text-xs font-semibold">Jordan Davis</p><p className="text-[11px] text-faint">Super Administrator</p></div>}</div></div>
    </aside>
    <div className={`min-w-0 transition-[margin] duration-200 ${collapsed ? "lg:ml-[76px]" : "lg:ml-[264px]"}`}>
      <header className="sticky top-0 z-20 flex h-[76px] items-center gap-4 border-b border-line bg-surface/95 px-4 backdrop-blur sm:px-7"><button onClick={() => setMobileOpen(true)} aria-label="Open navigation" className="rounded-lg border border-line px-3 py-2 lg:hidden">☰</button><div className="hidden items-center gap-2 text-xs text-faint sm:flex">Admin <span>/</span> <span className="font-semibold text-ink">{title}</span></div><div className="relative ml-auto hidden w-full max-w-[360px] sm:block"><span className="absolute left-3 top-2.5 text-faint">⌕</span><input aria-label="Search platform" placeholder="Search anything..." className="w-full rounded-xl border border-line bg-sunken py-2.5 pl-9 pr-12 text-xs outline-none focus:border-brand"/><kbd className="absolute right-3 top-2 rounded border border-line bg-surface px-1.5 py-0.5 text-[10px] text-faint">⌘ K</kbd></div><ThemeToggle/><div className="relative"><button aria-label="Notifications" onClick={() => setMenu(menu === "notifications" ? null : "notifications")} className="relative rounded-xl border border-line p-2.5 text-muted hover:bg-sunken">♧<span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand"/></button>{menu === "notifications" && <div className="absolute right-0 top-12 z-30 w-72 rounded-2xl border border-line bg-surface p-4 shadow-xl"><p className="font-semibold">Notifications</p><p className="mt-3 text-xs text-muted">3 failed payments need review.</p><p className="mt-2 text-xs text-muted">New subscriber: Northstar Studio</p><p className="mt-2 text-xs text-muted">Platform health check completed.</p></div>}</div><div className="relative"><button onClick={() => setMenu(menu === "profile" ? null : "profile")} className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-sunken"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#eee8ff] text-[11px] font-bold text-[#7556cf]">JD</span><span className="hidden text-left sm:block"><span className="block text-xs font-semibold">Jordan Davis</span><span className="block text-[10px] text-faint">Super Admin</span></span><span className="text-faint">⌄</span></button>{menu === "profile" && <div className="absolute right-0 top-12 z-30 w-48 rounded-xl border border-line bg-surface p-2 shadow-xl"><Link className="block rounded-lg px-3 py-2 text-xs hover:bg-sunken" href="/admin/settings">Admin settings</Link><Link className="block rounded-lg px-3 py-2 text-xs hover:bg-sunken" href="/">Back to Metrispot</Link></div>}</div></header>
      <main className="mx-auto max-w-[1600px] p-4 sm:p-7 lg:p-9">{children}</main>
    </div>
  </div>;
}
