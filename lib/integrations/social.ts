import { apiRequest } from "@/lib/api-client";
import { workspaceService } from "@/lib/workspace/service";

/** Social OAuth products supported by the backend integrations module. */
export type SocialProduct = "instagram" | "facebook" | "tiktok" | "tiktok_business" | "x";

export interface SocialAccountSummary {
  id: string;
  product: SocialProduct;
  providerAccountId: string;
  displayName: string;
  status: string;
  /** Scopes the person granted (never the access token itself). */
  scopes: string[];
  grantedAt: string | null;
  tokenExpiresAt: string | null;
  lastSyncedAt: string | null;
  tasks: string[];
  accountType: string | null;
  linkedInstagram: { id: string; username: string } | null;
}

export interface SocialAvailableProduct {
  product: SocialProduct;
  label: string;
  configured: boolean;
  scopes: string[];
  /** Callback URL the provider must have registered, exactly as sent. */
  redirectUri: string;
}

/** Display copy + favicon domain per product (used by the connections UI). */
export const PRODUCT_META: Record<
  SocialProduct,
  { label: string; domain: string; kind: string }
> = {
  instagram: { label: "Instagram", domain: "instagram.com", kind: "Instagram professional account" },
  facebook: { label: "Facebook", domain: "facebook.com", kind: "Facebook Page" },
  tiktok: { label: "TikTok", domain: "tiktok.com", kind: "TikTok (Display API)" },
  tiktok_business: { label: "TikTok for Business", domain: "tiktok.com", kind: "TikTok advertiser" },
  x: { label: "X", domain: "x.com", kind: "X account" },
};

export function isSocialProduct(value: string | null | undefined): value is SocialProduct {
  return value === "instagram" || value === "facebook" || value === "tiktok" || value === "tiktok_business" || value === "x";
}

async function currentWorkspaceId(): Promise<string> {
  let id = workspaceService.getId();
  if (!id) {
    await workspaceService.initialize().catch(() => undefined);
    id = workspaceService.getId();
  }
  if (!id) throw new Error("Select a workspace before connecting an account.");
  return id;
}

/** Starts a provider authorization flow; returns the URL the browser must open. */
export async function startSocialAuthorization(product: SocialProduct): Promise<string> {
  const workspaceId = await currentWorkspaceId();
  const result = await apiRequest<{ url: string; product: SocialProduct; scopes: string[] }>(
    `workspaces/${workspaceId}/integrations/authorize`,
    { method: "POST", body: { product } },
  );
  return result.url;
}

export async function listSocialConnections(): Promise<{
  accounts: SocialAccountSummary[];
  available: SocialAvailableProduct[];
}> {
  const workspaceId = await currentWorkspaceId();
  return apiRequest(`workspaces/${workspaceId}/integrations`);
}

export async function disconnectSocialConnection(accountId: string): Promise<{ id: string; status: string }> {
  const workspaceId = await currentWorkspaceId();
  return apiRequest(`workspaces/${workspaceId}/integrations/${accountId}/disconnect`, { method: "POST" });
}

/** Query keys the callback routes append to /connection; cleared after reading. */
export const OAUTH_BANNER_PARAMS = ["socialOAuth", "product", "code"] as const;

/** Friendly copy for the `?socialOAuth=` codes the callback routes redirect with. */
export function oauthBanner(params: URLSearchParams): { tone: "success" | "error"; message: string } | null {
  const status = params.get("socialOAuth");
  if (!status) return null;
  const rawProduct = params.get("product");
  const label = isSocialProduct(rawProduct) ? PRODUCT_META[rawProduct].label : "The provider";

  if (status === "connected") {
    return { tone: "success", message: `${label} connected. Your accounts are now being synced.` };
  }
  if (status === "denied") {
    return { tone: "error", message: "Authorization was cancelled — nothing was connected." };
  }
  switch (params.get("code")) {
    case "STATE_INVALID":
      return { tone: "error", message: "The sign-in link expired or was invalid. Please start the connection again." };
    case "NOT_CONFIGURED":
      return { tone: "error", message: `${label} login is not configured on this server yet.` };
    case "NO_ACCOUNTS":
      return { tone: "error", message: `No eligible accounts were found for this ${label} login.` };
    case "UNSUPPORTED_ACCOUNT":
      return { tone: "error", message: "This account type cannot be connected — no analytics are available for it." };
    case "ACCESS_DENIED":
      return { tone: "error", message: "Authorization was cancelled — nothing was connected." };
    case "REVOKED_PERMISSION":
      return { tone: "error", message: `${label} revoked access. Please reconnect the account.` };
    case "UPSTREAM_ERROR":
      return { tone: "error", message: `${label} did not complete the authorization. Please try again.` };
    default:
      return { tone: "error", message: "The connection could not be completed. Please try again." };
  }
}
