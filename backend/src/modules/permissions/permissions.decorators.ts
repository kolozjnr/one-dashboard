import { SetMetadata } from '@nestjs/common';
import type { AdminPermission, SubscriberPermission } from './permissions.constants';

export const WORKSPACE_PERMISSION_KEY = 'workspace_permission';
export const WORKSPACE_PERMISSIONS_KEY = 'workspace_permissions';
export const ADMIN_PERMISSION_KEY = 'admin_permission';
export const ADMIN_PERMISSIONS_KEY = 'admin_permissions';

// Workspace scope is resolved from the `:workspaceId` route parameter by PermissionsGuard.
export const RequireWorkspacePermission = (permission: SubscriberPermission) => SetMetadata(WORKSPACE_PERMISSION_KEY, permission);
export const RequireWorkspacePermissions = (...permissions: SubscriberPermission[]) => SetMetadata(WORKSPACE_PERMISSIONS_KEY, permissions);
export const RequireAdminPermission = (permission: AdminPermission) => SetMetadata(ADMIN_PERMISSION_KEY, permission);
export const RequireAdminPermissions = (...permissions: AdminPermission[]) => SetMetadata(ADMIN_PERMISSIONS_KEY, permissions);
