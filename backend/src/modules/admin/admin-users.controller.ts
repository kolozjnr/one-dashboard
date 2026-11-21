import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/access-token.guard';
import { RequireAdminPermission } from '../permissions/permissions.decorators';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { AdminService } from './admin.service';
import { GrantRoleDto, ListSubscribersDto, ListUsersDto, UpdateSubscriberDto, UpdateUserDto } from './admin.dto';

// Platform user, platform role and subscriber administration. Every route carries
// RequireAdminPermission metadata enforced by the global PermissionsGuard; workspace
// membership is never consulted here — platform access comes only from AdminMembership.
@ApiTags('admin')
@Controller('admin')
@UseGuards(PermissionsGuard)
export class AdminUsersController {
  constructor(private readonly admin: AdminService) {}

  @Get('users') @RequireAdminPermission('admin.users.view')
  listUsers(@Query() query: ListUsersDto) { return this.admin.listUsers(query); }

  @Get('users/:userId') @RequireAdminPermission('admin.users.view')
  getUser(@Param('userId', ParseUUIDPipe) userId: string) { return this.admin.getUser(userId); }

  @Patch('users/:userId') @RequireAdminPermission('admin.users.manage')
  updateUser(@Req() req: AuthenticatedRequest, @Param('userId', ParseUUIDPipe) userId: string, @Body() input: UpdateUserDto) { return this.admin.updateUser(req.user, userId, input); }

  @Post('users/:userId/suspend') @RequireAdminPermission('admin.users.suspend')
  suspendUser(@Req() req: AuthenticatedRequest, @Param('userId', ParseUUIDPipe) userId: string) { return this.admin.suspendUser(req.user, userId); }

  @Post('users/:userId/reactivate') @RequireAdminPermission('admin.users.manage')
  reactivateUser(@Req() req: AuthenticatedRequest, @Param('userId', ParseUUIDPipe) userId: string) { return this.admin.reactivateUser(req.user, userId); }

  @Get('roles') @RequireAdminPermission('admin.users.view')
  listRoles() { return this.admin.listRoles(); }

  @Put('users/:userId/role') @RequireAdminPermission('admin.users.manage')
  grantRole(@Req() req: AuthenticatedRequest, @Param('userId', ParseUUIDPipe) userId: string, @Body() input: GrantRoleDto) { return this.admin.grantRole(req.user, userId, input); }

  @Delete('users/:userId/role') @RequireAdminPermission('admin.users.manage')
  revokeRole(@Req() req: AuthenticatedRequest, @Param('userId', ParseUUIDPipe) userId: string) { return this.admin.revokeRole(req.user, userId); }

  @Get('subscribers') @RequireAdminPermission('admin.subscribers.view')
  listSubscribers(@Query() query: ListSubscribersDto) { return this.admin.listSubscribers(query); }

  @Get('subscribers/:workspaceId') @RequireAdminPermission('admin.subscribers.view')
  getSubscriber(@Param('workspaceId', ParseUUIDPipe) workspaceId: string) { return this.admin.getSubscriber(workspaceId); }

  @Patch('subscribers/:workspaceId') @RequireAdminPermission('admin.subscribers.manage')
  updateSubscriber(@Req() req: AuthenticatedRequest, @Param('workspaceId', ParseUUIDPipe) workspaceId: string, @Body() input: UpdateSubscriberDto) { return this.admin.updateSubscriber(req.user, workspaceId, input); }

  @Delete('subscribers/:workspaceId') @RequireAdminPermission('admin.subscribers.manage')
  deleteSubscriber(@Req() req: AuthenticatedRequest, @Param('workspaceId', ParseUUIDPipe) workspaceId: string) { return this.admin.deleteSubscriber(req.user, workspaceId); }
}
