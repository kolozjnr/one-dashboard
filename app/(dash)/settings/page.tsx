import type { Metadata } from "next";

export const metadata: Metadata = {
  // Reference quirk kept: settings.blade.php sets @section('title', 'Dashboard'),
  // so the tab reads "Dashboard" in the original app too.
  title: "Dashboard",
};

/**
 * Settings page — ported from items/setting.blade.php (served by
 * dashboard/settings.blade.php on the reference's /settings route).
 * The settings rows are inert cursor-pointer divs in the reference — kept.
 */
export default function SettingsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-ink mb-1">Settings</h1>
        <p className="text-sm text-faint">
          Take a look at your settings and the new policy to see what is covered
        </p>
      </div>

      {/* Settings List */}
      <div className="bg-surface rounded-xl shadow-xs">
        {/* Email Settings */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-line cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 flex items-center justify-center bg-red-50 dark:bg-red-500/10 rounded-full">
              <svg
                className="w-5 h-5 text-red-500"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-ink">Email settings</div>
              <div className="text-sm text-faint flex items-center">
                myemail@domain.com
                <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 dark:bg-green-500/15 text-green-800 dark:text-green-400 rounded-sm">
                  Verified
                </span>
              </div>
            </div>
          </div>
          <svg className="w-5 h-5 text-ghost" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>

        {/* Connected Accounts */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-line cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 flex items-center justify-center bg-red-50 dark:bg-red-500/10 rounded-full">
              <svg
                className="w-5 h-5 text-red-500"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-ink">Connected accounts</div>
              <div className="text-sm text-faint">
                Integrations connected to your Frame account
              </div>
            </div>
          </div>
          <svg className="w-5 h-5 text-ghost" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>

        {/* Language Settings */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-line cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 flex items-center justify-center bg-red-50 dark:bg-red-500/10 rounded-full">
              <svg
                className="w-5 h-5 text-red-500"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-ink">Language Settings</div>
              <div className="text-sm text-faint">English (USA)</div>
            </div>
          </div>
          <svg className="w-5 h-5 text-ghost" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>

        {/* Change Password */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-line cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 flex items-center justify-center bg-red-50 dark:bg-red-500/10 rounded-full">
              <svg
                className="w-5 h-5 text-red-500"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-ink">Change Password</div>
              <div className="text-sm text-faint">••••••••••••••</div>
            </div>
          </div>
          <svg className="w-5 h-5 text-ghost" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>

        {/* Close Account */}
        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 flex items-center justify-center bg-red-50 dark:bg-red-500/10 rounded-full">
              <svg
                className="w-5 h-5 text-red-500"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-ink">Close your account</div>
              <div className="text-sm text-faint">If you want to stop using FrameAI</div>
            </div>
          </div>
          <svg className="w-5 h-5 text-ghost" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
