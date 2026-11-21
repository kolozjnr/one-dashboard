import type { Metadata } from "next";
import { ApexChart } from "./performance-charts";

export const metadata: Metadata = {
  title: "Dashboard | Metrispot",
};

const subscriberLegend = [
  { color: "bg-[#E34F26]", name: "YouTube", value: "121,799" },
  { color: "bg-[#FF9B26]", name: "Facebook", value: "64,754" },
  { color: "bg-[#FFB98B]", name: "Spotify", value: "21,047" },
  { color: "bg-[#FF5733]", name: "Y", value: "15,387" },
  { color: "bg-[#FFC3A6]", name: "Instagram", value: "7,806" },
];

const trafficLegend = [
  { color: "bg-[#22C55E]", name: "Organic Search" },
  { color: "bg-[#EF4444]", name: "Direct" },
  { color: "bg-[#F59E0B]", name: "Referral" },
  { color: "bg-[#FCD34D]", name: "Unassigned" },
  { color: "bg-[#3B82F6]", name: "Paid Search" },
];

const adsDates = Array.from({ length: 7 }, () => "Sep 2024");

/**
 * Performance page — ported from items/performance.blade.php (served by
 * dashboard/performance.blade.php). The reference partial is a full nested
 * HTML document (its own <head>/Tailwind CDN/<title>); only the content is
 * ported. The reference's dead #lineChart/#areaChart instantiations crash
 * the script so several charts never render there — repaired here (see
 * performance-charts.tsx). The bar chart card nested inside the line chart
 * card is a reference quirk, kept. Bare `shadow`/`rounded` map to v4
 * `shadow-sm`/`rounded-sm` (v3 values).
 */
export default function PerformancePage() {
  return (
    <div className="container mx-auto p-6">
      {/* Top Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Line Charts Section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Top Chart */}
          <div className="bg-surface rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-semibold">Paid channels</h2>
                <div className="flex gap-8 mt-2">
                  <div>
                    <div className="text-2xl font-semibold">1.2M</div>
                    <div className="text-sm text-faint">Total users</div>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold">$894.08K</div>
                    <div className="text-sm text-faint">Total revenue</div>
                  </div>
                </div>
              </div>
              <select className="border border-line rounded-md px-3 py-1 text-sm bg-surface dark:bg-sunken text-ink">
                <option>Gender/Source</option>
              </select>
            </div>
            <ApexChart chartKey="topLine" className="h-[200px]" />
            <div className="flex justify-end gap-4 mt-2">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div>
                <span className="text-sm text-muted">Total revenue</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                <span className="text-sm text-muted">Total users</span>
              </div>
            </div>
          </div>

          {/* Bottom Chart */}
          <div className="bg-surface rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">Report</h2>
              <select className="border border-line rounded-md px-3 py-1 text-sm bg-surface dark:bg-sunken text-ink">
                <option>Handle with</option>
              </select>
            </div>

            <ApexChart chartKey="bottomLine" className="h-[200px]" />
            <div className="flex justify-end gap-4 mt-2">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                <span className="text-sm text-muted">Total revenue</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div>
                <span className="text-sm text-muted">Sales return</span>
              </div>
            </div>

            {/* Bar Chart (nested inside the Report card — reference quirk) */}
            <div className="bg-surface rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">
                Organic Social Channel
              </h2>
              <ApexChart chartKey="bar" className="h-[300px]" />
            </div>
          </div>
        </div>

        {/* Pie Charts Section */}
        <div className="space-y-6">
          <div className="bg-surface rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Subscribers</h2>
              <div className="text-sm text-faint">Last 2023 - Jan 2023</div>
            </div>

            {/* Total Numbers Row */}
            <div className="flex gap-4 mb-4 text-sm">
              <div>
                <span className="text-muted">123,456</span>
                <span className="text-ghost ml-1">Views</span>
              </div>
              <div>
                <span className="text-muted">123,456</span>
                <span className="text-ghost ml-1">Views</span>
              </div>
              <div>
                <span className="text-muted">123,456</span>
                <span className="text-ghost ml-1">Views</span>
              </div>
            </div>

            <ApexChart chartKey="subscribers" className="h-[200px]" />

            {/* Legend Items */}
            <div className="mt-4 space-y-2 text-sm">
              {subscriberLegend.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <div
                      className={`w-2 h-2 rounded-full ${item.color} mr-2`}
                    ></div>
                    <span className="text-muted">{item.name}</span>
                  </div>
                  <span className="text-muted">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Traffic Source</h2>
              <div className="flex items-center">
                <span className="text-sm text-faint">Categories</span>
                <svg
                  className="w-4 h-4 ml-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>

            {/* Main donut chart */}
            <ApexChart chartKey="traffic" className="h-[200px]" />

            {/* Legend items */}
            <div className="mt-4 space-y-2">
              {trafficLegend.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <div
                      className={`w-2 h-2 rounded-full ${item.color} mr-2`}
                    ></div>
                    <span className="text-sm text-muted">{item.name}</span>
                  </div>
                  <span className="text-sm text-muted">42.5%</span>
                </div>
              ))}
            </div>

            {/* Bottom progress ring */}
            <ApexChart chartKey="progressRing" className="mt-6 h-[100px]" />
            <div className="flex justify-center gap-8 mt-2 text-sm text-muted">
              <div className="flex items-center">
                <div className="w-4 h-0.5 bg-orange-500 mr-1"></div>
                <span>60</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-0.5 bg-gray-300 mr-1"></div>
                <span>40</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="bg-surface rounded-sm shadow-sm">
        <div className="p-4">
          <h2 className="text-lg font-medium mb-4">Ads performance</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-blue-100 dark:bg-blue-500/15">
                  <th className="border border-blue-200 dark:border-blue-500/30 px-4 py-2 text-left">
                    Report date
                  </th>
                  <th className="border border-blue-200 dark:border-blue-500/30 px-4 py-2 text-left bg-purple-100 dark:bg-purple-500/15">
                    Impressions
                  </th>
                  <th className="border border-blue-200 dark:border-blue-500/30 px-4 py-2 text-left bg-purple-50 dark:bg-purple-500/10">
                    Click
                  </th>
                  <th className="border border-blue-200 dark:border-blue-500/30 px-4 py-2 text-left bg-blue-50 dark:bg-blue-500/10">
                    CTR
                  </th>
                  <th className="border border-blue-200 dark:border-blue-500/30 px-4 py-2 text-left bg-orange-100 dark:bg-orange-500/15">
                    Amount spent
                  </th>
                  <th className="border border-blue-200 dark:border-blue-500/30 px-4 py-2 text-left">
                    CPC
                  </th>
                </tr>
              </thead>
              <tbody>
                {adsDates.map((date, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    <td className="border border-blue-200 dark:border-blue-500/30 px-4 py-2">
                      {date}
                    </td>
                    <td className="border border-blue-200 dark:border-blue-500/30 px-4 py-2 bg-purple-50 dark:bg-purple-500/10">
                      855.7k
                    </td>
                    <td className="border border-blue-200 dark:border-blue-500/30 px-4 py-2 bg-purple-50 dark:bg-purple-500/10">
                      10.1k
                    </td>
                    <td className="border border-blue-200 dark:border-blue-500/30 px-4 py-2 bg-blue-50 dark:bg-blue-500/10">
                      1.17%
                    </td>
                    <td className="border border-blue-200 dark:border-blue-500/30 px-4 py-2 bg-orange-50 dark:bg-orange-500/10">
                      $3,946.5
                    </td>
                    <td className="border border-blue-200 dark:border-blue-500/30 px-4 py-2">
                      $0.4
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
