import { DashboardHeader } from "@/components/layouts/dashboard-header";
import { DashboardSidebar } from "@/components/layouts/dashboard-sidebar";

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

      {/* Content area */}
      <div
        id="content-area"
        className="flex-1 flex flex-col transition-all duration-300 ease-in-out lg:ml-64"
      >
        <DashboardHeader />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
