import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { PrismaService } from '../../database/prisma.service';
import { authCookieNames } from './auth-cookies';
import { emailVerificationRequired } from './email-verification';
import { IS_PUBLIC_KEY } from './public.decorator';
import { Reflector } from '@nestjs/core';

export interface AuthenticatedRequest extends Request {
  cookies: Record<string, string | undefined>;
  // emailVerifiedAt is null only when EMAIL_VERIFICATION_REQUIRED=false lets
  // unverified accounts hold sessions.
  user?: { userId: string; sessionId: string; email: string; emailVerifiedAt: Date | null };
}

interface AccessPayload {
  sub: string;
  sid: string;
  iss: 'metrispot';
}

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.cookies?.[authCookieNames(this.config).access];
    if (!token) throw new UnauthorizedException();
    const verificationRequired = emailVerificationRequired(this.config);

    try {
      const payload = await this.jwt.verifyAsync<AccessPayload>(token, {
        issuer: 'metrispot',
      });
      const session = await this.prisma.userSession.findFirst({
        where: {
          id: payload.sid,
          userId: payload.sub,
          revokedAt: null,
          expiresAt: { gt: new Date() },
          user: {
            status: 'ACTIVE',
            deletedAt: null,
            deletionRequestedAt: null,
            ...(verificationRequired ? { emailVerifiedAt: { not: null } } : {}),
          },
        },
        select: {
          id: true,
          user: { select: { id: true, email: true, emailVerifiedAt: true } },
        },
      });
      if (!session || (verificationRequired && !session.user.emailVerifiedAt)) throw new UnauthorizedException();
      request.user = {
        userId: session.user.id,
        sessionId: session.id,
        email: session.user.email,
        emailVerifiedAt: session.user.emailVerifiedAt,
      };
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
