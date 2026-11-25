"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { AppLogo } from "@/components/app-logo";
import { isSocialProduct, startSocialAuthorization, type SocialProduct } from "@/lib/integrations/social";

type Platform = { id: string; name: string; domain?: string };

const PAGE_SIZE = 5;
const MODAL_ANIMATION_MS = 500;

/** Platforms offered in the Data Source picker (paginated, 5 per page). */
const PLATFORMS: Platform[] = [
  { id: "tiktok", name: "Tiktok", domain: "tiktok.com" },
  { id: "slack", name: "Slack", domain: "slack.com" },
  { id: "apple", name: "Apple", domain: "apple.com" },
  { id: "youtube", name: "YouTube", domain: "youtube.com" },
  { id: "spotify", name: "Spotify", domain: "spotify.com" },
  { id: "website", name: "Website" },
  { id: "instagram", name: "Instagram", domain: "instagram.com" },
  { id: "facebook", name: "Facebook", domain: "facebook.com" },
  { id: "x", name: "X (Twitter)", domain: "x.com" },
  { id: "linkedin", name: "LinkedIn", domain: "linkedin.com" },
  { id: "pinterest", name: "Pinterest", domain: "pinterest.com" },
  { id: "reddit", name: "Reddit", domain: "reddit.com" },
  { id: "twitch", name: "Twitch", domain: "twitch.tv" },
  { id: "discord", name: "Discord", domain: "discord.com" },
  { id: "github", name: "GitHub", domain: "github.com" },
  { id: "vimeo", name: "Vimeo", domain: "vimeo.com" },
  { id: "tumblr", name: "Tumblr", domain: "tumblr.com" },
  { id: "snapchat", name: "Snapchat", domain: "snapchat.com" },
  { id: "telegram", name: "Telegram", domain: "telegram.org" },
  { id: "medium", name: "Medium", domain: "medium.com" },
  { id: "substack", name: "Substack", domain: "substack.com" },
  { id: "behance", name: "Behance", domain: "behance.net" },
  { id: "dribbble", name: "Dribbble", domain: "dribbble.com" },
  { id: "amazon", name: "Amazon", domain: "amazon.com" },
  { id: "ebay", name: "eBay", domain: "ebay.com" },
  { id: "shopify", name: "Shopify", domain: "shopify.com" },
  { id: "wordpress", name: "WordPress", domain: "wordpress.com" },
];

/**
 * Mock connected-data performance: platform id -> performance %.
 * Only accounts that are already connected render a percentage; the rest
 * stay unconnected until a real backend supplies the numbers.
 */
const CONNECTED_PERFORMANCE: Record<string, number> = {
  tiktok: 25,
  slack: 12,
  apple: -4,
  youtube: 18,
  spotify: 9,
};

/**
 * Data Source card — searchable + paginated platform picker.
 * Picking a platform opens the (UI-only) connect modal, which scales out
 * from the page centre on open and back down on close / connect.
 */
