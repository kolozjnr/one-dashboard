"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { logout } from "@/lib/auth";
import { PinnableMenuItem } from "@/components/navigation/pinnable-menu-item";
import { readPinnedItems, writePinnedItems } from "@/lib/navigation/pins";

/**
 * Dashboard sidebar — ported from dashboard/sidebar.blade.php.
 * The reference wires the drawer with vanilla JS (and base.blade.php carries
 * a dead script bound to a non-existent #sidebarToggle); here the same
 * visuals are driven by React state. Reference quirks kept faithful:
 * no active-link highlight, and the Logout button reuses the Settings cog icon.
 */

function NavIcon({ d }: { d: string | string[] }) {
  const paths = Array.isArray(d) ? d : [d];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 mr-3 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      {paths.map((path) => (
        <path
          key={path}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d={path}
        />
      ))}
    </svg>
  );
}

const cogPaths = [
  "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
  "M15 12a3 3 0 11-6 0 3 3 0 016 0z",
];

export function DashboardSidebar() {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState<string[]>([]);

  useEffect(() => setPinned(readPinnedItems("dashboard")), []);

  const togglePin = (href: string) => setPinned((current) => {
    const next = current.includes(href) ? current.filter((item) => item !== href) : [...current, href];
    writePinnedItems("dashboard", next);
    return next;
  });

  // Reference: body scroll locked while the mobile drawer is open, and the
  // drawer force-closes when the viewport reaches the lg breakpoint.
  useEffect(() => {
    if (open) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
  }, [open]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <>
      {/* Toggle Button */}
      <div className="fixed top-4 left-4 z-50 lg:hidden">
        <button
          type="button"
          aria-label="Toggle sidebar"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="border border-line bg-surface text-ink p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/60"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16m-7 6h7"
            />
          </svg>
        </button>
      </div>

      {/* Overlay */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden="true"
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden ${
          open ? "block" : "hidden"
        }`}
      />

      {/* Sidebar */}
      <div
        id="sidebar"
        className={`fixed inset-y-0 left-0 z-40 flex flex-col h-screen bg-sidebar text-ink border-r border-line w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="px-6 py-4">
          <Link href="/" aria-label="Metrispot home">
            {/* Sidebar follows the theme, so the logo swaps with it */}
            <BrandLogo className="text-xl font-bold text-ink" />
          </Link>
        </div>

        {/* Navigation Links */}
        <nav data-tour="sidebar-navigation" className="flex-1 py-4 overflow-y-auto">
          <PinnableMenuItem href="/dashboard" label="Dashboard" pinned={pinned.includes("/dashboard")} onToggle={() => togglePin("/dashboard")} onNavigate={() => setOpen(false)} className="px-6 py-2 text-sm hover:bg-sunken dark:hover:bg-gray-800 transition-colors">
            <NavIcon d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </PinnableMenuItem>
          <PinnableMenuItem
            href="/dashboard"
            label="Dashboard"
            pinned={pinned.includes("/dashboard")}
            onToggle={() => togglePin("/dashboard")}
            onNavigate={() => setOpen(false)}
          >
            <NavIcon d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </PinnableMenuItem>

          <Link
            href="/source"
            className="flex items-center px-6 py-2 text-sm hover:bg-sunken dark:hover:bg-gray-800 transition-colors"
          >
            <NavIcon d="M13 7l-5 5 5 5m4-10l5 5-5 5" />
            Source
          </Link>

          <Link
            href="/connection"
            className="flex items-center px-6 py-2 text-sm hover:bg-sunken dark:hover:bg-gray-800 transition-colors"
          >
            <NavIcon d="M13 10V3L4 14h7v7l9-11h-7z" />
            Connections
          </Link>

          <Link
            href="/analytics"
            className="flex items-center px-6 py-2 text-sm hover:bg-sunken dark:hover:bg-gray-800 transition-colors"
          >
            <NavIcon d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            Website Analytics
          </Link>

          <Link
            href="/audience"
            className="flex items-center px-6 py-2 text-sm hover:bg-sunken dark:hover:bg-gray-800 transition-colors"
          >
            <NavIcon d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8zm6 0a4 4 0 100-8 4 4 0 000 8z" />
            Audience Insights
          </Link>

          <Link
            href="/compare"
            className="flex items-center px-6 py-2 text-sm hover:bg-sunken dark:hover:bg-gray-800 transition-colors"
          >
            <NavIcon d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            Compare
          </Link>

          <Link
            href="/reports"
            className="flex items-center px-6 py-2 text-sm hover:bg-sunken dark:hover:bg-gray-800 transition-colors"
          >
            <NavIcon d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            Reports
          </Link>

          <Link
            href="/performance"
            className="flex items-center px-6 py-2 text-sm hover:bg-sunken dark:hover:bg-gray-800 transition-colors"
          >
            <NavIcon d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            Performance
            <span className="ml-auto bg-sunken dark:bg-gray-800 text-xs px-2 py-1 rounded-full">
              10
            </span>
          </Link>

          <Link
            href="/user"
            className="flex items-center px-4 py-2 rounded-lg hover:bg-sunken dark:hover:bg-gray-800 transition-colors"
          >
            <NavIcon d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            Users
          </Link>

          <Link
            href="/billing"
            className="flex items-center px-4 py-2 rounded-lg hover:bg-sunken dark:hover:bg-gray-800 transition-colors"
          >
            <NavIcon d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            Billing
          </Link>

          <div className="mx-6 mb-2 mt-5 border-t border-line pt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-ghost">
            Workspace
          </div>
          <Link
            href="/workspace"
            className="flex items-center px-6 py-2 text-sm hover:bg-sunken dark:hover:bg-gray-800 transition-colors"
          >
            <NavIcon d="M3 7a2 2 0 012-2h5l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            Overview
          </Link>
          <Link
            href="/workspace/team"
            className="flex items-center px-6 py-2 text-sm hover:bg-sunken dark:hover:bg-gray-800 transition-colors"
          >
            <NavIcon d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H2v-2a4 4 0 014-4h3m6-4a4 4 0 11-8 0 4 4 0 018 0zm6-1a3 3 0 11-6 0 3 3 0 016 0z" />
            Team Members
          </Link>
          <Link
            href="/workspace/invitations"
            className="flex items-center px-6 py-2 text-sm hover:bg-sunken dark:hover:bg-gray-800 transition-colors"
          >
            <NavIcon d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            Invitations
          </Link>
          <Link
            href="/workspace/roles"
            className="flex items-center px-6 py-2 text-sm hover:bg-sunken dark:hover:bg-gray-800 transition-colors"
          >
            <NavIcon d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4zm-3 9l2 2 4-4" />
            Roles &amp; Permissions
          </Link>
          <Link
            href="/workspace/settings"
            className="flex items-center px-6 py-2 text-sm hover:bg-sunken dark:hover:bg-gray-800 transition-colors"
          >
            <NavIcon d={cogPaths} />
            Workspace Settings
          </Link>

          {/* Welcome Card */}
          <div className="mx-4 my-4 p-4 bg-sunken dark:bg-gray-800 border border-line dark:border-0 rounded-lg">
            <h3 className="font-medium text-sm">Welcome</h3>
            <p className="text-sm text-faint dark:text-gray-400 mt-1">
              Get to know your Metrispot Dashboard with our short walkthrough tour.
            </p>
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(new CustomEvent("metrispot-tour-start"))
              }
              className="mt-3 text-sm font-medium text-brand hover:text-brand-hover"
            >
              Start Tour
            </button>
          </div>

          {/* Bottom Links */}
          <div data-tour="sidebar-account" className="mt-auto">
            <Link
              href="/support"
              className="flex items-center px-6 py-2 text-sm hover:bg-sunken dark:hover:bg-gray-800 transition-colors"
            >
              <NavIcon d="M18.364 5.636l-3.536 3.536m0 0l5.656 5.656M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              Support
            </Link>

            <Link
              href="/settings"
              className="flex items-center px-6 py-2 text-sm hover:bg-sunken dark:hover:bg-gray-800 transition-colors"
            >
              <NavIcon d={cogPaths} />
              Settings
            </Link>
          </div>

          <div>
            <button
              type="button"
              onClick={logout}
              className="flex items-center px-6 py-2 text-sm hover:bg-sunken dark:hover:bg-gray-800 transition-colors w-full text-left"
            >
              <NavIcon d={cogPaths} />
              Logout
            </button>
          </div>

          {/* User Profile */}
          <div className="px-6 py-4 mt-4">
            <Link href="/profile">
              <div className="flex items-center">
                <div>
                  {/* Reference: alt text is "Profile photo" (kept faithful) */}
                  <img
                    src="/images/adewale.png"
                    alt="Profile photo"
                    className="h-8 w-8 rounded-full bg-sunken dark:bg-gray-700"
                  />
                </div>

                <div className="ml-3">
                  <p className="text-sm font-medium">johnmarvel</p>
                  <p className="text-xs text-faint dark:text-gray-500">
                    johnmarvel@gmail.com
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </nav>
      </div>
    </>
  );
}
