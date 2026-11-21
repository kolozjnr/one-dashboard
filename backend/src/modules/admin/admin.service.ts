import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TenantAccessService } from '../permissions/tenant-access.service';
import { EntitlementsService } from '../billing/entitlements.service';
import { effectiveStatus, serializeSubscription } from '../billing/billing.util';
import type { CreateProviderDto, GrantRoleDto, ListSubscribersDto, ListTicketsDto, ListUsersDto, ReplyTicketDto, SaveSettingsDto, UpdateProviderDto, UpdateSubscriberDto, UpdateTicketDto, UpdateUserDto } from './admin.dto';
import type { AuthenticatedRequest } from '../auth/access-token.guard';

type Actor = AuthenticatedRequest['user'];

// Platform administration. These endpoints are guarded by RequireAdminPermission on the
// controllers and re-check the same permission here (defense in depth). Platform roles
// are a separate system from workspace roles: only AdminMembership/AdminRole/AdminPermission
// records grant platform access, and no workspace record can elevate a user here.
@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TenantAccessService,
    private readonly audit: AuditService,
    private readonly entitlements: EntitlementsService,
  ) {}

  // ---- Platform roles --------------------------------------------------------------

  async listRoles() {
    const roles = await this.prisma.adminRole.findMany({
      include: { permissions: { include: { permission: true } }, _count: { select: { memberships: true } } },
      orderBy: { name: 'asc' },
    });
    return roles.map((role) => ({ key: role.key, name: role.name, description: role.description, permissions: role.permissions.map((grant) => grant.permission.key), members: role._count.memberships }));
  }

  // Grants or changes a user's platform role. Escalation guards: only Super Admins may
  // grant the Super Admin role, an admin can never grant a role holding permissions they
  // do not hold themselves, and nobody may change their own platform role.
  async grantRole(actor: Actor, targetUserId: string, input: GrantRoleDto) {
    const [targetRole, targetUser, previous] = await Promise.all([
      this.prisma.adminRole.findUnique({ where: { key: input.roleKey }, include: { permissions: { include: { permission: true } } } }),
      this.prisma.user.findFirst({ where: { id: targetUserId, deletedAt: null }, select: { id: true } }),
      this.prisma.adminMembership.findUnique({ where: { userId: targetUserId }, include: { role: true } }),
    ]);
    if (!targetUser) throw new NotFoundException('User not found');
    if (!targetRole) throw new NotFoundException('Platform role not found');
    if (targetUserId === actor!.userId) throw new ForbiddenException('You cannot change your own platform role');
    const actorMembership = await this.access.requireAdminPermission(actor!, 'admin.users.manage');
    if (targetRole.key === 'super-admin' && actorMembership.role.key !== 'super-admin') {
      throw new ForbiddenException('Only Super Admins can grant the Super Admin role');
    }
    const held = new Set(actorMembership.role.permissions.map((grant) => grant.permission.key));
    const requested = targetRole.permissions.map((grant) => grant.permission.key);
    if (requested.some((key) => !held.has(key))) throw new ForbiddenException('Cannot grant a role with permissions you do not have');
    if (previous?.roleId === targetRole.id) return { granted: false, role: { key: targetRole.key, name: targetRole.name } };
    const membership = await this.prisma.$transaction(async (tx) => {
      const row = await tx.adminMembership.upsert({
        where: { userId: targetUserId },
        update: { roleId: targetRole.id, grantedAt: new Date() },
        create: { userId: targetUserId, roleId: targetRole.id },
        include: { role: true },
      });
      await this.audit.record({
        actorId: actor!.userId,
        action: previous ? 'admin_role.changed' : 'admin_role.granted',
        targetType: 'admin_membership',
        targetId: targetUserId,
        metadata: { role: targetRole.key, ...(previous ? { previousRole: previous.role.key } : {}) },
      }, tx);
      return row;
    });
    return { granted: true, role: { key: membership.role.key, name: membership.role.name } };
  }

  async revokeRole(actor: Actor, targetUserId: string) {
    await this.access.requireAdminPermission(actor!, 'admin.users.manage');
    const target = await this.prisma.adminMembership.findUnique({ where: { userId: targetUserId }, include: { role: { include: { permissions: { include: { permission: true } } } } } });
    if (!target) throw new NotFoundException('User does not have a platform role');
    if (targetUserId === actor!.userId) throw new ForbiddenException('You cannot change your own platform role');
    const actorMembership = await this.access.requireAdminPermission(actor!, 'admin.users.manage');
    if (target.role.key === 'super-admin' && actorMembership.role.key !== 'super-admin') {
      throw new ForbiddenException('Only Super Admins can modify Super Admin roles');
    }
    const held = new Set(actorMembership.role.permissions.map((grant) => grant.permission.key));
    if (target.role.permissions.some((grant) => !held.has(grant.permission.key))) {
      throw new ForbiddenException('Cannot modify a role with permissions you do not have');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.adminMembership.delete({ where: { userId: targetUserId } });
      await this.audit.record({ actorId: actor!.userId, action: 'admin_role.revoked', targetType: 'admin_membership', targetId: targetUserId, metadata: { role: target.role.key } }, tx);
    });
    return { revoked: true };
  }

  // ---- Users ----------------------------------------------------------------------

  async listUsers(query: ListUsersDto) {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(query.q
        ? { OR: [{ email: { contains: query.q, mode: 'insensitive' } }, { profile: { displayName: { contains: query.q, mode: 'insensitive' } } }] }
        : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: { profile: true, adminMembership: { include: { role: true } }, _count: { select: { memberships: { where: { status: 'ACTIVE' } } } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      items: rows.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.profile?.displayName ?? null,
        status: user.status,
        emailVerified: Boolean(user.emailVerifiedAt),
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        workspaces: user._count.memberships,
        platformRole: user.adminMembership?.role.key ?? null,
        platformRoleName: user.adminMembership?.role.name ?? null,
      })),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async getUser(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        profile: true,
        adminMembership: { include: { role: true } },
        memberships: { where: { status: { in: ['ACTIVE', 'SUSPENDED'] } }, include: { workspace: { select: { id: true, name: true, slug: true } }, roles: { include: { role: true } } }, orderBy: { joinedAt: 'asc' } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    const activity = await this.prisma.auditLog.findMany({
      where: { OR: [{ actorId: userId }, { targetType: 'user', targetId: userId }] },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, action: true, targetType: true, targetId: true, workspaceId: true, createdAt: true },
    });
    return {
      id: user.id,
      email: user.email,
      name: user.profile?.displayName ?? null,
      status: user.status,
      emailVerified: Boolean(user.emailVerifiedAt),
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      platformRole: user.adminMembership ? { key: user.adminMembership.role.key, name: user.adminMembership.role.name } : null,
      workspaces: user.memberships.map((membership) => ({ id: membership.workspace.id, name: membership.workspace.name, status: membership.status, joinedAt: membership.joinedAt, roles: membership.roles.map((grant) => grant.role.name) })),
      activity,
    };
  }

  async updateUser(actor: Actor, userId: string, input: UpdateUserDto) {
    await this.access.requireAdminPermission(actor!, 'admin.users.manage');
    const user = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null }, select: { id: true } });
    if (!user) throw new NotFoundException('User not found');
    if (input.status === UserStatus.DISABLED && userId === actor!.userId) throw new ForbiddenException('You cannot disable your own account');
    const data: Prisma.UserUpdateInput = {};
    if (input.status !== undefined) data.status = input.status;
    if (input.emailVerified !== undefined) data.emailVerifiedAt = input.emailVerified ? new Date() : null;
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.user.update({ where: { id: userId }, data, select: { id: true, status: true, emailVerifiedAt: true } });
      await this.audit.record({ actorId: actor!.userId, action: 'user.updated', targetType: 'user', targetId: userId, metadata: { fields: Object.keys(input), status: row.status } }, tx);
      return row;
    });
    return { id: updated.id, status: updated.status, emailVerified: Boolean(updated.emailVerifiedAt) };
  }

  async suspendUser(actor: Actor, userId: string) {
    await this.access.requireAdminPermission(actor!, 'admin.users.suspend');
    if (userId === actor!.userId) throw new ForbiddenException('You cannot suspend your own account');
    const user = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null }, select: { id: true, status: true } });
    if (!user) throw new NotFoundException('User not found');
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { status: UserStatus.DISABLED } });
      await tx.userSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } });
      await this.audit.record({ actorId: actor!.userId, action: 'user.suspended', targetType: 'user', targetId: userId, metadata: { previousStatus: user.status } }, tx);
    });
    return { suspended: true };
  }

  async reactivateUser(actor: Actor, userId: string) {
    await this.access.requireAdminPermission(actor!, 'admin.users.manage');
    const user = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null }, select: { id: true, status: true } });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { status: UserStatus.ACTIVE } });
      await this.audit.record({ actorId: actor!.userId, action: 'user.reactivated', targetType: 'user', targetId: userId, metadata: { previousStatus: user.status } }, tx);
    });
    return { reactivated: true };
  }

  // ---- Subscribers (workspaces) ----------------------------------------------------

  async listSubscribers(query: ListSubscribersDto) {
    const subscriptionFilters: Prisma.SubscriptionWhereInput[] = [];
    if (query.planKey) subscriptionFilters.push({ plan: { key: query.planKey } });
    if (query.status) subscriptionFilters.push({ status: query.status });
    const where: Prisma.WorkspaceWhereInput = {
      deletedAt: null,
      ...(query.q
        ? { OR: [{ name: { contains: query.q, mode: 'insensitive' } }, { slug: { contains: query.q, mode: 'insensitive' } }, { owner: { email: { contains: query.q, mode: 'insensitive' } } }] }
        : {}),
      ...(subscriptionFilters.length ? { subscriptions: { some: { AND: subscriptionFilters } } } : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const [rows, total] = await Promise.all([
      this.prisma.workspace.findMany({
        where,
        include: {
          owner: { include: { profile: true } },
          _count: { select: { memberships: { where: { status: 'ACTIVE' } }, connectedAccounts: { where: { deletedAt: null } } } },
          subscriptions: { include: { plan: true }, orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
      this.prisma.workspace.count({ where }),
    ]);
    return {
      items: rows.map((workspace) => {
        const subscription = workspace.subscriptions[0];
        return {
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          ownerEmail: workspace.owner.email,
          ownerName: workspace.owner.profile?.displayName ?? workspace.owner.email,
          createdAt: workspace.createdAt,
          members: workspace._count.memberships,
          connectedAccounts: workspace._count.connectedAccounts,
          plan: subscription?.plan.name ?? 'Free',
          planKey: subscription?.plan.key ?? 'free',
          cycle: subscription?.interval ?? null,
          subscriptionStatus: subscription ? effectiveStatus(subscription) : 'NONE',
        };
      }),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async getSubscriber(workspaceId: string) {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, deletedAt: null },
      include: {
        owner: { include: { profile: true } },
        memberships: { where: { status: { in: ['ACTIVE', 'SUSPENDED'] } }, include: { user: { include: { profile: true } }, roles: { include: { role: true } } }, orderBy: { joinedAt: 'asc' } },
        subscriptions: { include: { plan: { include: { features: true } } }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!workspace) throw new NotFoundException('Subscriber not found');
    const [usage, activity] = await Promise.all([
      this.entitlements.usage(workspaceId),
      this.prisma.auditLog.findMany({ where: { workspaceId }, orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, actorId: true, action: true, targetType: true, targetId: true, createdAt: true } }),
    ]);
    const subscription = workspace.subscriptions[0];
    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      createdAt: workspace.createdAt,
      owner: { id: workspace.owner.id, email: workspace.owner.email, name: workspace.owner.profile?.displayName ?? null },
      subscription: subscription ? serializeSubscription(subscription) : null,
      usage,
      members: workspace.memberships.map((membership) => ({ id: membership.id, userId: membership.userId, email: membership.user.email, name: membership.user.profile?.displayName ?? membership.user.email, status: membership.status, roles: membership.roles.map((grant) => grant.role.name) })),
      activity,
    };
  }

  async updateSubscriber(actor: Actor, workspaceId: string, input: UpdateSubscriberDto) {
    await this.access.requireAdminPermission(actor!, 'admin.subscribers.manage');
    const workspace = await this.prisma.workspace.findFirst({ where: { id: workspaceId, deletedAt: null }, select: { id: true, name: true } });
    if (!workspace) throw new NotFoundException('Subscriber not found');
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.workspace.update({ where: { id: workspaceId }, data: { name: input.name.trim() }, select: { id: true, name: true } });
      await this.audit.record({ workspaceId, actorId: actor!.userId, action: 'workspace.updated', targetType: 'workspace', targetId: workspaceId, metadata: { scope: 'admin', name: row.name } }, tx);
      return row;
    });
    return updated;
  }

  async deleteSubscriber(actor: Actor, workspaceId: string) {
    await this.access.requireAdminPermission(actor!, 'admin.subscribers.manage');
    const workspace = await this.prisma.workspace.findFirst({ where: { id: workspaceId, deletedAt: null }, select: { id: true, name: true } });
    if (!workspace) throw new NotFoundException('Subscriber not found');
    await this.prisma.$transaction(async (tx) => {
      await tx.workspace.update({ where: { id: workspaceId }, data: { deletedAt: new Date() } });
      await this.audit.record({ workspaceId, actorId: actor!.userId, action: 'workspace.deleted', targetType: 'workspace', targetId: workspaceId, metadata: { name: workspace.name } }, tx);
    });
    return { deleted: true };
  }

  // ---- Platform integrations -------------------------------------------------------

  async listProviders() {
    const providers = await this.prisma.integrationProvider.findMany({
      include: { _count: { select: { accounts: { where: { deletedAt: null } } } } },
      orderBy: { name: 'asc' },
    });
    return providers.map((provider) => ({ id: provider.id, key: provider.key, name: provider.name, category: provider.category, isEnabled: provider.isEnabled, config: provider.config, accounts: provider._count.accounts, updatedAt: provider.updatedAt }));
  }

  async createProvider(actor: Actor, input: CreateProviderDto) {
    await this.access.requireAdminPermission(actor!, 'admin.integrations.manage');
    const key = input.key.toLowerCase();
    const existing = await this.prisma.integrationProvider.findUnique({ where: { key }, select: { id: true } });
    if (existing) throw new ConflictException('A provider with this key already exists');
    const provider = await this.prisma.$transaction(async (tx) => {
      const row = await tx.integrationProvider.create({ data: { key, name: input.name.trim(), category: input.category.trim(), isEnabled: input.isEnabled ?? false, config: input.config as Prisma.InputJsonValue } });
      await this.audit.record({ actorId: actor!.userId, action: 'integration.created', targetType: 'integration_provider', targetId: row.id, metadata: { key } }, tx);
      return row;
    });
    return { id: provider.id, key: provider.key, name: provider.name, category: provider.category, isEnabled: provider.isEnabled };
  }

  async updateProvider(actor: Actor, providerId: string, input: UpdateProviderDto) {
    await this.access.requireAdminPermission(actor!, 'admin.integrations.manage');
    const existing = await this.prisma.integrationProvider.findUnique({ where: { id: providerId }, select: { id: true } });
    if (!existing) throw new NotFoundException('Provider not found');
    const data: Prisma.IntegrationProviderUpdateInput = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.category !== undefined) data.category = input.category.trim();
    if (input.isEnabled !== undefined) data.isEnabled = input.isEnabled;
    if (input.config !== undefined) data.config = input.config as Prisma.InputJsonValue;
    const provider = await this.prisma.$transaction(async (tx) => {
      const row = await tx.integrationProvider.update({ where: { id: providerId }, data });
      await this.audit.record({ actorId: actor!.userId, action: 'integration.updated', targetType: 'integration_provider', targetId: providerId, metadata: { fields: Object.keys(input) } }, tx);
      return row;
    });
    return { id: provider.id, key: provider.key, name: provider.name, category: provider.category, isEnabled: provider.isEnabled, config: provider.config };
  }

  // ---- Platform settings -----------------------------------------------------------

  async listSettings() {
    const settings = await this.prisma.systemSetting.findMany({ orderBy: { key: 'asc' } });
    return settings.map((setting) => ({ key: setting.key, value: setting.value, updatedAt: setting.updatedAt }));
  }

  async saveSettings(actor: Actor, input: SaveSettingsDto) {
    await this.access.requireAdminPermission(actor!, 'admin.settings.manage');
    const keys = [...new Set(input.settings.map((setting) => setting.key))];
    if (!keys.length) return this.listSettings();
    await this.prisma.$transaction(async (tx) => {
      for (const setting of input.settings) {
        await tx.systemSetting.upsert({ where: { key: setting.key }, update: { value: setting.value as Prisma.InputJsonValue }, create: { key: setting.key, value: setting.value as Prisma.InputJsonValue } });
      }
      await this.audit.record({ actorId: actor!.userId, action: 'settings.updated', targetType: 'system_setting', targetId: keys.join(',').slice(0, 180), metadata: { keys } }, tx);
    });
    return this.listSettings();
  }

  // ---- Support ---------------------------------------------------------------------

  async listTickets(query: ListTicketsDto) {
    const where: Prisma.SupportTicketWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.workspaceId ? { workspaceId: query.workspaceId } : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const [rows, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        include: { workspace: { select: { id: true, name: true } }, createdBy: { include: { user: { select: { email: true } } } }, _count: { select: { messages: true } } },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: query.limit,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);
    return {
      items: rows.map((ticket) => ({ id: ticket.id, workspaceId: ticket.workspaceId, workspaceName: ticket.workspace.name, requesterEmail: ticket.createdBy.user.email, subject: ticket.subject, status: ticket.status, priority: ticket.priority, messages: ticket._count.messages, createdAt: ticket.createdAt, updatedAt: ticket.updatedAt })),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async getTicket(ticketId: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id: ticketId },
      include: {
        workspace: { select: { id: true, name: true } },
        createdBy: { include: { user: { select: { email: true } } } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return { ...ticket, workspaceName: ticket.workspace.name, requesterEmail: ticket.createdBy.user.email };
  }

  async updateTicket(actor: Actor, ticketId: string, input: UpdateTicketDto) {
    await this.access.requireAdminPermission(actor!, 'admin.support.manage');
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId }, select: { id: true, status: true, priority: true } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    const data: Prisma.SupportTicketUpdateInput = {};
    if (input.status !== undefined) {
      data.status = input.status;
      data.closedAt = input.status === 'CLOSED' ? new Date() : null;
    }
    if (input.priority !== undefined) data.priority = input.priority;
    if (!Object.keys(data).length) return { updated: false };
    await this.prisma.$transaction(async (tx) => {
      await tx.supportTicket.update({ where: { id: ticketId }, data });
      await this.audit.record({ actorId: actor!.userId, action: 'support.ticket_updated', targetType: 'support_ticket', targetId: ticketId, metadata: { ...input } }, tx);
    });
    return { updated: true };
  }

  async replyToTicket(actor: Actor, ticketId: string, input: ReplyTicketDto) {
    await this.access.requireAdminPermission(actor!, 'admin.support.manage');
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId }, select: { id: true, workspaceId: true } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    const message = await this.prisma.$transaction(async (tx) => {
      const row = await tx.supportMessage.create({ data: { workspaceId: ticket.workspaceId, ticketId, senderId: null, isStaff: true, body: input.body.trim() } });
      await tx.supportTicket.update({ where: { id: ticketId }, data: { updatedAt: new Date() } });
      await this.audit.record({ workspaceId: ticket.workspaceId, actorId: actor!.userId, action: 'support.replied', targetType: 'support_ticket', targetId: ticketId }, tx);
      return row;
    });
    return { id: message.id, isStaff: true, body: message.body, createdAt: message.createdAt };
  }
}
