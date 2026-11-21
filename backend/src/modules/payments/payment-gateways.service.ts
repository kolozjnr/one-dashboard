import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { PaymentGateway } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TenantAccessService } from '../permissions/tenant-access.service';
import type { AuthenticatedRequest } from '../auth/access-token.guard';
import { adapterFor, registeredAdapters } from './gateway.registry';
import type { GatewayConfig, GatewayCredentials, GatewayProviderKey, PaymentGatewayAdapter } from './gateway.types';
import { isGatewayProviderKey } from './gateway.types';
import { SecretVaultService } from './secret-vault.service';

export interface ConfigureGatewayInput {
  credentials: Record<string, string>;
  config: Record<string, string>;
  activate?: boolean;
}

export interface GatewaySummary {
  provider: string;
  displayName: string;
  status: 'ACTIVE' | 'INACTIVE';
  statusReason: string | null;
  supportsRefunds: boolean;
  environment: string | null;
  currency: string | null;
  /** Names only — never values. */
  requiredCredentials: string[];
  requiredConfig: string[];
  configuredCredentials: string[];
  configuredConfig: string[];
  missing: string[];
  activatedAt: Date | null;
  lastTestedAt: Date | null;
  lastTestResult: string | null;
}

const SECRET_KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]{0,40}$/;
const MAX_SECRET_LENGTH = 500;

