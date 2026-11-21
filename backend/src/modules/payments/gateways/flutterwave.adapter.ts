import { GatewayError, type GatewayConfig, type GatewayCredentials, type GatewayRefundRequest, type GatewayRefundResult, type GatewayTransaction, type GatewayWebhookEvent, type InitializePaymentRequest, type InitializePaymentResponse, type PaymentGatewayAdapter } from '../gateway.types';
import { asDate, asNumber, asRecord, asString, bodyDigest, dig, gatewayError, gatewayFetch, headerValue, normalizeCurrency, safeEquals } from '../gateway.util';

// Flutterwave adapter. Amounts are major units on this API, the checkout reference is
// our own `tx_ref`, and the webhook carries a plain `verif-hash` (not an HMAC).
export class FlutterwaveAdapter implements PaymentGatewayAdapter {
  readonly key = 'flutterwave' as const;
  readonly displayName = 'Flutterwave';
  readonly supportsRefunds = true;
  readonly requiredCredentials = ['secretKey', 'webhookSecretHash'] as const;
  readonly requiredConfig = ['environment', 'currency'] as const;
  readonly defaultConfig: GatewayConfig = { environment: 'live', currency: 'NGN' };

  async initialize(request: InitializePaymentRequest, credentials: GatewayCredentials, config: GatewayConfig): Promise<InitializePaymentResponse> {
    const { status, json } = await gatewayFetch({
      method: 'POST',
      url: `${this.baseUrl(config)}/v3/payments`,
      headers: { Authorization: `Bearer ${this.secret(credentials)}` },
      body: JSON.stringify({
        tx_ref: request.reference,
        amount: request.amount,
        currency: request.currency,
        redirect_url: request.callbackUrl,
        payment_options: 'card,banktransfer,ussd,mobilemoney',
        customer: { email: request.email },
        customizations: { title: request.description },
        meta: request.metadata,
      }),
    });
    if (status < 200 || status >= 300) throw gatewayError(status, json, 'Flutterwave rejected the payment initialization');
    const link = asString(dig(json, 'data', 'link'));
    if (!link) throw new GatewayError('BAD_RESPONSE', 'Flutterwave did not return a checkout link');
    return { checkoutUrl: link, providerReference: request.reference };
  }

  // Verification needs a Flutterwave transaction id; it is captured from the first
  // verify-by-reference response and reused afterwards.
  async retrieve(reference: string, credentials: GatewayCredentials, config: GatewayConfig, context?: { providerPaymentId?: string | null }): Promise<GatewayTransaction> {
    const providerPaymentId = context?.providerPaymentId ?? null;
    const url = providerPaymentId
      ? `${this.baseUrl(config)}/v3/transactions/verify/${encodeURIComponent(providerPaymentId)}`
      : `${this.baseUrl(config)}/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`;
    const { status, json } = await gatewayFetch({ url, headers: { Authorization: `Bearer ${this.secret(credentials)}` } });
    if (status === 404) throw new GatewayError('NOT_FOUND', 'Flutterwave has no transaction with that reference', 404);
    if (status < 200 || status >= 300) throw gatewayError(status, json, 'Flutterwave could not verify the transaction');
    const data = asRecord(dig(json, 'data'));
    if (!data) throw new GatewayError('BAD_RESPONSE', 'Flutterwave returned an empty verification payload');
    const providerStatus = asString(data.status)?.toLowerCase() ?? '';
    const currency = normalizeCurrency(asString(data.currency));
    return {
      outcome: this.outcome(providerStatus),
      providerPaymentId: data.id === undefined || data.id === null ? null : String(data.id),
      providerReference: asString(data.tx_ref),
      reference: asString(data.tx_ref),
      amount: asNumber(data.amount),
      currency,
      paidAt: asDate(data.created_at) ?? asDate(data.charged_at),
      channel: asString(data.payment_type) ?? asString(data.channel),
      customerEmail: asString(dig(data, 'customer', 'email')),
      failureReason: providerStatus === 'failed' || providerStatus === 'cancelled' ? asString(data.processor_response) ?? asString(data.error) : null,
      raw: json,
    };
  }

