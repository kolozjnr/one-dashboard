import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../auth/access-token.guard';
import { RequireAdminPermission } from '../permissions/permissions.decorators';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { AdminService } from './admin.service';
import { CreateProviderDto, ListTicketsDto, ReplyTicketDto, SaveSettingsDto, UpdateProviderDto, UpdateTicketDto } from './admin.dto';

// Platform operations: integration providers, system settings and support tickets.
@ApiTags('admin')
@Controller('admin')
@UseGuards(PermissionsGuard)
export class AdminPlatformController {
  constructor(private readonly admin: AdminService) {}

  @Get('integrations') @RequireAdminPermission('admin.integrations.view')
  listProviders() { return this.admin.listProviders(); }

  @Post('integrations') @RequireAdminPermission('admin.integrations.manage')
  createProvider(@Req() req: AuthenticatedRequest, @Body() input: CreateProviderDto) { return this.admin.createProvider(req.user, input); }

  @Patch('integrations/:providerId') @RequireAdminPermission('admin.integrations.manage')
  updateProvider(@Req() req: AuthenticatedRequest, @Param('providerId', ParseUUIDPipe) providerId: string, @Body() input: UpdateProviderDto) { return this.admin.updateProvider(req.user, providerId, input); }

  @Get('settings') @RequireAdminPermission('admin.settings.view')
  listSettings() { return this.admin.listSettings(); }

  @Post('settings') @RequireAdminPermission('admin.settings.manage')
  saveSettings(@Req() req: AuthenticatedRequest, @Body() input: SaveSettingsDto) { return this.admin.saveSettings(req.user, input); }

  @Get('support') @RequireAdminPermission('admin.support.view')
  listTickets(@Query() query: ListTicketsDto) { return this.admin.listTickets(query); }

  @Get('support/:ticketId') @RequireAdminPermission('admin.support.view')
  getTicket(@Param('ticketId', ParseUUIDPipe) ticketId: string) { return this.admin.getTicket(ticketId); }

  @Patch('support/:ticketId') @RequireAdminPermission('admin.support.manage')
  updateTicket(@Req() req: AuthenticatedRequest, @Param('ticketId', ParseUUIDPipe) ticketId: string, @Body() input: UpdateTicketDto) { return this.admin.updateTicket(req.user, ticketId, input); }

  @Post('support/:ticketId/messages') @RequireAdminPermission('admin.support.manage')
  replyToTicket(@Req() req: AuthenticatedRequest, @Param('ticketId', ParseUUIDPipe) ticketId: string, @Body() input: ReplyTicketDto) { return this.admin.replyToTicket(req.user, ticketId, input); }
}
