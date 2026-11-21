import type { Metadata } from "next";

import DataSourcePanel from "./data-source-panel";

export const metadata: Metadata = {
  // Reference quirk kept: source.blade.php sets @section('title', 'Dashboard'),
  // so the tab reads "Dashboard" in the original app too.
  title: "Dashboard | Metrispot",
};

/**
 * Source page — ported from items/source.blade.php (served by
 * dashboard/source.blade.php on the reference's /source route).
 * The Data Source card (search, paginated platform list, connect modal)
 * lives in ./data-source-panel.tsx. Buttons are inert in the reference.
 */
export default function SourcePage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Source</h2>

        {/* Progress steps */}
        <div className="flex items-center mb-8">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white">
              1
            </div>
            <div className="ml-2 text-ink">Add data</div>
          </div>
          <div className="flex-1 h-px bg-gray-300 mx-4"></div>
          <div className="flex items-center opacity-50">
            <div className="w-8 h-8 rounded-full border-2 border-line-strong flex items-center justify-center">
              2
            </div>
            <div className="ml-2 text-muted">Preview</div>
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left side - Data source picker (searchable + paginated) */}
          <DataSourcePanel />

          {/* Right side - Empty state */}
          <div className="flex flex-col items-center justify-center text-center p-8">
            <img src="/images/data-bitz.jpeg" alt="No data" className="w-64 mb-6" />
            <h3 className="text-lg font-medium mb-2">
              You do not have any data yet
            </h3>
            <p className="text-muted mb-4">
              Click &quot;Add data&quot; button to get started in adding your first
              data source
            </p>
            <button
              type="button"
              className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600"
            >
              Add data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