// Owns gateway registration. A gateway is ACTIVE only after every required credential
// and configuration value has been supplied and validated; secrets are encrypted
// before they touch the row and are never returned by any read path.
@Injectable()
export class PaymentGatewaysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly access: TenantAccessService,
    private readonly vault: SecretVaultService,
  ) {}

  /** Adapter catalog merged with stored configuration (safe to expose to admins). */
  async list(): Promise<GatewaySummary[]> {
    const rows = await this.prisma.paymentGateway.findMany();
    const byProvider = new Map(rows.map((row) => [row.provider, row]));
    return registeredAdapters().map((adapter) => this.summarize(adapter, byProvider.get(adapter.key) ?? null));
  }

  async configure(actor: AuthenticatedRequest['user'], provider: string, input: ConfigureGatewayInput): Promise<GatewaySummary> {
    await this.access.requireAdminPermission(actor!, 'admin.payments.manage');
    const adapter = this.adapter(provider);
    this.assertShape(input.credentials, 'credentials');
    this.assertShape(input.config, 'config');

    const existing = await this.prisma.paymentGateway.findUnique({ where: { provider: adapter.key } });
    const credentials = { ...this.vault.open(existing?.credentialsCiphertext), ...this.clean(input.credentials) };
    const config = { ...((existing?.config as Record<string, string> | null) ?? {}), ...this.clean(input.config) };
    // An explicitly empty value clears a previously stored secret/config entry.
    for (const [key, value] of Object.entries(input.credentials)) if (value === '') delete credentials[key];
    for (const [key, value] of Object.entries(input.config)) if (value === '') delete config[key];

    const missing = this.missingFields(adapter, credentials, config);
    const wantsActivation = input.activate !== false;
    const active = wantsActivation && missing.length === 0;
    const statusReason = !wantsActivation
      ? 'Paused by administrator'
      : missing.length > 0
        ? `Missing configuration: ${missing.join(', ')}`
        : null;

    const row = await this.prisma.paymentGateway.upsert({
      where: { provider: adapter.key },
      create: {
        provider: adapter.key,
        displayName: adapter.displayName,
        status: active ? 'ACTIVE' : 'INACTIVE',
        statusReason,
        credentialsCiphertext: this.vault.seal(credentials),
        config,
        activatedAt: active ? new Date() : null,
      },
      update: {
        displayName: adapter.displayName,
        status: active ? 'ACTIVE' : 'INACTIVE',
        statusReason,
        credentialsCiphertext: this.vault.seal(credentials),
        config,
        ...(active && existing?.status !== 'ACTIVE' ? { activatedAt: new Date() } : {}),
      },
    });
    await this.audit.record({
      actorId: actor!.userId,
      action: active ? 'payment.gateway.activated' : 'payment.gateway.configured',
      targetType: 'payment_gateway',
      targetId: row.provider,
      metadata: {
        provider: row.provider,
        status: row.status,
        missing,
        credentialKeys: Object.keys(credentials).sort(),
        configKeys: Object.keys(config).sort(),
      },
    });
    return this.summarize(adapter, row);
  }

  /**
   * Pauses a gateway for new checkouts. Credentials and configuration are kept so
   * in-flight payments can still be verified, refunded, and reconciled from webhooks —
   * use `configure` with an empty value to forget an individual secret.
   */
  async deactivate(actor: AuthenticatedRequest['user'], provider: string): Promise<GatewaySummary> {
    await this.access.requireAdminPermission(actor!, 'admin.payments.manage');
    const adapter = this.adapter(provider);
    const existing = await this.prisma.paymentGateway.findUnique({ where: { provider: adapter.key } });
    if (!existing) throw new NotFoundException('Payment gateway is not configured');
    const row = await this.prisma.paymentGateway.update({
      where: { provider: adapter.key },
      data: { status: 'INACTIVE', statusReason: 'Deactivated by administrator', activatedAt: null },
    });
    await this.audit.record({
      actorId: actor!.userId,
      action: 'payment.gateway.deactivated',
      targetType: 'payment_gateway',
      targetId: row.provider,
      metadata: { provider: row.provider },
    });
    return this.summarize(adapter, row);
  }

  async test(actor: AuthenticatedRequest['user'], provider: string): Promise<GatewaySummary> {
    await this.access.requireAdminPermission(actor!, 'admin.payments.manage');
    const adapter = this.adapter(provider);
    const existing = await this.prisma.paymentGateway.findUnique({ where: { provider: adapter.key } });
    if (!existing || existing.status !== 'ACTIVE') throw new ConflictException('Activate the gateway before testing its credentials');
    const { credentials, config } = this.readSecrets(adapter, existing);
    let result = 'ok';
    try {
      await adapter.ping(credentials, config);
    } catch (error) {
      result = error instanceof Error ? error.message.slice(0, 60) : 'failed';
    }
    const row = await this.prisma.paymentGateway.update({
      where: { provider: adapter.key },
      data: { lastTestedAt: new Date(), lastTestResult: result },
    });
    await this.audit.record({
      actorId: actor!.userId,
      action: 'payment.gateway.tested',
      targetType: 'payment_gateway',
      targetId: row.provider,
      metadata: { provider: row.provider, result },
    });
    return this.summarize(adapter, row);
  }

  /**
   * Outbound resolution: used before initializing a payment or calling a provider
   * endpoint on behalf of the platform. The gateway must be registered, configured,
   * and ACTIVE — credentials that were never provided can never be used.
   */
  async resolveOutbound(provider?: string): Promise<{ adapter: PaymentGatewayAdapter; credentials: GatewayCredentials; config: GatewayConfig; row: PaymentGateway }> {
    if (provider !== undefined && !isGatewayProviderKey(provider)) throw new NotFoundException('Unknown payment gateway');
    const rows = await this.prisma.paymentGateway.findMany({ where: { status: 'ACTIVE' } });
    const candidates = provider ? rows.filter((row) => row.provider === provider) : rows;
    if (candidates.length === 0) {
      throw new ConflictException(provider ? 'That payment gateway is not active' : 'No payment gateway is active yet');
    }
    if (!provider && candidates.length > 1) throw new ConflictException('Several payment gateways are active; select one explicitly');
    const row = candidates[0]!;
    const adapter = this.adapter(row.provider);
    const { credentials, config } = this.readSecrets(adapter, row);
    const missing = this.missingFields(adapter, credentials, config);
    if (missing.length > 0) {
      await this.prisma.paymentGateway.update({ where: { id: row.id }, data: { status: 'INACTIVE', statusReason: `Missing configuration: ${missing.join(', ')}` } });
      throw new ConflictException('That payment gateway is missing configuration and was deactivated');
    }
    return { adapter, credentials, config, row };
  }

  /**
   * Credential resolution for trusted provider calls that must still work while a
   * gateway is paused for new checkouts: webhooks, verification refreshes and refunds
   * all reconcile in-flight money. Signature verification (webhooks) or an authenticated
   * API call (the others) is what makes these calls safe, not the ACTIVE flag.
   */
  async resolveConfigured(provider: string): Promise<{ adapter: PaymentGatewayAdapter; credentials: GatewayCredentials; config: GatewayConfig }> {
    if (!isGatewayProviderKey(provider)) throw new NotFoundException('Unknown payment gateway');
    const row = await this.prisma.paymentGateway.findUnique({ where: { provider } });
    if (!row) throw new ConflictException('Payment gateway is not configured');
    const adapter = this.adapter(provider);
    const { credentials, config } = this.readSecrets(adapter, row);
    if (Object.keys(credentials).length === 0) throw new ConflictException('Payment gateway has no stored credentials');
    return { adapter, credentials, config };
  }

  // ---- Internals ----------------------------------------------------------------

  private adapter(provider: string): PaymentGatewayAdapter {
    if (!isGatewayProviderKey(provider)) throw new NotFoundException('Unknown payment gateway');
    return adapterFor(provider as GatewayProviderKey);
  }

  private readSecrets(adapter: PaymentGatewayAdapter, row: PaymentGateway): { credentials: GatewayCredentials; config: GatewayConfig } {
    const credentials = this.vault.open(row.credentialsCiphertext);
    const storedConfig = (row.config as Record<string, string> | null) ?? {};
    return { credentials, config: { ...adapter.defaultConfig, ...storedConfig } };
  }

  private missingFields(adapter: PaymentGatewayAdapter, credentials: GatewayCredentials, config: GatewayConfig): string[] {
    const missing: string[] = [];
    for (const key of adapter.requiredCredentials) if (!credentials[key]) missing.push(key);
    for (const key of adapter.requiredConfig) if (!config[key]) missing.push(key);
    return missing;
  }

  private clean(values: Record<string, string>): Record<string, string> {
    const output: Record<string, string> = {};
    for (const [key, value] of Object.entries(values)) {
      if (value === '') continue; // an empty value clears a stored secret
      output[key] = value;
    }
    return output;
  }

  private assertShape(values: unknown, field: string): void {
    if (typeof values !== 'object' || values === null || Array.isArray(values)) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: `\`${field}\` must be an object of strings`, details: [{ field, message: 'must be an object' }] });
    }
    for (const [key, value] of Object.entries(values as Record<string, unknown>)) {
      if (!SECRET_KEY_PATTERN.test(key)) {
        throw new BadRequestException({ code: 'VALIDATION_ERROR', message: `Invalid \`${field}\` key`, details: [{ field: `${field}.${key}`, message: 'keys must be alphanumeric' }] });
      }
      if (typeof value !== 'string' || value.length === 0 || value.length > MAX_SECRET_LENGTH) {
        throw new BadRequestException({ code: 'VALIDATION_ERROR', message: `Invalid \`${field}.${key}\` value`, details: [{ field: `${field}.${key}`, message: `must be 1-${MAX_SECRET_LENGTH} characters` }] });
      }
    }
  }

  private summarize(adapter: PaymentGatewayAdapter, row: PaymentGateway | null): GatewaySummary {
    const credentials = this.vault.open(row?.credentialsCiphertext);
    const storedConfig = ((row?.config as Record<string, string> | null) ?? {}) as Record<string, string>;
    const missing = this.missingFields(adapter, credentials, storedConfig);
    return {
      provider: adapter.key,
      displayName: adapter.displayName,
      status: (row?.status as 'ACTIVE' | 'INACTIVE' | undefined) ?? 'INACTIVE',
      statusReason: row?.statusReason ?? (row ? null : 'Not configured'),
      supportsRefunds: adapter.supportsRefunds,
      environment: storedConfig.environment ?? null,
      currency: storedConfig.currency ?? null,
      requiredCredentials: [...adapter.requiredCredentials],
      requiredConfig: [...adapter.requiredConfig],
      configuredCredentials: Object.keys(credentials).sort(),
      configuredConfig: Object.keys(storedConfig).sort(),
      missing,
      activatedAt: row?.activatedAt ?? null,
      lastTestedAt: row?.lastTestedAt ?? null,
      lastTestResult: row?.lastTestResult ?? null,
    };
  }
}
