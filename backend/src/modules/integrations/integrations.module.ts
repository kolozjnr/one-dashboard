import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PermissionsModule } from '../permissions/permissions.module';
import {
  IntegrationsController,
  MetaCallbackController,
  TikTokCallbackController,
  XCallbackController,
} from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { IntegrationsVaultService } from './integrations-vault.service';
import { MetaFacebookAdapter } from './meta-facebook.adapter';
import { MetaInsightsService } from './meta-insights.service';
import { MetaInstagramAdapter } from './meta-instagram.adapter';
import { SocialInsightsService } from './social-insights.service';
import { TikTokAdapter } from './tiktok.adapter';
import { TikTokBusinessAdapter } from './tiktok-business.adapter';
import { XAdapter } from './x.adapter';
import { XOAuth1Strategy } from './x-oauth1.strategy';

/**
 * OAuth integrations. Same layering as the payments module: a provider-neutral
 * service and controller on top, stateless adapters underneath that are the
 * only code knowing provider host names and scope names (Instagram, Facebook,
 * TikTok Display, TikTok for Business, X), one vault that encrypts every token
 * at rest, and two insights services that discover — never assume — which
 * metrics each account can actually report.
 */
@Module({
  imports: [PermissionsModule, AuditModule],
  controllers: [IntegrationsController, MetaCallbackController, TikTokCallbackController, XCallbackController],
  providers: [
    IntegrationsVaultService,
    MetaInstagramAdapter,
    MetaFacebookAdapter,
    TikTokAdapter,
    TikTokBusinessAdapter,
    XOAuth1Strategy,
    XAdapter,
    MetaInsightsService,
    SocialInsightsService,
    IntegrationsService,
  ],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
