import type { Metadata } from "next";
import { ReportsBody } from "./reports-body";

export const metadata: Metadata = {
  title: "Reports | Metrispot",
};

/**
 * Reports module — pick a report type, apply filters (date range,
 * platform, account, website), generate a mocked report, preview it and
 * export CSV (real client-side Blob) or PDF (simulated in this
 * frontend-only build). No backend: report data comes from
 * lib/analytics/reports-data.ts.
 */
export default function ReportsPage() {
  return (
    <div className="bg-gray-50 dark:bg-transparent">
      <div className="container mx-auto px-4 py-8 w-full">
        <ReportsBody />
      </div>
    </div>
  );
}
