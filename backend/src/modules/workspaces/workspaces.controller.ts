import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/access-token.guard';
import { RequireWorkspacePermission } from '../permissions/permissions.decorators';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { ChangeRoleDto, CreateInvitationDto, CreateRoleDto, UpdateWorkspaceDto } from './workspace.dto';
import { WorkspacesService } from './workspaces.service';

@Controller()
@UseGuards(PermissionsGuard)
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Get('workspaces') list(@Req() req: AuthenticatedRequest) { return this.workspaces.list(req.user!.userId); }
  @Post('invitations/:token/accept') accept(@Req() req: AuthenticatedRequest, @Param('token') token: string) { return this.workspaces.accept(req.user, token); }
  @Get('workspaces/:workspaceId') @RequireWorkspacePermission('workspace.view') overview(@Req() req: AuthenticatedRequest, @Param('workspaceId', ParseUUIDPipe) id: string) { return this.workspaces.overview(req.user, id); }
  @Get('workspaces/:workspaceId/usage') @RequireWorkspacePermission('workspace.view') usage(@Req() req: AuthenticatedRequest, @Param('workspaceId', ParseUUIDPipe) id: string) { return this.workspaces.usage(req.user, id); }
  @Get('workspaces/:workspaceId/activity') @RequireWorkspacePermission('workspace.view') activity(@Req() req: AuthenticatedRequest, @Param('workspaceId', ParseUUIDPipe) id: string) { return this.workspaces.activity(req.user, id); }
  @Patch('workspaces/:workspaceId') @RequireWorkspacePermission('workspace.update') update(@Req() req: AuthenticatedRequest, @Param('workspaceId', ParseUUIDPipe) id: string, @Body() dto: UpdateWorkspaceDto) { return this.workspaces.update(req.user, id, dto); }
  @Get('workspaces/:workspaceId/permissions') @RequireWorkspacePermission('workspace.view') permissions(@Req() req: AuthenticatedRequest, @Param('workspaceId', ParseUUIDPipe) id: string) { return this.workspaces.permissionsForActor(req.user, id); }
  @Get('workspaces/:workspaceId/members') @RequireWorkspacePermission('team.view') members(@Req() req: AuthenticatedRequest, @Param('workspaceId', ParseUUIDPipe) id: string) { return this.workspaces.members(req.user, id); }
  @Get('workspaces/:workspaceId/roles') @RequireWorkspacePermission('team.view') roles(@Req() req: AuthenticatedRequest, @Param('workspaceId', ParseUUIDPipe) id: string) { return this.workspaces.rolesForActor(req.user, id); }
  @Post('workspaces/:workspaceId/roles') @RequireWorkspacePermission('team.manage') createRole(@Req() req: AuthenticatedRequest, @Param('workspaceId', ParseUUIDPipe) id: string, @Body() dto: CreateRoleDto) { return this.workspaces.createRole(req.user, id, dto); }
  @Get('workspaces/:workspaceId/invitations') @RequireWorkspacePermission('team.view') invitations(@Req() req: AuthenticatedRequest, @Param('workspaceId', ParseUUIDPipe) id: string) { return this.workspaces.invitations(req.user, id); }
  @Post('workspaces/:workspaceId/invitations') @RequireWorkspacePermission('team.invite') invite(@Req() req: AuthenticatedRequest, @Param('workspaceId', ParseUUIDPipe) id: string, @Body() dto: CreateInvitationDto) { return this.workspaces.invite(req.user, id, dto); }
  @Post('workspaces/:workspaceId/invitations/:invitationId/resend') @RequireWorkspacePermission('team.invite') resend(@Req() req: AuthenticatedRequest, @Param('workspaceId', ParseUUIDPipe) id: string, @Param('invitationId', ParseUUIDPipe) invitationId: string) { return this.workspaces.resend(req.user, id, invitationId); }
  @Delete('workspaces/:workspaceId/invitations/:invitationId') @RequireWorkspacePermission('team.invite') revoke(@Req() req: AuthenticatedRequest, @Param('workspaceId', ParseUUIDPipe) id: string, @Param('invitationId', ParseUUIDPipe) invitationId: string) { return this.workspaces.revoke(req.user, id, invitationId); }
  @Patch('workspaces/:workspaceId/members/:membershipId/role') @RequireWorkspacePermission('team.manage') role(@Req() req: AuthenticatedRequest, @Param('workspaceId', ParseUUIDPipe) id: string, @Param('membershipId', ParseUUIDPipe) member: string, @Body() dto: ChangeRoleDto) { return this.workspaces.changeMember(req.user, id, member, 'role', dto.roleId); }
  @Post('workspaces/:workspaceId/members/:membershipId/suspend') @RequireWorkspacePermission('team.manage') suspend(@Req() req: AuthenticatedRequest, @Param('workspaceId', ParseUUIDPipe) id: string, @Param('membershipId', ParseUUIDPipe) member: string) { return this.workspaces.changeMember(req.user, id, member, 'suspend'); }
  @Post('workspaces/:workspaceId/members/:membershipId/reactivate') @RequireWorkspacePermission('team.manage') reactivate(@Req() req: AuthenticatedRequest, @Param('workspaceId', ParseUUIDPipe) id: string, @Param('membershipId', ParseUUIDPipe) member: string) { return this.workspaces.changeMember(req.user, id, member, 'reactivate'); }
  @Delete('workspaces/:workspaceId/members/:membershipId') @RequireWorkspacePermission('team.remove') remove(@Req() req: AuthenticatedRequest, @Param('workspaceId', ParseUUIDPipe) id: string, @Param('membershipId', ParseUUIDPipe) member: string) { return this.workspaces.changeMember(req.user, id, member, 'remove'); }
  @Post('workspaces/:workspaceId/transfer-ownership') @RequireWorkspacePermission('workspace.transfer_ownership') transfer(@Req() req: AuthenticatedRequest, @Param('workspaceId', ParseUUIDPipe) id: string, @Body('membershipId') member: string) { return this.workspaces.transfer(req.user, id, member); }
}
