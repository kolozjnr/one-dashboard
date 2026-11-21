import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { BillingModule } from '../billing/billing.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { AdminBillingController } from './admin-billing.controller';
import { AdminPlatformController } from './admin-platform.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [PermissionsModule, AuditModule, BillingModule],
  controllers: [AdminUsersController, AdminBillingController, AdminPlatformController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
