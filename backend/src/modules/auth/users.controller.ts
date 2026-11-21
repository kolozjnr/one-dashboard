import { Body, Controller, HttpCode, HttpStatus, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { Response } from 'express';
import { AccessTokenGuard, type AuthenticatedRequest } from './access-token.guard';
import { clearAuthCookies } from './auth-cookies';
import { ChangePasswordDto } from './auth.dto';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';

class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  locale?: string;
}

@ApiTags('users')
@Controller('users/me')
@UseGuards(AccessTokenGuard)
export class UsersController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Patch()
  @ApiOperation({ summary: 'Update the authenticated user profile' })
  updateProfile(@Req() request: AuthenticatedRequest, @Body() input: UpdateProfileDto) {
    return this.auth.updateProfile(request.user!.userId, input);
  }

  @Patch('password')
  @ApiOperation({ summary: 'Change the current password and revoke all sessions' })
  async changePassword(
    @Req() request: AuthenticatedRequest,
    @Body() input: ChangePasswordDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.changePassword(request.user!.userId, input);
    clearAuthCookies(response, this.config);
    return result;
  }

  @Post('deletion-request')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Schedule account deletion and revoke active sessions' })
  async requestDeletion(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.requestDeletion(request.user!.userId);
    clearAuthCookies(response, this.config);
    return result;
  }
}
