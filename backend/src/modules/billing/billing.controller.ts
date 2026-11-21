import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/access-token.guard';
import { RequireWorkspacePermission } from '../permissions/permissions.decorators';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { CancelSubscriptionDto, ChangeCycleDto, ChangePlanDto, CreateSubscriptionDto } from './billing.dto';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('billing')
@Controller('workspaces/:workspaceId')
@UseGuards(PermissionsGuard)
export class BillingController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get('subscription') @RequireWorkspacePermission('workspace.view')
  current(@Req() req: AuthenticatedRequest, @Param('workspaceId', ParseUUIDPipe) workspaceId: string) { return this.subscriptions.current(req.user, workspaceId); }

  @Post('subscription') @RequireWorkspacePermission('workspace.billing') @HttpCode(HttpStatus.CREATED)
  create(@Req() req: AuthenticatedRequest, @Param('workspaceId', ParseUUIDPipe) workspaceId: string, @Body() input: CreateSubscriptionDto) { return this.subscriptions.create(req.user, workspaceId, input); }

  @Patch('subscription/plan') @RequireWorkspacePermission('workspace.billing')
  changePlan(@Req() req: AuthenticatedRequest, @Param('workspaceId', ParseUUIDPipe) workspaceId: string, @Body() input: ChangePlanDto) { return this.subscriptions.changePlan(req.user, workspaceId, input); }

  @Patch('subscription/cycle') @RequireWorkspacePermission('workspace.billing')
  changeCycle(@Req() req: AuthenticatedRequest, @Param('workspaceId', ParseUUIDPipe) workspaceId: string, @Body() input: ChangeCycleDto) { return this.subscriptions.changeCycle(req.user, workspaceId, input); }

  @Post('subscription/cancel') @RequireWorkspacePermission('workspace.billing')
  cancel(@Req() req: AuthenticatedRequest, @Param('workspaceId', ParseUUIDPipe) workspaceId: string, @Body() input: CancelSubscriptionDto) { return this.subscriptions.cancel(req.user, workspaceId, input); }

  @Post('subscription/resume') @RequireWorkspacePermission('workspace.billing')
  resume(@Req() req: AuthenticatedRequest, @Param('workspaceId', ParseUUIDPipe) workspaceId: string) { return this.subscriptions.resume(req.user, workspaceId); }

  @Post('subscription/renew') @RequireWorkspacePermission('workspace.billing')
  renew(@Req() req: AuthenticatedRequest, @Param('workspaceId', ParseUUIDPipe) workspaceId: string) { return this.subscriptions.renew(req.user, workspaceId); }
}
