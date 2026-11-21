import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BillingInterval, Prisma, SubscriptionEventType, SubscriptionStatus, type PaymentStatus, type PlanFeature, type Subscription, type SubscriptionPlan } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TenantAccessService } from '../permissions/tenant-access.service';
import { EntitlementsService } from './entitlements.service';
import { addDays, addInterval, effectiveStatus, newPaymentReference, serializePayment, serializeSubscription } from './billing.util';
import type { AdminCreateSubscriptionDto, CancelSubscriptionDto, ChangeCycleDto, ChangePlanDto, CreateSubscriptionDto, ListPaymentsDto, ListSubscriptionsDto } from './billing.dto';
import type { AuthenticatedRequest } from '../auth/access-token.guard';

export type SubscriptionScope = 'workspace' | 'admin';
export type SubscriptionWithPlan = Subscription & { plan: SubscriptionPlan & { features: PlanFeature[] } };

/** Context for transitions that a verified payment (or its refund) drives. */
export interface PaymentTransitionContext {
  source: string;
  actorId: string | null;
  paymentId: string;
  metadata?: Prisma.InputJsonValue;
}

// Statuses that represent a live (or in-flight) subscription; anything else is terminal
// and must be reactivated or replaced through create().
const LIVE_STATUSES: SubscriptionStatus[] = ['PENDING', 'TRIALING', 'ACTIVE', 'PAST_DUE'];
const ENTITLED: SubscriptionStatus[] = ['TRIALING', 'ACTIVE', 'PAST_DUE'];
const RESUMABLE: SubscriptionStatus[] = ['SUSPENDED', 'CANCELED', 'EXPIRED'];

