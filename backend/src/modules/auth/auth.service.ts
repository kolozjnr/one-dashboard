import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthTokenPurpose, Prisma, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import { EmailDeliveryService } from './email-delivery.service';
import type { ChangePasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from './auth.dto';
import type { AuthenticatedRequest } from './access-token.guard';
import { emailVerificationRequired } from './email-verification';
import { AuditService } from '../audit/audit.service';
import { TenantAccessService } from '../permissions/tenant-access.service';
import { SUBSCRIBER_PERMISSIONS, SUBSCRIBER_ROLE_PERMISSIONS } from '../permissions/permissions.constants';

const GENERIC_REQUEST_MESSAGE =
  'If the request is eligible, instructions will be sent to the email address.';

interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  accessTtlSeconds: number;
  refreshTtlSeconds: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly email: EmailDeliveryService,
    private readonly audit: AuditService,
    private readonly access: TenantAccessService,
  ) {}

  async register(input: RegisterDto): Promise<{ message: string }> {
    this.email.assertReady();
    const email = input.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) return { message: GENERIC_REQUEST_MESSAGE };

    const passwordHash = await argon2.hash(input.password, {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });
    const token = this.newOpaqueToken();
    try {
      const defaultRoles = Object.entries(SUBSCRIBER_ROLE_PERMISSIONS);
      const permissionKeys = [...new Set([...SUBSCRIBER_PERMISSIONS, ...defaultRoles.flatMap(([, permissions]) => permissions)])];
      // Seed the global catalog in one query. Doing one upsert per role permission
      // inside a remote-database transaction caused registration to exceed Prisma's
      // default five-second interactive transaction timeout.
      await this.prisma.permission.createMany({
        data: permissionKeys.map((key) => ({ key })),
        skipDuplicates: true,
      });
      const permissionRows = await this.prisma.permission.findMany({
        where: { key: { in: permissionKeys } },
        select: { id: true, key: true },
      });
      const permissionIds = new Map(permissionRows.map((permission) => [permission.key, permission.id]));

      await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            passwordHash,
            profile: { create: { displayName: input.name } },
          },
        });
        const workspace = await tx.workspace.create({
          data: {
            name: `${input.name}'s workspace`,
            slug: `${this.slugify(input.name).slice(0, 48)}-${randomBytes(4).toString('hex')}`,
            ownerId: user.id,
          },
        });
        await tx.role.createMany({
          data: defaultRoles.map(([key]) => ({
            workspaceId: workspace.id,
            key,
            name: key[0].toUpperCase() + key.slice(1),
            isBuiltIn: true,
          })),
        });
        const roles = await tx.role.findMany({ where: { workspaceId: workspace.id }, select: { id: true, key: true } });
        const roleIds = new Map(roles.map((role) => [role.key, role.id]));
        const rolePermissions = defaultRoles.flatMap(([key, permissions]) =>
          permissions.map((permissionKey) => {
            const roleId = roleIds.get(key);
            const permissionId = permissionIds.get(permissionKey);
            if (!roleId || !permissionId) throw new Error('Default workspace role permissions were not initialized');
            return { roleId, permissionId };
          }),
        );
        await tx.rolePermission.createMany({ data: rolePermissions });
        const ownerRoleId = roleIds.get('owner');
        if (!ownerRoleId) throw new Error('Default workspace owner role was not initialized');
        const membership = await tx.workspaceMembership.create({
          data: { workspaceId: workspace.id, userId: user.id },
        });
        await tx.membershipRole.create({
          data: { workspaceId: workspace.id, membershipId: membership.id, roleId: ownerRoleId },
        });
        await tx.authToken.create({
          data: {
            userId: user.id,
            purpose: AuthTokenPurpose.EMAIL_VERIFICATION,
            tokenHash: this.hashToken(token),
            expiresAt: this.afterHours(24),
          },
        });
        await this.audit.record({
          workspaceId: workspace.id,
          actorId: user.id,
          action: 'workspace.created',
          targetType: 'workspace',
          targetId: workspace.id,
        }, tx);
      }, { maxWait: 10_000, timeout: 20_000 });
    } catch (error) {
      if (this.isUniqueConflict(error)) return { message: GENERIC_REQUEST_MESSAGE };
      throw error;
    }

    try {
      await this.email.sendVerification(email, token);
    } catch {
      this.logger.warn('Verification delivery could not be completed; user can request another email.');
    }
    return { message: GENERIC_REQUEST_MESSAGE };
  }

  async login(input: LoginDto, request: AuthenticatedRequest): Promise<{ user: object; tokens: SessionTokens }> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.trim().toLowerCase() },
      include: { profile: true },
    });
    const validPassword = user
      ? await argon2.verify(user.passwordHash, input.password).catch(() => false)
      : false;
    if (!user || !validPassword) throw new UnauthorizedException('Invalid email or password');
    if (
      user.status !== UserStatus.ACTIVE ||
      user.deletedAt ||
      user.deletionRequestedAt
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }
    // Unverified emails get their own actionable error (never the generic
    // "invalid credentials" — the password was correct). When verification is
    // disabled via EMAIL_VERIFICATION_REQUIRED=false, this gate is skipped.
    if (!user.emailVerifiedAt && emailVerificationRequired(this.config)) {
      throw new UnauthorizedException('Your email address has not been verified yet. Check your inbox for the verification link.');
    }

    const refreshTtlSeconds = this.refreshTtlSeconds();
    const sessionId = randomUUID();
    const refreshToken = this.refreshToken(sessionId);
    const session = await this.prisma.userSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshTokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + refreshTtlSeconds * 1000),
        userAgent: request.headers['user-agent']?.slice(0, 512),
      },
    });
    const accessTtlSeconds = this.accessTtlSeconds();
    return {
      user: this.publicUser(user),
      tokens: {
        accessToken: await this.accessToken(user.id, session.id, accessTtlSeconds),
        refreshToken,
        accessTtlSeconds,
        refreshTtlSeconds,
      },
    };
  }

  async refresh(refreshToken: string | undefined): Promise<SessionTokens> {
    const { sessionId, validFormat } = this.parseRefreshToken(refreshToken);
    if (!validFormat) throw new UnauthorizedException();
    const nextRefresh = this.refreshToken(sessionId);
    const nextHash = this.hashToken(nextRefresh);
    const refreshTtlSeconds = this.refreshTtlSeconds();
    const result = await this.prisma.$transaction(async (tx) => {
      const session = await tx.userSession.findUnique({
        where: { id: sessionId },
        include: { user: true },
      });
      if (
        !session ||
        session.revokedAt ||
        session.expiresAt <= new Date() ||
        session.user.status !== UserStatus.ACTIVE ||
        session.user.deletedAt ||
        session.user.deletionRequestedAt ||
        (emailVerificationRequired(this.config) && !session.user.emailVerifiedAt)
      ) {
        throw new UnauthorizedException();
      }
      if (!this.constantTimeHashMatch(session.refreshTokenHash, this.hashToken(refreshToken!))) {
        await tx.userSession.updateMany({
          where: { userId: session.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        return null;
      }
      const rotated = await tx.userSession.updateMany({
        where: { id: session.id, refreshTokenHash: session.refreshTokenHash, revokedAt: null },
        data: {
          refreshTokenHash: nextHash,
          expiresAt: new Date(Date.now() + refreshTtlSeconds * 1000),
          lastUsedAt: new Date(),
        },
      });
      if (rotated.count !== 1) throw new UnauthorizedException();
      const accessTtlSeconds = this.accessTtlSeconds();
      return {
        accessToken: await this.accessToken(session.userId, session.id, accessTtlSeconds),
        refreshToken: nextRefresh,
        accessTtlSeconds,
        refreshTtlSeconds,
      };
    });
    if (!result) throw new UnauthorizedException('Refresh token reuse detected');
    return result;
  }

  async logout(userId: string | undefined, refreshToken: string | undefined): Promise<void> {
    if (userId) {
      await this.prisma.userSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return;
    }
    const parsed = this.parseRefreshToken(refreshToken);
    if (!parsed.validFormat || !refreshToken) return;
    await this.prisma.userSession.updateMany({
      where: { id: parsed.sessionId, refreshTokenHash: this.hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: { profile: true, memberships: { where: { status: 'ACTIVE' }, include: { workspace: true } } },
    });
    if (!user) throw new UnauthorizedException();
    // Platform administration context is separate from workspace roles; the frontend may
    // use it to hide navigation, but every admin endpoint enforces it independently.
    const platform = await this.access.adminContext(userId);
    return {
      ...this.publicUser(user),
      workspaces: user.memberships.map(({ workspace }) => ({ id: workspace.id, name: workspace.name, slug: workspace.slug })),
      platform,
    };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const authToken = await this.findValidToken(token, AuthTokenPurpose.EMAIL_VERIFICATION);
    await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.authToken.updateMany({
        where: { id: authToken.id, consumedAt: null, expiresAt: { gt: new Date() } },
        data: { consumedAt: new Date() },
      });
      if (consumed.count !== 1) throw new BadRequestException('This link is invalid or has expired');
      await tx.user.update({ where: { id: authToken.userId }, data: { emailVerifiedAt: new Date() } });
      await tx.authToken.updateMany({
        where: { userId: authToken.userId, purpose: AuthTokenPurpose.EMAIL_VERIFICATION, consumedAt: null },
        data: { consumedAt: new Date() },
      });
    });
    return { message: 'Email verified. You can now sign in.' };
  }

  async resendVerification(email: string): Promise<{ message: string }> {
    this.email.assertReady();
    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), emailVerifiedAt: null, status: UserStatus.ACTIVE, deletedAt: null },
    });
    if (user) {
      const token = await this.createActionToken(user.id, AuthTokenPurpose.EMAIL_VERIFICATION, 24);
      try {
        await this.email.sendVerification(user.email, token);
      } catch {
        this.logger.warn('Verification delivery could not be completed.');
      }
    }
    return { message: GENERIC_REQUEST_MESSAGE };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    this.email.assertReady();
    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), status: UserStatus.ACTIVE, deletedAt: null },
    });
    if (user) {
      const token = await this.createActionToken(user.id, AuthTokenPurpose.PASSWORD_RESET, 1);
      try {
        await this.email.sendPasswordReset(user.email, token);
      } catch {
        this.logger.warn('Password reset delivery could not be completed.');
      }
    }
    return { message: GENERIC_REQUEST_MESSAGE };
  }

  async resetPassword(input: ResetPasswordDto): Promise<{ message: string }> {
    const authToken = await this.findValidToken(input.token, AuthTokenPurpose.PASSWORD_RESET);
    const passwordHash = await this.hashPassword(input.password);
    await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.authToken.updateMany({
        where: { id: authToken.id, consumedAt: null, expiresAt: { gt: new Date() } },
        data: { consumedAt: new Date() },
      });
      if (consumed.count !== 1) throw new BadRequestException('This link is invalid or has expired');
      await tx.user.update({ where: { id: authToken.userId }, data: { passwordHash } });
      await tx.authToken.updateMany({
        where: { userId: authToken.userId, purpose: AuthTokenPurpose.PASSWORD_RESET, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      await tx.userSession.updateMany({
        where: { userId: authToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
    return { message: 'Password reset. Sign in with your new password.' };
  }

  async changePassword(userId: string, input: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const valid = user ? await argon2.verify(user.passwordHash, input.currentPassword).catch(() => false) : false;
    if (!user || !valid) throw new BadRequestException('Current password is incorrect');
    const passwordHash = await this.hashPassword(input.newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      this.prisma.userSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    return { message: 'Password updated. Sign in again with your new password.' };
  }

  async updateProfile(userId: string, update: { displayName?: string; timezone?: string; locale?: string }) {
    const profile = await this.prisma.userProfile.upsert({
      where: { userId },
      create: { userId, ...update },
      update,
    });
    return { profile };
  }

  async requestDeletion(userId: string): Promise<{ message: string }> {
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { deletionRequestedAt: now, deletionScheduledFor: new Date(now.getTime() + 30 * 86400000) },
      }),
      this.prisma.userSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } }),
    ]);
    return { message: 'Account deletion requested. Your account is scheduled for deletion in 30 days.' };
  }

  private async createActionToken(userId: string, purpose: AuthTokenPurpose, expiresInHours: number): Promise<string> {
    const token = this.newOpaqueToken();
    await this.prisma.$transaction([
      this.prisma.authToken.updateMany({ where: { userId, purpose, consumedAt: null }, data: { consumedAt: new Date() } }),
      this.prisma.authToken.create({
        data: { userId, purpose, tokenHash: this.hashToken(token), expiresAt: this.afterHours(expiresInHours) },
      }),
    ]);
    return token;
  }

  private async findValidToken(token: string, purpose: AuthTokenPurpose) {
    const authToken = await this.prisma.authToken.findFirst({
      where: { tokenHash: this.hashToken(token), purpose, consumedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!authToken) throw new BadRequestException('This link is invalid or has expired');
    return authToken;
  }

  private async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 });
  }

  private publicUser(user: { id: string; email: string; emailVerifiedAt: Date | null; createdAt: Date; profile: { displayName: string | null; avatarUrl: string | null; timezone: string; locale: string } | null }) {
    return {
      id: user.id,
      email: user.email,
      emailVerified: Boolean(user.emailVerifiedAt),
      createdAt: user.createdAt,
      profile: user.profile,
    };
  }

  private async accessToken(userId: string, sessionId: string, expiresIn: number): Promise<string> {
    return this.jwt.signAsync(
      { sid: sessionId },
      { subject: userId, issuer: 'metrispot', expiresIn },
    );
  }

  private accessTtlSeconds(): number {
    return this.config.getOrThrow<number>('AUTH_ACCESS_TTL_SECONDS');
  }

  private refreshTtlSeconds(): number {
    return this.config.getOrThrow<number>('AUTH_REFRESH_TTL_DAYS') * 86400;
  }

  private newOpaqueToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private refreshToken(sessionId: string): string {
    return `${sessionId}.${this.newOpaqueToken()}`;
  }

  private parseRefreshToken(token: string | undefined): { sessionId: string; validFormat: boolean } {
    if (!token) return { sessionId: '', validFormat: false };
    const match = /^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.([A-Za-z0-9_-]{43})$/i.exec(token);
    return { sessionId: match?.[1] ?? '', validFormat: match !== null };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private constantTimeHashMatch(left: string, right: string): boolean {
    const leftBytes = Buffer.from(left, 'hex');
    const rightBytes = Buffer.from(right, 'hex');
    return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
  }

  private afterHours(hours: number): Date {
    return new Date(Date.now() + hours * 3600_000);
  }

  private slugify(value: string): string {
    return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'workspace';
  }

  private isUniqueConflict(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}
