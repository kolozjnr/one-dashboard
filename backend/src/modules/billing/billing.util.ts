import { randomBytes } from 'node:crypto';
import type { BillingInterval, Payment, PlanFeature, Subscription, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import type { PlanLimits } from './entitlements.service';

// Globally unique, provider-independent transaction reference. Minted server-side,
// never derived from client input, and only ever *compared* when a provider echoes it
// back — a redirect carrying it proves nothing by itself.
export function newPaymentReference(): string {
  return `mp_${randomBytes(16).toString('hex')}`;
}

// What one billing interval of a plan costs, in major units. The annual price wins when
// present; otherwise a yearly cycle is twelve monthly charges.
export function expectedChargeAmount(plan: Pick<SubscriptionPlan, 'amount' | 'annualAmount'>, interval: BillingInterval): number {
  return interval === 'YEARLY' ? Number(plan.annualAmount ?? Number(plan.amount) * 12) : Number(plan.amount);
}

export function monthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonths(date: Date, months: number): Date {
  const target = new Date(date.getTime());
  const day = target.getUTCDate();
  target.setUTCDate(1);
  target.setUTCMonth(target.getUTCMonth() + months);
  const daysInMonth = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, daysInMonth));
  return target;
}

// Adds one billing interval to a date (calendar-safe for month ends).
export function addInterval(date: Date, interval: BillingInterval): Date {
  return interval === 'YEARLY' ? addMonths(date, 12) : addMonths(date, 1);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

// Status a subscription should present as: periods that ran out expire (or cancel when
// cancelAtPeriodEnd was set) without requiring a background job.
export function effectiveStatus(
  subscription: Pick<Subscription, 'status' | 'cancelAtPeriodEnd' | 'currentPeriodEnd'>,
  now: Date = new Date(),
): SubscriptionStatus {
  const ended = subscription.currentPeriodEnd !== null && subscription.currentPeriodEnd <= now;
  const entitled = subscription.status === 'TRIALING' || subscription.status === 'ACTIVE' || subscription.status === 'PAST_DUE';
  if (ended && entitled) return subscription.cancelAtPeriodEnd ? 'CANCELED' : 'EXPIRED';
  return subscription.status;
}

export interface SerializedPlan {
  id: string;
  key: string;
  name: string;
  description: string | null;
  monthlyAmount: number;
  annualAmount: number | null;
  currency: string;
  interval: BillingInterval;
  trialDays: number;
  seatLimit: number;
  maxConnectedAccounts: number;
  maxWebsites: number;
  analyticsHistoryDays: number;
  maxReportsPerMonth: number;
  maxAiRequestsPerMonth: number;
  displayOrder: number;
  isActive: boolean;
  features: { key: string; label: string; value: string | null }[];
}

export function serializePlan(plan: SubscriptionPlan & { features?: PlanFeature[] }): SerializedPlan {
  return {
    id: plan.id,
    key: plan.key,
    name: plan.name,
    description: plan.description,
    monthlyAmount: Number(plan.amount),
    annualAmount: plan.annualAmount === null ? null : Number(plan.annualAmount),
    currency: plan.currency,
    interval: plan.interval,
    trialDays: plan.trialDays,
    seatLimit: plan.seatLimit,
    maxConnectedAccounts: plan.maxConnectedAccounts,
    maxWebsites: plan.maxWebsites,
    analyticsHistoryDays: plan.analyticsHistoryDays,
    maxReportsPerMonth: plan.maxReportsPerMonth,
    maxAiRequestsPerMonth: plan.maxAiRequestsPerMonth,
    displayOrder: plan.displayOrder,
    isActive: plan.isActive,
    features: (plan.features ?? []).map((feature) => ({ key: feature.key, label: feature.label, value: feature.value })),
  };
}

export function serializeSubscription(subscription: Subscription & { plan: SubscriptionPlan & { features?: PlanFeature[] } }) {
  return {
    id: subscription.id,
    workspaceId: subscription.workspaceId,
    planId: subscription.planId,
    status: subscription.status,
    interval: subscription.interval,
    provider: subscription.provider,
    providerCustomerId: subscription.providerCustomerId,
    providerSubscriptionId: subscription.providerSubscriptionId,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    canceledAt: subscription.canceledAt,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
    plan: serializePlan(subscription.plan),
  };
}

export function serializePayment(payment: Payment) {
  return {
    id: payment.id,
    workspaceId: payment.workspaceId,
    subscriptionId: payment.subscriptionId,
    reference: payment.reference,
    provider: payment.provider,
    providerReference: payment.providerReference,
    amount: Number(payment.amount),
    currency: payment.currency,
    status: payment.status,
    channel: payment.channel,
    failureReason: payment.failureReason,
    verifiedAt: payment.verifiedAt,
    verificationSource: payment.verificationSource,
    refundedAmount: Number(payment.refundedAmount),
    paidAt: payment.paidAt,
    refundedAt: payment.refundedAt,
    createdAt: payment.createdAt,
  };
}

// Plan limits are read from the database only; zero (or less) always means unlimited.
export function limitSnapshot(limits: PlanLimits) {
  return { ...limits };
}
