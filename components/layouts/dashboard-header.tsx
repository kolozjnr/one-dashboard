"use client";

import { ThemeToggle } from "@/components/theme/theme-toggle";

/**
 * Dashboard top bar — ported from dashboard/header.blade.php.
 * Height h-12, white (surface) with bottom border, search on the left,
 * Live toggle + bell + account icon on the right. The theme toggle is an
 * added feature, styled to match the neighbouring header icons.
 */
export function DashboardHeader() {
  return (
    <div className="w-full h-12 bg-surface border-b border-line flex items-center justify-between px-4">
      {/* Search Bar */}
      <div className="flex items-center relative">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 text-ghost absolute left-2.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          placeholder="Search..."
          className="w-[240px] h-8 pl-9 pr-4 rounded-lg border border-line text-sm text-ink focus:outline-none focus:ring-1 focus:ring-line-strong"
        />
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-6">
        {/* Demo Toggle */}
        <div className="flex items-center space-x-2">
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" />
            <div className="w-9 h-5 bg-gray-200 dark:bg-gray-600 rounded-full peer peer-checked:bg-red-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all after:duration-300"></div>
          </label>
          <span className="text-sm text-muted">Live</span>
        </div>

        {/* Theme Toggle (added feature) */}
        <ThemeToggle
          className="w-8 h-8 hover:bg-sunken text-faint"
          iconClassName="h-5 w-5"
        />

        {/* Notification Icon */}
        <div className="flex items-center justify-center w-8 h-8 hover:bg-sunken rounded-full cursor-pointer">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-faint"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </div>

        {/* User Icon */}
        <div className="flex items-center justify-center w-8 h-8 hover:bg-sunken rounded-full cursor-pointer">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-faint"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
