import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import type { AuthenticatedRequest } from '../auth/access-token.guard';
import { RequireWorkspacePermission } from '../permissions/permissions.decorators';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { AuthorizeDto, InsightsQueryDto } from './integrations.dto';
import { IntegrationsService } from './integrations.service';

/**
 * Workspace integration surface. What is deliberately absent: no route that
 * trusts redirect parameters for anything except the signed-state callbacks
 * below, and no endpoint that ever returns a token — only scopes, expiry and
 * account metadata cross this boundary.
 */
@ApiTags('integrations')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/integrations')
@UseGuards(PermissionsGuard)
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  @Get()
  @RequireWorkspacePermission('integrations.view')
  list(@Req() req: AuthenticatedRequest, @Param('workspaceId', ParseUUIDPipe) workspaceId: string) {
    return this.integrations.list(req.user!, workspaceId);
  }

  /** Returns the provider authorization URL the browser should be sent to. */
  @Post('authorize')
  @RequireWorkspacePermission('integrations.connect')
  @HttpCode(HttpStatus.OK)
  authorize(
    @Req() req: AuthenticatedRequest,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Body() input: AuthorizeDto,
  ) {
    return this.integrations.authorize(req.user!, workspaceId, input.product);
  }

  @Get(':accountId/insights')
  @RequireWorkspacePermission('analytics.view')
  insights(
    @Req() req: AuthenticatedRequest,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Query() query: InsightsQueryDto,
  ) {
    return this.integrations.syncInsights(req.user!, workspaceId, accountId, query);
  }

  @Post(':accountId/disconnect')
  @RequireWorkspacePermission('integrations.disconnect')
  @HttpCode(HttpStatus.OK)
  disconnect(
    @Req() req: AuthenticatedRequest,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('accountId', ParseUUIDPipe) accountId: string,
  ) {
    return this.integrations.disconnect(req.user!, workspaceId, accountId);
  }
}

/**
 * Shared implementation for the provider OAuth redirect targets. Each
 * provider registers its own fixed URI (see META_REDIRECT_URI,
 * TIKTOK_REDIRECT_URI, X_REDIRECT_URI), so the controllers live outside the
 * workspace-scoped controller and are `@Public()`: the browser arrives from
 * the provider carrying no guarantee of a live session, and the signed state
 * — not a cookie — proves which workspace started the flow. They return JSON;
 * the Next.js routes at the matching /auth/<provider>/callback path perform
 * the browser redirect.
 */
abstract class OAuthCallbackController {
  protected constructor(private readonly integrations: IntegrationsService) {}

  protected handle(query: Record<string, string | string[] | undefined>) {
    const pick = (key: string): string | undefined => {
      const value = query[key];
      return Array.isArray(value) ? value[0] : value;
    };
    return this.integrations.handleCallback({
      code: pick('code'),
      state: pick('state'),
      error: pick('error'),
      error_description: pick('error_description'),
    });
  }
}

@ApiTags('integrations')
@Controller('integrations/meta')
export class MetaCallbackController extends OAuthCallbackController {
  constructor(integrations: IntegrationsService) {
    super(integrations);
  }

  @Public()
  @Get('callback')
  callback(@Query() query: Record<string, string | string[] | undefined>) {
    return this.handle(query);
  }
}

/** TikTok Login Kit / Display API and TikTok for Business share one route. */
@ApiTags('integrations')
@Controller('integrations/tiktok')
export class TikTokCallbackController extends OAuthCallbackController {
  constructor(integrations: IntegrationsService) {
    super(integrations);
  }

  @Public()
  @Get('callback')
  callback(@Query() query: Record<string, string | string[] | undefined>) {
    return this.handle(query);
  }
}

/** X OAuth 2.0 PKCE redirect target. */
@ApiTags('integrations')
@Controller('integrations/x')
export class XCallbackController extends OAuthCallbackController {
  constructor(integrations: IntegrationsService) {
    super(integrations);
  }

  @Public()
  @Get('callback')
  callback(@Query() query: Record<string, string | string[] | undefined>) {
    return this.handle(query);
  }
}
