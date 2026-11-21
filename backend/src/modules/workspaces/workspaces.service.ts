import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import { TenantAccessService } from '../permissions/tenant-access.service';
import { EmailDeliveryService } from '../auth/email-delivery.service';
import type { AuthenticatedRequest } from '../auth/access-token.guard';
import type { CreateInvitationDto, CreateRoleDto, UpdateWorkspaceDto } from './workspace.dto';
import { AuditService } from '../audit/audit.service';
import { EntitlementsService } from '../billing/entitlements.service';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TenantAccessService,
    private readonly mail: EmailDeliveryService,
    private readonly auditService: AuditService,
    private readonly entitlements: EntitlementsService,
  ) {}

  async list(userId: string) {
    const rows = await this.prisma.workspaceMembership.findMany({
      where: { userId, status: 'ACTIVE', workspace: { deletedAt: null } },
      include: { workspace: { include: { owner: { include: { profile: true } }, subscriptions: { where: { status: { in: ['TRIALING', 'ACTIVE', 'PAST_DUE'] } }, include: { plan: true }, take: 1 } }, }, roles: { include: { role: true } } },
      orderBy: { joinedAt: 'asc' },
    });
    return rows.map(({ workspace, roles }) => ({ id: workspace.id, name: workspace.name, slug: workspace.slug, ownerId: workspace.ownerId, ownerName: workspace.owner.profile?.displayName ?? workspace.owner.email, ownerEmail: workspace.owner.email, createdAt: workspace.createdAt, role: roles[0]?.role.name ?? 'Member', subscription: workspace.subscriptions[0]?.plan.name ?? 'Free', seats: workspace.subscriptions[0]?.plan.seatLimit ?? 1 }));
  }

  async overview(actor: AuthenticatedRequest['user'], workspaceId: string) {
    await this.access.requireWorkspacePermission(actor!, workspaceId, 'workspace.view');
    const [workspace, members, invitations, connectedAccounts, activity] = await Promise.all([
      this.prisma.workspace.findFirst({ where: { id: workspaceId, deletedAt: null }, include: { owner: { include: { profile: true } }, subscriptions: { where: { status: { in: ['TRIALING', 'ACTIVE', 'PAST_DUE'] } }, include: { plan: true }, take: 1 } } }),
      this.prisma.workspaceMembership.findMany({ where: { workspaceId, status: { in: ['ACTIVE', 'SUSPENDED'] } }, include: { user: { include: { profile: true } }, roles: { include: { role: true } } }, orderBy: { joinedAt: 'asc' } }),
      this.prisma.invitation.findMany({ where: { workspaceId, status: { in: ['PENDING', 'EXPIRED'] } }, include: { roles: { include: { role: true } } }, orderBy: { createdAt: 'desc' } }),
      this.prisma.connectedAccount.count({ where: { workspaceId } }),
      this.prisma.auditLog.findMany({ where: { workspaceId }, orderBy: { createdAt: 'desc' }, take: 30 }),
    ]);
    if (!workspace) throw new NotFoundException('Workspace not found');
    return { id: workspace.id, name: workspace.name, ownerId: workspace.ownerId, ownerName: workspace.owner.profile?.displayName ?? workspace.owner.email, ownerEmail: workspace.owner.email, subscription: workspace.subscriptions[0]?.plan.name ?? 'Free', seats: workspace.subscriptions[0]?.plan.seatLimit ?? 1, createdAt: workspace.createdAt, connectedAccounts, members: members.map((m) => ({ id: m.id, name: m.user.profile?.displayName ?? m.user.email, email: m.user.email, role: m.roles[0]?.role.name ?? 'Member', roleId: m.roles[0]?.roleId, joinedAt: m.joinedAt, status: m.status })), invitations: invitations.map((i) => ({ id: i.id, name: i.displayName ?? i.email, email: i.email, role: i.roles[0]?.role.name ?? 'Member', roleId: i.roles[0]?.roleId, invitedAt: i.createdAt, expiresAt: i.expiresAt, status: i.status, message: i.message })), roles: await this.roles(workspaceId), activity: activity.map((a) => ({ id: a.id, actor: a.actorId ?? 'System', action: a.action, target: a.targetId ?? a.targetType, when: a.createdAt })) };
  }

  async roles(workspaceId: string) {
    return this.prisma.role.findMany({ where: { workspaceId }, include: { permissions: { include: { permission: true } } }, orderBy: { createdAt: 'asc' } }).then((rows) => rows.map((r) => ({ id: r.id, role: r.name, key: r.key, description: r.description ?? '', custom: !r.isBuiltIn, permissions: r.permissions.map((p) => p.permission.key) })));
  }

  async createRole(actor: AuthenticatedRequest['user'], workspaceId: string, input: CreateRoleDto) {
    await this.access.requireWorkspacePermission(actor!, workspaceId, 'team.manage');
    const requested = [...new Set(input.permissions)];
    // Central escalation guard: validates scope (never admin.*, never owner-reserved)
    // and requires the actor to hold every permission they grant.
    await this.access.assertCanGrantPermissions(actor!, workspaceId, requested);
    const roleKey = input.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 70);
    if (!roleKey) throw new ConflictException('Invalid role name');
    const role = await this.prisma.role.create({ data: { workspaceId, key: `${roleKey}-${randomBytes(3).toString('hex')}`, name: input.name.trim(), description: input.description?.trim(), permissions: { create: await Promise.all(requested.map(async (key) => ({ permission: { connectOrCreate: { where: { key }, create: { key } } } }))) } }, select: { id: true, name: true } });
    await this.audit(workspaceId, actor!.userId, 'role.created', 'role', role.id, { name: role.name, permissions: requested });
    return role;
  }

  async usage(actor: AuthenticatedRequest['user'], workspaceId: string) {
    await this.access.requireWorkspacePermission(actor!, workspaceId, 'workspace.view');
    const [members, pendingInvitations, connectedAccounts, snapshot] = await Promise.all([
      this.prisma.workspaceMembership.count({ where: { workspaceId, status: { in: ['ACTIVE', 'SUSPENDED'] } } }),
      this.prisma.invitation.count({ where: { workspaceId, status: 'PENDING', expiresAt: { gt: new Date() } } }),
      this.prisma.connectedAccount.count({ where: { workspaceId, deletedAt: null } }),
      this.entitlements.snapshot(workspaceId),
    ]);
    return { members, pendingInvitations, seats: snapshot.limits.seats, connectedAccounts, plan: snapshot.plan?.name ?? 'Free' };
  }

  // Effective permission keys for the caller — used by the frontend to hide actions it
  // cannot perform. The backend independently enforces every one of them.
  async permissionsForActor(actor: AuthenticatedRequest['user'], workspaceId: string) {
    await this.access.requireWorkspacePermission(actor!, workspaceId, 'workspace.view');
    const permissions = await this.access.workspacePermissions(actor!, workspaceId);
    return { permissions: [...permissions] };
  }

  async activity(actor: AuthenticatedRequest['user'], workspaceId: string) {
    await this.access.requireWorkspacePermission(actor!, workspaceId, 'workspace.view');
    return this.prisma.auditLog.findMany({ where: { workspaceId }, orderBy: { createdAt: 'desc' }, take: 100, select: { id: true, actorId: true, action: true, targetType: true, targetId: true, createdAt: true } });
  }

  async update(actor: AuthenticatedRequest['user'], workspaceId: string, input: UpdateWorkspaceDto) {
    await this.access.requireWorkspacePermission(actor!, workspaceId, 'workspace.update');
    const workspace = await this.prisma.workspace.update({ where: { id: workspaceId }, data: { name: input.name.trim() }, select: { id: true, name: true } });
    await this.audit(workspaceId, actor!.userId, 'workspace.updated', 'workspace', workspaceId);
    return workspace;
  }

  async invite(actor: AuthenticatedRequest['user'], workspaceId: string, input: CreateInvitationDto) {
    await this.access.requireWorkspacePermission(actor!, workspaceId, 'team.invite');
    const email = input.email.trim().toLowerCase();
    const role = await this.prisma.role.findFirst({ where: { id: input.roleId, workspaceId }, include: { permissions: { include: { permission: true } } } });
    if (!role || role.key === 'owner') throw new ForbiddenException('Invalid invitation role');
    await this.access.assertCanGrantPermissions(actor!, workspaceId, role.permissions.map((rp) => rp.permission.key));
    const existingUser = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existingUser && await this.prisma.workspaceMembership.findFirst({ where: { workspaceId, userId: existingUser.id, status: { in: ['ACTIVE', 'SUSPENDED'] } } })) throw new ConflictException('This email already has workspace access');
    if (await this.prisma.invitation.findFirst({ where: { workspaceId, email, status: 'PENDING', expiresAt: { gt: new Date() } } })) throw new ConflictException('A pending invitation already exists');
    await this.entitlements.assertCanInviteMember(workspaceId);
    const token = randomBytes(32).toString('base64url');
    const invitation = await this.prisma.invitation.create({ data: { workspaceId, email, displayName: input.displayName?.trim(), message: input.message?.trim(), tokenHash: hash(token), invitedById: actor!.userId, expiresAt: new Date(Date.now() + 7 * 86400_000) }, select: { id: true, email: true, expiresAt: true } });
    await this.prisma.invitationRole.create({ data: { workspaceId, invitationId: invitation.id, roleId: role.id } });
    await this.audit(workspaceId, actor!.userId, 'invitation.created', 'invitation', invitation.id);
    await this.mail.sendInvitation(email, (await this.prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { name: true } })).name, token);
    return invitation;
  }

  async resend(actor: AuthenticatedRequest['user'], workspaceId: string, invitationId: string) {
    await this.access.requireWorkspacePermission(actor!, workspaceId, 'team.invite');
    const old = await this.prisma.invitation.findFirst({ where: { id: invitationId, workspaceId, status: 'PENDING' }, include: { workspace: true } });
    if (!old) throw new NotFoundException('Invitation not found');
    const token = randomBytes(32).toString('base64url');
    const updated = await this.prisma.invitation.update({ where: { id: old.id }, data: { tokenHash: hash(token), expiresAt: new Date(Date.now() + 7 * 86400_000) }, select: { id: true, email: true, expiresAt: true } });
    await this.mail.sendInvitation(old.email, old.workspace.name, token);
    return updated;
  }

  async revoke(actor: AuthenticatedRequest['user'], workspaceId: string, invitationId: string) {
    await this.access.requireWorkspacePermission(actor!, workspaceId, 'team.invite');
    const result = await this.prisma.invitation.updateMany({ where: { id: invitationId, workspaceId, status: 'PENDING' }, data: { status: 'REVOKED', tokenHash: `revoked-${randomBytes(40).toString('hex')}` } });
    if (!result.count) throw new NotFoundException('Pending invitation not found');
    return { revoked: true };
  }

  async accept(actor: AuthenticatedRequest['user'], token: string) {
    const invitation = await this.prisma.invitation.findFirst({ where: { tokenHash: hash(token), status: 'PENDING', expiresAt: { gt: new Date() } }, include: { roles: true } });
    if (!invitation) throw new NotFoundException('Invitation is invalid or expired');
    if (invitation.email.toLowerCase() !== actor!.email.toLowerCase()) throw new ForbiddenException('Sign in with the invited email address');
    await this.prisma.$transaction(async (tx) => {
      if (!(await this.entitlements.canJoinWorkspace(invitation.workspaceId, tx))) throw new ConflictException('No workspace seats are available');
      const existing = await tx.workspaceMembership.findUnique({ where: { workspaceId_userId: { workspaceId: invitation.workspaceId, userId: actor!.userId } } });
      const membership = existing
        ? await tx.workspaceMembership.update({ where: { id: existing.id }, data: { status: 'ACTIVE' } })
        : await tx.workspaceMembership.create({ data: { workspaceId: invitation.workspaceId, userId: actor!.userId } });
      await tx.membershipRole.deleteMany({ where: { workspaceId: invitation.workspaceId, membershipId: membership.id } });
      for (const role of invitation.roles) await tx.membershipRole.create({ data: { workspaceId: invitation.workspaceId, membershipId: membership.id, roleId: role.roleId } });
      await tx.invitation.update({ where: { id: invitation.id }, data: { status: 'ACCEPTED', acceptedAt: new Date(), acceptedById: actor!.userId, tokenHash: `accepted-${randomBytes(40).toString('hex')}` } });
      await this.auditService.record({ workspaceId: invitation.workspaceId, actorId: actor!.userId, action: 'invitation.accepted', targetType: 'invitation', targetId: invitation.id }, tx);
    });
    return { accepted: true, workspaceId: invitation.workspaceId };
  }

  async changeMember(actor: AuthenticatedRequest['user'], workspaceId: string, membershipId: string, operation: 'role' | 'suspend' | 'reactivate' | 'remove', roleId?: string) {
    await this.access.requireWorkspacePermission(actor!, workspaceId, operation === 'remove' ? 'team.remove' : 'team.manage');
    const member = await this.prisma.workspaceMembership.findFirst({ where: { id: membershipId, workspaceId }, include: { workspace: true, roles: { include: { role: true } } } });
    if (!member) throw new NotFoundException('Member not found');
    if (member.userId === member.workspace.ownerId || member.roles.some((r) => r.role.key === 'owner')) throw new ForbiddenException('Transfer workspace ownership before changing the owner membership');
    if (operation === 'role') {
      const role = await this.prisma.role.findFirst({ where: { id: roleId, workspaceId }, include: { permissions: { include: { permission: true } } } });
      if (!role || role.key === 'owner') throw new ForbiddenException('Invalid role');
      await this.access.assertCanGrantPermissions(actor!, workspaceId, role.permissions.map((rp) => rp.permission.key));
      if (member.userId === member.workspace.ownerId) throw new ForbiddenException('Owner membership cannot be changed');
      await this.prisma.$transaction([this.prisma.membershipRole.deleteMany({ where: { workspaceId, membershipId } }), this.prisma.membershipRole.create({ data: { workspaceId, membershipId, roleId: role.id } })]);
      await this.audit(workspaceId, actor!.userId, 'member.role_changed', 'membership', member.id, { roleId: role.id, roleName: role.name });
      return { updated: true };
    }
    await this.prisma.workspaceMembership.update({ where: { id: member.id }, data: { status: operation === 'suspend' ? 'SUSPENDED' : operation === 'reactivate' ? 'ACTIVE' : 'REMOVED' } });
    await this.audit(workspaceId, actor!.userId, `member.${operation}`, 'membership', member.id);
    return { updated: true };
  }

  async transfer(actor: AuthenticatedRequest['user'], workspaceId: string, targetMembershipId: string) {
    await this.access.requireWorkspacePermission(actor!, workspaceId, 'workspace.transfer_ownership');
    const workspace = await this.prisma.workspace.findFirst({ where: { id: workspaceId, ownerId: actor!.userId } });
    if (!workspace) throw new ForbiddenException('Only the current owner may transfer ownership');
    const target = await this.prisma.workspaceMembership.findFirst({ where: { id: targetMembershipId, workspaceId, status: 'ACTIVE' } });
    if (!target) throw new NotFoundException('Active member not found');
    await this.prisma.$transaction(async (tx) => {
      const ownerRole = await tx.role.findFirstOrThrow({ where: { workspaceId, key: 'owner' } });
      const previous = await tx.workspaceMembership.findUniqueOrThrow({ where: { workspaceId_userId: { workspaceId, userId: actor!.userId } } });
      await tx.membershipRole.deleteMany({ where: { workspaceId, membershipId: previous.id } });
      const adminRole = await tx.role.findFirst({ where: { workspaceId, key: 'admin' } });
      if (adminRole) await tx.membershipRole.create({ data: { workspaceId, membershipId: previous.id, roleId: adminRole.id } });
      await tx.membershipRole.upsert({ where: { membershipId_roleId: { membershipId: target.id, roleId: ownerRole.id } }, create: { workspaceId, membershipId: target.id, roleId: ownerRole.id }, update: {} });
      await tx.workspace.update({ where: { id: workspaceId }, data: { ownerId: target.userId } });
      await this.auditService.record({ workspaceId, actorId: actor!.userId, action: 'workspace.ownership_transferred', targetType: 'membership', targetId: target.id }, tx);
      await this.auditService.record({ workspaceId, actorId: actor!.userId, action: 'member.role_changed', targetType: 'membership', targetId: previous.id, metadata: { role: 'admin' } }, tx);
      await this.auditService.record({ workspaceId, actorId: actor!.userId, action: 'member.role_changed', targetType: 'membership', targetId: target.id, metadata: { role: 'owner' } }, tx);
    });
    return { transferred: true };
  }

  private async audit(workspaceId: string, actorId: string, action: string, targetType: string, targetId: string, metadata?: Prisma.InputJsonValue) {
    await this.auditService.record({ workspaceId, actorId, action, targetType, targetId, metadata });
  }

  async members(actor: AuthenticatedRequest['user'], workspaceId: string) {
    await this.access.requireWorkspacePermission(actor!, workspaceId, 'team.view');
    return this.overview(actor, workspaceId).then((x) => x.members);
  }
  async invitations(actor: AuthenticatedRequest['user'], workspaceId: string) {
    await this.access.requireWorkspacePermission(actor!, workspaceId, 'team.view');
    return this.overview(actor, workspaceId).then((x) => x.invitations);
  }
  async rolesForActor(actor: AuthenticatedRequest['user'], workspaceId: string) {
    await this.access.requireWorkspacePermission(actor!, workspaceId, 'team.view');
    return this.roles(workspaceId);
  }
}
