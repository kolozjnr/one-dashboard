import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/access-token.guard';
import { RequireWorkspacePermission } from '../permissions/permissions.decorators';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { InitializePaymentDto, PaymentDetailsQueryDto, PaymentHistoryQueryDto } from './payments.dto';
import { PaymentsService } from './payments.service';

/**
 * Workspace payment surface. Note what is *not* here: no route that trusts a redirect
 * parameter. `verify` is the only path that can settle a payment, and it always asks
 * the gateway's own verification endpoint first.
 */
@ApiTags('payments')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/payments')
@UseGuards(PermissionsGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post()
  @RequireWorkspacePermission('workspace.billing')
  @HttpCode(HttpStatus.CREATED)
  initialize(
    @Req() req: AuthenticatedRequest,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Body() input: InitializePaymentDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.payments.initialize(req.user, workspaceId, input, idempotencyKey);
  }

  @Get()
  @RequireWorkspacePermission('workspace.view')
  history(@Req() req: AuthenticatedRequest, @Param('workspaceId', ParseUUIDPipe) workspaceId: string, @Query() query: PaymentHistoryQueryDto) {
    return this.payments.history(req.user, workspaceId, query);
  }

  @Get(':paymentId')
  @RequireWorkspacePermission('workspace.view')
  details(
    @Req() req: AuthenticatedRequest,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Query() query: PaymentDetailsQueryDto,
  ) {
    return this.payments.details(req.user, workspaceId, paymentId, query);
  }

  @Post(':paymentId/verify')
  @RequireWorkspacePermission('workspace.billing')
  @HttpCode(HttpStatus.OK)
  verify(@Req() req: AuthenticatedRequest, @Param('workspaceId', ParseUUIDPipe) workspaceId: string, @Param('paymentId', ParseUUIDPipe) paymentId: string) {
    return this.payments.verify(req.user, workspaceId, paymentId);
  }

  @Post(':paymentId/cancel')
  @RequireWorkspacePermission('workspace.billing')
  @HttpCode(HttpStatus.OK)
  cancel(@Req() req: AuthenticatedRequest, @Param('workspaceId', ParseUUIDPipe) workspaceId: string, @Param('paymentId', ParseUUIDPipe) paymentId: string) {
    return this.payments.cancel(req.user, workspaceId, paymentId);
  }
}
