import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import type { Subscription } from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';

export interface SubscriptionConfirmationJob {
  notificationId: string;
  workspaceId: string;
  userId: string;
  subscriptionId: string;
  planName: string;
  reference: string | null;
  type: 'subscription.activated';
}

/**
 * Confirmation queue for billing outcomes. The in-app `Notification` row is written in
 * the same spirit as the payment records (durable, workspace-scoped, immediately
 * visible), and the delivery job is enqueued afterwards so an unreachable broker never
 * fails the payment itself.
 */
@Injectable()
export class PaymentNotificationsService {
  private readonly logger = new Logger(PaymentNotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('notifications') private readonly queue: Queue<SubscriptionConfirmationJob>,
  ) {}

  async confirmSubscriptionActivated(input: { workspaceId: string; subscription: Subscription & { plan: { name: string } }; reference: string | null }): Promise<void> {
    try {
      const workspace = await this.prisma.workspace.findUnique({ where: { id: input.workspaceId }, select: { ownerId: true, name: true } });
      if (!workspace) return;
      const membership = await this.prisma.workspaceMembership.findUnique({
        where: { workspaceId_userId: { workspaceId: input.workspaceId, userId: workspace.ownerId } },
        select: { status: true },
      });
      if (!membership || membership.status !== 'ACTIVE') {
        this.logger.warn(`Workspace ${input.workspaceId} has no active owner membership; confirmation not queued`);
        return;
      }
      const title = `${input.subscription.plan.name} plan is active`;
      const message = `Payment ${input.reference ?? 'received'} confirmed. Your subscription is active and workspace entitlements have been updated.`;
      const notification = await this.prisma.notification.create({
        data: { workspaceId: input.workspaceId, userId: workspace.ownerId, type: 'subscription.activated', title, message },
      });
      const job: SubscriptionConfirmationJob = {
        notificationId: notification.id,
        workspaceId: input.workspaceId,
        userId: workspace.ownerId,
        subscriptionId: input.subscription.id,
        planName: input.subscription.plan.name,
        reference: input.reference,
        type: 'subscription.activated',
      };
      await this.queue.add('subscription.activated', job, {
        // The notification id is the idempotency key: replayed verifications must not
        // enqueue a second confirmation for the same activation.
        jobId: `subscription-activated:${notification.id}`,
        removeOnComplete: true,
        removeOnFail: true,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`Could not queue the subscription confirmation (${message})`);
    }
  }
}
