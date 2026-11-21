import { BadGatewayException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Payment, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { AuthenticatedRequest } from '../auth/access-token.guard';
import { AuditService } from '../audit/audit.service';
import { TenantAccessService } from '../permissions/tenant-access.service';
import { effectiveStatus, expectedChargeAmount, newPaymentReference, serializePayment, serializeSubscription } from '../billing/billing.util';
import { SubscriptionsService, type SubscriptionWithPlan } from '../billing/subscriptions.service';
import { GatewayError, type GatewayTransaction } from './gateway.types';
import { normalizeCurrency, sameMoney } from './gateway.util';
import { PaymentGatewaysService } from './payment-gateways.service';
import { PaymentNotificationsService } from './payment-notifications.service';
import { PaymentProcessingService, PaymentVerificationError, type ApplyResult, type ProviderEvidence } from './payment-processing.service';
import type { ActivateSubscriptionDto, InitializePaymentDto, PaymentDetailsQueryDto, PaymentHistoryQueryDto, RefundPaymentDto } from './payments.dto';
import { isUniqueViolation } from './prisma-errors';

type Actor = AuthenticatedRequest['user'];
type SubscriptionWithPlanAndFeatures = SubscriptionWithPlan;

const PAYABLE_STATUSES = ['PENDING', 'TRIALING', 'ACTIVE', 'PAST_DUE'];
const SETTLED_STATUSES: Payment['status'][] = ['SUCCEEDED', 'REFUNDED', 'PARTIALLY_REFUNDED'];
const MANUAL_PROVIDER = 'manual';

/** Result of one trusted verification round trip (raw rows, serialized by callers). */
type VerifyOutcome =
  | { state: 'PENDING'; payment: Payment; message: string }
  | { state: 'SETTLED'; payment: Payment; alreadyVerified: boolean; transition?: ApplyResult['transition'] }
  | { state: 'REJECTED'; payment: Payment; message: string };

/**
 * Caller-facing payment API: checkout initialization, transaction history, details,
 * verification, cancellation, refunds and the auditable manual activation workflow.
 *
 * Every state change goes through PaymentProcessingService inside a database
 * transaction, and every "is this paid?" answer comes from a trusted provider endpoint
 * or a signature-verified webhook — never from a browser redirect.
 */
@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly access: TenantAccessService,
    private readonly audit: AuditService,
    private readonly gateways: PaymentGatewaysService,
    private readonly processing: PaymentProcessingService,
    private readonly notifications: PaymentNotificationsService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  // ---- Checkout ------------------------------------------------------------------

  async initialize(actor: Actor, workspaceId: string, input: InitializePaymentDto, idempotencyKeyHeader?: string) {
    await this.access.requireWorkspacePermission(actor!, workspaceId, 'workspace.billing');
    const subscription = await this.resolvePayableSubscription(workspaceId, input.subscriptionId);
    const amount = expectedChargeAmount(subscription.plan, subscription.interval);
    if (amount <= 0) throw new ConflictException({ code: 'PAYMENT_NOT_REQUIRED', message: 'This plan does not require a payment', details: [] });

    const idempotencyKey = idempotencyKeyHeader ? `${workspaceId}:${idempotencyKeyHeader.slice(0, 120)}` : null;
    if (idempotencyKey) {
      const existing = await this.prisma.payment.findUnique({ where: { idempotencyKey } });
      if (existing && existing.workspaceId === workspaceId) return this.checkoutResponse(existing, true);
    }

    const gateway = await this.gateways.resolveOutbound(input.gateway);
    this.assertGatewayCurrency(gateway.config, subscription.plan.currency);

    const payment = await this.createPayment({
      workspaceId,
      subscriptionId: subscription.id,
      reference: newPaymentReference(),
      provider: gateway.row.provider,
      amount,
      currency: subscription.plan.currency,
      customerEmail: actor!.email,
      idempotencyKey,
      metadata: { gateway: gateway.row.provider, planKey: subscription.plan.key, interval: subscription.interval },
    });
    if (payment.reused) return this.checkoutResponse(payment.payment, true);
    const created = payment.payment;

    let checkoutUrl: string;
    let providerReference: string | null;
    try {
      const checkout = await gateway.adapter.initialize(
        {
          reference: created.reference,
          amount,
          currency: created.currency,
          email: actor!.email,
          description: `${subscription.plan.name} (${subscription.interval.toLowerCase()})`,
          callbackUrl: this.callbackUrl(),
          metadata: { workspaceId, subscriptionId: subscription.id, reference: created.reference },
        },
        gateway.credentials,
        gateway.config,
      );
      checkoutUrl = checkout.checkoutUrl;
      providerReference = checkout.providerReference;
    } catch (error) {
      const message = (error instanceof GatewayError ? error.message : 'The payment gateway could not start this checkout').slice(0, 300);
      // Release the idempotency key so the client may retry the same request; keep the
      // failed row for history.
      await this.prisma.payment.update({ where: { id: created.id }, data: { status: 'FAILED', failureReason: message, ...(idempotencyKey ? { idempotencyKey: null } : {}) } });
      await this.audit.record({
        workspaceId,
        actorId: actor!.userId,
        action: 'payment.initialization_failed',
        targetType: 'payment',
        targetId: created.id,
        metadata: { provider: created.provider, reference: created.reference, message },
      });
      throw new BadGatewayException({ code: 'GATEWAY_ERROR', message, details: [] });
    }

    const stored = await this.prisma.payment.update({
      where: { id: created.id },
      data: { checkoutUrl, ...(created.providerReference ? {} : providerReference ? { providerReference } : {}) },
    });
    await this.audit.record({
      workspaceId,
      actorId: actor!.userId,
      action: 'payment.initialized',
      targetType: 'payment',
      targetId: stored.id,
      metadata: { reference: stored.reference, provider: stored.provider, amount: Number(stored.amount), currency: stored.currency, subscriptionId: subscription.id },
    });
    return this.checkoutResponse(stored, false);
  }

  // ---- Reads ---------------------------------------------------------------------

  async history(actor: Actor, workspaceId: string, query: PaymentHistoryQueryDto) {
    await this.access.requireWorkspacePermission(actor!, workspaceId, 'workspace.view');
    const skip = (query.page - 1) * query.limit;
    const where: Prisma.PaymentWhereInput = { workspaceId, ...(query.status ? { status: query.status } : {}) };
    const [rows, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: { subscription: { include: { plan: { select: { key: true, name: true } } } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
      this.prisma.payment.count({ where }),
    ]);
    return {
      items: rows.map((row) => ({
        ...serializePayment(row),
        planKey: row.subscription.plan.key,
        planName: row.subscription.plan.name,
        subscriptionStatus: row.subscription.status,
      })),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async details(actor: Actor, workspaceId: string, paymentId: string, query: PaymentDetailsQueryDto) {
    await this.access.requireWorkspacePermission(actor!, workspaceId, 'workspace.view');
    const payment = await this.processing.workspacePayment(workspaceId, paymentId);
    const [events, refunds] = await Promise.all([
      this.prisma.paymentEvent.findMany({ where: { paymentId: payment.id }, orderBy: { receivedAt: 'desc' }, take: 25 }),
      this.prisma.paymentRefund.findMany({ where: { paymentId: payment.id }, orderBy: { createdAt: 'desc' } }),
    ]);
    const provider = query.refresh && payment.provider !== MANUAL_PROVIDER ? await this.providerSnapshot(payment) : null;
    return {
      payment: serializePayment(payment),
      events: events.map((event) => ({
        id: event.id,
        provider: event.provider,
        type: event.type,
        status: event.status,
        outcome: event.outcome,
        summary: event.summary,
        signatureValid: event.signatureValid,
        receivedAt: event.receivedAt,
        processedAt: event.processedAt,
      })),
      refunds: refunds.map((refund) => ({
        id: refund.id,
        provider: refund.provider,
        providerReference: refund.providerReference,
        amount: Number(refund.amount),
        currency: refund.currency,
        status: refund.status,
        reason: refund.reason,
        failureReason: refund.failureReason,
        createdAt: refund.createdAt,
        completedAt: refund.completedAt,
      })),
      provider,
    };
  }

  // ---- Verification --------------------------------------------------------------

  async verify(actor: Actor, workspaceId: string, paymentId: string) {
    await this.access.requireWorkspacePermission(actor!, workspaceId, 'workspace.billing');
    const payment = await this.processing.workspacePayment(workspaceId, paymentId);
    return this.verifyPayment(payment, actor!.userId);
  }

  async adminVerify(actor: Actor, paymentId: string) {
    await this.access.requireAdminPermission(actor!, 'admin.payments.manage');
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    return this.verifyPayment(payment, actor!.userId);
  }

  async cancel(actor: Actor, workspaceId: string, paymentId: string) {
    await this.access.requireWorkspacePermission(actor!, workspaceId, 'workspace.billing');
    const payment = await this.processing.workspacePayment(workspaceId, paymentId);
    if (payment.status !== 'PENDING') throw new ConflictException({ code: 'PAYMENT_NOT_PENDING', message: 'Only pending payments can be canceled', details: [] });
    // A cancellation can never grant entitlement, so a tenant-declared intent is safe.
    const result = await this.processing.apply(
      payment,
      { source: 'workspace', outcome: 'CANCELED', reference: null, amount: null, currency: null },
      { actorId: actor!.userId },
    );
    return { payment: serializePayment(result.payment), transition: result.transition };
  }

  // ---- Refunds -------------------------------------------------------------------

  async refund(actor: Actor, paymentId: string, input: RefundPaymentDto) {
    await this.access.requireAdminPermission(actor!, 'admin.payments.refund');
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== 'SUCCEEDED' && payment.status !== 'PARTIALLY_REFUNDED') {
      throw new ConflictException({ code: 'PAYMENT_NOT_REFUNDABLE', message: 'Only successful payments can be refunded', details: [] });
    }
    const alreadyRefunded = Number(payment.refundedAmount);
    const remaining = Number(payment.amount) - alreadyRefunded;
    const amount = input.amount ?? remaining;
    if (amount <= 0 || amount > remaining + 1e-9) {
      throw new ConflictException({ code: 'INVALID_REFUND_AMOUNT', message: 'Refund amount must be between 0 and the unrefunded balance', details: [] });
    }

    if (payment.provider === MANUAL_PROVIDER) {
      // Offline money has no provider to call: the record itself is the evidence.
      const result = await this.processing.recordRefund(payment, {
        provider: MANUAL_PROVIDER,
        providerReference: null,
        amount,
        status: 'SUCCEEDED',
        reason: input.reason ?? 'Offline refund',
        requestedById: actor!.userId,
        source: 'admin',
        actorId: actor!.userId,
      });
      return this.refundResponse(result);
    }

    const gateway = await this.gateways.resolveConfigured(payment.provider);
    if (!gateway.adapter.supportsRefunds) throw new ConflictException({ code: 'REFUNDS_UNSUPPORTED', message: 'That gateway does not support refunds', details: [] });
    const providerPaymentId = this.storedProviderTransactionId(payment);
    try {
      const outcome = await gateway.adapter.refund(
        { reference: payment.reference, providerReference: payment.providerReference, providerPaymentId, amount, currency: payment.currency, reason: input.reason ?? null },
        gateway.credentials,
        gateway.config,
      );
      const result = await this.processing.recordRefund(payment, {
        provider: payment.provider,
        providerReference: outcome.providerReference,
        amount,
        status: outcome.status,
        reason: input.reason ?? null,
        failureReason: outcome.failureReason,
        requestedById: actor!.userId,
        source: 'admin',
        actorId: actor!.userId,
      });
      if (outcome.status === 'FAILED') {
        throw new BadGatewayException({ code: 'GATEWAY_ERROR', message: outcome.failureReason ?? 'The gateway rejected the refund', details: [] });
      }
      return this.refundResponse(result);
    } catch (error) {
      if (error instanceof BadGatewayException || error instanceof ConflictException) throw error;
      const message = (error instanceof GatewayError ? error.message : 'The gateway could not process this refund').slice(0, 300);
      await this.audit.record({
        workspaceId: payment.workspaceId,
        actorId: actor!.userId,
        action: 'payment.refund.rejected',
        targetType: 'payment',
        targetId: payment.id,
        metadata: { provider: payment.provider, amount, message },
      });
      throw new BadGatewayException({ code: 'GATEWAY_ERROR', message, details: [] });
    }
  }

  // ---- Admin manual activation ---------------------------------------------------

  /**
   * The only path that activates a subscription without a gateway webhook. It requires
   * an administrator, a reason, an explicit confirmation, and either a payment
   * reference that survives provider verification or documented manual-payment
   * evidence whose amount and currency match the plan charge.
   */
  async activateSubscription(actor: Actor, subscriptionId: string, input: ActivateSubscriptionDto) {
    await this.access.requireAdminPermission(actor!, 'admin.subscriptions.activate');
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: { include: { features: true } }, workspace: { select: { id: true, name: true } } },
    });
    if (!subscription) throw new NotFoundException('Subscription not found');
    if (subscription.status !== 'PENDING') {
      throw new ConflictException({ code: 'SUBSCRIPTION_NOT_PENDING', message: 'Only pending subscriptions can be activated manually', details: [] });
    }
    const hasEvidence = Boolean(input.evidence);
    const hasReference = Boolean(input.paymentReference && input.paymentReference.trim().length > 0);
    if (hasEvidence === hasReference) {
      throw new ConflictException({
        code: 'ACTIVATION_EVIDENCE_REQUIRED',
        message: 'Provide either a payment reference or manual payment evidence (exactly one)',
        details: [],
      });
    }

    const expectedAmount = expectedChargeAmount(subscription.plan, subscription.interval);
    const expectedCurrency = normalizeCurrency(subscription.plan.currency)!;
    let payment: Payment | null = null;

    if (hasReference) {
      payment = await this.prisma.payment.findUnique({ where: { reference: input.paymentReference!.trim() } });
      if (!payment) {
        throw new NotFoundException({ code: 'PAYMENT_REFERENCE_NOT_FOUND', message: 'No payment with that reference exists; use manual evidence instead', details: [] });
      }
      if (payment.subscriptionId !== subscription.id || payment.workspaceId !== subscription.workspaceId) {
        throw new ConflictException({ code: 'PAYMENT_REFERENCE_MISMATCH', message: 'That reference belongs to a different subscription', details: [] });
      }
      payment = await this.settleEvidencePayment(payment, actor);
    } else {
      const evidence = input.evidence!;
      const currency = normalizeCurrency(evidence.currency)!;
      if (currency !== expectedCurrency) {
        throw new ConflictException({ code: 'CURRENCY_MISMATCH', message: `Evidence currency must be ${expectedCurrency}`, details: [] });
      }
      if (!sameMoney(expectedAmount, evidence.amount, expectedCurrency)) {
        throw new ConflictException({ code: 'AMOUNT_MISMATCH', message: `Evidence amount must match the ${expectedCurrency} charge for this plan`, details: [] });
      }
    }

    const reason = input.reason.trim();
    const result = await this.prisma.$transaction(async (tx) => {
      let evidencePayment: Payment;
      if (payment) {
        evidencePayment = await tx.payment.update({
          where: { id: payment.id },
          data: { verifiedAt: payment.verifiedAt ?? new Date(), verificationSource: payment.verificationSource ?? 'manual_evidence' },
        });
      } else {
        const evidence = input.evidence!;
        evidencePayment = await tx.payment.create({
          data: {
            workspaceId: subscription.workspaceId,
            subscriptionId: subscription.id,
            reference: newPaymentReference(),
            provider: MANUAL_PROVIDER,
            providerReference: evidence.reference?.trim() || null,
            amount: evidence.amount,
            currency: normalizeCurrency(evidence.currency)!,
            status: 'SUCCEEDED',
            paidAt: new Date(),
            verifiedAt: new Date(),
            verificationSource: 'manual_evidence',
            metadata: { evidence: { method: evidence.method, notes: evidence.notes ?? null, reference: evidence.reference ?? null }, reason, recordedBy: actor!.userId },
          },
        });
        await this.audit.record(
          {
            workspaceId: subscription.workspaceId,
            actorId: actor!.userId,
            action: 'payment.recorded',
            targetType: 'payment',
            targetId: evidencePayment.id,
            metadata: { reference: evidencePayment.reference, amount: evidence.amount, currency: evidence.currency, method: evidence.method, reason },
          },
          tx,
        );
      }

      const activated = await this.subscriptions.activateFromPayment(tx, subscription.id, {
        source: 'admin-manual',
        actorId: actor!.userId,
        paymentId: evidencePayment.id,
        metadata: {
          reason,
          evidence: payment ? { kind: 'payment_reference', reference: payment.reference, verificationSource: evidencePayment.verificationSource } : { kind: 'manual_evidence', method: input.evidence!.method, reference: input.evidence!.reference ?? null },
        },
      });
      await this.audit.record(
        {
          workspaceId: subscription.workspaceId,
          actorId: actor!.userId,
          action: 'subscription.manual_activation',
          targetType: 'subscription',
          targetId: subscription.id,
          metadata: {
            reason,
            confirmed: true,
            paymentId: evidencePayment.id,
            paymentReference: evidencePayment.reference,
            provider: evidencePayment.provider,
            amount: Number(evidencePayment.amount),
            currency: evidencePayment.currency,
            evidence: payment ? 'payment_reference' : 'manual_evidence',
          },
        },
        tx,
      );
      return { subscription: activated.subscription, payment: evidencePayment, changed: activated.changed };
    });

    if (result.changed && result.subscription) {
      await this.notifications.confirmSubscriptionActivated({ workspaceId: subscription.workspaceId, subscription: result.subscription, reference: result.payment.reference });
    }
    return {
      subscription: serializeSubscription(result.subscription),
      payment: serializePayment(result.payment),
      activated: result.changed,
    };
  }

  // ---- Internals -----------------------------------------------------------------

  /**
   * Accepts a payment reference as activation evidence only after the payment is
   * settled: a gateway payment that is still pending gets one trusted-endpoint
   * verification round trip, a failed/canceled payment is refused outright, and an
   * offline payment must already have been recorded as SUCCEEDED.
   */
  private async settleEvidencePayment(payment: Payment, actor: Actor): Promise<Payment> {
    if (payment.status === 'SUCCEEDED') return payment;
    if (payment.status === 'REFUNDED' || payment.status === 'PARTIALLY_REFUNDED') {
      throw new ConflictException({ code: 'PAYMENT_REFUNDED', message: 'That payment was refunded and cannot be used as evidence', details: [] });
    }
    if (payment.status === 'FAILED' || payment.status === 'CANCELED') {
      throw new ConflictException({ code: 'PAYMENT_NOT_SETTLED', message: 'That payment is recorded as failed or canceled and cannot activate a subscription', details: [] });
    }
    if (payment.provider === MANUAL_PROVIDER) {
      throw new ConflictException({ code: 'PAYMENT_NOT_SETTLED', message: 'That manual payment is not recorded as successful; record it as evidence first', details: [] });
    }
    // Still PENDING at the provider: one trusted verification round trip decides.
    const outcome = await this.runVerify(payment, actor!.userId);
    if (outcome.state === 'PENDING') {
      throw new ConflictException({ code: 'PAYMENT_NOT_VERIFIED', message: 'The provider has not confirmed that payment yet', details: [] });
    }
    if (outcome.state === 'REJECTED') {
      throw new ConflictException({ code: 'PAYMENT_VERIFICATION_REJECTED', message: outcome.message, details: [] });
    }
    return outcome.payment;
  }

  /** Public verification response: rejections surface as conflicts, never as success. */
  private async verifyPayment(payment: Payment, actorId: string) {
    if (SETTLED_STATUSES.includes(payment.status)) {
      return { state: 'SETTLED' as const, alreadyVerified: true, payment: serializePayment(payment) };
    }
    const outcome = await this.runVerify(payment, actorId);
    if (outcome.state === 'REJECTED') {
      throw new ConflictException({ code: 'PAYMENT_VERIFICATION_REJECTED', message: outcome.message, details: [] });
    }
    if (outcome.state === 'PENDING') {
      return { state: 'PENDING' as const, payment: serializePayment(outcome.payment), message: outcome.message };
    }
    return { state: 'SETTLED' as const, alreadyVerified: false, payment: serializePayment(outcome.payment), transition: outcome.transition ?? 'RECORDED' };
  }

  /**
   * Trusted-endpoint round trip: fetch, compare, then apply inside one transaction.
   * Returns raw rows — serialization happens at the public boundary.
   */
  private async runVerify(payment: Payment, actorId: string): Promise<VerifyOutcome> {
    if (payment.provider === MANUAL_PROVIDER) {
      throw new ConflictException({ code: 'GATEWAY_NOT_CONFIGURED', message: 'Manual payments are confirmed through their recorded evidence', details: [] });
    }
    const gateway = await this.gateways.resolveConfigured(payment.provider);
    let transaction: GatewayTransaction;
    try {
      transaction = await gateway.adapter.retrieve(payment.providerReference ?? payment.reference, gateway.credentials, gateway.config, {
        providerPaymentId: this.storedProviderTransactionId(payment),
      });
    } catch (error) {
      const message = (error instanceof GatewayError ? error.message : 'The gateway could not be reached').slice(0, 300);
      await this.audit.record({
        workspaceId: payment.workspaceId,
        actorId,
        action: 'payment.verification_unavailable',
        targetType: 'payment',
        targetId: payment.id,
        metadata: { provider: payment.provider, reference: payment.reference, message },
      });
      throw new BadGatewayException({ code: 'GATEWAY_ERROR', message, details: [] });
    }
    if (transaction.outcome === 'PENDING') {
      return { state: 'PENDING', payment, message: 'The gateway has not settled this transaction yet' };
    }
    try {
      const result = await this.processing.apply(payment, this.evidenceFromTransaction('verify_endpoint', transaction), { actorId });
      if (result.transition === 'ACTIVATED' && result.subscription) {
        await this.notifications.confirmSubscriptionActivated({ workspaceId: payment.workspaceId, subscription: result.subscription, reference: payment.reference });
      }
      return { state: 'SETTLED', payment: result.payment, alreadyVerified: false, transition: result.transition };
    } catch (error) {
      if (error instanceof PaymentVerificationError) {
        await this.audit.record({
          workspaceId: payment.workspaceId,
          actorId,
          action: 'payment.verification_rejected',
          targetType: 'payment',
          targetId: payment.id,
          metadata: { code: error.code, message: error.message, reference: payment.reference, provider: payment.provider },
        });
        return { state: 'REJECTED', payment, message: error.message };
      }
      throw error;
    }
  }

  private evidenceFromTransaction(source: ProviderEvidence['source'], transaction: GatewayTransaction): ProviderEvidence {
    if (transaction.outcome === 'PENDING') {
      // Callers filter this first; belt-and-braces so a pending state can never be
      // turned into evidence by accident.
      throw new PaymentVerificationError('AMOUNT_UNREPORTED', 'A pending gateway state is not evidence of a settled payment');
    }
    return {
      source,
      outcome: transaction.outcome,
      reference: transaction.reference,
      amount: transaction.amount,
      currency: transaction.currency,
      providerReference: transaction.providerReference,
      providerPaymentId: transaction.providerPaymentId,
      paidAt: transaction.paidAt,
      channel: transaction.channel,
      customerEmail: transaction.customerEmail,
      failureReason: transaction.failureReason,
    };
  }

  private async providerSnapshot(payment: Payment) {
    try {
      const gateway = await this.gateways.resolveConfigured(payment.provider);
      const transaction = await gateway.adapter.retrieve(payment.providerReference ?? payment.reference, gateway.credentials, gateway.config, {
        providerPaymentId: this.storedProviderTransactionId(payment),
      });
      return {
        provider: gateway.adapter.key,
        outcome: transaction.outcome,
        amount: transaction.amount,
        currency: transaction.currency,
        paidAt: transaction.paidAt,
        channel: transaction.channel,
        providerReference: transaction.providerReference,
        providerPaymentId: transaction.providerPaymentId,
        fetchedAt: new Date(),
      };
    } catch (error) {
      const message = error instanceof GatewayError ? error.message : 'The gateway could not be reached';
      return { provider: payment.provider, error: message.slice(0, 300), fetchedAt: new Date() };
    }
  }

  private async resolvePayableSubscription(workspaceId: string, subscriptionId?: string) {
    const subscription = subscriptionId
      ? await this.prisma.subscription.findFirst({ where: { id: subscriptionId, workspaceId }, include: { plan: { include: { features: true } } } })
      : await this.prisma.subscription.findFirst({ where: { workspaceId }, include: { plan: { include: { features: true } } }, orderBy: { createdAt: 'desc' } });
    if (!subscription) throw new NotFoundException('No subscription found for this workspace');
    const status = effectiveStatus(subscription);
    if (!PAYABLE_STATUSES.includes(status)) {
      throw new ConflictException({ code: 'SUBSCRIPTION_NOT_PAYABLE', message: `A subscription in status ${status.toLowerCase()} cannot be paid`, details: [] });
    }
    return subscription;
  }

  private assertGatewayCurrency(config: Record<string, string>, currency: string): void {
    const configured = config.currencies;
    if (!configured) return;
    const accepted = configured.split(',').map((entry) => entry.trim().toUpperCase()).filter(Boolean);
    if (accepted.length > 0 && !accepted.includes(currency.toUpperCase())) {
      throw new ConflictException({ code: 'CURRENCY_NOT_SUPPORTED', message: `That gateway does not accept ${currency.toUpperCase()}`, details: [] });
    }
  }

  private async createPayment(input: {
    workspaceId: string;
    subscriptionId: string;
    reference: string;
    provider: string;
    amount: number;
    currency: string;
    customerEmail: string;
    idempotencyKey: string | null;
    metadata: Prisma.InputJsonValue;
  }): Promise<{ payment: Payment; reused: boolean }> {
    const data: Prisma.PaymentUncheckedCreateInput = {
      workspaceId: input.workspaceId,
      subscriptionId: input.subscriptionId,
      reference: input.reference,
      provider: input.provider,
      amount: input.amount,
      currency: input.currency.toUpperCase(),
      status: 'PENDING',
      customerEmail: input.customerEmail,
      idempotencyKey: input.idempotencyKey,
      metadata: input.metadata,
    };
    try {
      return { payment: await this.prisma.payment.create({ data }), reused: false };
    } catch (error) {
      // A concurrent request won the same idempotency key: replay its payment. Anything
      // else (a reference collision, ...) keeps the original error.
      if (isUniqueViolation(error) && input.idempotencyKey) {
        const existing = await this.prisma.payment.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
        if (existing && existing.workspaceId === input.workspaceId) return { payment: existing, reused: true };
      }
      throw error;
    }
  }

  private checkoutResponse(payment: Payment, idempotent: boolean) {
    return {
      payment: serializePayment(payment),
      checkoutUrl: payment.checkoutUrl,
      gateway: payment.provider,
      idempotent,
      // Explicit contract for the frontend: the redirect is a pointer, not proof.
      nextStep: `After the checkout redirect, call POST /workspaces/${payment.workspaceId}/payments/${payment.id}/verify to settle this payment server-side.`,
    };
  }

  private callbackUrl(): string {
    return new URL('/billing', this.config.getOrThrow<string>('APP_BASE_URL')).toString();
  }

  private storedProviderTransactionId(payment: Payment): string | null {
    const metadata = payment.metadata as Prisma.JsonObject | null;
    const value = metadata?.providerTransactionId;
    return typeof value === 'string' && value.length > 0 ? value : null;
  }

  private refundResponse(result: { refundId: string; payment: Payment; subscription: SubscriptionWithPlanAndFeatures | null; suspended: boolean }) {
    return {
      refundId: result.refundId,
      payment: serializePayment(result.payment),
      subscription: result.subscription ? serializeSubscription(result.subscription) : null,
      suspended: result.suspended,
    };
  }
}
