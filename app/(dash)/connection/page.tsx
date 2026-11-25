import type { Metadata } from "next";

import { SocialConnections } from "@/components/connection/social-connections";
import ConnectionTabs from "./connection-tabs";

export const metadata: Metadata = {
  // Reference quirk kept: connection.blade.php sets @section('title', 'Dashboard'),
  // so the tab reads "Dashboard" in the original app too.
  title: "Dashboard | Metrispot",
};

/**
 * Connection page — ported from items/connection.blade.php (served by
 * dashboard/connection.blade.php on the reference's /connection route).
 * The Blade `@for` renders 60 identical dot divs — ported as a static block.
 * Tab switching and the Destination cards live in ./connection-tabs.tsx.
 */
export default function ConnectionPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <h1 className="text-xl font-semibold text-ink mb-10">Connections</h1>
        </div>

        {/* Add New Button */}
        <button
          type="button"
          className="inline-flex items-center px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-md"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
          Add new
        </button>
      </div>

      {/* Connected social (Instagram / Facebook / TikTok / X) accounts — real OAuth */}
      <SocialConnections />

      {/* Navigation Tabs + panel (Sources empty state / Destination cards) */}
      <ConnectionTabs />
    </div>
  );
}