// Owns subscription state transitions. Workspace callers are authorized against
// workspace membership; admin callers are authorized by RequireAdminPermission on the
// controller and re-checked here for defense in depth. Every transition writes a
// SubscriptionEvent and an AuditLog row in the same transaction.
@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TenantAccessService,
    private readonly audit: AuditService,
    private readonly entitlements: EntitlementsService,
  ) {}

  // ---- Workspace scope -------------------------------------------------------------

  async current(actor: AuthenticatedRequest['user'], workspaceId: string) {
    await this.access.requireWorkspacePermission(actor!, workspaceId, 'workspace.view');
    const found = await this.prisma.subscription.findFirst({
      where: { workspaceId },
      include: { plan: { include: { features: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const subscription = found ? await this.resolveExpiry(found) : null;
    return { subscription: subscription ? serializeSubscription(subscription) : null, usage: await this.entitlements.usage(workspaceId) };
  }

  async create(actor: AuthenticatedRequest['user'], workspaceId: string, input: CreateSubscriptionDto, scope: SubscriptionScope = 'workspace') {
    if (scope === 'workspace') await this.access.requireWorkspacePermission(actor!, workspaceId, 'workspace.billing');
    else await this.access.requireAdminPermission(actor!, 'admin.subscriptions.manage');
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { key: input.planKey }, include: { features: true } });
    if (!plan || !plan.isActive) throw new NotFoundException('Plan not found');
    const interval = input.interval ?? plan.interval;
    const existing = await this.prisma.subscription.findFirst({ where: { workspaceId }, orderBy: { createdAt: 'desc' } });
    if (existing && LIVE_STATUSES.includes(existing.status)) throw new ConflictException('This workspace already has a subscription');
    const now = new Date();
    const status: SubscriptionStatus = Number(plan.amount) === 0 ? 'ACTIVE' : plan.trialDays > 0 ? 'TRIALING' : 'PENDING';
    const changes = {
      planId: plan.id,
      status,
      interval,
      currentPeriodStart: now,
      currentPeriodEnd: status === 'TRIALING' ? addDays(now, plan.trialDays) : addInterval(now, interval),
      cancelAtPeriodEnd: false,
      canceledAt: null,
    };
    const subscription = await this.prisma.$transaction(async (tx) => {
      const sub = existing
        ? await tx.subscription.update({ where: { id: existing.id }, data: changes, include: { plan: { include: { features: true } } } })
        : await tx.subscription.create({ data: { workspaceId, ...changes }, include: { plan: { include: { features: true } } } });
      await tx.subscriptionEvent.create({ data: { workspaceId, subscriptionId: sub.id, type: 'CREATED', source: scope, description: `Subscription created on ${plan.name}` } });
      await this.audit.record({ workspaceId, actorId: actor!.userId, action: 'subscription.created', targetType: 'subscription', targetId: sub.id, metadata: { plan: plan.key, interval, status, scope } }, tx);
      return sub;
    });
    return { subscription: serializeSubscription(subscription), overLimit: await this.overLimitWarnings(workspaceId) };
  }

  async changePlan(actor: AuthenticatedRequest['user'], workspaceId: string, input: ChangePlanDto) {
    const sub = await this.memberSubscription(actor, workspaceId, 'workspace.billing');
    return this.applyPlanChange(sub, input.planKey, actor!.userId, 'workspace');
  }

  async changeCycle(actor: AuthenticatedRequest['user'], workspaceId: string, input: ChangeCycleDto) {
    const sub = await this.memberSubscription(actor, workspaceId, 'workspace.billing');
    return this.applyCycleChange(sub, input.interval, actor!.userId, 'workspace');
  }

  async cancel(actor: AuthenticatedRequest['user'], workspaceId: string, input: CancelSubscriptionDto) {
    const sub = await this.memberSubscription(actor, workspaceId, 'workspace.billing');
    return this.applyCancel(sub, Boolean(input.atPeriodEnd), actor!.userId, 'workspace');
  }

  async resume(actor: AuthenticatedRequest['user'], workspaceId: string) {
    const sub = await this.memberSubscription(actor, workspaceId, 'workspace.billing');
    return this.applyReactivate(sub, actor!.userId, 'workspace');
  }

  async renew(actor: AuthenticatedRequest['user'], workspaceId: string) {
    const sub = await this.memberSubscription(actor, workspaceId, 'workspace.billing');
    return this.applyRenew(sub, actor!.userId, 'workspace');
  }

  // ---- Admin scope ----------------------------------------------------------------

  async adminList(query: ListSubscriptionsDto) {
    const where: Prisma.SubscriptionWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.workspaceId ? { workspaceId: query.workspaceId } : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const [rows, total] = await Promise.all([
      this.prisma.subscription.findMany({ where, include: { plan: true, workspace: { include: { owner: { select: { email: true } } } } }, orderBy: { createdAt: 'desc' }, skip, take: query.limit }),
      this.prisma.subscription.count({ where }),
    ]);
    return {
      items: rows.map((row) => ({
        ...serializeSubscription({ ...row, plan: { ...row.plan, features: [] } }),
        status: effectiveStatus(row),
        workspaceName: row.workspace.name,
        ownerEmail: row.workspace.owner.email,
      })),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async adminDetail(subscriptionId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: { include: { features: true } }, workspace: { select: { id: true, name: true, slug: true } }, payments: { orderBy: { createdAt: 'desc' } }, events: { orderBy: { occurredAt: 'desc' }, take: 50 } },
    });
    if (!sub) throw new NotFoundException('Subscription not found');
    const resolved = await this.resolveExpiry(sub);
    return { ...serializeSubscription(resolved), workspace: sub.workspace, payments: sub.payments.map(serializePayment), events: sub.events, usage: await this.entitlements.usage(sub.workspaceId) };
  }

  async adminCreate(actor: AuthenticatedRequest['user'], input: AdminCreateSubscriptionDto) {
    return this.create(actor, input.workspaceId, { planKey: input.planKey, interval: input.interval }, 'admin');
  }

  async adminChangePlan(actor: AuthenticatedRequest['user'], subscriptionId: string, planKey: string) {
    await this.access.requireAdminPermission(actor!, 'admin.subscriptions.manage');
    return this.applyPlanChange(await this.platformSubscription(subscriptionId), planKey, actor!.userId, 'admin');
  }

  async adminChangeCycle(actor: AuthenticatedRequest['user'], subscriptionId: string, interval: BillingInterval) {
    await this.access.requireAdminPermission(actor!, 'admin.subscriptions.manage');
    return this.applyCycleChange(await this.platformSubscription(subscriptionId), interval, actor!.userId, 'admin');
  }

  async adminRenew(actor: AuthenticatedRequest['user'], subscriptionId: string) {
    await this.access.requireAdminPermission(actor!, 'admin.subscriptions.manage');
    return this.applyRenew(await this.platformSubscription(subscriptionId), actor!.userId, 'admin');
  }

  async adminSuspend(actor: AuthenticatedRequest['user'], subscriptionId: string, reason?: string) {
    await this.access.requireAdminPermission(actor!, 'admin.subscriptions.manage');
    const sub = await this.platformSubscription(subscriptionId);
    this.requireStatus(sub, LIVE_STATUSES, 'Subscription cannot be suspended');
    const updated = await this.runTransition(
      sub,
      { status: 'SUSPENDED' },
      { type: 'SUSPENDED', description: reason ?? 'Subscription suspended' },
      { actorId: actor!.userId, action: 'subscription.suspended', metadata: { plan: sub.plan.key, reason: reason ?? null } },
      'admin',
    );
    return serializeSubscription(updated);
  }

  async adminCancel(actor: AuthenticatedRequest['user'], subscriptionId: string, input: CancelSubscriptionDto) {
    await this.access.requireAdminPermission(actor!, 'admin.subscriptions.manage');
    return this.applyCancel(await this.platformSubscription(subscriptionId), Boolean(input.atPeriodEnd), actor!.userId, 'admin');
  }

  async adminReactivate(actor: AuthenticatedRequest['user'], subscriptionId: string) {
    await this.access.requireAdminPermission(actor!, 'admin.subscriptions.manage');
    return this.applyReactivate(await this.platformSubscription(subscriptionId), actor!.userId, 'admin');
  }

  async adminExtend(actor: AuthenticatedRequest['user'], subscriptionId: string, days: number) {
    await this.access.requireAdminPermission(actor!, 'admin.subscriptions.manage');
    const sub = await this.platformSubscription(subscriptionId);
    this.requireStatus(sub, [...ENTITLED, 'SUSPENDED'], 'Subscription cannot be extended');
    const base = sub.currentPeriodEnd && sub.currentPeriodEnd > new Date() ? sub.currentPeriodEnd : new Date();
    const updated = await this.runTransition(
      sub,
      { currentPeriodEnd: addDays(base, days) },
      { type: 'EXTENDED', description: `Subscription extended by ${days} day(s)` },
      { actorId: actor!.userId, action: 'subscription.extended', metadata: { days } },
      'admin',
    );
    return serializeSubscription(updated);
  }

  // ---- Verified payment transitions ------------------------------------------------

  // Single implementation of the payment-driven subscription transitions. Each runs
  // inside the caller's transaction (so payment + subscription rows commit together),
  // re-reads the subscription before deciding, and writes a SubscriptionEvent plus an
  // AuditLog row with the payment id for correlation.

  /** PENDING → ACTIVE after a verified successful payment: sets start/expiry and records entitlements. */
  async activateFromPayment(tx: Prisma.TransactionClient, subscriptionId: string, context: PaymentTransitionContext) {
    const sub = await tx.subscription.findUnique({ where: { id: subscriptionId }, include: { plan: { include: { features: true } } } });
    if (!sub) throw new ConflictException('Payment references a subscription that no longer exists');
    if (sub.status !== 'PENDING') return { subscription: sub, changed: false };
    const now = new Date();
    const extra = (context.metadata ?? {}) as Prisma.JsonObject;
    const entitlements = await this.entitlements.snapshot(sub.workspaceId, tx);
    const updated = await this.applyTransition(
      tx,
      sub,
      { status: 'ACTIVE', currentPeriodStart: now, currentPeriodEnd: addInterval(now, sub.interval), cancelAtPeriodEnd: false, canceledAt: null },
      { type: 'ACTIVATED', description: 'Subscription activated by a verified payment', metadata: { ...extra, entitlements: entitlements as unknown as Prisma.InputJsonValue } },
      { actorId: context.actorId, action: 'subscription.activated', metadata: { ...extra } },
      context.source,
    );
    return { subscription: updated, changed: true };
  }

  /** Entitled subscription + successful payment → new paid period (renewal). */
  async renewFromPayment(tx: Prisma.TransactionClient, subscriptionId: string, context: PaymentTransitionContext) {
    const sub = await tx.subscription.findUnique({ where: { id: subscriptionId }, include: { plan: { include: { features: true } } } });
    if (!sub) throw new ConflictException('Payment references a subscription that no longer exists');
    if (!ENTITLED.includes(sub.status)) return { subscription: sub, changed: false };
    const now = new Date();
    const start = sub.currentPeriodEnd && sub.currentPeriodEnd > now ? sub.currentPeriodEnd : now;
    const extra = (context.metadata ?? {}) as Prisma.JsonObject;
    const updated = await this.applyTransition(
      tx,
      sub,
      { status: 'ACTIVE', currentPeriodStart: start, currentPeriodEnd: addInterval(start, sub.interval) },
      { type: 'RENEWED', description: 'Subscription renewed by a verified payment', metadata: { ...extra, interval: sub.interval } },
      { actorId: context.actorId, action: 'subscription.renewed', metadata: { ...extra, plan: sub.plan.key } },
      context.source,
    );
    return { subscription: updated, changed: true };
  }

  /** Entitled subscription + failed payment → PAST_DUE (never a silent state change). */
  async failFromPayment(tx: Prisma.TransactionClient, subscriptionId: string, context: Omit<PaymentTransitionContext, 'paymentId'> & { paymentId?: string }) {
    const sub = await tx.subscription.findUnique({ where: { id: subscriptionId }, include: { plan: { include: { features: true } } } });
    if (!sub) throw new ConflictException('Payment references a subscription that no longer exists');
    if (!ENTITLED.includes(sub.status) || sub.status === 'PAST_DUE') return { subscription: sub, changed: false };
    const extra = (context.metadata ?? {}) as Prisma.JsonObject;
    const updated = await this.applyTransition(
      tx,
      sub,
      { status: 'PAST_DUE' },
      { type: 'PAYMENT_FAILED', description: 'Subscription marked past due after a failed payment', metadata: extra },
      { actorId: context.actorId, action: 'subscription.payment_failed', metadata: { ...extra, plan: sub.plan.key } },
      context.source,
    );
    return { subscription: updated, changed: true };
  }

  /** Completed full refund → entitlement revoked until the workspace resolves it. */
  async suspendFromRefund(tx: Prisma.TransactionClient, subscriptionId: string, context: PaymentTransitionContext) {
    const sub = await tx.subscription.findUnique({ where: { id: subscriptionId }, include: { plan: { include: { features: true } } } });
    if (!sub) throw new ConflictException('Payment references a subscription that no longer exists');
    if (!ENTITLED.includes(sub.status)) return { subscription: sub, changed: false };
    const extra = (context.metadata ?? {}) as Prisma.JsonObject;
    const updated = await this.applyTransition(
      tx,
      sub,
      { status: 'SUSPENDED' },
      { type: 'SUSPENDED', description: 'Subscription suspended after a completed refund', metadata: extra },
      { actorId: context.actorId, action: 'subscription.suspended', metadata: { ...extra, plan: sub.plan.key, reason: 'refund' } },
      context.source,
    );
    return { subscription: updated, changed: true };
  }

  // ---- Payments (admin) -----------------------------------------------------------

  async adminListPayments(query: ListPaymentsDto) {
    const where: Prisma.PaymentWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.workspaceId ? { workspaceId: query.workspaceId } : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const [rows, total] = await Promise.all([
      this.prisma.payment.findMany({ where, include: { workspace: { select: { name: true } }, subscription: { include: { plan: true } } }, orderBy: { createdAt: 'desc' }, skip, take: query.limit }),
      this.prisma.payment.count({ where }),
    ]);
    return {
      items: rows.map((row) => ({ ...serializePayment(row), workspaceName: row.workspace.name, planKey: row.subscription.plan.key, planName: row.subscription.plan.name })),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  /**
   * Records an operator-supplied payment (bank transfer, offline terminal, ...) as
   * evidence. It deliberately activates nothing: activation always happens through the
   * auditable manual-activation workflow in the payments module, which validates this
   * row (or a provider-verified reference) and requires a reason plus confirmation.
   */
  async adminRecordPayment(actor: AuthenticatedRequest['user'], input: { subscriptionId: string; amount: number; currency: string; status: PaymentStatus; provider?: string; providerReference?: string; reference?: string }) {
    await this.access.requireAdminPermission(actor!, 'admin.payments.manage');
    if (!['PENDING', 'SUCCEEDED', 'FAILED'].includes(input.status)) throw new BadRequestException('Payment status must be pending, succeeded or failed');
    const sub = await this.platformSubscription(input.subscriptionId);
    const now = new Date();
    const payment = await this.prisma.$transaction(async (tx) => {
      const row = await tx.payment.create({
        data: {
          workspaceId: sub.workspaceId,
          subscriptionId: sub.id,
          reference: input.reference ?? newPaymentReference(),
          provider: input.provider ?? 'manual',
          providerReference: input.providerReference,
          amount: input.amount,
          currency: input.currency.toUpperCase(),
          status: input.status,
          paidAt: input.status === 'SUCCEEDED' ? now : null,
          metadata: { recordedBy: actor!.userId, evidence: 'manual_record' },
        },
      });
      await this.audit.record({ workspaceId: sub.workspaceId, actorId: actor!.userId, action: 'payment.recorded', targetType: 'payment', targetId: row.id, metadata: { amount: input.amount, currency: input.currency.toUpperCase(), status: input.status, subscriptionId: sub.id, reference: row.reference } }, tx);
      return row;
    });
    return { payment: serializePayment(payment), subscription: serializeSubscription(sub) };
  }

  // ---- Internals ------------------------------------------------------------------

  private async memberSubscription(actor: AuthenticatedRequest['user'], workspaceId: string, permission: string): Promise<SubscriptionWithPlan> {
    await this.access.requireWorkspacePermission(actor!, workspaceId, permission);
    const found = await this.prisma.subscription.findFirst({ where: { workspaceId }, include: { plan: { include: { features: true } } }, orderBy: { createdAt: 'desc' } });
    if (!found) throw new NotFoundException('No subscription found for this workspace');
    return this.resolveExpiry(found);
  }

  private async platformSubscription(subscriptionId: string): Promise<SubscriptionWithPlan> {
    const found = await this.prisma.subscription.findUnique({ where: { id: subscriptionId }, include: { plan: { include: { features: true } } } });
    if (!found) throw new NotFoundException('Subscription not found');
    return this.resolveExpiry(found);
  }

  // Persists the lazy expiry transition when a paid period ran out without a job running.
  private async resolveExpiry(subscription: SubscriptionWithPlan): Promise<SubscriptionWithPlan> {
    const status = effectiveStatus(subscription);
    if (status === subscription.status) return subscription;
    return this.runTransition(
      subscription,
      { status },
      { type: status === 'EXPIRED' ? 'EXPIRED' : 'CANCELED', description: 'Subscription period ended' },
      { actorId: null, action: status === 'EXPIRED' ? 'subscription.expired' : 'subscription.canceled', metadata: { scope: 'system' } },
      'system',
    );
  }

  private async applyPlanChange(sub: SubscriptionWithPlan, planKey: string, actorId: string, scope: SubscriptionScope) {
    this.requireStatus(sub, LIVE_STATUSES, 'Reactivate the subscription before changing plans');
    if (sub.plan.key === planKey) throw new ConflictException('The subscription is already on this plan');
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { key: planKey }, include: { features: true } });
    if (!plan || !plan.isActive) throw new NotFoundException('Plan not found');
    const direction = Number(plan.amount) >= Number(sub.plan.amount) ? 'upgrade' : 'downgrade';
    const updated = await this.runTransition(
      sub,
      { plan: { connect: { id: plan.id } } },
      { type: 'PLAN_CHANGED', description: `Plan changed from ${sub.plan.name} to ${plan.name}`, metadata: { from: sub.plan.key, to: plan.key, direction } },
      { actorId, action: 'subscription.plan_changed', metadata: { from: sub.plan.key, to: plan.key, direction } },
      scope,
    );
    return { subscription: serializeSubscription(updated), overLimit: await this.overLimitWarnings(sub.workspaceId) };
  }

  private async applyCycleChange(sub: SubscriptionWithPlan, interval: BillingInterval, actorId: string, scope: SubscriptionScope) {
    this.requireStatus(sub, ENTITLED, 'Only an entitled subscription can change its billing cycle');
    if (sub.interval === interval) throw new ConflictException(`The billing cycle is already ${interval.toLowerCase()}`);
    const start = new Date();
    const updated = await this.runTransition(
      sub,
      { interval, currentPeriodStart: start, currentPeriodEnd: addInterval(start, interval) },
      { type: 'CYCLE_CHANGED', description: `Billing cycle changed to ${interval.toLowerCase()}`, metadata: { interval } },
      { actorId, action: 'subscription.cycle_changed', metadata: { interval } },
      scope,
    );
    return serializeSubscription(updated);
  }

  private async applyCancel(sub: SubscriptionWithPlan, atPeriodEnd: boolean, actorId: string, scope: SubscriptionScope) {
    this.requireStatus(sub, LIVE_STATUSES, 'Subscription cannot be cancelled');
    const updated = await this.runTransition(
      sub,
      atPeriodEnd ? { cancelAtPeriodEnd: true, canceledAt: new Date() } : { status: 'CANCELED', cancelAtPeriodEnd: false, canceledAt: new Date() },
      { type: 'CANCELED', description: atPeriodEnd ? 'Cancellation scheduled at period end' : 'Subscription cancelled' },
      { actorId, action: 'subscription.canceled', metadata: { atPeriodEnd } },
      scope,
    );
    return serializeSubscription(updated);
  }

  private async applyReactivate(sub: SubscriptionWithPlan, actorId: string, scope: SubscriptionScope) {
    this.requireStatus(sub, RESUMABLE, 'Subscription cannot be reactivated');
    const now = new Date();
    const periodEnded = !sub.currentPeriodEnd || sub.currentPeriodEnd <= now;
    const updated = await this.runTransition(
      sub,
      {
        status: 'ACTIVE',
        cancelAtPeriodEnd: false,
        canceledAt: null,
        ...(periodEnded ? { currentPeriodStart: now, currentPeriodEnd: addInterval(now, sub.interval) } : {}),
      },
      { type: 'REACTIVATED', description: 'Subscription reactivated' },
      { actorId, action: 'subscription.reactivated', metadata: { plan: sub.plan.key, restartedPeriod: periodEnded } },
      scope,
    );
    return serializeSubscription(updated);
  }

  private async applyRenew(sub: SubscriptionWithPlan, actorId: string, scope: SubscriptionScope) {
    this.requireStatus(sub, ENTITLED, 'Only an entitled subscription can be renewed');
    const now = new Date();
    const start = sub.currentPeriodEnd && sub.currentPeriodEnd > now ? sub.currentPeriodEnd : now;
    const updated = await this.runTransition(
      sub,
      { status: 'ACTIVE', currentPeriodStart: start, currentPeriodEnd: addInterval(start, sub.interval) },
      { type: 'RENEWED', description: 'Subscription renewed' },
      { actorId, action: 'subscription.renewed', metadata: { plan: sub.plan.key, interval: sub.interval } },
      scope,
    );
    return serializeSubscription(updated);
  }

  private requireStatus(sub: SubscriptionWithPlan, allowed: SubscriptionStatus[], message: string): void {
    if (!allowed.includes(sub.status)) throw new ConflictException(message);
  }

  private async runTransition(
    sub: SubscriptionWithPlan,
    changes: Prisma.SubscriptionUpdateInput,
    event: { type: SubscriptionEventType; description?: string; metadata?: Prisma.InputJsonValue },
    auditEntry: { actorId: string | null; action: string; metadata?: Prisma.InputJsonValue },
    source: string,
  ): Promise<SubscriptionWithPlan> {
    return this.prisma.$transaction((tx) => this.applyTransition(tx, sub, changes, event, auditEntry, source));
  }

  private async applyTransition(
    tx: Prisma.TransactionClient,
    sub: SubscriptionWithPlan,
    changes: Prisma.SubscriptionUpdateInput,
    event: { type: SubscriptionEventType; description?: string; metadata?: Prisma.InputJsonValue },
    auditEntry: { actorId: string | null; action: string; metadata?: Prisma.InputJsonValue },
    source: string,
  ): Promise<SubscriptionWithPlan> {
    const updated = await tx.subscription.update({ where: { id: sub.id }, data: changes, include: { plan: { include: { features: true } } } });
    await tx.subscriptionEvent.create({ data: { workspaceId: sub.workspaceId, subscriptionId: sub.id, type: event.type, source, description: event.description, metadata: event.metadata } });
    await this.audit.record({ workspaceId: sub.workspaceId, actorId: auditEntry.actorId, action: auditEntry.action, targetType: 'subscription', targetId: sub.id, metadata: { ...(auditEntry.metadata as Prisma.JsonObject | undefined ?? {}), source } }, tx);
    return updated;
  }

  // Compares current usage against the (new) plan limits after a plan change so the
  // caller learns immediately when existing resources exceed a downgrade.
  private async overLimitWarnings(workspaceId: string): Promise<string[]> {
    const usage = await this.entitlements.usage(workspaceId);
    const warnings: string[] = [];
    const check = (name: string, used: number, limit: number) => {
      if (limit > 0 && used > limit) warnings.push(name);
    };
    check('members', usage.used.members + usage.used.pendingInvitations, usage.limits.seats);
    check('connectedAccounts', usage.used.connectedAccounts, usage.limits.connectedAccounts);
    check('websites', usage.used.websites, usage.limits.websites);
    check('reportsThisMonth', usage.used.reportsThisMonth, usage.limits.reportsPerMonth);
    check('aiRequestsThisMonth', usage.used.aiRequestsThisMonth, usage.limits.aiRequestsPerMonth);
    return warnings;
  }
}
