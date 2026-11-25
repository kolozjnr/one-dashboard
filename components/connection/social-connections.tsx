"use client";

import { useCallback, useEffect, useState } from "react";

import { AppLogo } from "@/components/app-logo";
import {
  OAUTH_BANNER_PARAMS,
  PRODUCT_META,
  disconnectSocialConnection,
  listSocialConnections,
  oauthBanner,
  startSocialAuthorization,
  type SocialAccountSummary,
  type SocialAvailableProduct,
  type SocialProduct,
} from "@/lib/integrations/social";

/**
 * Connected social accounts (Instagram, Facebook, TikTok, TikTok for
 * Business, X) on the Connections page. Loads from the real integrations API,
 * shows granted scopes and status, starts reconnect flows, and disconnects
 * (which destroys the stored tokens server-side). The `?socialOAuth=` query
 * banner reflects the outcome of the OAuth redirect that lands on this page.
 */
export function SocialConnections() {
  const [accounts, setAccounts] = useState<SocialAccountSummary[]>([]);
  const [available, setAvailable] = useState<SocialAvailableProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await listSocialConnections();
      setAccounts(data.accounts);
      setAvailable(data.available);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connections could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // The `?socialOAuth=` outcome only exists after a full-page redirect from
    // a provider, so it cannot be read during render without mismatching the
    // server HTML — the mount effect is the correct place (same reasoning as
    // the login flash in app/(auth)/login). One extra render is intentional.
    const params = new URLSearchParams(window.location.search);
    const outcome = oauthBanner(params);
    if (outcome) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBanner(outcome);
      for (const key of OAUTH_BANNER_PARAMS) params.delete(key);
      const query = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    }
    void refresh();
  }, [refresh]);

  const handleConnect = async (product: SocialAvailableProduct["product"]) => {
    setError(null);
    try {
      const url = await startSocialAuthorization(product);
      window.location.assign(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The connection could not be started.");
    }
  };

  const handleDisconnect = async (account: SocialAccountSummary) => {
    setBusyId(account.id);
    try {
      await disconnectSocialConnection(account.id);
      setAccounts((current) => current.filter((item) => item.id !== account.id));
      setBanner({ tone: "success", message: `${account.displayName} disconnected — stored tokens were deleted.` });
    } catch (err) {
      setError(err instanceof Error ? err.message : "The account could not be disconnected.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="mt-6" aria-label="Connected social accounts">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-ink">Social accounts</h2>
        <span className="text-xs text-faint">Instagram, Facebook, TikTok &amp; X</span>
      </div>

      {banner && (
        <p
          role="status"
          className={`mb-3 rounded-lg border px-3 py-2 text-sm ${
            banner.tone === "success"
              ? "border-green-300 bg-green-50 text-green-700"
              : "border-red-300 bg-red-50 text-red-700"
          }`}
        >
          {banner.message}
        </p>
      )}
      {error && (
        <p role="alert" className="mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="py-6 text-center text-sm text-faint">Loading connections…</p>
      ) : accounts.length === 0 ? (
        <p className="py-6 text-center text-sm text-faint">
          No social accounts connected yet. Use a platform&rsquo;s Connect action to authorize it.
        </p>
      ) : (
        <ul className="space-y-3">
          {accounts.map((account) => {
            const meta = PRODUCT_META[account.product] ?? { label: account.product, domain: "", kind: account.product };
            return (
              <li key={account.id} className="rounded-lg border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <AppLogo name={meta.label} domain={meta.domain} className="h-7 w-7 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">
                        {account.displayName}
                        {account.linkedInstagram?.username ? (
                          <span className="ml-2 font-normal text-faint">· IG {account.linkedInstagram.username}</span>
                        ) : null}
                      </p>
                      <p className="text-xs text-faint mt-0.5">
                        {meta.kind}
                        {account.accountType ? ` · ${account.accountType}` : ""}
                        {account.lastSyncedAt
                          ? ` · synced ${new Date(account.lastSyncedAt).toLocaleString()}`
                          : " · not synced yet"}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <StatusBadge status={account.status} />
                        {account.scopes.map((scope) => (
                          <span
                            key={scope}
                            className="rounded-full bg-sunken border border-line px-2 py-0.5 text-[11px] text-muted"
                            title="Granted permission"
                          >
                            {scope}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDisconnect(account)}
                    disabled={busyId === account.id}
                    className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted hover:bg-sunken transition-colors disabled:opacity-50"
                  >
                    {busyId === account.id ? "Disconnecting…" : "Disconnect"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {available.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {available.map((product) => {
            const alreadyConnected = accounts.some((account) => account.product === product.product);
            return (
              <button
                key={product.product}
                type="button"
                onClick={() => void handleConnect(product.product)}
                disabled={!product.configured}
                title={
                  (product.configured
                    ? `Request: ${product.scopes.length ? product.scopes.join(", ") : "account authorization"}` +
                      (product.product === "tiktok_business"
                        ? " (advertiser analytics — separate app and review)"
                        : product.product === "tiktok"
                          ? " (profile and videos only — no business analytics)"
                          : "")
                    : `${product.label} login is not configured on this server`) +
                  `\nCallback URI to register with ${product.label}, exactly: ${product.redirectUri}`
                }
                className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted hover:bg-sunken transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {alreadyConnected ? `Connect another ${product.label}` : `Connect ${product.label}`}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "CONNECTED"
      ? "border-green-300 bg-green-50 text-green-700"
      : status === "NEEDS_REAUTH"
        ? "border-amber-300 bg-amber-50 text-amber-700"
        : "border-line bg-sunken text-muted";
  const label =
    status === "CONNECTED" ? "Connected" : status === "NEEDS_REAUTH" ? "Reconnect required" : status.toLowerCase();
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone}`}>{label}</span>
  );
}

/** Re-exported for pages that need the product union in props. */
export type { SocialProduct };
