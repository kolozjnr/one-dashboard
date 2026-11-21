import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import type { AuthenticatedRequest } from './access-token.guard';
import { authCookieNames, authCookieOptions, clearAuthCookies, setAuthCookies } from './auth-cookies';
import {
  EmailDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  TokenDto,
} from './auth.dto';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';

interface CookieRequest extends Request {
  cookies: Record<string, string | undefined>;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Get('csrf')
  @Public()
  @ApiOperation({ summary: 'Issue a CSRF token for same-origin mutation requests' })
  issueCsrf(@Res({ passthrough: true }) response: Response) {
    const token = randomBytes(32).toString('base64url');
    const names = authCookieNames(this.config);
    response.cookie(names.csrf, token, {
      ...authCookieOptions(this.config),
      maxAge: 2 * 60 * 60 * 1000,
    });
    return { csrfToken: token };
  }

  @Post('register')
  @Public()
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Create an account and send email verification instructions' })
  register(@Body() input: RegisterDto) {
    return this.auth.register(input);
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Authenticate and issue secure access and refresh cookies' })
  async login(
    @Body() input: LoginDto,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.login(input, request);
    const { tokens, user } = result;
    setAuthCookies(
      response,
      this.config,
      tokens.accessToken,
      tokens.refreshToken,
      tokens.accessTtlSeconds,
      tokens.refreshTtlSeconds,
    );
    return { user };
  }

  @Post('logout')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke the current refresh session and clear authentication cookies' })
  async logout(
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.auth.logout(undefined, request.cookies?.[authCookieNames(this.config).refresh]);
    clearAuthCookies(response, this.config);
    return { message: 'Signed out' };
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Rotate the refresh token and issue a new short-lived access token' })
  async refresh(
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const tokens = await this.auth.refresh(request.cookies?.[authCookieNames(this.config).refresh]);
    setAuthCookies(
      response,
      this.config,
      tokens.accessToken,
      tokens.refreshToken,
      tokens.accessTtlSeconds,
      tokens.refreshTtlSeconds,
    );
    return { message: 'Session refreshed' };
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Request password reset instructions without revealing account existence' })
  forgotPassword(@Body() input: EmailDto) {
    return this.auth.forgotPassword(input.email);
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Reset a password with a single-use email token' })
  async resetPassword(
    @Body() input: ResetPasswordDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.resetPassword(input);
    clearAuthCookies(response, this.config);
    return result;
  }

  @Post('verify-email')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  verifyEmail(@Body() input: TokenDto) {
    return this.auth.verifyEmail(input.token);
  }

  @Post('resend-verification')
  @Public()
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  resendVerification(@Body() input: EmailDto) {
    return this.auth.resendVerification(input.email);
  }

  @Get('me')
  // No @Public(): the global AccessTokenGuard authenticates this route. The handler-level
  // guard used to be a no-op because the class was marked public, so request.user was
  // never populated and `me` crashed.
  @ApiOperation({ summary: 'Return the authenticated user profile and memberships' })
  me(@Req() request: AuthenticatedRequest) {
    return this.auth.me(request.user!.userId);
  }
}
