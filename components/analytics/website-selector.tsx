"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/ui/dropdown";
import { Modal } from "@/components/ui/modal";
import {
  INITIAL_WEBSITES,
  WEBSITE_PLATFORMS,
  type Website,
  type WebsiteStatus,
} from "@/lib/analytics/website-data";
import { cn } from "@/lib/utils";

const STATUS_META: Record<WebsiteStatus, { label: string; variant: "success" | "warning" | "danger" }> = {
  connected: { label: "Connected", variant: "success" },
  pending: { label: "Pending", variant: "warning" },
  error: { label: "Error", variant: "danger" },
};

function StatusDot({ status }: { status: WebsiteStatus }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "h-2 w-2 shrink-0 rounded-full",
        status === "connected" && "bg-green-500",
        status === "pending" && "bg-amber-500",
        status === "error" && "bg-red-500",
      )}
    />
  );
}

function WebsiteFavicon({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sunken text-[11px] font-semibold uppercase text-muted"
    >
      {name.slice(0, 2)}
    </span>
  );
}

const inputClass =
  "w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ghost focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/40";

/**
 * Website selector: searchable dropdown listing connected websites with
 * their connection status, plus an Add Website modal that simulates the
 * registration + connection handshake with mock data.
 */
export function WebsiteSelector({
  websites,
  selectedId,
  onSelect,
  onAdd,
}: {
  websites: Website[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAdd: (website: Website) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const selected = websites.find((site) => site.id === selectedId) ?? websites[0];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return websites;
    return websites.filter(
      (site) =>
        site.name.toLowerCase().includes(q) ||
        site.url.toLowerCase().includes(q) ||
        site.platform.toLowerCase().includes(q),
    );
  }, [websites, query]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Dropdown
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) setQuery("");
          }}
          panelClassName="w-[22rem]"
          trigger={
            <button
              type="button"
              className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2 text-left transition-colors hover:bg-sunken"
            >
              <WebsiteFavicon name={selected.name} />
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-ink">{selected.name}</span>
                  <StatusDot status={selected.status} />
                </span>
                <span className="block truncate text-xs text-faint">{selected.url}</span>
              </span>
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-ghost">
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          }
        >
          {open && (
            <div className="py-1">
              <div className="border-b border-line px-3 pb-2 pt-1">
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search websites…"
                  aria-label="Search websites"
                  className={cn(inputClass, "py-1.5 text-xs")}
                  autoFocus
                />
              </div>

              <ul className="max-h-72 overflow-y-auto py-1">
                {filtered.length === 0 && (
                  <li className="px-3 py-4 text-center text-xs text-faint">
                    No websites match “{query}”.
                  </li>
                )}
                {filtered.map((site) => {
                  const active = site.id === selected.id;
                  return (
                    <li key={site.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelect(site.id);
                          setOpen(false);
                          setQuery("");
                        }}
                        className={cn(
                          "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-sunken",
                          active && "bg-sunken/60",
                        )}
                      >
                        <WebsiteFavicon name={site.name} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span
                              className={cn(
                                "truncate text-sm",
                                active ? "font-semibold text-brand" : "font-medium text-ink",
                              )}
                            >
                              {site.name}
                            </span>
                          </span>
                          <span className="block truncate text-xs text-faint">{site.url}</span>
                        </span>
                        <Badge variant={STATUS_META[site.status].variant}>
                          {STATUS_META[site.status].label}
                        </Badge>
                        {active && (
                          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-brand">
                            <path
                              fillRule="evenodd"
                              d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 111.4-1.4l3.3 3.3 6.8-6.8a1 1 0 011.4 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="border-t border-line p-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-center"
                  onClick={() => {
                    setOpen(false);
                    setModalOpen(true);
                  }}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" />
                  </svg>
                  Add website
                </Button>
              </div>
            </div>
          )}
        </Dropdown>

        <Button variant="default" onClick={() => setModalOpen(true)}>
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" />
          </svg>
          Add Website
        </Button>
      </div>

      <AddWebsiteModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onAdd={onAdd}
        existingUrls={websites.map((site) => site.url)}
      />
    </>
  );
}

/* ------------------------------------------------------------------ add modal */

type ModalStep = "form" | "connecting" | "done";

function AddWebsiteModal({
  open,
  onOpenChange,
  onAdd,
  existingUrls,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (website: Website) => void;
  existingUrls: string[];
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState("");
  const [status, setStatus] = useState<WebsiteStatus>("pending");
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<ModalStep>("form");

  const reset = () => {
    setName("");
    setUrl("");
    setPlatform("");
    setStatus("pending");
    setError(null);
    setStep("form");
  };

  const close = (next: boolean) => {
    if (!next && step === "connecting") return; // don't dismiss mid-handshake
    onOpenChange(next);
    if (!next) window.setTimeout(reset, 200);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return setError("Website name is required.");
    try {
      const parsed = new URL(url.trim());
      if (!/^https?:$/.test(parsed.protocol)) throw new Error("protocol");
    } catch {
      return setError("Enter a valid URL including https://");
    }
    if (existingUrls.includes(url.trim().replace(/\/$/, ""))) {
      return setError("This website is already connected.");
    }
    setError(null);

    // Simulated registration + tracking connection handshake.
    setStep("connecting");
    window.setTimeout(() => {
      setStep("done");
      onAdd({
        id: `site-${Date.now().toString(36)}`,
        name: name.trim(),
        url: url.trim().replace(/\/$/, ""),
        platform: platform || "Other",
        status,
        addedAt: new Date().toISOString(),
      });
      window.setTimeout(() => {
        close(false);
      }, 900);
    }, 1400);
  };

  return (
    <Modal
      open={open}
      onOpenChange={close}
      title="Add a website"
      description="Register a new property and simulate its tracking connection."
      footer={
        step === "form" ? (
          <>
            <Button variant="ghost" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button variant="default" type="submit" form="add-website-form">
              Connect website
            </Button>
          </>
        ) : undefined
      }
    >
      {step === "form" && (
        <form id="add-website-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="site-name" className="mb-1 block text-xs font-medium text-muted">
              Website name
            </label>
            <input
              id="site-name"
              className={inputClass}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Acme Store"
              required
            />
          </div>

          <div>
            <label htmlFor="site-url" className="mb-1 block text-xs font-medium text-muted">
              Website URL
            </label>
            <input
              id="site-url"
              className={inputClass}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com"
              inputMode="url"
              required
            />
          </div>

          <div>
            <label htmlFor="site-platform" className="mb-1 block text-xs font-medium text-muted">
              Website platform <span className="text-ghost">(optional)</span>
            </label>
            <select
              id="site-platform"
              className={inputClass}
              value={platform}
              onChange={(event) => setPlatform(event.target.value)}
            >
              <option value="">Auto-detect</option>
              {WEBSITE_PLATFORMS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="site-status" className="mb-1 block text-xs font-medium text-muted">
              Tracking status
            </label>
            <select
              id="site-status"
              className={inputClass}
              value={status}
              onChange={(event) => setStatus(event.target.value as WebsiteStatus)}
            >
              <option value="connected">Connected — receiving events</option>
              <option value="pending">Pending — awaiting verification</option>
              <option value="error">Disconnected — needs attention</option>
            </select>
          </div>

          {error && (
            <p role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </form>
      )}

      {step === "connecting" && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" aria-hidden="true" />
          <p className="text-sm font-medium text-ink">Registering website…</p>
          <p className="text-xs text-faint">Generating tracking ID and verifying the connection.</p>
        </div>
      )}

      {step === "done" && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10 text-green-500">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path
                fillRule="evenodd"
                d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 111.4-1.4l3.3 3.3 6.8-6.8a1 1 0 011.4 0z"
                clipRule="evenodd"
              />
            </svg>
          </span>
          <p className="text-sm font-medium text-ink">{name} is connected</p>
          <p className="text-xs text-faint">Mock tracking events will start flowing immediately.</p>
        </div>
      )}
    </Modal>
  );
}

export { INITIAL_WEBSITES };
