import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { serializePlan } from './billing.util';
import type { CreatePlanDto, UpdatePlanDto } from './billing.dto';
import type { AuthenticatedRequest } from '../auth/access-token.guard';

// Subscription plan catalog. Plans are platform-scoped rows; every limit they carry
// is read back from the database by EntitlementsService — never from a request body.
@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async catalog() {
    const plans = await this.prisma.subscriptionPlan.findMany({ where: { isActive: true }, include: { features: true }, orderBy: { displayOrder: 'asc' } });
    return plans.map(serializePlan);
  }

  async list() {
    const plans = await this.prisma.subscriptionPlan.findMany({ include: { features: true, _count: { select: { subscriptions: true } } }, orderBy: { displayOrder: 'asc' } });
    return plans.map((plan) => ({ ...serializePlan(plan), subscriptions: plan._count.subscriptions }));
  }

  async detail(planId: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: planId }, include: { features: true } });
    if (!plan) throw new NotFoundException('Plan not found');
    return serializePlan(plan);
  }

  async create(actor: AuthenticatedRequest['user'], input: CreatePlanDto) {
    const key = input.key.toLowerCase();
    const existing = await this.prisma.subscriptionPlan.findUnique({ where: { key }, select: { id: true } });
    if (existing) throw new ConflictException('A plan with this key already exists');
    const plan = await this.prisma.$transaction(async (tx) => {
      const created = await tx.subscriptionPlan.create({
        data: {
          key,
          name: input.name.trim(),
          description: input.description?.trim(),
          amount: input.monthlyAmount,
          annualAmount: input.annualAmount,
          currency: input.currency.toUpperCase(),
          interval: input.interval,
          trialDays: input.trialDays ?? 0,
          seatLimit: input.seatLimit,
          maxConnectedAccounts: input.maxConnectedAccounts,
          maxWebsites: input.maxWebsites,
          analyticsHistoryDays: input.analyticsHistoryDays,
          maxReportsPerMonth: input.maxReportsPerMonth,
          maxAiRequestsPerMonth: input.maxAiRequestsPerMonth,
          displayOrder: input.displayOrder ?? 0,
          isActive: input.isActive ?? true,
        },
      });
      if (input.features?.length) {
        await tx.planFeature.createMany({ data: input.features.map((feature) => ({ planId: created.id, key: feature.key, label: feature.label, value: feature.value })) });
      }
      await this.audit.record({ actorId: actor?.userId ?? null, action: 'plan.created', targetType: 'plan', targetId: created.id, metadata: { key } }, tx);
      return created;
    });
    return this.detail(plan.id);
  }

  async update(actor: AuthenticatedRequest['user'], planId: string, input: UpdatePlanDto) {
    const existing = await this.prisma.subscriptionPlan.findUnique({ where: { id: planId }, select: { id: true } });
    if (!existing) throw new NotFoundException('Plan not found');
    const { features, ...fields } = input;
    const data: Prisma.SubscriptionPlanUpdateInput = {};
    if (fields.name !== undefined) data.name = fields.name.trim();
    if (fields.description !== undefined) data.description = fields.description.trim();
    if (fields.monthlyAmount !== undefined) data.amount = fields.monthlyAmount;
    if (fields.annualAmount !== undefined) data.annualAmount = fields.annualAmount;
    if (fields.currency !== undefined) data.currency = fields.currency.toUpperCase();
    if (fields.interval !== undefined) data.interval = fields.interval;
    if (fields.trialDays !== undefined) data.trialDays = fields.trialDays;
    if (fields.seatLimit !== undefined) data.seatLimit = fields.seatLimit;
    if (fields.maxConnectedAccounts !== undefined) data.maxConnectedAccounts = fields.maxConnectedAccounts;
    if (fields.maxWebsites !== undefined) data.maxWebsites = fields.maxWebsites;
    if (fields.analyticsHistoryDays !== undefined) data.analyticsHistoryDays = fields.analyticsHistoryDays;
    if (fields.maxReportsPerMonth !== undefined) data.maxReportsPerMonth = fields.maxReportsPerMonth;
    if (fields.maxAiRequestsPerMonth !== undefined) data.maxAiRequestsPerMonth = fields.maxAiRequestsPerMonth;
    if (fields.displayOrder !== undefined) data.displayOrder = fields.displayOrder;
    if (fields.isActive !== undefined) data.isActive = fields.isActive;
    await this.prisma.$transaction(async (tx) => {
      await tx.subscriptionPlan.update({ where: { id: planId }, data });
      if (features) {
        await tx.planFeature.deleteMany({ where: { planId } });
        if (features.length) await tx.planFeature.createMany({ data: features.map((feature) => ({ planId, key: feature.key, label: feature.label, value: feature.value })) });
      }
      await this.audit.record({ actorId: actor?.userId ?? null, action: 'plan.updated', targetType: 'plan', targetId: planId, metadata: { fields: Object.keys(fields) } }, tx);
    });
    return this.detail(planId);
  }

  async remove(actor: AuthenticatedRequest['user'], planId: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: planId }, select: { id: true, key: true, _count: { select: { subscriptions: true } } } });
    if (!plan) throw new NotFoundException('Plan not found');
    if (plan._count.subscriptions > 0) throw new ConflictException('Plan is referenced by existing subscriptions');
    await this.prisma.$transaction(async (tx) => {
      await tx.subscriptionPlan.delete({ where: { id: planId } });
      await this.audit.record({ actorId: actor?.userId ?? null, action: 'plan.deleted', targetType: 'plan', targetId: planId, metadata: { key: plan.key } }, tx);
    });
    return { deleted: true };
  }
}
