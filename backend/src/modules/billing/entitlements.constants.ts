import type { SubscriptionStatus } from '@prisma/client';

// Statuses whose workspace still inherits the plan's entitlements. PAST_DUE keeps
// working until the paid period ends; PENDING (awaiting payment) never grants access.
export const ENTITLED_STATUSES: SubscriptionStatus[] = ['TRIALING', 'ACTIVE', 'PAST_DUE'];

// Fallback free-tier limits used only when no `free` plan row exists yet (db:seed
// creates it). Zero means "unlimited" for every limit — the plan catalog convention.
export const FREE_TIER_LIMITS = {
  seats: 1,
  connectedAccounts: 1,
  websites: 1,
  analyticsHistoryDays: 7,
  reportsPerMonth: 5,
  aiRequestsPerMonth: 2,
} as const;

export const FREE_PLAN_KEY = 'free';

export const USAGE_KEYS = {
  reports: 'reports',
  aiRequests: 'ai_requests',
} as const;

export type UsageKey = (typeof USAGE_KEYS)[keyof typeof USAGE_KEYS];

export function usageLimitFor(key: UsageKey, limits: { reportsPerMonth: number; aiRequestsPerMonth: number }): number {
  return key === USAGE_KEYS.reports ? limits.reportsPerMonth : limits.aiRequestsPerMonth;
}
