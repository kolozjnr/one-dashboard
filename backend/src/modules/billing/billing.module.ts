import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { BillingController } from './billing.controller';
import { EntitlementsService } from './entitlements.service';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  imports: [PermissionsModule, AuditModule],
  controllers: [PlansController, BillingController],
  providers: [EntitlementsService, PlansService, SubscriptionsService],
  exports: [EntitlementsService, PlansService, SubscriptionsService],
})
export class BillingModule {}
