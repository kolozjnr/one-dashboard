import type { Metadata } from "next";
import { CompareBody } from "./compare-body";

export const metadata: Metadata = {
  title: "Compare Platforms | Metrispot",
};

/**
 * Cross-platform comparison — pick two or more connected sources and a
 * metric, then read metric cards, a multi-series chart, a performance
 * ranking and growth comparison. Metrics whose definitions differ across
 * platforms render an explanation callout first (never a silent compare).
 * All data is mocked deterministically on the client.
 */
export default function ComparePage() {
  return (
    <div className="bg-gray-50 dark:bg-transparent">
      <div className="container mx-auto px-4 py-8 w-full">
        <CompareBody />
      </div>
    </div>
  );
}
