import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Job } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { EmailDeliveryService } from '../auth/email-delivery.service';
import type { SubscriptionConfirmationJob } from './payment-notifications.service';

/**
 * Consumes the confirmation queue. The durable record is the `Notification` row the
 * producer already wrote; this worker adds the best-effort email leg. Every failure is
 * logged and swallowed — a missing SMTP transport must never turn a confirmed payment
 * into an error.
 */
@Injectable()
@Processor('notifications')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emails: EmailDeliveryService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async process(job: Job<SubscriptionConfirmationJob>): Promise<{ delivered: boolean; reason?: string }> {
    const payload = job.data;
    if (payload.type !== 'subscription.activated') return { delivered: false, reason: 'unsupported_job' };

    const notification = await this.prisma.notification.findUnique({ where: { id: payload.notificationId }, select: { id: true } });
    if (!notification) return { delivered: false, reason: 'notification_missing' };

    if (!this.config.get<string>('SMTP_URL') || !this.config.get<string>('EMAIL_FROM')) {
      // In-app delivery already happened when the row was written.
      return { delivered: false, reason: 'email_not_configured' };
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.userId }, select: { email: true, status: true } });
    if (!user || user.status !== 'ACTIVE') return { delivered: false, reason: 'recipient_unavailable' };

    try {
      await this.emails.send(
        user.email,
        `Your ${payload.planName} subscription is active`,
        [
          'Your payment was confirmed and your subscription is now active.',
          '',
          `Plan: ${payload.planName}`,
          `Reference: ${payload.reference ?? 'n/a'}`,
          '',
          'You can review the transaction history from your workspace billing page.',
        ].join('\n'),
      );
      return { delivered: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`Confirmation email for job ${job.id} could not be sent (${message})`);
      return { delivered: false, reason: 'email_failed' };
    }
  }
}
