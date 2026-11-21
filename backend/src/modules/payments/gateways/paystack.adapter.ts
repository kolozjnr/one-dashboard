import { createHmac } from 'node:crypto';
import { GatewayError, type GatewayConfig, type GatewayCredentials, type GatewayRefundRequest, type GatewayRefundResult, type GatewayTransaction, type GatewayWebhookEvent, type InitializePaymentRequest, type InitializePaymentResponse, type PaymentGatewayAdapter } from '../gateway.types';
import { asDate, asNumber, asRecord, asString, bodyDigest, dig, fromMinorUnits, gatewayError, gatewayFetch, headerValue, safeEquals, toMinorUnits, normalizeCurrency } from '../gateway.util';

const BASE_URL = 'https://api.paystack.co';

// Paystack adapter. Amounts arrive in kobo (minor units) and the reference we minted
// at initialize time is echoed back, which is what lets a webhook be tied to exactly
// one Payment row.
export class PaystackAdapter implements PaymentGatewayAdapter {
  readonly key = 'paystack' as const;
  readonly displayName = 'Paystack';
  readonly supportsRefunds = true;
  // The webhook signature is an HMAC-SHA512 of the raw body. Paystack signs with the
  // secret key; an explicit webhook secret is accepted when operators rotate one.
  readonly requiredCredentials = ['secretKey'] as const;
  readonly requiredConfig = ['environment', 'currency'] as const;
  readonly defaultConfig: GatewayConfig = { environment: 'live', currency: 'NGN' };

  async initialize(request: InitializePaymentRequest, credentials: GatewayCredentials): Promise<InitializePaymentResponse> {
    const { status, json } = await gatewayFetch({
      method: 'POST',
      url: `${BASE_URL}/transaction/initialize`,
      headers: { Authorization: `Bearer ${this.secret(credentials)}` },
      body: JSON.stringify({
        email: request.email,
        amount: toMinorUnits(request.amount, request.currency),
        currency: request.currency,
        reference: request.reference,
        callback_url: request.callbackUrl,
        metadata: request.metadata,
      }),
    });
    if (status < 200 || status >= 300) throw gatewayError(status, json, 'Paystack rejected the payment initialization');
    const data = asRecord(dig(json, 'data'));
    const checkoutUrl = asString(dig(data, 'authorization_url'));
    if (!checkoutUrl) throw new GatewayError('BAD_RESPONSE', 'Paystack did not return an authorization URL');
    return { checkoutUrl, providerReference: asString(data?.reference) ?? request.reference };
  }

