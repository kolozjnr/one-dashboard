import { createHmac } from 'node:crypto';
import { GatewayError, type GatewayConfig, type GatewayCredentials, type GatewayRefundRequest, type GatewayRefundResult, type GatewayTransaction, type GatewayWebhookEvent, type InitializePaymentRequest, type InitializePaymentResponse, type PaymentGatewayAdapter } from '../gateway.types';
import { asNumber, asRecord, asString, bodyDigest, dig, fromMinorUnits, gatewayError, gatewayFetch, headerValue, normalizeCurrency, safeEquals, toMinorUnits } from '../gateway.util';

const BASE_URL = 'https://api.stripe.com';
const SIGNATURE_TOLERANCE_SECONDS = 300;

// Stripe adapter: a hosted Checkout Session is created per payment, the session id is
// stored as the provider reference, and our own reference travels inside session
// metadata so webhooks can be correlated back to exactly one Payment row.
export class StripeAdapter implements PaymentGatewayAdapter {
  readonly key = 'stripe' as const;
  readonly displayName = 'Stripe';
  readonly supportsRefunds = true;
  readonly requiredCredentials = ['secretKey', 'webhookSigningSecret'] as const;
  readonly requiredConfig = ['environment', 'currency'] as const;
  readonly defaultConfig: GatewayConfig = { environment: 'live', currency: 'USD' };

