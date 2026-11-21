import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, type WorkspaceMembership } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { isCustomSubscriberPermission, isKnownSubscriberPermission, isPlatformPermission, isReservedSubscriberPermission } from './permissions.constants';

export interface AuthenticatedActor { userId: string }

@Injectable()
export class TenantAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async requireWorkspacePermission(actor: AuthenticatedActor, workspaceId: string, permissionKey: string): Promise<WorkspaceMembership> {
    return this.requireWorkspacePermissions(actor, workspaceId, [permissionKey]);
  }

  // Loads the membership once and requires every key. Ownership is authoritative for
  // ownership-only actions; all other access comes from assigned role permissions.
  async requireWorkspacePermissions(actor: AuthenticatedActor, workspaceId: string, permissionKeys: string[]): Promise<WorkspaceMembership> {
    const membership = await this.prisma.workspaceMembership.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: actor.userId } },
      include: { workspace: { select: { ownerId: true } }, roles: { include: { role: { include: { permissions: { include: { permission: { select: { key: true } } } } } } } } },
    });
    if (!membership || membership.status !== 'ACTIVE') throw new ForbiddenException('Workspace permission required');
    const permissions = new Set(membership.roles.flatMap((mr) => mr.role.permissions.map((rp) => rp.permission.key)));
    const isOwner = membership.workspace.ownerId === actor.userId;
    const allowed = permissionKeys.every((key) => permissions.has(key) || (isOwner && key === 'workspace.transfer_ownership'));
    if (!allowed) throw new ForbiddenException('Workspace permission required');
    return membership;
  }

  async requireAdminPermission(actor: AuthenticatedActor, permissionKey: string) {
    return this.requireAdminPermissions(actor, [permissionKey]);
  }

  // Platform administration is a separate system from workspace roles: only the
  // AdminMembership → AdminRole → AdminPermission chain is consulted here.
  async requireAdminPermissions(actor: AuthenticatedActor, permissionKeys: string[]) {
    const membership = await this.prisma.adminMembership.findUnique({
      where: { userId: actor.userId },
      include: { role: { include: { permissions: { include: { permission: { select: { key: true } } } } } } },
    });
    const permissions = new Set(membership?.role.permissions.map((rp) => rp.permission.key) ?? []);
    if (!membership || !permissionKeys.every((key) => permissions.has(key))) {
      throw new ForbiddenException('Platform administration permission required');
    }
    return membership;
  }

  // Central privilege-escalation guard for workspace role grants. Every path that assigns
  // permissions to a workspace role or invitation must call this: keys must be subscriber
  // scoped (never `admin.*`), never owner-reserved, and the actor must already hold each
  // key — except the workspace owner, who may grant any subscriber-scoped permission
  // inside their own workspace.
  async assertCanGrantPermissions(actor: AuthenticatedActor, workspaceId: string, permissionKeys: string[]): Promise<void> {
    const membership = await this.prisma.workspaceMembership.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: actor.userId } },
      include: { workspace: { select: { ownerId: true } }, roles: { include: { role: { include: { permissions: { include: { permission: { select: { key: true } } } } } } } } },
    });
    if (membership?.status !== 'ACTIVE') throw new ForbiddenException('Active workspace membership required');
    const held = new Set(membership.roles.flatMap((mr) => mr.role.permissions.map((rp) => rp.permission.key)));
    const isOwner = membership.workspace.ownerId === actor.userId;
    for (const key of [...new Set(permissionKeys)]) {
      if (isPlatformPermission(key)) throw new ForbiddenException('Platform permissions cannot be granted inside a workspace');
      if (!isKnownSubscriberPermission(key) && !isCustomSubscriberPermission(key)) throw new ForbiddenException('Unknown subscriber permission');
      if (isReservedSubscriberPermission(key)) throw new ForbiddenException('This permission is reserved for the workspace owner');
      if (!isOwner && !held.has(key)) throw new ForbiddenException('Cannot grant permissions you do not have');
    }
  }

  async workspacePermissions(actor: AuthenticatedActor, workspaceId: string): Promise<Set<string>> {
    const membership = await this.prisma.workspaceMembership.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: actor.userId } },
      include: { roles: { include: { role: { include: { permissions: { include: { permission: { select: { key: true } } } } } } } } },
    });
    if (membership?.status !== 'ACTIVE') throw new ForbiddenException('Active workspace membership required');
    return new Set(membership.roles.flatMap((mr) => mr.role.permissions.map((rp) => rp.permission.key)));
  }

  // Effective platform role for the user, or null when they have none. Used to expose
  // platform permissions to the frontend for navigation hints only — enforcement stays here.
  async adminContext(userId: string) {
    const membership = await this.prisma.adminMembership.findUnique({
      where: { userId },
      include: { role: { include: { permissions: { include: { permission: { select: { key: true } } } } } } },
    });
    if (!membership) return null;
    return {
      role: { key: membership.role.key, name: membership.role.name },
      permissions: membership.role.permissions.map((rp) => rp.permission.key),
    };
  }

  workspaceWhere<T extends object>(workspaceId: string, conditions: T): T & { workspaceId: string } { return { ...conditions, workspaceId }; }
  workspaceRecordWhere<T extends object>(workspaceId: string, recordId: string, conditions: T): T & { id: string; workspaceId: string } { return { ...conditions, id: recordId, workspaceId }; }
  membershipFilter(workspaceId: string, userId: string): Prisma.WorkspaceMembershipWhereInput { return { workspaceId, userId, status: 'ACTIVE' }; }
}
