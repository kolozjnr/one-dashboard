import { ConflictException, Injectable } from '@nestjs/common';
import type { Prisma, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ENTITLED_STATUSES, FREE_PLAN_KEY, FREE_TIER_LIMITS, USAGE_KEYS, usageLimitFor, type UsageKey } from './entitlements.constants';
import { monthStart } from './billing.util';

export interface PlanLimits {
  seats: number;
  connectedAccounts: number;
  websites: number;
  analyticsHistoryDays: number;
  reportsPerMonth: number;
  aiRequestsPerMonth: number;
}

export interface EntitlementSnapshot {
  status: SubscriptionStatus | 'NONE';
  plan: { id: string; key: string; name: string; currency: string; monthlyAmount: number; annualAmount: number | null; trialDays: number } | null;
  limits: PlanLimits;
  features: string[];
}

export interface UsageReport {
  status: SubscriptionStatus | 'NONE';
  plan: EntitlementSnapshot['plan'];
  limits: PlanLimits;
  features: string[];
  used: {
    members: number;
    pendingInvitations: number;
    connectedAccounts: number;
    websites: number;
    reportsThisMonth: number;
    aiRequestsThisMonth: number;
  };
  remaining: {
    seats: number | null;
    connectedAccounts: number | null;
    websites: number | null;
    reportsThisMonth: number | null;
    aiRequestsThisMonth: number | null;
  };
  analyticsHistory: { days: number; since: Date | null };
}

type Db = Prisma.TransactionClient | PrismaService;

// Reusable entitlement oracle for plan limits. Reads the workspace's entitled
// subscription and its plan from the database on every check — no limit is ever
// supplied by a caller or trusted from the frontend. Controllers must not
// duplicate these checks; they call the can*/assert* methods here instead.
@Injectable()
export class EntitlementsService {
  constructor(private readonly prisma: PrismaService) {}

  private db(client?: Prisma.TransactionClient): Db {
    return client ?? this.prisma;
  }

