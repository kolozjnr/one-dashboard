import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { authCookieNames } from './auth-cookies';
import { SKIP_CSRF_KEY } from './skip-csrf.decorator';

interface CookieRequest extends Request {
  cookies: Record<string, string | undefined>;
}

@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly allowedOrigins: Set<string>;

  constructor(
    private readonly config: ConfigService,
    private readonly reflector: Reflector = new Reflector(),
  ) {
    this.allowedOrigins = new Set(
      config
        .getOrThrow<string>('CORS_ORIGIN')
        .split(',')
        .map((origin) => origin.trim()),
    );
  }

  canActivate(context: ExecutionContext): boolean {
    if (
      this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
        context.getHandler(),
        context.getClass(),
      ])
    ) {
      return true;
    }
    const request = context.switchToHttp().getRequest<CookieRequest>();
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;

    const origin = request.headers.origin;
    const cookie = request.cookies?.[authCookieNames(this.config).csrf];
    const header = request.headers['x-csrf-token'];
    const token = Array.isArray(header) ? header[0] : header;
    if (
      !origin ||
      !this.allowedOrigins.has(origin) ||
      !cookie ||
      !token ||
      !this.equalToken(cookie, token)
    ) {
      throw new ForbiddenException({
        code: 'CSRF_VALIDATION_FAILED',
        message: 'The request could not be processed',
        details: [],
      });
    }
    return true;
  }

  private equalToken(cookie: string, header: string): boolean {
    const left = Buffer.from(cookie);
    const right = Buffer.from(header);
    return left.length === right.length && timingSafeEqual(left, right);
  }
}
