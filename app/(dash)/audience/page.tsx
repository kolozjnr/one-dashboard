import type { Metadata } from "next";
import { AudienceBody } from "./audience-body";

export const metadata: Metadata = {
  title: "Audience Insights | Metrispot",
};

/**
 * Audience Insights module — per-source demographics, geography and
 * activity timing. Every section is gated by what the selected source
 * actually reports (see AUDIENCE_CAPABILITIES), so a website or LinkedIn
 * never renders age/gender panels it cannot support. All data is mocked
 * deterministically on the client; no backend calls.
 */
export default function AudiencePage() {
  return (
    <div className="bg-gray-50 dark:bg-transparent">
      <div className="container mx-auto px-4 py-8 w-full">
        <AudienceBody />
      </div>
    </div>
  );
}
