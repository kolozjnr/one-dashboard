import { DashboardHeader } from "@/components/layouts/dashboard-header";
import { DashboardSidebar } from "@/components/layouts/dashboard-sidebar";
import { DashboardTour } from "@/components/tour/dashboard-tour";

/**
 * Dashboard shell — ported from dashboard/base.blade.php.
 * Reference defect repaired: sidebar.blade.php wrapped a second
 * `@yield('content')` inside #mainContent, rendering every dashboard page
 * twice side by side. Here the content renders once inside #content-area,
 * which carries the reference's `lg:ml-64` offset (previously on #mainContent).
 */
export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex h-screen">
      <DashboardSidebar />

      {/* Content area — min-w-0 lets flex children shrink instead of
          forcing the page wider than the viewport. */}
      <div
        id="content-area"
        className="flex min-w-0 flex-1 flex-col transition-all duration-300 ease-in-out lg:ml-64"
      >
        <DashboardHeader />
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      {/* Onboarding tour — auto-starts for new users, replayable from the sidebar */}
      <DashboardTour />
    </div>
  );
}
