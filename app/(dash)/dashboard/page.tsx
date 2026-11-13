import { Suspense } from "react";
import type { Metadata } from "next";

import { DashboardBody } from "./dashboard-body";
import { AnalyticsProvider } from "@/components/analytics/analytics-context";
import { ChartSkeleton, MetricGridSkeleton } from "@/components/analytics/states";

export const metadata: Metadata = {
  title: "Dashboard",
};

/**
 * Dashboard page — header kept from the reference port; the body is the
 * dynamic analytics system (Connected Apps + date filters, registry-driven
 * KPI cards, universal Recharts chart, engagement, website analytics and
 * the adaptive content table). All widgets share the analytics context so
 * changing the selected sources or the date range updates every section.
 */
export default function DashboardPage() {
  return (
    <div className="bg-gray-50 dark:bg-transparent">
      <div className="container mx-auto px-4 py-8 w-full">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="flex gap-4">
            {/* Buttons are inert in the reference */}
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2 border border-line rounded-lg hover:bg-gray-50 dark:hover:bg-white/5"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M12 5v14m7-7H5"></path>
              </svg>
              Share
            </button>
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2 border border-line rounded-lg hover:bg-gray-50 dark:hover:bg-white/5"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
              </svg>
              Export
            </button>
            <button
              type="button"
              className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600"
            >
              Connect
            </button>
          </div>
        </div>

        {/* The analytics context seeds its date range from `new Date()` at
            render time; the boundary defers that read to request time per
            Next.js cacheComponents guidance instead of failing prerender. */}
        <Suspense
          fallback={
            <div className="space-y-6">
              <MetricGridSkeleton count={7} />
              <ChartSkeleton />
            </div>
          }
        >
          <AnalyticsProvider>
            <DashboardBody />
          </AnalyticsProvider>
        </Suspense>
      </div>
    </div>
  );
}