export default function DataSourcePanel() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [modalPlatform, setModalPlatform] = useState<Platform | null>(null);
  const [modalShown, setModalShown] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PLATFORMS;
    return PLATFORMS.filter((p) => p.name.toLowerCase().includes(q));
  }, [query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const openModal = (platform: Platform) => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setModalPlatform(platform);
    setModalShown(false);
    // Let the hidden state paint first so the transition actually runs.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setModalShown(true)),
    );
  };

  const closeModal = () => {
    setModalShown(false);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setModalPlatform(null);
      closeTimer.current = null;
    }, MODAL_ANIMATION_MS);
  };

  return (
    <div className="border border-line rounded-lg bg-surface p-4">
      <h3 className="text-sm font-semibold text-ink mb-3">Data Source</h3>

      {/* Searchable picker */}
      <div className="relative mb-4">
        <svg
          className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ghost pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder="Type platform name"
          className="w-full pl-9 pr-3 py-2 text-sm bg-sunken border border-line rounded-lg placeholder:text-ghost text-ink focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
        />
      </div>

      {/* Platform rows */}
      {pageItems.length > 0 ? (
        <ul className="divide-y divide-line">
          {pageItems.map((platform) => {
            const performance = CONNECTED_PERFORMANCE[platform.id];
            return (
              <li key={platform.id}>
                <button
                  type="button"
                  onClick={() => openModal(platform)}
                  className="w-full flex items-center justify-between gap-3 py-3 px-1 text-left hover:bg-sunken transition-colors"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <AppLogo name={platform.name} domain={platform.domain} />
                    <span className="text-sm text-ink truncate">
                      {platform.name}
                    </span>
                  </span>
                  {performance === undefined ? (
                    <span className="text-xs text-ghost shrink-0">Connect</span>
                  ) : (
                    <span
                      className={`text-sm font-medium shrink-0 ${
                        performance >= 0 ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {performance >= 0 ? "+" : ""}
                      {performance}%
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="py-8 text-center text-sm text-faint">
          No platforms match &quot;{query}&quot;
        </p>
      )}

      {/* Pagination */}
      <nav
        className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-line"
        aria-label="Platform pages"
      >
        <PageButton
          onClick={() => setPage(currentPage - 1)}
          disabled={currentPage === 1}
          ariaLabel="Previous page"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </PageButton>

        {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setPage(n)}
            aria-current={n === currentPage ? "page" : undefined}
            className={`w-8 h-8 flex items-center justify-center rounded-md border text-sm ${
              n === currentPage
                ? "border-brand text-brand font-semibold"
                : "border-line text-muted hover:bg-sunken"
            }`}
          >
            {n}
          </button>
        ))}

        <PageButton
          onClick={() => setPage(currentPage + 1)}
          disabled={currentPage === pageCount}
          ariaLabel="Next page"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </PageButton>
      </nav>

      {/* Connect modal — Instagram/Facebook run the real Meta OAuth flow;
          the remaining platforms are still placeholder connects. The key
          remounts the modal per platform so connect state resets cleanly. */}
      <ConnectModal
        key={modalPlatform?.id ?? "modal"}
        platform={modalPlatform}
        shown={modalShown}
        onClose={closeModal}
      />
    </div>
  );
}

function PageButton({
  onClick,
  disabled,
  ariaLabel,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="w-8 h-8 flex items-center justify-center rounded-md border border-line text-muted hover:bg-sunken disabled:opacity-40 disabled:pointer-events-none"
    >
      {children}
    </button>
  );
}

/**
 * Modal scales up from the centre of the page (open) and back down (close /
 * successful connect). `platform` stays mounted while `shown` flips to false
 * so the closing transition can finish before unmounting.
 */
function ConnectModal({
  platform,
  shown,
  onClose,
}: {
  platform: Platform | null;
  shown: boolean;
  onClose: () => void;
}) {
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  useEffect(() => {
    if (!platform) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [platform, onClose]);

  if (!platform) return null;

  const isWebsite = platform.id === "website";
  // Instagram, Facebook, TikTok and X are real OAuth flows (see
  // lib/integrations/social); every other platform still uses the placeholder.
  const socialProduct: SocialProduct | null =
    isSocialProduct(platform.id) && platform.id !== "tiktok_business" ? platform.id : null;

  const handleConnect = async () => {
    if (!socialProduct) {
      onClose();
      return;
    }
    setConnecting(true);
    setConnectError(null);
    try {
      const url = await startSocialAuthorization(socialProduct);
      window.location.assign(url);
    } catch (error) {
      setConnecting(false);
      setConnectError(error instanceof Error ? error.message : "The connection could not be started.");
    }
  };

  const socialCopy =
    socialProduct === "instagram"
      ? "Sign in with your Instagram professional account (Business or Creator) to grant read-only insights access. Personal accounts are not supported."
      : socialProduct === "facebook"
        ? "Sign in with Facebook to grant access to the Pages you manage. One login can connect multiple Pages."
        : socialProduct === "tiktok"
          ? "Sign in with TikTok for read-only access to your profile and videos. Impressions and reach are not part of the Display API — those need TikTok for Business."
          : socialProduct === "x"
            ? "Sign in with X for read-only access to your profile and posts, plus the metrics you are entitled to see."
            : null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 transition-opacity duration-500 ${
        shown ? "opacity-100" : "opacity-0"
      }`}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-modal-title"
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md rounded-xl bg-surface border border-line shadow-2xl p-6 text-center origin-center transition-all duration-500 ease-out ${
          shown ? "opacity-100 scale-100" : "opacity-0 scale-75"
        }`}
      >
        <div className="mx-auto w-14 h-14 rounded-xl bg-sunken border border-line flex items-center justify-center mb-4 overflow-hidden">
          <AppLogo name={platform.name} domain={platform.domain} className="h-8 w-8" />
        </div>

        <h2 id="connect-modal-title" className="text-lg font-semibold text-ink">
          {isWebsite ? "Connect your website" : `Connect ${platform.name}`}
        </h2>
        <p className="text-sm text-faint mt-2">
          {isWebsite
            ? "Add your website URL to start tracking sessions, visitors and the most visited pages."
            : (socialCopy ?? `Authenticate your ${platform.name} account to grant access to your ${platform.name} page.`)}
        </p>

        {isWebsite && (
          <input
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://yourwebsite.com"
            aria-label="Website URL"
            className="mt-4 w-full rounded-lg border border-line bg-sunken px-3 py-2.5 text-sm text-ink placeholder:text-ghost focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        )}

        {connectError && (
          <p role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {connectError}
          </p>
        )}

        <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-line bg-sunken px-3 py-1.5 text-xs font-medium text-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-brand" />
          {isWebsite
            ? "Website connection coming soon"
            : socialProduct
              ? "Read-only insights access — disconnect anytime"
              : "Social connection coming soon"}
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={handleConnect}
            disabled={connecting}
            className="flex-1 px-4 py-2.5 rounded-lg bg-brand hover:bg-brand-hover text-white text-sm font-medium transition-colors disabled:opacity-60"
          >
            {connecting ? "Redirecting…" : "Connect"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={connecting}
            className="flex-1 px-4 py-2.5 rounded-lg border border-line text-muted hover:bg-sunken text-sm font-medium transition-colors disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