  async refund(request: GatewayRefundRequest, credentials: GatewayCredentials, config: GatewayConfig): Promise<GatewayRefundResult> {
    if (!request.providerPaymentId) throw new GatewayError('UNSUPPORTED', 'Flutterwave refunds require the transaction id captured during verification');
    const { status, json } = await gatewayFetch({
      method: 'POST',
      url: `${this.baseUrl(config)}/v3/refunds`,
      headers: { Authorization: `Bearer ${this.secret(credentials)}` },
      body: JSON.stringify({
        transaction_id: Number(request.providerPaymentId),
        amount: request.amount,
        currency: request.currency,
        ...(request.reason ? { comments: request.reason } : {}),
      }),
    });
    if (status < 200 || status >= 300) throw gatewayError(status, json, 'Flutterwave rejected the refund');
    const data = asRecord(dig(json, 'data'));
    const refundStatus = asString(data?.status)?.toLowerCase();
    return {
      providerReference: data?.id === undefined || data?.id === null ? null : String(data.id),
      amount: asNumber(data?.amount) ?? request.amount,
      status: refundStatus === 'completed' || refundStatus === 'succeeded' ? 'SUCCEEDED' : refundStatus === 'failed' ? 'FAILED' : 'PENDING',
      failureReason: refundStatus === 'failed' ? asString(data?.complete_message) ?? 'Refund failed at Flutterwave' : null,
      raw: json,
    };
  }

  verifyWebhookSignature(rawBody: Buffer, headers: Record<string, string | string[] | undefined>, credentials: GatewayCredentials): boolean {
    const signature = headerValue(headers, 'verif-hash');
    const secret = credentials.webhookSecretHash;
    if (!signature || !secret) return false;
    return safeEquals(signature, secret);
  }

  parseWebhook(rawBody: Buffer): GatewayWebhookEvent {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody.toString('utf8'));
    } catch {
      throw new GatewayError('BAD_RESPONSE', 'Flutterwave webhook body is not valid JSON');
    }
    const envelope = asRecord(parsed);
    const event = asString(envelope?.event) ?? 'unknown';
    const data = asRecord(dig(parsed, 'data'));
    const dataId = data?.id === undefined || data?.id === null ? null : String(data.id);
    const txRef = asString(data?.tx_ref);
    const kind: GatewayWebhookEvent['kind'] = event.startsWith('refund.') ? 'REFUND' : event.startsWith('charge.') || event.startsWith('payment.') ? 'PAYMENT' : 'OTHER';
    return {
      eventId: dataId ? `${event}:${dataId}` : txRef ? `${event}:${txRef}` : bodyDigest(rawBody),
      type: event,
      kind,
      outcome: kind === 'PAYMENT' ? this.outcome(asString(data?.status)?.toLowerCase() ?? '') : null,
      reference: txRef,
      providerReference: txRef,
      providerPaymentId: dataId,
      amount: asNumber(data?.amount),
      currency: normalizeCurrency(asString(data?.currency)),
      customerEmail: asString(dig(data, 'customer', 'email')),
      metadata: this.stringMap(data?.meta ?? data?.metadata),
      raw: parsed,
    };
  }

  async ping(credentials: GatewayCredentials, config: GatewayConfig): Promise<void> {
    const { status, json } = await gatewayFetch({ url: `${this.baseUrl(config)}/v3/balances?type=balance`, headers: { Authorization: `Bearer ${this.secret(credentials)}` } });
    if (status < 200 || status >= 300) throw gatewayError(status, json, 'Flutterwave credentials were rejected');
  }

  private baseUrl(config: GatewayConfig): string {
    return config.environment === 'test' ? 'https://sandbox-api.flutterwave.com' : 'https://api.flutterwave.com';
  }

  private secret(credentials: GatewayCredentials): string {
    const secret = credentials.secretKey;
    if (!secret) throw new GatewayError('NOT_CONFIGURED', 'Flutterwave secret key is not configured');
    return secret;
  }

  private outcome(status: string): GatewayTransaction['outcome'] {
    switch (status) {
      case 'successful':
      case 'success':
        return 'SUCCEEDED';
      case 'failed':
        return 'FAILED';
      case 'cancelled':
      case 'canceled':
        return 'CANCELED';
      default:
        // pending, queued, ongoing, reversed, empty: never assume success.
        return 'PENDING';
    }
  }

  private stringMap(value: unknown): Record<string, string> {
    const record = asRecord(value);
    if (!record) return {};
    const output: Record<string, string> = {};
    for (const [key, entry] of Object.entries(record)) {
      if (typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean') output[key] = String(entry);
    }
    return output;
  }
}
