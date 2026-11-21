import type { Metadata } from "next";

export const metadata: Metadata = {
  // Reference quirk kept: billing.blade.php sets @section('title', 'Dashboard'),
  // so the tab reads "Dashboard" in the original app too.
  title: "Dashboard | Metrispot",
};

/**
 * Billing page — ported from items/billing.blade.php (served by
 * dashboard/billing.blade.php on the reference's /billing route).
 * Plan cards, prices and feature lists are verbatim. Activate buttons are
 * inert in the reference.
 */
export default function BillingPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Try Free Plan */}
        <div className="rounded-lg border border-line p-6 bg-surface">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Try Free</h3>
            <div className="mt-2">
              <span className="text-3xl font-bold">$0.00</span>
            </div>
          </div>

          <ul className="space-y-3 mb-6">
            <li className="flex items-center text-muted">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
              1 user
            </li>
            <li className="flex items-center text-muted">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
              1 data source
            </li>
            <li className="flex items-center text-muted">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
              1 account
            </li>
            <li className="flex items-center text-muted">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
              5 GB destination
            </li>
            <li className="flex items-center text-muted">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
              No DB destination backfills
            </li>
            <li className="flex items-center text-muted">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
              Daily DB refresh
            </li>
          </ul>

          <button
            type="button"
            className="w-full py-2 px-4 border border-line-strong rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            Activate
          </button>
        </div>

        {/* Basic Plan */}
        <div className="rounded-lg border border-line p-6 bg-orange-100 dark:bg-orange-500/15 relative">
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm">
              Monthly
            </span>
          </div>

          <div className="mb-4">
            <h3 className="text-lg font-semibold">Basic Plan</h3>
            <div className="mt-2">
              <span className="text-3xl font-bold">$50.00</span>
            </div>
          </div>

          <ul className="space-y-3 mb-6">
            <li className="flex items-center text-muted">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
              1 user
            </li>
            <li className="flex items-center text-muted">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
              1 data source
            </li>
            <li className="flex items-center text-muted">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
              1 account
            </li>
            <li className="flex items-center text-muted">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
              5 GB destination
            </li>
            <li className="flex items-center text-muted">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
              No DB destination backfills
            </li>
            <li className="flex items-center text-muted">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
              Daily DB refresh
            </li>
          </ul>

          <button
            type="button"
            className="w-full py-2 px-4 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
          >
            Activate
          </button>
        </div>

        {/* Professional Plan */}
        <div className="rounded-lg border border-line p-6 bg-surface">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Professional</h3>
            <div className="mt-2">
              <span className="text-3xl font-bold">$120.00</span>
            </div>
          </div>

          <ul className="space-y-3 mb-6">
            <li className="flex items-center text-muted">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
              1 user
            </li>
            <li className="flex items-center text-muted">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
              1 data source
            </li>
            <li className="flex items-center text-muted">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
              1 account
            </li>
            <li className="flex items-center text-muted">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
              5 GB destination
            </li>
            <li className="flex items-center text-muted">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
              No DB destination backfills
            </li>
            <li className="flex items-center text-muted">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
              Daily DB refresh
            </li>
          </ul>

          <button
            type="button"
            className="w-full py-2 px-4 border border-line-strong rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            Activate
          </button>
        </div>
      </div>

      {/* VIP Section */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-lg border border-line p-6 bg-surface">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">VIP</h3>
            <div className="mt-2">
              <span className="text-3xl font-bold">$150.00</span>
            </div>
          </div>

          <ul className="space-y-3 mb-6">
            <li className="flex items-center text-muted">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
              1 user
            </li>
            <li className="flex items-center text-muted">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
              1 data source
            </li>
            <li className="flex items-center text-muted">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
              1 account
            </li>
            <li className="flex items-center text-muted">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
              5 GB destination
            </li>
            <li className="flex items-center text-muted">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
              No DB destination backfills
            </li>
            <li className="flex items-center text-muted">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
              Daily DB refresh
            </li>
          </ul>

          <button
            type="button"
            className="w-full py-2 px-4 border border-line-strong rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            Activate
          </button>
        </div>

        {/* Enterprise Section */}
        <div className="rounded-lg border border-line p-6 bg-surface">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Enterprise</h3>
            <p className="text-muted mt-2">
              Perfect for larger teams with custom requirements. This plan is
              suitable for large teams and enterprise businesses that need
              advanced features and a wide range of complex business uses.
            </p>
          </div>

          <button
            type="button"
            className="w-full py-2 px-4 bg-surface border border-line-strong rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors mt-4"
          >
            Let&apos;s Talk
          </button>
        </div>
      </div>
    </div>
  );
}
