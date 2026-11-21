import { Suspense } from "react";
import type { Metadata } from "next";
import { AnalyticsBody } from "./analytics-body";

export const metadata: Metadata = {
  title: "Website Analytics | Metrispot",
};

/**
 * Website Analytics module — a dedicated dashboard route for monitoring
 * website traffic, visitor behaviour, page performance and user activities.
 * All data is mocked on the client; no tracking scripts or backend calls.
 *
 * The mock data is seeded from the current time at render, so the body is
 * wrapped in a Suspense boundary per Next.js cacheComponents guidance —
 * that defers the time reads to request time instead of failing prerender.
 */
export default function AnalyticsPage() {
  return (
    <div className="bg-gray-50 dark:bg-transparent">
      <div className="container mx-auto px-4 py-8 w-full">
        <Suspense
          fallback={
            <div className="space-y-6">
              <div className="h-9 w-64 animate-pulse rounded-md bg-sunken" />
              <div className="h-10 w-full animate-pulse rounded-md bg-sunken" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-32 animate-pulse rounded-lg border border-line bg-surface"
                  />
                ))}
              </div>
              <div className="h-80 animate-pulse rounded-lg border border-line bg-surface" />
            </div>
          }
        >
          <AnalyticsBody />
        </Suspense>
      </div>
    </div>
  );
}