  async initialize(request: InitializePaymentRequest, credentials: GatewayCredentials, config: GatewayConfig): Promise<InitializePaymentResponse> {
    const currency = request.currency.toLowerCase();
    const form = new URLSearchParams();
    form.set('mode', 'payment');
    form.set('client_reference_id', request.reference);
    form.set('customer_email', request.email);
    form.set('success_url', request.callbackUrl);
    form.set('cancel_url', withQuery(request.callbackUrl, 'payment_status', 'canceled'));
    form.set('line_items[0][quantity]', '1');
    form.set('line_items[0][price_data][currency]', currency);
    form.set('line_items[0][price_data][unit_amount]', String(toMinorUnits(request.amount, request.currency)));
    form.set('line_items[0][price_data][product_data][name]', request.description);
    form.set('metadata[reference]', request.reference);
    for (const [key, value] of Object.entries(request.metadata)) form.set(`metadata[${key}]`, value);

    const { status, json } = await gatewayFetch({
      method: 'POST',
      url: `${this.baseUrl(config)}/v1/checkout/sessions`,
      headers: { Authorization: `Bearer ${this.secret(credentials)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    if (status < 200 || status >= 300) throw gatewayError(status, json, 'Stripe rejected the payment initialization');
    const session = asRecord(json);
    const url = asString(session?.url);
    const sessionId = asString(session?.id);
    if (!url || !sessionId) throw new GatewayError('BAD_RESPONSE', 'Stripe did not return a checkout session URL');
    return { checkoutUrl: url, providerReference: sessionId };
  }

  async retrieve(reference: string, credentials: GatewayCredentials, config: GatewayConfig, context?: { providerPaymentId?: string | null }): Promise<GatewayTransaction> {
    const sessionId = reference.startsWith('cs_') ? reference : context?.providerPaymentId?.startsWith('cs_') ? context.providerPaymentId : null;
    if (!sessionId) throw new GatewayError('UNSUPPORTED', 'Stripe verification requires the checkout session id captured at initialization');
    const { status, json } = await gatewayFetch({
      url: `${this.baseUrl(config)}/v1/checkout/sessions/${encodeURIComponent(sessionId)}?expand%5B%5D=payment_intent`,
      headers: { Authorization: `Bearer ${this.secret(credentials)}` },
    });
    if (status === 404) throw new GatewayError('NOT_FOUND', 'Stripe has no checkout session with that reference', 404);
    if (status < 200 || status >= 300) throw gatewayError(status, json, 'Stripe could not verify the transaction');
    const session = asRecord(json);
    if (!session) throw new GatewayError('BAD_RESPONSE', 'Stripe returned an empty verification payload');

    const paymentIntent = asRecord(session.payment_intent);
    const intentStatus = asString(paymentIntent?.status)?.toLowerCase();
    const sessionStatus = asString(session.status)?.toLowerCase() ?? '';
    const paymentStatus = asString(session.payment_status)?.toLowerCase() ?? '';
    const currency = normalizeCurrency(asString(paymentIntent?.currency) ?? asString(session.currency));
    const amountMinor = asNumber(paymentIntent?.amount) ?? asNumber(session.amount_total);
    const failed = intentStatus !== undefined && intentStatus !== 'succeeded';
    const createdSeconds = asNumber(paymentIntent?.created) ?? asNumber(session.created);
    const methodTypes = paymentIntent?.payment_method_types;
    const channel = Array.isArray(methodTypes) && typeof methodTypes[0] === 'string' ? methodTypes[0] : null;

    return {
      outcome: paymentStatus === 'paid' ? 'SUCCEEDED' : sessionStatus === 'expired' ? 'CANCELED' : failed && sessionStatus === 'complete' ? 'FAILED' : paymentStatus === 'unpaid' && sessionStatus === 'complete' ? 'FAILED' : 'PENDING',
      providerPaymentId: asString(paymentIntent?.id) ?? sessionId,
      providerReference: sessionId,
      reference: asString(session.client_reference_id) ?? asString(dig(paymentIntent, 'metadata', 'reference')) ?? asString(dig(session, 'metadata', 'reference')),
      amount: amountMinor === null ? null : fromMinorUnits(amountMinor, currency ?? 'USD'),
      currency,
      paidAt: createdSeconds === null ? null : new Date(createdSeconds * 1000),
      channel,
      customerEmail: asString(dig(session, 'customer_details', 'email')) ?? asString(session.customer_email),
      failureReason: failed ? asString(dig(paymentIntent, 'last_payment_error', 'message')) : null,
      raw: json,
    };
  }

  async refund(request: GatewayRefundRequest, credentials: GatewayCredentials, config: GatewayConfig): Promise<GatewayRefundResult> {
    const paymentIntent = request.providerPaymentId && request.providerPaymentId.startsWith('pi_') ? request.providerPaymentId : null;
    if (!paymentIntent) throw new GatewayError('UNSUPPORTED', 'Stripe refunds require the payment intent id captured during verification');
    const form = new URLSearchParams();
    form.set('payment_intent', paymentIntent);
    form.set('amount', String(toMinorUnits(request.amount, request.currency)));
    form.set('reason', 'requested_by_customer');
    form.set('metadata[reference]', request.reference);
    const { status, json } = await gatewayFetch({
      method: 'POST',
      url: `${this.baseUrl(config)}/v1/refunds`,
      headers: { Authorization: `Bearer ${this.secret(credentials)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    if (status < 200 || status >= 300) throw gatewayError(status, json, 'Stripe rejected the refund');
    const refund = asRecord(json);
    const refundStatus = asString(refund?.status)?.toLowerCase();
    const refundAmount = refund ? asNumber(refund.amount) : null;
    return {
      providerReference: asString(refund?.id),
      amount: refundAmount === null ? request.amount : fromMinorUnits(refundAmount, request.currency),
      status: refundStatus === 'succeeded' ? 'SUCCEEDED' : refundStatus === 'failed' || refundStatus === 'canceled' ? 'FAILED' : 'PENDING',
      failureReason: refundStatus === 'failed' || refundStatus === 'canceled' ? 'Refund failed at Stripe' : null,
      raw: json,
    };
  }

  verifyWebhookSignature(rawBody: Buffer, headers: Record<string, string | string[] | undefined>, credentials: GatewayCredentials): boolean {
    const header = headerValue(headers, 'stripe-signature');
    const secret = credentials.webhookSigningSecret;
    if (!header || !secret) return false;
    const parts = header.split(',').map((part) => part.trim());
    const timestamp = parts.filter((part) => part.startsWith('t=')).map((part) => part.slice(2))[0];
    const signatures = parts.filter((part) => part.startsWith('v1=')).map((part) => part.slice(3));
    if (!timestamp || signatures.length === 0) return false;
    const seconds = Number(timestamp);
    if (!Number.isFinite(seconds) || Math.abs(Math.floor(Date.now() / 1000) - seconds) > SIGNATURE_TOLERANCE_SECONDS) return false;
    const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody.toString('utf8')}`).digest('hex');
    return signatures.some((candidate) => safeEquals(candidate, expected));
  }

  parseWebhook(rawBody: Buffer): GatewayWebhookEvent {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody.toString('utf8'));
    } catch {
      throw new GatewayError('BAD_RESPONSE', 'Stripe webhook body is not valid JSON');
    }
    const envelope = asRecord(parsed);
    const type = asString(envelope?.type) ?? asString(envelope?.event) ?? 'unknown';
    const objectId = asRecord(dig(parsed, 'data', 'object'));
    const eventId = asString(envelope?.id);
    const kind: GatewayWebhookEvent['kind'] = type.startsWith('refund.') ? 'REFUND' : type.startsWith('checkout.session') || type.startsWith('payment_intent') || type.startsWith('charge.') ? 'PAYMENT' : 'OTHER';
    const currency = normalizeCurrency(asString(objectId?.currency));
    const amountMinor = asNumber(objectId?.amount_total) ?? asNumber(objectId?.amount);
    const paymentIntentId = asString(objectId?.payment_intent);
    const sessionId = type.startsWith('checkout.session') ? asString(objectId?.id) : null;

    return {
      eventId: eventId ?? `${type}:${sessionId ?? paymentIntentId ?? bodyDigest(rawBody)}`,
      type,
      kind,
      outcome: kind === 'PAYMENT' ? this.outcome(type, objectId) : null,
      reference: asString(objectId?.client_reference_id) ?? asString(dig(objectId, 'metadata', 'reference')),
      // Only session events carry the reference we stored as providerReference; other
      // events rely on `reference` above for the lookup instead of overwriting it.
      providerReference: sessionId,
      providerPaymentId: paymentIntentId ?? asString(objectId?.id),
      amount: amountMinor === null || !currency ? null : fromMinorUnits(amountMinor, currency),
      currency,
      customerEmail: asString(dig(objectId, 'customer_details', 'email')) ?? asString(objectId?.customer_email),
      metadata: this.stringMap(objectId?.metadata),
      raw: parsed,
    };
  }

  async ping(credentials: GatewayCredentials, config: GatewayConfig): Promise<void> {
    const { status, json } = await gatewayFetch({ url: `${this.baseUrl(config)}/v1/balance`, headers: { Authorization: `Bearer ${this.secret(credentials)}` } });
    if (status < 200 || status >= 300) throw gatewayError(status, json, 'Stripe credentials were rejected');
  }

  private baseUrl(_config: GatewayConfig): string {
    // Stripe uses one API host for both test and live keys; the key itself selects the mode.
    return BASE_URL;
  }

  private secret(credentials: GatewayCredentials): string {
    const secret = credentials.secretKey;
    if (!secret) throw new GatewayError('NOT_CONFIGURED', 'Stripe secret key is not configured');
    return secret;
  }

  private outcome(type: string, object: Record<string, unknown> | null): GatewayTransaction['outcome'] {
    if (type === 'checkout.session.expired') return 'CANCELED';
    if (type === 'payment_intent.canceled') return 'CANCELED';
    if (type === 'payment_intent.succeeded') return 'SUCCEEDED';
    if (type === 'payment_intent.payment_failed') return 'FAILED';
    if (type === 'checkout.session.completed') {
      const paymentStatus = asString(object?.payment_status)?.toLowerCase();
      if (paymentStatus === 'paid' || paymentStatus === 'no_payment_required') return 'SUCCEEDED';
      return 'FAILED';
    }
    const paymentStatus = asString(object?.payment_status)?.toLowerCase();
    if (paymentStatus === 'paid') return 'SUCCEEDED';
    if (paymentStatus === 'unpaid' && asString(object?.status) === 'complete') return 'FAILED';
    return 'PENDING';
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

function withQuery(url: string, key: string, value: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}