  async retrieve(reference: string, credentials: GatewayCredentials): Promise<GatewayTransaction> {
    const { status, json } = await gatewayFetch({
      url: `${BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
      headers: { Authorization: `Bearer ${this.secret(credentials)}` },
    });
    if (status === 404) throw new GatewayError('NOT_FOUND', 'Paystack has no transaction with that reference', 404);
    if (status < 200 || status >= 300) throw gatewayError(status, json, 'Paystack could not verify the transaction');
    const data = asRecord(dig(json, 'data'));
    if (!data) throw new GatewayError('BAD_RESPONSE', 'Paystack returned an empty verification payload');
    const providerStatus = asString(data.status)?.toLowerCase() ?? '';
    const currency = normalizeCurrency(asString(data.currency));
    const paidAt = asDate(data.paid_at) ?? asDate(data.transaction_date);
    return {
      outcome: this.outcome(providerStatus),
      providerPaymentId: data.id === undefined || data.id === null ? null : String(data.id),
      providerReference: asString(data.reference),
      reference: asString(data.reference),
      amount: asNumber(data.amount) === null ? null : fromMinorUnits(asNumber(data.amount)!, currency ?? 'NGN'),
      currency,
      paidAt,
      channel: asString(data.channel),
      customerEmail: asString(dig(data, 'customer', 'email')),
      failureReason: providerStatus === 'failed' || providerStatus === 'abandoned' ? asString(data.gateway_response) : null,
      raw: json,
    };
  }

  async refund(request: GatewayRefundRequest, credentials: GatewayCredentials): Promise<GatewayRefundResult> {
    const { status, json } = await gatewayFetch({
      method: 'POST',
      url: `${BASE_URL}/refund`,
      headers: { Authorization: `Bearer ${this.secret(credentials)}` },
      body: JSON.stringify({
        transaction: request.providerReference ?? request.reference,
        amount: toMinorUnits(request.amount, request.currency),
        ...(request.reason ? { reason: request.reason } : {}),
      }),
    });
    if (status < 200 || status >= 300) throw gatewayError(status, json, 'Paystack rejected the refund');
    const data = asRecord(dig(json, 'data'));
    const refundStatus = asString(data?.status)?.toLowerCase();
    // Paystack queues most refunds; only an explicitly completed refund is SUCCEEDED.
    return {
      providerReference: asString(data?.refund_reference) ?? asString(data?.id),
      amount: request.amount,
      status: refundStatus === 'processed' || refundStatus === 'completed' ? 'SUCCEEDED' : refundStatus === 'failed' ? 'FAILED' : 'PENDING',
      failureReason: refundStatus === 'failed' ? asString(data?.reason) ?? 'Refund failed at Paystack' : null,
      raw: json,
    };
  }

  verifyWebhookSignature(rawBody: Buffer, headers: Record<string, string | string[] | undefined>, credentials: GatewayCredentials): boolean {
    const signature = headerValue(headers, 'x-paystack-signature');
    if (!signature) return false;
    const secret = credentials.webhookSecret || credentials.secretKey;
    if (!secret) return false;
    const expected = createHmac('sha512', secret).update(rawBody).digest('hex');
    return safeEquals(signature, expected);
  }

  parseWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): GatewayWebhookEvent {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody.toString('utf8'));
    } catch {
      throw new GatewayError('BAD_RESPONSE', 'Paystack webhook body is not valid JSON');
    }
    const envelope = asRecord(parsed);
    const event = asString(envelope?.event) ?? 'unknown';
    const data = asRecord(dig(parsed, 'data'));
    const dataId = data?.id === undefined || data?.id === null ? null : String(data.id);
    const kind: GatewayWebhookEvent['kind'] = event.startsWith('refund.') ? 'REFUND' : event.startsWith('charge.') || event.startsWith('transaction.') ? 'PAYMENT' : 'OTHER';
    const metadata = this.stringMap(data?.metadata);
    const amountMinor = data ? asNumber(data.amount) : null;
    const currencyCode = asString(data?.currency);
    return {
      // Paystack has no per-delivery event id: transaction id + event type, or a body hash.
      eventId: dataId ? `${event}:${dataId}` : bodyDigest(rawBody),
      type: event,
      kind,
      outcome: kind === 'PAYMENT' ? this.outcome(asString(data?.status)?.toLowerCase() ?? this.eventOutcome(event)) : null,
      reference: asString(data?.reference),
      providerReference: asString(data?.reference),
      providerPaymentId: dataId,
      amount: amountMinor === null ? null : fromMinorUnits(amountMinor, currencyCode ?? 'NGN'),
      currency: normalizeCurrency(currencyCode),
      customerEmail: asString(dig(data, 'customer', 'email')),
      metadata,
      raw: parsed,
    };
  }

  async ping(credentials: GatewayCredentials): Promise<void> {
    const { status, json } = await gatewayFetch({ url: `${BASE_URL}/balance`, headers: { Authorization: `Bearer ${this.secret(credentials)}` } });
    if (status < 200 || status >= 300) throw gatewayError(status, json, 'Paystack credentials were rejected');
  }

  private secret(credentials: GatewayCredentials): string {
    const secret = credentials.secretKey;
    if (!secret) throw new GatewayError('NOT_CONFIGURED', 'Paystack secret key is not configured');
    return secret;
  }

  private outcome(status: string): GatewayTransaction['outcome'] {
    switch (status) {
      case 'success':
        return 'SUCCEEDED';
      case 'failed':
        return 'FAILED';
      case 'abandoned':
        return 'CANCELED';
      default:
        // pending, processing, ongoing, queued, reversed, empty: never assume success.
        return 'PENDING';
    }
  }

  private eventOutcome(event: string): string {
    if (event === 'charge.success') return 'success';
    if (event === 'charge.failed') return 'failed';
    if (event === 'charge.abandoned') return 'abandoned';
    return '';
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
