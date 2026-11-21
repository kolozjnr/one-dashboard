import type { CookieOptions, Response } from 'express';
import type { ConfigService } from '@nestjs/config';

export interface AuthCookieNames {
  access: string;
  refresh: string;
  csrf: string;
}

export function authCookieNames(config: ConfigService): AuthCookieNames {
  const prefix = config.get<string>('NODE_ENV') === 'production' ? '__Host-' : '';
  return {
    access: `${prefix}metrispot_access`,
    refresh: `${prefix}metrispot_refresh`,
    csrf: `${prefix}metrispot_csrf`,
  };
}

export function authCookieOptions(config: ConfigService): CookieOptions {
  return {
    httpOnly: true,
    secure: config.get<string>('NODE_ENV') === 'production',
    sameSite: 'lax',
    path: '/',
  };
}

export function setAuthCookies(
  response: Response,
  config: ConfigService,
  accessToken: string,
  refreshToken: string,
  accessTtlSeconds: number,
  refreshTtlSeconds: number,
): void {
  const names = authCookieNames(config);
  const options = authCookieOptions(config);
  response.cookie(names.access, accessToken, { ...options, maxAge: accessTtlSeconds * 1000 });
  response.cookie(names.refresh, refreshToken, { ...options, maxAge: refreshTtlSeconds * 1000 });
}

export function clearAuthCookies(response: Response, config: ConfigService): void {
  const names = authCookieNames(config);
  const options = authCookieOptions(config);
  response.clearCookie(names.access, options);
  response.clearCookie(names.refresh, options);
}
