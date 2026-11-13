"use client";

import { useState } from "react";

type Tab = "sources" | "destination";

type Destination = {
  id: string;
  name: string;
  email: string;
  connectedAt: string;
};

const DESTINATIONS: Destination[] = [
  {
    id: "youtube-1",
    name: "Youtube",
    email: "deepcypher10@gmail.com",
    connectedAt: "Connected 4th May, 2024, 11:50 AM",
  },
];

/**
 * Tabs + panels for the Connections page. The Sources panel holds the
 * reference's empty state; Destination renders the connected-account cards
 * (logo, account line, connected timestamp, Browse / Reconnect / Disconnect).
 */
export default function ConnectionTabs() {
  const [tab, setTab] = useState<Tab>("destination");

  return (
    <div>
      {/* Navigation Tabs */}
      <nav className="flex space-x-4 border-b border-line">
        <button
          type="button"
          onClick={() => setTab("sources")}
          className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === "sources"
              ? "text-red-600 border-red-600"
              : "text-faint border-transparent hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Sources
        </button>
        <button
          type="button"
          onClick={() => setTab("destination")}
          className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px inline-flex items-center gap-2 ${
            tab === "destination"
              ? "text-red-600 border-red-600"
              : "text-faint border-transparent hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          Destination
        </button>
      </nav>

      {tab === "sources" ? <SourcesPanel /> : <DestinationPanel />}
    </div>
  );
}

function SourcesPanel() {
  return (
    <div className="mt-12 flex flex-col items-center justify-center">
      <div className="w-72 h-48 mb-6 relative">
        {/* World Map Background (simplified using dots) — reference loops 60 times */}
        <div className="absolute inset-0 grid grid-cols-12 gap-2 opacity-10">
          {Array.from({ length: 60 }).map((_, i) => (
            <div
              key={i}
              className="w-1 h-1 bg-gray-400 rounded-full"
            />
          ))}
        </div>

        {/* Text Content */}
        <img src="/images/data-bitz.jpeg" alt="No data" className="w-64 mb-6" />
        <h3 className="text-lg font-medium text-ink mb-2">
          You do not have any Source yet
        </h3>
        <p className="text-sm text-faint text-center mb-6">
          Select or add source to connect and start<br />
          your free 30-day trial
        </p>

        <div className="flex justify-center">
          <button
            type="button"
            className="inline-flex items-center px-6 py-3 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-md"
          >
            Add Source
          </button>
        </div>
      </div>
    </div>
  );
}

function DestinationPanel() {
  return (
    <div className="mt-6 space-y-4">
      {DESTINATIONS.map((item) => (
        <div
          key={item.id}
          className="bg-surface border border-line rounded-lg overflow-hidden"
        >
          {/* Account line */}
          <div className="flex items-start gap-3 p-4">
            <YouTubeLogo />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-semibold text-ink">
                  {item.name} - {item.email}
                </span>
                <ExternalLinkIcon />
              </div>
              <p className="text-xs text-faint mt-1">{item.connectedAt}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-3 border-t border-line">
            <ActionButton label="Browse">
              <FolderIcon />
            </ActionButton>
            <ActionButton label="Reconnect" divider>
              <RefreshIcon />
            </ActionButton>
            <ActionButton label="Disconnect" divider>
              <UnlinkIcon />
            </ActionButton>
          </div>
        </div>
      ))}
    </div>
  );
}

function ActionButton({
  label,
  divider,
  children,
}: {
  label: string;
  divider?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`flex items-center justify-center gap-2 py-2.5 text-xs text-faint hover:text-ink hover:bg-sunken transition-colors ${
        divider ? "border-l border-line" : ""
      }`}
    >
      {children}
      {label}
    </button>
  );
}

function YouTubeLogo() {
  return (
    <span className="shrink-0 w-7 h-7 rounded-md bg-[#FF0000] flex items-center justify-center">
      <svg viewBox="0 0 24 24" fill="#ffffff" className="w-3.5 h-3.5">
        <path d="M9.5 8.2v7.6L16 12z" />
      </svg>
    </span>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="w-3.5 h-3.5 text-ghost"
      aria-hidden="true"
    >
      <path d="M10.75 3.25a.75.75 0 00-1.5 0v1.44L5.53 8.47a.75.75 0 101.06 1.06l3.66-3.66v1.44a.75.75 0 001.5 0V3.25z" />
      <path d="M4.5 5.75a.75.75 0 00-.75.75v8.75c0 .414.336.75.75.75h8.75a.75.75 0 00.75-.75v-3a.75.75 0 00-1.5 0v2.25H5.25V6.5h2.25a.75.75 0 000-1.5H4.5z" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
      />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 12a7.5 7.5 0 0112.9-5.2M19.5 12a7.5 7.5 0 01-12.9 5.2"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.5 3.5v3.5H14M6.5 20.5V17H10"
      />
    </svg>
  );
}

function UnlinkIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.5 14.5l5-5M7.8 16.2l-1.3 1.3a3.5 3.5 0 01-4.97-4.97l3.18-3.18M16.2 7.8l1.3-1.3a3.5 3.5 0 014.97 4.97l-3.18 3.18"
      />
    </svg>
  );
}
