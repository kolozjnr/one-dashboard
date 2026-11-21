import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Payment, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SubscriptionsService, type SubscriptionWithPlan } from '../billing/subscriptions.service';
import { sameMoney, normalizeCurrency } from './gateway.util';
import type { GatewayOutcome } from './gateway.types';

export type EvidenceOutcome = Extract<GatewayOutcome, 'SUCCEEDED' | 'FAILED' | 'CANCELED'>;
export type VerificationRejectionCode = 'REFERENCE_MISMATCH' | 'AMOUNT_MISMATCH' | 'AMOUNT_UNREPORTED' | 'CURRENCY_MISMATCH' | 'ASSOCIATION_MISMATCH';

/**
 * Thrown when what the provider reports does not line up with what we recorded when
 * the checkout was created. Rejections are logged against the payment/event and are
 * never allowed to move money state.
 */
export class PaymentVerificationError extends Error {
  constructor(
    readonly code: VerificationRejectionCode,
    message: string,
  ) {
    super(message);
    this.name = 'PaymentVerificationError';
  }
}

/** Normalized, provider-reported facts about one transaction, already fetched from a trusted endpoint. */
export interface ProviderEvidence {
  /** Where the outcome was established: a trusted endpoint, a signed webhook, or a tenant/admin action that cannot grant money (cancellation). */
  source: 'verify_endpoint' | 'webhook' | 'admin_verification' | 'workspace' | 'manual_evidence';
  outcome: EvidenceOutcome;
  /** Reference echoed back by the provider (null when the provider does not echo one). */
  reference: string | null;
  amount: number | null;
  currency: string | null;
  providerReference?: string | null;
  providerPaymentId?: string | null;
  paidAt?: Date | null;
  channel?: string | null;
  customerEmail?: string | null;
  failureReason?: string | null;
  /** Workspace/subscription ids the provider echoed; checked when present. */
  association?: { workspaceId?: string | null; subscriptionId?: string | null };
}

export interface ApplyOptions {
  actorId?: string | null;
  /** Provider event id, for correlation in audit/subscription metadata. */
  eventId?: string | null;
  /** Extra metadata merged into the audit entry. */
  metadata?: Prisma.InputJsonValue;
}

export interface ApplyResult {
  payment: Payment;
  subscription: SubscriptionWithPlan | null;
  transition: 'ACTIVATED' | 'RENEWED' | 'PAYMENT_FAILED' | 'RECORDED' | 'SKIPPED';
  /** False when an earlier delivery already settled this payment (idempotent replay). */
  changed: boolean;
}

const SUCCESS_CLAIMABLE: Payment['status'][] = ['PENDING', 'FAILED', 'CANCELED'];
const FAILURE_CLAIMABLE: Payment['status'][] = ['PENDING'];

/**
 * Transactional core of the payment lifecycle. It is the only place that writes
 * payment, refund, subscription and subscription-event rows together, always inside
 * one database transaction, so a payment can never be "successful" while its
 * subscription stayed pending (or the other way around).
 *
 * Nothing in here talks to a gateway: callers must have already fetched evidence
 * from a trusted provider endpoint or a signature-verified webhook.
 */
