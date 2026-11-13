"use client";

import { useState } from "react";
import { WebsiteSelector } from "@/components/analytics/website-selector";
import {
  INITIAL_WEBSITES,
  getTrafficSources,
  type Website,
} from "@/lib/analytics/website-data";
import { cn } from "@/lib/utils";
import { OverviewTab } from "./overview-tab";
import { RealtimeTab } from "./realtime-tab";
import { PagesTab } from "./pages-tab";
import { EventsTab } from "./events-tab";
import { VisitorsTab } from "./visitors-tab";
import { TrafficTab } from "./traffic-tab";
import { DevicesTab } from "./devices-tab";
import { ConversionsTab } from "./conversions-tab";

type TabId =
  | "overview"
  | "realtime"
  | "pages"
  | "events"
  | "visitors"
  | "traffic"
  | "devices"
  | "conversions";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "realtime", label: "Real-time" },
  { id: "pages", label: "Pages" },
  { id: "events", label: "Events" },
  { id: "visitors", label: "Visitors" },
  { id: "traffic", label: "Traffic Sources" },
  { id: "devices", label: "Devices" },
  { id: "conversions", label: "Conversions" },
];

/**
 * Client shell for the Website Analytics module: website selector at the
 * top, sub-navigation tabs below it, and the active tab's panel. Website
 * selection is simulated with mock data — switching regenerates every
 * section from the new website id.
 */
export function AnalyticsBody() {
  const [websites, setWebsites] = useState<Website[]>(INITIAL_WEBSITES);
  const [selectedId, setSelectedId] = useState<string>(INITIAL_WEBSITES[0].id);
  const [tab, setTab] = useState<TabId>("overview");

  const website = websites.find((site) => site.id === selectedId) ?? websites[0];
  const sources = getTrafficSources(website.id);

  const handleAdd = (site: Website) => {
    setWebsites((prev) => [...prev, site]);
    setSelectedId(site.id);
  };

  return (
    <div className="space-y-6">
      {/* Page header + website selector */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-ink">Website Analytics</h1>
          <p className="mt-1 text-sm text-faint">
            Monitor traffic, visitor behaviour, page performance and user activities
            for your connected websites.
          </p>
        </div>
        <WebsiteSelector
          websites={websites}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onAdd={handleAdd}
        />
      </header>

      {/* Connection banner for websites that are not fully connected */}
      {website.status !== "connected" && (
        <div
          role="status"
          className={cn(
            "flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 text-sm",
            website.status === "pending"
              ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
              : "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
          )}
        >
          <span className="font-medium">
            {website.status === "pending"
              ? "Tracking is pending verification."
              : "This website is not receiving events."}
          </span>
          <span className="text-xs opacity-80">
            {website.status === "pending"
              ? "Verify the tracking snippet on " + website.url + " to start collecting data."
              : "Reconnect the tracking integration to resume data collection."}
          </span>
          <button
            type="button"
            className="ml-auto rounded-md border border-current/30 px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-80"
          >
            {website.status === "pending" ? "Verify now" : "Reconnect"}
          </button>
        </div>
      )}

      {/* Sub-navigation tabs */}
      <nav className="flex space-x-1 overflow-x-auto border-b border-line" aria-label="Analytics sections">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-current={tab === item.id ? "page" : undefined}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === item.id
                ? "border-brand text-brand"
                : "border-transparent text-faint hover:text-ink",
            )}
          >
            {item.label}
            {item.id === "realtime" && (
              <span className="ml-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green-500 align-middle" aria-hidden="true" />
            )}
          </button>
        ))}
      </nav>

      {/* Active tab panel */}
      <div key={`${website.id}-${tab}`}>
        {tab === "overview" && <OverviewTab website={website} sources={sources} onNavigate={setTab} />}
        {tab === "realtime" && <RealtimeTab website={website} />}
        {tab === "pages" && <PagesTab website={website} />}
        {tab === "events" && <EventsTab website={website} />}
        {tab === "visitors" && <VisitorsTab website={website} />}
        {tab === "traffic" && <TrafficTab website={website} sources={sources} />}
        {tab === "devices" && <DevicesTab website={website} />}
        {tab === "conversions" && <ConversionsTab website={website} />}
      </div>
    </div>
  );
}
