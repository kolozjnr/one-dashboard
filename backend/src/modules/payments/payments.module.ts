import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { AdminPaymentsController } from './admin-payments.controller';
import { NotificationProcessor } from './notification.processor';
import { PaymentGatewaysService } from './payment-gateways.service';
import { PaymentNotificationsService } from './payment-notifications.service';
import { PaymentProcessingService } from './payment-processing.service';
import { PaymentWebhooksController } from './payment-webhooks.controller';
import { PaymentWebhooksService } from './payment-webhooks.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { SecretVaultService } from './secret-vault.service';

/**
 * Provider-independent payment layer. Everything above this module (controllers,
 * admin actions) sees one vocabulary — initialize, verify, refund, activate — and only
 * the adapters inside know provider names.
 *
 * Import graph: BillingModule (subscription transitions), PermissionsModule (tenant +
 * admin checks), AuditModule (money actions are always attributable), AuthModule (the
 * confirmation email transport used by the queue consumer).
 */
@Module({
  imports: [
    BillingModule,
    PermissionsModule,
    AuditModule,
    AuthModule,
    BullModule.registerQueue({ name: 'notifications' }),
  ],
  controllers: [PaymentsController, PaymentWebhooksController, AdminPaymentsController],
  providers: [
    SecretVaultService,
    PaymentGatewaysService,
    PaymentProcessingService,
    PaymentNotificationsService,
    PaymentWebhooksService,
    PaymentsService,
    NotificationProcessor,
  ],
  exports: [PaymentGatewaysService, PaymentProcessingService, PaymentsService],
})
export class PaymentsModule {}
