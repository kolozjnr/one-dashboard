import { BadRequestException, Controller, Headers, HttpCode, HttpStatus, Param, Post, Req } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../auth/public.decorator';
import { SkipCsrf } from '../auth/skip-csrf.decorator';
import { PaymentWebhooksService } from './payment-webhooks.service';

type RawBodyRequest = Request & { rawBody?: Buffer };

/**
 * Inbound gateway callbacks. These routes are public (no session cookie exists for a
 * gateway) and instead rely on: raw-body signature verification, idempotency keys, and
 * throttling that is deliberately separate from the browser rate limit.
 */
@ApiTags('payments')
@Controller('payments/webhooks')
export class PaymentWebhooksController {
  constructor(private readonly webhooks: PaymentWebhooksService) {}

  @Public()
  @SkipCsrf()
  @SkipThrottle()
  @Post(':provider')
  @HttpCode(HttpStatus.OK)
  receive(
    @Param('provider') provider: string,
    @Req() req: RawBodyRequest,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    if (!req.rawBody) {
      // The server was started without raw-body support; refuse rather than verify a
      // re-serialized body (its signature could never match anyway).
      throw new BadRequestException({ code: 'RAW_BODY_UNAVAILABLE', message: 'Raw request body is not available for signature verification', details: [] });
    }
    return this.webhooks.handle(provider.toLowerCase(), req.rawBody, headers);
  }
}
