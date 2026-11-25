import { Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { IntegrationError } from './integrations.types';

/**
 * Shared persistence for account metric syncs (Meta, TikTok, X).
 *
 * One place writes the three rows every provider needs:
 *  - `AnalyticsMetric`  — the dashboard metric definition (created on demand),
 *  - `AnalyticsSnapshot` — one value per account per range,
 *  - `AccountMetricCapability` — "this account demonstrably reports this",
 * plus the `SyncJob` bookkeeping and the account's `lastSyncedAt`.
 *
 * A persistence failure marks the job FAILED and raises a safe
 * UPSTREAM_ERROR: metrics are never half-written silently.
 */
export interface PersistableRange {
  since: Date;
  until: Date;
}

export interface PersistableMetric {
  key: string;
  value: number;
  dimensions?: Record<string, string | number>;
}

export interface PersistOptions {
  /** SyncJob.jobType, e.g. `meta.insights` / `social.insights`. */
  jobType: string;
  labelFor: (key: string) => string;
  aggregationFor: (key: string) => string;
  /** Provider-aware redaction for anything that could reach a log. */
  redact: (message: string) => string;
  loggerLabel: string;
}

export async function persistAccountMetrics(
  prisma: PrismaService,
  account: { id: string; workspaceId: string; providerId: string },
  range: PersistableRange,
  metrics: PersistableMetric[],
  options: PersistOptions,
): Promise<void> {
  if (!metrics.length) return;
  const logger = new Logger(options.loggerLabel);
  const job = await prisma.syncJob.create({
    data: {
      workspaceId: account.workspaceId,
      accountId: account.id,
      jobType: options.jobType,
      status: 'RUNNING',
      startedAt: new Date(),
    },
  });
  try {
    for (const metric of metrics) {
      const row = await prisma.analyticsMetric.upsert({
        where: { key: metric.key },
        update: {},
        create: {
          key: metric.key,
          name: options.labelFor(metric.key),
          aggregation: options.aggregationFor(metric.key),
        },
      });
      await prisma.analyticsSnapshot.upsert({
        where: {
          workspaceId_accountId_metricId_periodStart_periodEnd: {
            workspaceId: account.workspaceId,
            accountId: account.id,
            metricId: row.id,
            periodStart: range.since,
            periodEnd: range.until,
          },
        },
        update: { value: metric.value, dimensions: metric.dimensions ?? undefined, collectedAt: new Date() },
        create: {
          workspaceId: account.workspaceId,
          accountId: account.id,
          metricId: row.id,
          periodStart: range.since,
          periodEnd: range.until,
          value: metric.value,
          dimensions: metric.dimensions ?? undefined,
        },
      });
      // Capability = "this account demonstrably returns this metric".
      await prisma.accountMetricCapability.upsert({
        where: {
          workspaceId_providerId_metricId_accountId: {
            workspaceId: account.workspaceId,
            providerId: account.providerId,
            metricId: row.id,
            accountId: account.id,
          },
        },
        update: {},
        create: {
          workspaceId: account.workspaceId,
          providerId: account.providerId,
          metricId: row.id,
          accountId: account.id,
        },
      });
    }
    await prisma.syncJob.update({
      where: { id: job.id },
      data: { status: 'SUCCEEDED', completedAt: new Date() },
    });
    await prisma.connectedAccount.update({
      where: { id: account.id },
      data: { lastSyncedAt: new Date() },
    });
  } catch (error) {
    const message = error instanceof Error ? options.redact(error.message) : 'unknown error';
    logger.warn(`metric persistence failed for account ${account.id}: ${message}`);
    await prisma.syncJob.update({
      where: { id: job.id },
      data: { status: 'FAILED', completedAt: new Date(), errorCode: 'PERSIST_FAILED', safeError: message },
    });
    throw new IntegrationError('UPSTREAM_ERROR', 'Metrics could not be saved. Please try again.', 502);
  }
}
