"use client";

import { useMemo, useState } from "react";
import { AdminSearch } from "@/components/admin/admin-search";
import { supportedPlatforms } from "@/lib/admin/status";

type Platform = {
  name: (typeof supportedPlatforms)[number];
  category: "Social" | "Video" | "Professional";
  description: string;
  enabled: boolean;
  accounts: number;
  lastSync: string;
};

const initialPlatforms: Platform[] = [
  { name: "Instagram", category: "Social", description: "Photo, video, audience, and engagement analytics.", enabled: true, accounts: 428, lastSync: "5 minutes ago" },
  { name: "TikTok", category: "Video", description: "Video performance, audience, and engagement analytics.", enabled: true, accounts: 316, lastSync: "12 minutes ago" },
  { name: "YouTube", category: "Video", description: "Channel, video, watch time, and subscriber analytics.", enabled: true, accounts: 184, lastSync: "18 minutes ago" },
  { name: "Facebook", category: "Social", description: "Page reach, audience, and content performance.", enabled: true, accounts: 267, lastSync: "9 minutes ago" },
  { name: "LinkedIn", category: "Professional", description: "Company page and professional audience insights.", enabled: true, accounts: 146, lastSync: "32 minutes ago" },
  { name: "X", category: "Social", description: "Post engagement and audience growth insights.", enabled: false, accounts: 0, lastSync: "Not connected" },
  { name: "Pinterest", category: "Social", description: "Pin impressions, saves, and audience insights.", enabled: false, accounts: 0, lastSync: "Not connected" },
  { name: "Threads", category: "Social", description: "Post interactions and audience growth insights.", enabled: false, accounts: 0, lastSync: "Not connected" },
];

export default function IntegrationsPage() {
  const [platforms, setPlatforms] = useState(initialPlatforms);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All categories");
  const [selected, setSelected] = useState<Platform | null>(null);
  const [notice, setNotice] = useState("");
  const shown = useMemo(() => platforms.filter((platform) =>
    (category === "All categories" || platform.category === category) &&
    `${platform.name} ${platform.category} ${platform.description}`.toLowerCase().includes(search.toLowerCase()),
  ), [platforms, category, search]);

  function togglePlatform(name: Platform["name"]) {
    setPlatforms((current) => current.map((platform) => platform.name === name
      ? { ...platform, enabled: !platform.enabled, lastSync: platform.enabled ? "Not connected" : "Waiting for authorization" }
      : platform));
    const platform = platforms.find((item) => item.name === name);
    if (platform) setNotice(`${name} ${platform.enabled ? "disabled" : "enabled"} in mock state. No provider connection was changed.`);
  }

  return <section className="space-y-6">
    <header>
      <p className="mb-2 text-xs text-faint">Platform administration · Integrations</p>
      <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">Social Integrations</h1>
      <p className="mt-1 text-sm text-muted">Manage supported platform availability and review mock connection activity.</p>
    </header>
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100">
      Platform controls change local mock state only. OAuth authorization, synchronization, and provider APIs are not connected.
    </div>
    <div className="grid gap-3 sm:grid-cols-3">
      {[["Supported platforms", platforms.length], ["Enabled", platforms.filter((platform) => platform.enabled).length], ["Connected accounts", platforms.reduce((sum, platform) => sum + platform.accounts, 0)]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-line bg-surface p-4"><p className="text-xs text-muted">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>)}
    </div>
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
        <AdminSearch aria-label="Search platforms" placeholder="Search platforms..." value={search} onChange={(event) => setSearch(event.target.value)} />
        <select aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink"><option>All categories</option><option>Social</option><option>Video</option><option>Professional</option></select>
        <span className="text-xs text-faint">{shown.length} platforms</span>
      </div>
      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((platform) => <article key={platform.name} className="rounded-xl border border-line p-4">
          <div className="flex items-start justify-between gap-3"><div><span className="text-[10px] font-semibold uppercase tracking-wide text-faint">{platform.category}</span><h2 className="mt-1 text-base font-semibold">{platform.name}</h2></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${platform.enabled ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300" : "bg-sunken text-muted"}`}>{platform.enabled ? "Enabled" : "Disabled"}</span></div>
          <p className="mt-3 min-h-10 text-xs leading-5 text-muted">{platform.description}</p>
          <div className="mt-3 flex justify-between border-t border-line pt-3 text-[11px] text-faint"><span>{platform.accounts} accounts</span><span>Sync: {platform.lastSync}</span></div>
          <div className="mt-4 flex gap-2"><button type="button" onClick={() => setSelected(platform)} className="flex-1 rounded-lg border border-line px-3 py-2 text-xs hover:bg-sunken">Details</button><button type="button" onClick={() => togglePlatform(platform.name)} className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium ${platform.enabled ? "border border-line text-ink hover:bg-sunken" : "bg-brand text-white hover:bg-brand-hover"}`}>{platform.enabled ? "Disable" : "Enable"}</button></div>
        </article>)}
        {shown.length === 0 && <p className="col-span-full py-10 text-center text-sm text-muted">No platforms match your search.</p>}
      </div>
    </div>
    {notice && <div role="status" className="fixed bottom-5 right-5 z-50 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink shadow-xl">{notice}<button type="button" aria-label="Dismiss notification" onClick={() => setNotice("")} className="ml-3 text-muted">×</button></div>}
    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}><section role="dialog" aria-modal="true" aria-labelledby="platform-title" className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs text-faint">Platform details</p><h2 id="platform-title" className="mt-1 text-xl font-bold">{selected.name}</h2></div><button type="button" onClick={() => setSelected(null)} aria-label="Close details" className="rounded-lg border border-line px-3 py-1 text-muted">×</button></div><p className="mt-4 text-sm leading-6 text-muted">{selected.description}</p><dl className="mt-5 space-y-3 border-t border-line pt-4 text-sm"><div className="flex justify-between"><dt className="text-muted">Availability</dt><dd>{selected.enabled ? "Enabled" : "Disabled"}</dd></div><div className="flex justify-between"><dt className="text-muted">Connected accounts</dt><dd>{selected.accounts}</dd></div><div className="flex justify-between"><dt className="text-muted">Last sync</dt><dd>{selected.lastSync}</dd></div></dl><p className="mt-5 rounded-lg bg-sunken p-3 text-xs leading-5 text-muted">Authorization and data synchronization are placeholders. Enabling this platform does not connect an external account.</p></section></div>}
  </section>;
}