@Injectable()
export class PaymentProcessingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  /**
   * Reference, amount, currency and association comparison. A successful redirect is
   * never evidence; even a genuine provider payload is rejected when any of these
   * four checks does not match what we stored at initialize time.
   */
  assertEvidence(payment: Payment, evidence: ProviderEvidence): void {
    if (evidence.reference && evidence.reference !== payment.reference) {
      throw new PaymentVerificationError('REFERENCE_MISMATCH', 'Provider reference does not match this payment');
    }
    const currency = normalizeCurrency(evidence.currency);
    const expectedCurrency = normalizeCurrency(payment.currency);
    if (evidence.outcome === 'SUCCEEDED') {
      if (evidence.amount === null || !currency) {
        throw new PaymentVerificationError('AMOUNT_UNREPORTED', 'Provider did not report an amount and currency for this transaction');
      }
      if (currency !== expectedCurrency) {
        throw new PaymentVerificationError('CURRENCY_MISMATCH', `Provider reported ${currency} but this payment is ${expectedCurrency}`);
      }
      if (!sameMoney(Number(payment.amount), evidence.amount, expectedCurrency!)) {
        throw new PaymentVerificationError('AMOUNT_MISMATCH', 'Provider amount does not match the amount charged');
      }
    } else if (evidence.amount !== null && currency && (currency !== expectedCurrency || !sameMoney(Number(payment.amount), evidence.amount, expectedCurrency!))) {
      // A failed/cancelled charge with a mismatched amount is still a mismatch worth flagging.
      throw new PaymentVerificationError('AMOUNT_MISMATCH', 'Provider amount does not match the amount charged');
    }
    const association = evidence.association;
    if (association) {
      if (association.workspaceId && association.workspaceId !== payment.workspaceId) {
        throw new PaymentVerificationError('ASSOCIATION_MISMATCH', 'Provider metadata points at a different workspace');
      }
      if (association.subscriptionId && association.subscriptionId !== payment.subscriptionId) {
        throw new PaymentVerificationError('ASSOCIATION_MISMATCH', 'Provider metadata points at a different subscription');
      }
    }
  }

  /** Applies verified evidence to the payment and its subscription in one transaction. */
  async apply(payment: Payment, evidence: ProviderEvidence, options: ApplyOptions = {}): Promise<ApplyResult> {
    this.assertEvidence(payment, evidence);
    return this.prisma.$transaction((tx) => this.applyInTransaction(tx, payment, evidence, options));
  }

  private async applyInTransaction(
    tx: Prisma.TransactionClient,
    payment: Payment,
    evidence: ProviderEvidence,
    options: ApplyOptions,
  ): Promise<ApplyResult> {
    const now = new Date();
    const claimable = evidence.outcome === 'SUCCEEDED' ? SUCCESS_CLAIMABLE : FAILURE_CLAIMABLE;
    const claim = await tx.payment.updateMany({
      where: { id: payment.id, status: { in: claimable } },
      data: this.paymentChanges(payment, evidence, now),
    });
    const claimed = claim.count === 1;

    const settled = await tx.payment.findUnique({ where: { id: payment.id } });
    if (!settled) throw new NotFoundException('Payment disappeared while being processed');

    // A later provider state never downgrades money that already settled: a
    // failed/cancelled delivery arriving after a success is recorded but ignored.
    const settledOutcome = this.settledOutcome(settled);
    const extra = (options.metadata ?? {}) as Prisma.JsonObject;
    if (evidence.outcome !== 'SUCCEEDED' && settledOutcome === 'SUCCEEDED') {
      await this.audit.record(
        {
          actorId: options.actorId ?? null,
          action: 'payment.outcome_ignored',
          targetType: 'payment',
          targetId: payment.id,
          workspaceId: payment.workspaceId,
          metadata: { reported: evidence.outcome, current: settled.status, source: evidence.source, ...extra },
        },
        tx,
      );
      return { payment: settled, subscription: null, transition: 'SKIPPED', changed: false };
    }

    const baseMetadata: Prisma.InputJsonValue = {
      paymentId: payment.id,
      reference: payment.reference,
      provider: payment.provider,
      source: evidence.source,
      ...(options.eventId ? { eventId: options.eventId } : {}),
      ...extra,
    };

    let transition: ApplyResult['transition'] = 'RECORDED';
    let subscription: SubscriptionWithPlan | null = null;

    if (settledOutcome === 'SUCCEEDED') {
      const outcome = await this.settleSubscriptionFromSuccess(tx, settled, evidence, baseMetadata, options.actorId ?? null);
      subscription = outcome.subscription;
      transition = outcome.transition;
    } else if (settledOutcome === 'FAILED' && claimed) {
      const outcome = await this.subscriptions.failFromPayment(tx, settled.subscriptionId, {
        source: evidence.source,
        actorId: options.actorId ?? null,
        metadata: baseMetadata,
      });
      subscription = outcome.subscription;
      transition = outcome.changed ? 'PAYMENT_FAILED' : 'RECORDED';
    }

    await this.audit.record(
      {
        actorId: options.actorId ?? null,
        action: `payment.${settled.status.toLowerCase()}`,
        targetType: 'payment',
        targetId: payment.id,
        workspaceId: payment.workspaceId,
        metadata: { ...(baseMetadata as Prisma.JsonObject), amount: Number(settled.amount), currency: settled.currency },
      },
      tx,
    );

    return { payment: settled, subscription, transition, changed: claimed };
  }

  // Success handling: PENDING subscriptions activate (start/expiry/entitlements/event),
  // anything already entitled is renewed for a fresh period from this payment.
  private async settleSubscriptionFromSuccess(
    tx: Prisma.TransactionClient,
    payment: Payment,
    evidence: ProviderEvidence,
    metadata: Prisma.InputJsonValue,
    actorId: string | null,
  ): Promise<{ subscription: SubscriptionWithPlan | null; transition: ApplyResult['transition'] }> {
    const current = await tx.subscription.findUnique({ where: { id: payment.subscriptionId }, include: { plan: { include: { features: true } } } });
    if (!current) throw new ConflictException('Payment is not attached to an existing subscription');

    if (current.status === 'PENDING') {
      const activated = await this.subscriptions.activateFromPayment(tx, current.id, {
        source: evidence.source,
        actorId,
        paymentId: payment.id,
        metadata,
      });
      return { subscription: activated.subscription, transition: activated.changed ? 'ACTIVATED' : 'RECORDED' };
    }
    if (['TRIALING', 'ACTIVE', 'PAST_DUE'].includes(current.status)) {
      const renewed = await this.subscriptions.renewFromPayment(tx, current.id, {
        source: evidence.source,
        actorId,
        paymentId: payment.id,
        metadata,
      });
      return { subscription: renewed.subscription, transition: renewed.changed ? 'RENEWED' : 'RECORDED' };
    }
    // SUSPENDED/CANCELED/EXPIRED: record the money, do not resurrect the subscription.
    return { subscription: current, transition: 'RECORDED' };
  }

  private paymentChanges(payment: Payment, evidence: ProviderEvidence, now: Date): Prisma.PaymentUpdateManyMutationInput {
    const base: Prisma.PaymentUpdateManyMutationInput = {
      verifiedAt: now,
      verificationSource: evidence.source,
    };
    if (evidence.providerReference && !payment.providerReference) base.providerReference = evidence.providerReference;
    if (evidence.customerEmail && !payment.customerEmail) base.customerEmail = evidence.customerEmail;
    if (evidence.channel && !payment.channel) base.channel = evidence.channel;

    if (evidence.outcome === 'SUCCEEDED') {
      return {
        ...base,
        status: 'SUCCEEDED',
        paidAt: evidence.paidAt ?? payment.paidAt ?? now,
        failureReason: null,
        ...(evidence.providerPaymentId ? { metadata: this.withProviderTransactionId(payment, evidence.providerPaymentId) } : {}),
      };
    }
    if (evidence.outcome === 'FAILED') {
      return { ...base, status: 'FAILED', failureReason: (evidence.failureReason ?? 'Gateway reported a failed payment').slice(0, 300) };
    }
    return { ...base, status: 'CANCELED', failureReason: 'Checkout canceled at the gateway' };
  }

  private withProviderTransactionId(payment: Payment, providerPaymentId: string): Prisma.InputJsonValue {
    const current = (payment.metadata ?? {}) as Prisma.JsonObject;
    return { ...current, providerTransactionId: providerPaymentId };
  }

  private settledOutcome(payment: Payment): Payment['status'] {
    if (payment.status === 'SUCCEEDED') return 'SUCCEEDED';
    if (payment.status === 'REFUNDED' || payment.status === 'PARTIALLY_REFUNDED') return 'REFUNDED';
    if (payment.status === 'FAILED') return 'FAILED';
    if (payment.status === 'CANCELED') return 'CANCELED';
    return 'PENDING';
  }

  // ---- Refunds ------------------------------------------------------------------

  /**
   * Records a refund outcome against the payment. A completed full refund suspends the
   * subscription (money returned = entitlement revoked); partial refunds keep the
   * subscription running and only adjust the refunded total.
   */
  async recordRefund(
    payment: Payment,
    input: {
      provider: string;
      providerReference: string | null;
      amount: number;
      status: 'SUCCEEDED' | 'PENDING' | 'FAILED';
      reason?: string | null;
      failureReason?: string | null;
      requestedById?: string | null;
      source: 'admin' | 'webhook';
      actorId?: string | null;
    },
  ): Promise<{ refundId: string; payment: Payment; subscription: SubscriptionWithPlan | null; suspended: boolean }> {
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const refund = await tx.paymentRefund.create({
        data: {
          workspaceId: payment.workspaceId,
          paymentId: payment.id,
          provider: input.provider,
          providerReference: input.providerReference,
          amount: input.amount,
          currency: payment.currency,
          status: input.status === 'PENDING' ? 'PENDING' : input.status,
          reason: input.reason ?? null,
          failureReason: input.failureReason ?? null,
          requestedById: input.requestedById ?? null,
          completedAt: input.status === 'SUCCEEDED' ? now : null,
        },
      });

      let updated = payment;
      let suspended = false;
      let subscription: SubscriptionWithPlan | null = null;

      if (input.status === 'SUCCEEDED') {
        const refundedTotal = Number(payment.refundedAmount) + input.amount;
        const full = refundedTotal >= Number(payment.amount);
        updated = await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: full ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
            refundedAmount: refundedTotal,
            refundedAt: now,
          },
        });
        if (full) {
          const outcome = await this.subscriptions.suspendFromRefund(tx, payment.subscriptionId, {
            source: input.source,
            actorId: input.actorId ?? null,
            paymentId: payment.id,
            metadata: { refundId: refund.id, amount: input.amount, provider: input.provider },
          });
          subscription = outcome.subscription;
          suspended = outcome.changed;
        }
      }

      await this.audit.record(
        {
          actorId: input.actorId ?? null,
          action: `payment.refund.${input.status.toLowerCase()}`,
          targetType: 'payment',
          targetId: payment.id,
          workspaceId: payment.workspaceId,
          metadata: {
            refundId: refund.id,
            amount: input.amount,
            currency: payment.currency,
            provider: input.provider,
            providerReference: input.providerReference,
            source: input.source,
            suspended,
          },
        },
        tx,
      );
      return { refundId: refund.id, payment: updated, subscription, suspended };
    });
  }

  // ---- Lookup -------------------------------------------------------------------

  async findPayment(where: Prisma.PaymentWhereInput): Promise<Payment | null> {
    return this.prisma.payment.findFirst({ where });
  }

  /** Workspace-scoped read used by every caller-facing path (tenant boundary). */
  async workspacePayment(workspaceId: string, paymentId: string): Promise<Payment> {
    const payment = await this.prisma.payment.findFirst({ where: { id: paymentId, workspaceId } });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }
}