  async snapshot(workspaceId: string, client?: Prisma.TransactionClient): Promise<EntitlementSnapshot> {
    const db = this.db(client);
    const now = new Date();
    const subscription = await db.subscription.findFirst({
      where: {
        workspaceId,
        status: { in: ENTITLED_STATUSES },
        OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: now } }],
      },
      include: { plan: { include: { features: true } } },
      orderBy: { createdAt: 'desc' },
    });
    if (subscription) return this.fromPlan(subscription.plan, subscription.status);
    const free = await db.subscriptionPlan.findUnique({ where: { key: FREE_PLAN_KEY }, include: { features: true } });
    if (free) return this.fromPlan(free, 'NONE');
    return { status: 'NONE', plan: null, limits: { ...FREE_TIER_LIMITS }, features: [] };
  }

  async usage(workspaceId: string, client?: Prisma.TransactionClient): Promise<UsageReport> {
    const db = this.db(client);
    const [snapshot, members, pendingInvitations, connectedAccounts, websites, reports, aiRequests] = await Promise.all([
      this.snapshot(workspaceId, client),
      db.workspaceMembership.count({ where: { workspaceId, status: { in: ['ACTIVE', 'SUSPENDED'] } } }),
      db.invitation.count({ where: { workspaceId, status: 'PENDING', expiresAt: { gt: new Date() } } }),
      db.connectedAccount.count({ where: { workspaceId, deletedAt: null } }),
      db.website.count({ where: { workspaceId, deletedAt: null } }),
      this.counter(db, workspaceId, USAGE_KEYS.reports),
      this.counter(db, workspaceId, USAGE_KEYS.aiRequests),
    ]);
    const { limits } = snapshot;
    const remaining = (used: number, limit: number) => (limit <= 0 ? null : Math.max(0, limit - used));
    return {
      status: snapshot.status,
      plan: snapshot.plan,
      limits,
      features: snapshot.features,
      used: { members, pendingInvitations, connectedAccounts, websites, reportsThisMonth: reports, aiRequestsThisMonth: aiRequests },
      remaining: {
        seats: remaining(members + pendingInvitations, limits.seats),
        connectedAccounts: remaining(connectedAccounts, limits.connectedAccounts),
        websites: remaining(websites, limits.websites),
        reportsThisMonth: remaining(reports, limits.reportsPerMonth),
        aiRequestsThisMonth: remaining(aiRequests, limits.aiRequestsPerMonth),
      },
      analyticsHistory: {
        days: limits.analyticsHistoryDays,
        since: limits.analyticsHistoryDays <= 0 ? null : new Date(Date.now() - limits.analyticsHistoryDays * 86_400_000),
      },
    };
  }

  async canConnectAccount(workspaceId: string, client?: Prisma.TransactionClient): Promise<boolean> {
    const db = this.db(client);
    const [{ limits }, used] = await Promise.all([
      this.snapshot(workspaceId, client),
      db.connectedAccount.count({ where: { workspaceId, deletedAt: null } }),
    ]);
    return this.withinLimit(used, limits.connectedAccounts);
  }

  async canInviteMember(workspaceId: string, client?: Prisma.TransactionClient): Promise<boolean> {
    const db = this.db(client);
    const [{ limits }, members, pendingInvitations] = await Promise.all([
      this.snapshot(workspaceId, client),
      db.workspaceMembership.count({ where: { workspaceId, status: { in: ['ACTIVE', 'SUSPENDED'] } } }),
      db.invitation.count({ where: { workspaceId, status: 'PENDING', expiresAt: { gt: new Date() } } }),
    ]);
    return this.withinLimit(members + pendingInvitations, limits.seats);
  }

  // Seat check used while accepting an invitation: the accepting member is not a
  // membership row yet, so only existing memberships must fit within the seats.
  async canJoinWorkspace(workspaceId: string, client?: Prisma.TransactionClient): Promise<boolean> {
    const db = this.db(client);
    const [{ limits }, members] = await Promise.all([
      this.snapshot(workspaceId, client),
      db.workspaceMembership.count({ where: { workspaceId, status: { in: ['ACTIVE', 'SUSPENDED'] } } }),
    ]);
    return this.withinLimit(members, limits.seats);
  }

  async canCreateWebsite(workspaceId: string, client?: Prisma.TransactionClient): Promise<boolean> {
    const db = this.db(client);
    const [{ limits }, used] = await Promise.all([
      this.snapshot(workspaceId, client),
      db.website.count({ where: { workspaceId, deletedAt: null } }),
    ]);
    return this.withinLimit(used, limits.websites);
  }

  async canGenerateReport(workspaceId: string, client?: Prisma.TransactionClient): Promise<boolean> {
    const snapshot = await this.snapshot(workspaceId, client);
    const used = await this.counter(this.db(client), workspaceId, USAGE_KEYS.reports);
    return this.withinLimit(used, snapshot.limits.reportsPerMonth);
  }

  async canUseAI(workspaceId: string, client?: Prisma.TransactionClient): Promise<boolean> {
    const snapshot = await this.snapshot(workspaceId, client);
    const used = await this.counter(this.db(client), workspaceId, USAGE_KEYS.aiRequests);
    return this.withinLimit(used, snapshot.limits.aiRequestsPerMonth);
  }

  async canAccessFeature(workspaceId: string, feature: string, client?: Prisma.TransactionClient): Promise<boolean> {
    const snapshot = await this.snapshot(workspaceId, client);
    return snapshot.features.includes(feature);
  }

  async canAccessAnalyticsHistory(workspaceId: string, date: Date, client?: Prisma.TransactionClient): Promise<boolean> {
    const snapshot = await this.snapshot(workspaceId, client);
    const days = snapshot.limits.analyticsHistoryDays;
    return days <= 0 || date.getTime() >= Date.now() - days * 86_400_000;
  }

  async assertCanConnectAccount(workspaceId: string, client?: Prisma.TransactionClient): Promise<void> {
    if (!(await this.canConnectAccount(workspaceId, client))) throw new ConflictException('The connected account limit for this plan has been reached');
  }

  async assertCanInviteMember(workspaceId: string, client?: Prisma.TransactionClient): Promise<void> {
    if (!(await this.canInviteMember(workspaceId, client))) throw new ConflictException('No workspace seats are available');
  }

  async assertCanCreateWebsite(workspaceId: string, client?: Prisma.TransactionClient): Promise<void> {
    if (!(await this.canCreateWebsite(workspaceId, client))) throw new ConflictException('The website limit for this plan has been reached');
  }

  async assertCanGenerateReport(workspaceId: string, client?: Prisma.TransactionClient): Promise<void> {
    if (!(await this.canGenerateReport(workspaceId, client))) throw new ConflictException('The monthly report limit for this plan has been reached');
  }

  async assertCanUseAI(workspaceId: string, client?: Prisma.TransactionClient): Promise<void> {
    if (!(await this.canUseAI(workspaceId, client))) throw new ConflictException('The monthly AI request limit for this plan has been reached');
  }

  // Atomically consume one unit of a metered monthly limit (reports, AI requests).
  // The increment rolls back with the transaction when the plan limit is reached.
  async consumeUsage(workspaceId: string, key: UsageKey, client?: Prisma.TransactionClient): Promise<number> {
    const snapshot = await this.snapshot(workspaceId, client);
    const limit = usageLimitFor(key, snapshot.limits);
    const run = async (tx: Db): Promise<number> => {
      const row = await tx.usageCounter.upsert({
        where: { workspaceId_key_periodStart: { workspaceId, key, periodStart: monthStart(new Date()) } },
        create: { workspaceId, key, periodStart: monthStart(new Date()), value: 1 },
        update: { value: { increment: 1 } },
      });
      if (!this.withinLimit(row.value - 1, limit)) {
        throw new ConflictException(key === USAGE_KEYS.reports ? 'The monthly report limit for this plan has been reached' : 'The monthly AI request limit for this plan has been reached');
      }
      return row.value;
    };
    if (client) return run(client);
    return this.prisma.$transaction(run);
  }

  async incrementUsage(workspaceId: string, key: UsageKey, amount = 1, client?: Prisma.TransactionClient): Promise<number> {
    const periodStart = monthStart(new Date());
    const row = await this.db(client).usageCounter.upsert({
      where: { workspaceId_key_periodStart: { workspaceId, key, periodStart } },
      create: { workspaceId, key, periodStart, value: amount },
      update: { value: { increment: amount } },
    });
    return row.value;
  }

  private async counter(db: Db, workspaceId: string, key: UsageKey): Promise<number> {
    const row = await db.usageCounter.findUnique({
      where: { workspaceId_key_periodStart: { workspaceId, key, periodStart: monthStart(new Date()) } },
      select: { value: true },
    });
    return row?.value ?? 0;
  }

  // Zero (or negative) means unlimited; otherwise usage must stay below the limit.
  private withinLimit(used: number, limit: number): boolean {
    return limit <= 0 || used < limit;
  }

  private fromPlan(plan: SubscriptionPlan & { features: { key: string }[] }, status: SubscriptionStatus | 'NONE'): EntitlementSnapshot {
    return {
      status,
      plan: {
        id: plan.id,
        key: plan.key,
        name: plan.name,
        currency: plan.currency,
        monthlyAmount: Number(plan.amount),
        annualAmount: plan.annualAmount === null ? null : Number(plan.annualAmount),
        trialDays: plan.trialDays,
      },
      limits: {
        seats: plan.seatLimit,
        connectedAccounts: plan.maxConnectedAccounts,
        websites: plan.maxWebsites,
        analyticsHistoryDays: plan.analyticsHistoryDays,
        reportsPerMonth: plan.maxReportsPerMonth,
        aiRequestsPerMonth: plan.maxAiRequestsPerMonth,
      },
      features: plan.features.map((feature) => feature.key),
    };
  }
}
