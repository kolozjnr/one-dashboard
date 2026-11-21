import type { Metadata } from "next";

export const metadata: Metadata = {
  // Reference quirk kept: user.blade.php sets @section('title', 'Dashboard'),
  // so the tab reads "Dashboard" in the original app too.
  title: "Dashboard | Metrispot",
};

/**
 * User page — ported from items/user.blade.php (served by
 * dashboard/user.blade.php on the reference's /user route).
 * The `@Personal Organization` line is literal text in the reference
 * (Blade leaves unknown @-directives untouched) — kept verbatim.
 * The button is inert in the reference.
 */
export default function UsersPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="flex flex-col space-y-1 mb-8">
        <h1 className="text-xl font-semibold text-ink">Users</h1>
        <p className="text-sm text-faint">@Personal Organization</p>
      </div>

      {/* Empty State */}
      <div className="mt-12 flex flex-col items-center justify-center">
        {/* Illustration */}
        <img src="/images/data-bitz.jpeg" alt="No data" className="w-64 mb-6" />

        {/* Text Content */}
        <h3 className="text-lg font-medium text-ink mb-2">
          You do not have any Source yet
        </h3>
        <p className="text-sm text-faint text-center mb-6">
          Select or add source to connect and start<br />
          your free 30-day trial
        </p>

        {/* Add User Button */}
        <button
          type="button"
          className="inline-flex items-center px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-md"
        >
          Add User
        </button>
      </div>
    </div>
  );
}
