import { BadRequestException, Injectable, PayloadTooLargeException, UnauthorizedException } from '@nestjs/common';
import type { Payment, PaymentEvent, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { GatewayWebhookEvent } from './gateway.types';
import { bodyDigest } from './gateway.util';
import { PaymentGatewaysService } from './payment-gateways.service';
import { PaymentNotificationsService } from './payment-notifications.service';
import { PaymentProcessingService, PaymentVerificationError, type ProviderEvidence } from './payment-processing.service';
import { isUniqueViolation } from './prisma-errors';

const MAX_WEBHOOK_BYTES = 1_000_000;

export interface WebhookOutcome {
  status: PaymentEvent['status'];
  message: string;
}

/**
 * Inbound webhook ingestion. The rules, in order:
 *
 *  1. A delivery is only acted on after its signature verifies against the exact raw
 *     bytes (constant-time compare, provider-specific scheme).
 *  2. Every delivery — valid or not — is logged as a `PaymentEvent` before anything
 *     else, keyed by `provider:eventId` so redeliveries are database-level no-ops.
 *  3. The payment is located by reference, provider reference, or the provider
 *     transaction id we stored at verification time; unmatched events are IGNORED.
 *  4. Amount, currency and association comparisons run before any money state moves;
 *     mismatches are REJECTED (never retried), unexpected errors are FAILED (the
 *     provider may retry those).
 *  5. Success/failure application and the subscription transition happen inside one
 *     database transaction via PaymentProcessingService.
 */
@Injectable()
export class PaymentWebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly gateways: PaymentGatewaysService,
    private readonly processing: PaymentProcessingService,
    private readonly notifications: PaymentNotificationsService,
  ) {}

  async handle(provider: string, rawBody: Buffer, headers: Record<string, string | string[] | undefined>): Promise<WebhookOutcome> {
    if (rawBody.length > MAX_WEBHOOK_BYTES) {
      throw new PayloadTooLargeException({ code: 'WEBHOOK_TOO_LARGE', message: 'Webhook payload exceeds 1MB', details: [] });
    }
    // Unknown provider → 404, provider without stored credentials → 409.
    const gateway = await this.gateways.resolveConfigured(provider);
    const signatureValid = gateway.adapter.verifyWebhookSignature(rawBody, headers, gateway.credentials);

    let event: GatewayWebhookEvent | null = null;
    let parseError: string | null = null;
    try {
      event = gateway.adapter.parseWebhook(rawBody, headers);
    } catch (error) {
      parseError = error instanceof Error ? error.message : 'Webhook body could not be parsed';
    }

    if (!signatureValid) {
      // Still logged (payload included) so operators can see attempted forgeries.
      const { row } = await this.recordEvent({
        provider,
        event,
        rawBody,
        signatureValid: false,
        status: 'REJECTED',
        summary: 'Invalid webhook signature',
        payload: event?.raw,
      });
      await this.audit.record({
        actorId: null,
        action: 'payment.webhook_rejected',
        targetType: 'payment_event',
        targetId: row.id,
        metadata: { provider, type: event?.type ?? 'unknown', reason: 'signature' },
      });
      throw new UnauthorizedException({ code: 'WEBHOOK_SIGNATURE_INVALID', message: 'Webhook signature verification failed', details: [] });
    }

    if (!event || parseError) {
      const { row } = await this.recordEvent({
        provider,
        event: null,
        rawBody,
        signatureValid: true,
        status: 'REJECTED',
        summary: parseError ?? 'Webhook body could not be parsed',
      });
      throw new BadRequestException({ code: 'WEBHOOK_UNPARSEABLE', message: parseError ?? 'Webhook body could not be parsed', details: [], eventId: row.id });
    }

    const { row, created } = await this.recordEvent({
      provider,
      event,
      rawBody,
      signatureValid: true,
      status: 'RECEIVED',
      summary: 'Signature verified',
      payload: event.raw,
      replayFailed: true,
    });
    if (!created) {
      // Duplicate delivery: the first attempt owns the outcome (PROCESSED, IGNORED,
      // REJECTED, ...). FAILED rows may be replayed so a crashed run can be retried.
      return { status: row.status, message: `Duplicate delivery; event already ${row.status}` };
    }

    const payment = await this.findPayment(provider, event);
    if (!payment) {
      await this.finalize(row.id, 'IGNORED', 'No payment matches this event');
      return { status: 'IGNORED', message: 'No payment matches this event' };
    }
    await this.prisma.paymentEvent.update({ where: { id: row.id }, data: { paymentId: payment.id, workspaceId: payment.workspaceId } });

    if (event.kind === 'PAYMENT') return this.applyPaymentEvent(row, payment, event);
    if (event.kind === 'REFUND') return this.applyRefundEvent(row, payment, event);
    await this.finalize(row.id, 'IGNORED', `Unhandled event type ${event.type}`);
    return { status: 'IGNORED', message: `Unhandled event type ${event.type}` };
  }

  // ---- Payment events -------------------------------------------------------------

  private async applyPaymentEvent(event: PaymentEvent, payment: Payment, delivery: GatewayWebhookEvent): Promise<WebhookOutcome> {
    if (!delivery.outcome || delivery.outcome === 'PENDING') {
      await this.finalize(event.id, 'IGNORED', `Provider reported a non-terminal state (${delivery.type})`);
      return { status: 'IGNORED', message: 'Provider reported a non-terminal state' };
    }

    const evidence: ProviderEvidence = {
      source: 'webhook',
      outcome: delivery.outcome,
      reference: delivery.reference,
      amount: delivery.amount,
      currency: delivery.currency,
      providerReference: delivery.providerReference,
      providerPaymentId: delivery.providerPaymentId,
      customerEmail: delivery.customerEmail,
      association: {
        workspaceId: typeof delivery.metadata.workspaceId === 'string' ? delivery.metadata.workspaceId : null,
        subscriptionId: typeof delivery.metadata.subscriptionId === 'string' ? delivery.metadata.subscriptionId : null,
      },
    };

    try {
      const result = await this.processing.apply(payment, evidence, {
        eventId: event.id,
        metadata: { gatewayEvent: delivery.type },
      });
      const status = result.changed ? 'PROCESSED' : 'DUPLICATE';
      const summary = result.changed
        ? `Applied ${delivery.outcome} (${result.transition})`
        : `Already settled as ${result.payment.status}; delivery not reapplied`;
      await this.finalize(event.id, status, summary);
      if (result.transition === 'ACTIVATED' && result.subscription) {
        await this.notifications.confirmSubscriptionActivated({
          workspaceId: payment.workspaceId,
          subscription: result.subscription,
          reference: payment.reference,
        });
      }
      return { status, message: summary };
    } catch (error) {
      if (error instanceof PaymentVerificationError) {
        // Mismatched reference/amount/currency/association: log and never retry.
        await this.finalize(event.id, 'REJECTED', `${error.code}: ${error.message}`);
        await this.audit.record({
          workspaceId: payment.workspaceId,
          actorId: null,
          action: 'payment.verification_rejected',
          targetType: 'payment',
          targetId: payment.id,
          metadata: { code: error.code, message: error.message, source: 'webhook', eventId: event.id, gatewayEvent: delivery.type },
        });
        return { status: 'REJECTED', message: error.message };
      }
      // Unexpected failure (database, ...): mark FAILED so the provider's retry is allowed.
      await this.finalize(event.id, 'FAILED', `Processing error: ${this.message(error)}`);
      throw error;
    }
  }

  // ---- Refund events --------------------------------------------------------------

  private async applyRefundEvent(event: PaymentEvent, payment: Payment, delivery: GatewayWebhookEvent): Promise<WebhookOutcome> {
    if (payment.status !== 'SUCCEEDED' && payment.status !== 'PARTIALLY_REFUNDED') {
      await this.finalize(event.id, 'IGNORED', `Payment is ${payment.status}; nothing to refund`);
      return { status: 'IGNORED', message: `Payment is ${payment.status}; nothing to refund` };
    }
    if (delivery.amount === null || !delivery.currency) {
      await this.finalize(event.id, 'REJECTED', 'Refund event did not report an amount and currency');
      return { status: 'REJECTED', message: 'Refund event did not report an amount and currency' };
    }
    const result = await this.processing.recordRefund(payment, {
      provider: payment.provider,
      providerReference: delivery.providerReference ?? delivery.reference,
      amount: delivery.amount,
      status: refundOutcomeFromType(delivery.type),
      reason: delivery.type,
      source: 'webhook',
      actorId: null,
    });
    const summary = `Refund ${result.refundId} recorded from ${delivery.type}`;
    await this.finalize(event.id, 'PROCESSED', summary);
    return { status: 'PROCESSED', message: summary };
  }

  // ---- Internals -----------------------------------------------------------------

  /** Locates the payment this delivery belongs to, across all three provider keys. */
  private async findPayment(provider: string, event: GatewayWebhookEvent): Promise<Payment | null> {
    const clauses: Prisma.PaymentWhereInput[] = [];
    if (event.reference) clauses.push({ reference: event.reference });
    if (event.providerReference) clauses.push({ provider, providerReference: event.providerReference });
    if (event.providerPaymentId) clauses.push({ provider, metadata: { path: ['providerTransactionId'], equals: event.providerPaymentId } });
    if (clauses.length === 0) return null;
    return this.prisma.payment.findFirst({ where: { OR: clauses } });
  }

  private async recordEvent(input: {
    provider: string;
    event: GatewayWebhookEvent | null;
    rawBody: Buffer;
    signatureValid: boolean;
    status: PaymentEvent['status'];
    summary: string;
    payload?: unknown;
    replayFailed?: boolean;
  }): Promise<{ row: PaymentEvent; created: boolean }> {
    const providerEventId = (input.event?.eventId ?? bodyDigest(input.rawBody)).slice(0, 200);
    const idempotencyKey = `${input.provider}:${providerEventId}`.slice(0, 260);
    const existing = await this.prisma.paymentEvent.findFirst({
      where: { OR: [{ idempotencyKey }, { provider: input.provider, providerEventId }] },
    });
    if (existing) {
      if (input.replayFailed && existing.status === 'FAILED') {
        const row = await this.prisma.paymentEvent.update({
          where: { id: existing.id },
          data: {
            status: 'RECEIVED',
            signatureValid: input.signatureValid,
            receivedAt: new Date(),
            summary: 'Replayed after a failed processing attempt',
            ...(input.payload !== undefined ? { payload: input.payload as Prisma.InputJsonValue } : {}),
          },
        });
        return { row, created: true };
      }
      return { row: existing, created: false };
    }

    try {
      const row = await this.prisma.paymentEvent.create({
        data: {
          provider: input.provider,
          providerEventId,
          idempotencyKey,
          type: input.event?.type ?? 'unknown',
          status: input.status,
          signatureValid: input.signatureValid,
          outcome: input.event?.outcome ?? null,
          summary: input.summary.slice(0, 500),
          ...(input.payload !== undefined ? { payload: input.payload as Prisma.InputJsonValue } : {}),
        },
      });
      return { row, created: true };
    } catch (error) {
      if (isUniqueViolation(error)) {
        const raced = await this.prisma.paymentEvent.findFirst({ where: { OR: [{ idempotencyKey }, { provider: input.provider, providerEventId }] } });
        if (raced) return { row: raced, created: false };
      }
      throw error;
    }
  }

  private async finalize(eventId: string, status: PaymentEvent['status'], summary: string): Promise<void> {
    await this.prisma.paymentEvent.update({
      where: { id: eventId },
      data: { status, summary: summary.slice(0, 500), processedAt: new Date() },
    });
  }

  private message(error: unknown): string {
    return (error instanceof Error ? error.message : 'unknown error').slice(0, 200);
  }
}

/** Conservative refund interpretation of a provider event type string. */
function refundOutcomeFromType(type: string): 'SUCCEEDED' | 'PENDING' | 'FAILED' {
  const normalized = type.toLowerCase();
  if (normalized.includes('fail') || normalized.includes('reject')) return 'FAILED';
  if (normalized.includes('pending') || normalized.includes('created') || normalized.includes('requested') || normalized.includes('processing')) return 'PENDING';
  return 'SUCCEEDED';
}
