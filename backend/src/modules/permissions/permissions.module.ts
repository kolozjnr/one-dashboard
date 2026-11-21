import { Module } from '@nestjs/common';
import { TenantAccessService } from './tenant-access.service';
import { PermissionsGuard } from './permissions.guard';

@Module({
  providers: [TenantAccessService, PermissionsGuard],
  exports: [TenantAccessService, PermissionsGuard],
})
export class PermissionsModule {}
