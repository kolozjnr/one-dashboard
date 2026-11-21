// Provider-independent payment contract. Every gateway (Paystack, Flutterwave,
// Stripe, ...) implements exactly this interface, so nothing above the adapter layer
// ever branches on a provider name except to pick an adapter and to label rows.
//
// Amounts crossing this boundary are always *major* units (10.50 USD) in plain
// numbers; adapters own the conversion to each provider's minor unit (kobo, cents)
// and must report the exact integer they received so the caller can compare without
// floating point drift.

export type GatewayProviderKey = 'paystack' | 'flutterwave' | 'stripe';

export const GATEWAY_PROVIDER_KEYS: GatewayProviderKey[] = ['paystack', 'flutterwave', 'stripe'];

export function isGatewayProviderKey(value: string): value is GatewayProviderKey {
  return (GATEWAY_PROVIDER_KEYS as string[]).includes(value);
}

/** Decrypted secrets for one gateway (secret key, webhook secret, ...). */
export type GatewayCredentials = Record<string, string>;

/** Non-secret configuration for one gateway (environment, currency, callback base). */
export type GatewayConfig = Record<string, string>;

export interface InitializePaymentRequest {
  /** Our unique transaction reference; providers that allow a caller-supplied id must echo it. */
  reference: string;
  /** Major units, already reduced by any discount, always taken from the plan row. */
  amount: number;
  currency: string;
  email: string;
  description: string;
  /** Where the provider sends the browser back to; never a source of truth. */
  callbackUrl: string;
  /** Provider metadata echoed back by webhooks; used as a cross-check only. */
  metadata: Record<string, string>;
}

export interface InitializePaymentResponse {
  checkoutUrl: string;
  /** The provider's own reference when it differs from ours (Stripe session ids, ...). */
  providerReference: string | null;
}

/** Normalized terminal/pending state reported by a provider. */
export type GatewayOutcome = 'SUCCEEDED' | 'FAILED' | 'CANCELED' | 'PENDING';

/**
 * Normalized provider-side view of one transaction. Returned by retrieve(); the
 * payment service — never the adapter — decides whether it is trustworthy enough to
 * move money state, by comparing reference, amount, currency and association.
 */
export interface GatewayTransaction {
  outcome: GatewayOutcome;
  /** Provider's transaction id, when the provider exposes one. */
  providerPaymentId: string | null;
  providerReference: string | null;
  /** The reference the provider echoes back; a mismatch with ours is a rejection. */
  reference: string | null;
  amount: number | null;
  currency: string | null;
  paidAt: Date | null;
  channel: string | null;
  customerEmail: string | null;
  failureReason: string | null;
  raw: unknown;
}

export interface GatewayRefundRequest {
  reference: string;
  providerReference: string | null;
  providerPaymentId: string | null;
  amount: number;
  currency: string;
  reason?: string | null;
}

export interface GatewayRefundResult {
  providerReference: string | null;
  amount: number;
  status: 'SUCCEEDED' | 'PENDING' | 'FAILED';
  failureReason: string | null;
  raw: unknown;
}

/** Payment-shaped webhook delivery, normalized from the provider's own envelope. */
export interface GatewayWebhookEvent {
  /** Stable id for duplicate suppression; falls back to a body hash when the provider sends none. */
  eventId: string;
  type: string;
  kind: 'PAYMENT' | 'REFUND' | 'OTHER';
  outcome: GatewayOutcome | null;
  reference: string | null;
  providerReference: string | null;
  providerPaymentId: string | null;
  amount: number | null;
  currency: string | null;
  customerEmail: string | null;
  /** Provider metadata (workspace/subscription ids when we attached them at checkout). */
  metadata: Record<string, string>;
  raw: unknown;
}

export interface PaymentGatewayAdapter {
  readonly key: GatewayProviderKey;
  readonly displayName: string;
  readonly supportsRefunds: boolean;
  /** Secret keys that must be present before the gateway can be activated. */
  readonly requiredCredentials: readonly string[];
  /** Non-secret config keys that must be present before the gateway can be activated. */
  readonly requiredConfig: readonly string[];
  /** Sensible defaults merged under submitted config (environment, currency, ...). */
  readonly defaultConfig: GatewayConfig;

  initialize(request: InitializePaymentRequest, credentials: GatewayCredentials, config: GatewayConfig): Promise<InitializePaymentResponse>;

  /** Reads the transaction from the provider's API (trusted endpoint, not a redirect). */
  retrieve(reference: string, credentials: GatewayCredentials, config: GatewayConfig, context?: { providerPaymentId?: string | null }): Promise<GatewayTransaction>;

  refund(request: GatewayRefundRequest, credentials: GatewayCredentials, config: GatewayConfig): Promise<GatewayRefundResult>;

  /** Constant-time signature check over the exact raw body bytes. */
  verifyWebhookSignature(rawBody: Buffer, headers: Record<string, string | string[] | undefined>, credentials: GatewayCredentials): boolean;

  /** Parses an already signature-checked body into the normalized event shape. */
  parseWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): GatewayWebhookEvent;

  /** Cheap authenticated call used by the admin "test credentials" action. */
  ping(credentials: GatewayCredentials, config: GatewayConfig): Promise<void>;
}

/** Failure raised by an adapter; `message` is safe to log and to return to operators. */
export class GatewayError extends Error {
  constructor(
    readonly code: 'UPSTREAM_ERROR' | 'NOT_FOUND' | 'NOT_CONFIGURED' | 'UNSUPPORTED' | 'BAD_RESPONSE',
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'GatewayError';
  }
}
