import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/access-token.guard';
import { RequireAdminPermission } from '../permissions/permissions.decorators';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { ActivateSubscriptionDto, ConfigureGatewayDto, RefundPaymentDto } from './payments.dto';
import { PaymentGatewaysService } from './payment-gateways.service';
import { PaymentsService } from './payments.service';

/**
 * Payment administration: gateway registration/activation, provider-side verification,
 * refunds, and the auditable manual activation workflow. Refunds and activation live
 * here (rather than in the billing admin controller) so every money-moving admin action
 * has one home with one set of permission checks.
 */
@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(PermissionsGuard)
export class AdminPaymentsController {
  constructor(
    private readonly gateways: PaymentGatewaysService,
    private readonly payments: PaymentsService,
  ) {}

  @Get('payment-gateways')
  @RequireAdminPermission('admin.payments.view')
  listGateways() {
    return this.gateways.list();
  }

  @Put('payment-gateways/:provider')
  @RequireAdminPermission('admin.payments.manage')
  configureGateway(@Req() req: AuthenticatedRequest, @Param('provider') provider: string, @Body() input: ConfigureGatewayDto) {
    return this.gateways.configure(req.user, provider, input);
  }

  @Delete('payment-gateways/:provider')
  @RequireAdminPermission('admin.payments.manage')
  deactivateGateway(@Req() req: AuthenticatedRequest, @Param('provider') provider: string) {
    return this.gateways.deactivate(req.user, provider);
  }

  @Post('payment-gateways/:provider/test')
  @RequireAdminPermission('admin.payments.manage')
  testGateway(@Req() req: AuthenticatedRequest, @Param('provider') provider: string) {
    return this.gateways.test(req.user, provider);
  }

  @Post('payments/:paymentId/verify')
  @RequireAdminPermission('admin.payments.manage')
  verifyPayment(@Req() req: AuthenticatedRequest, @Param('paymentId') paymentId: string) {
    return this.payments.adminVerify(req.user, paymentId);
  }

  @Post('payments/:paymentId/refund')
  @RequireAdminPermission('admin.payments.refund')
  refundPayment(@Req() req: AuthenticatedRequest, @Param('paymentId') paymentId: string, @Body() input: RefundPaymentDto) {
    return this.payments.refund(req.user, paymentId, input);
  }

  @Post('subscriptions/:subscriptionId/activate')
  @RequireAdminPermission('admin.subscriptions.activate')
  activateSubscription(@Req() req: AuthenticatedRequest, @Param('subscriptionId') subscriptionId: string, @Body() input: ActivateSubscriptionDto) {
    return this.payments.activateSubscription(req.user, subscriptionId, input);
  }
}
