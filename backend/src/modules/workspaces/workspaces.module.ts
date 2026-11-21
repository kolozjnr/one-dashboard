import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { BillingModule } from '../billing/billing.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';

@Module({ imports: [AuthModule, PermissionsModule, AuditModule, BillingModule], controllers: [WorkspacesController], providers: [WorkspacesService] })
export class WorkspacesModule {}
