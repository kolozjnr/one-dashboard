import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/access-token.guard';
import { RequireAdminPermission } from '../permissions/permissions.decorators';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { AdminCreateSubscriptionDto, CancelSubscriptionDto, ChangeCycleDto, ChangePlanDto, CreatePlanDto, ExtendSubscriptionDto, ListPaymentsDto, ListSubscriptionsDto, RecordPaymentDto, SuspendSubscriptionDto, UpdatePlanDto } from '../billing/billing.dto';
import { PlansService } from '../billing/plans.service';
import { SubscriptionsService } from '../billing/subscriptions.service';

// Platform billing administration: plan catalog, subscription overrides and payments.
// Lifecycle operations delegate to SubscriptionsService so workspace and platform paths
// share one implementation of every transition (events + audit written identically).
@ApiTags('admin')
@Controller('admin')
@UseGuards(PermissionsGuard)
export class AdminBillingController {
  constructor(
    private readonly plans: PlansService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  @Get('plans') @RequireAdminPermission('admin.subscriptions.view')
  listPlans() { return this.plans.list(); }

  @Post('plans') @RequireAdminPermission('admin.subscriptions.manage')
  createPlan(@Req() req: AuthenticatedRequest, @Body() input: CreatePlanDto) { return this.plans.create(req.user, input); }

  @Patch('plans/:planId') @RequireAdminPermission('admin.subscriptions.manage')
  updatePlan(@Req() req: AuthenticatedRequest, @Param('planId', ParseUUIDPipe) planId: string, @Body() input: UpdatePlanDto) { return this.plans.update(req.user, planId, input); }

  @Delete('plans/:planId') @RequireAdminPermission('admin.subscriptions.manage')
  removePlan(@Req() req: AuthenticatedRequest, @Param('planId', ParseUUIDPipe) planId: string) { return this.plans.remove(req.user, planId); }

  @Get('subscriptions') @RequireAdminPermission('admin.subscriptions.view')
  listSubscriptions(@Query() query: ListSubscriptionsDto) { return this.subscriptions.adminList(query); }

  @Get('subscriptions/:subscriptionId') @RequireAdminPermission('admin.subscriptions.view')
  getSubscription(@Param('subscriptionId', ParseUUIDPipe) subscriptionId: string) { return this.subscriptions.adminDetail(subscriptionId); }

  @Post('subscriptions') @RequireAdminPermission('admin.subscriptions.manage')
  createSubscription(@Req() req: AuthenticatedRequest, @Body() input: AdminCreateSubscriptionDto) { return this.subscriptions.adminCreate(req.user, input); }

  @Patch('subscriptions/:subscriptionId/plan') @RequireAdminPermission('admin.subscriptions.manage')
  changePlan(@Req() req: AuthenticatedRequest, @Param('subscriptionId', ParseUUIDPipe) subscriptionId: string, @Body() input: ChangePlanDto) { return this.subscriptions.adminChangePlan(req.user, subscriptionId, input.planKey); }

  @Patch('subscriptions/:subscriptionId/cycle') @RequireAdminPermission('admin.subscriptions.manage')
  changeCycle(@Req() req: AuthenticatedRequest, @Param('subscriptionId', ParseUUIDPipe) subscriptionId: string, @Body() input: ChangeCycleDto) { return this.subscriptions.adminChangeCycle(req.user, subscriptionId, input.interval); }

  @Post('subscriptions/:subscriptionId/renew') @RequireAdminPermission('admin.subscriptions.manage')
  renew(@Req() req: AuthenticatedRequest, @Param('subscriptionId', ParseUUIDPipe) subscriptionId: string) { return this.subscriptions.adminRenew(req.user, subscriptionId); }

  @Post('subscriptions/:subscriptionId/suspend') @RequireAdminPermission('admin.subscriptions.manage')
  suspend(@Req() req: AuthenticatedRequest, @Param('subscriptionId', ParseUUIDPipe) subscriptionId: string, @Body() input: SuspendSubscriptionDto) { return this.subscriptions.adminSuspend(req.user, subscriptionId, input.reason); }

  @Post('subscriptions/:subscriptionId/cancel') @RequireAdminPermission('admin.subscriptions.manage')
  cancel(@Req() req: AuthenticatedRequest, @Param('subscriptionId', ParseUUIDPipe) subscriptionId: string, @Body() input: CancelSubscriptionDto) { return this.subscriptions.adminCancel(req.user, subscriptionId, input); }

  @Post('subscriptions/:subscriptionId/reactivate') @RequireAdminPermission('admin.subscriptions.manage')
  reactivate(@Req() req: AuthenticatedRequest, @Param('subscriptionId', ParseUUIDPipe) subscriptionId: string) { return this.subscriptions.adminReactivate(req.user, subscriptionId); }

  @Post('subscriptions/:subscriptionId/extend') @RequireAdminPermission('admin.subscriptions.manage')
  extend(@Req() req: AuthenticatedRequest, @Param('subscriptionId', ParseUUIDPipe) subscriptionId: string, @Body() input: ExtendSubscriptionDto) { return this.subscriptions.adminExtend(req.user, subscriptionId, input.days); }

  @Get('payments') @RequireAdminPermission('admin.payments.view')
  listPayments(@Query() query: ListPaymentsDto) { return this.subscriptions.adminListPayments(query); }

  @Post('payments') @RequireAdminPermission('admin.payments.manage')
  recordPayment(@Req() req: AuthenticatedRequest, @Body() input: RecordPaymentDto) { return this.subscriptions.adminRecordPayment(req.user, input); }

  // Refunds and evidence-based activation deliberately live in AdminPaymentsController
  // (payments module): gateway verification, refunds and manual activation are checked
  // there against one set of payment permissions.
}
