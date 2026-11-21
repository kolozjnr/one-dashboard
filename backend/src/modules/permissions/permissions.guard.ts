import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../auth/access-token.guard';
import { ADMIN_PERMISSION_KEY, ADMIN_PERMISSIONS_KEY, WORKSPACE_PERMISSION_KEY, WORKSPACE_PERMISSIONS_KEY } from './permissions.decorators';
import { TenantAccessService } from './tenant-access.service';

// Enforces the metadata published by RequireWorkspacePermission(s) / RequireAdminPermission(s).
// Registered as a global guard after AccessTokenGuard, so every protected endpoint is checked
// server-side regardless of what the frontend chooses to render.
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly access: TenantAccessService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const targets = [context.getHandler(), context.getClass()];
    const workspacePermission = this.reflector.getAllAndOverride<string | undefined>(WORKSPACE_PERMISSION_KEY, targets);
    const workspacePermissions = this.reflector.getAllAndOverride<string[] | undefined>(WORKSPACE_PERMISSIONS_KEY, targets);
    const adminPermission = this.reflector.getAllAndOverride<string | undefined>(ADMIN_PERMISSION_KEY, targets);
    const adminPermissions = this.reflector.getAllAndOverride<string[] | undefined>(ADMIN_PERMISSIONS_KEY, targets);
    const requiredWorkspace = [...(workspacePermission ? [workspacePermission] : []), ...(workspacePermissions ?? [])];
    const requiredAdmin = [...(adminPermission ? [adminPermission] : []), ...(adminPermissions ?? [])];
    if (requiredWorkspace.length) {
      const rawWorkspaceId = request.params.workspaceId;
      const workspaceId = Array.isArray(rawWorkspaceId) ? rawWorkspaceId[0] : rawWorkspaceId;
      if (!workspaceId || !request.user) throw new ForbiddenException('Workspace scope is required');
      await this.access.requireWorkspacePermissions(request.user, workspaceId, requiredWorkspace);
    }
    if (requiredAdmin.length) {
      if (!request.user) throw new ForbiddenException();
      await this.access.requireAdminPermissions(request.user, requiredAdmin);
    }
    return true;
  }
}
