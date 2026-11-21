import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export interface AuditEntry {
  action: string;
  targetType: string;
  targetId?: string | null;
  workspaceId?: string | null;
  actorId?: string | null;
  metadata?: Prisma.InputJsonValue;
}

// Central audit log writer. All important permission, role, subscription and platform
// changes must go through record() so they land in AuditLog with consistent naming.
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  // Pass the surrounding transaction client to keep the audit row atomic with the
  // change it describes; otherwise it is written immediately.
  async record(entry: AuditEntry, client?: Prisma.TransactionClient): Promise<void> {
    const db = client ?? this.prisma;
    await db.auditLog.create({
      data: {
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId ?? null,
        workspaceId: entry.workspaceId ?? null,
        actorId: entry.actorId ?? null,
        metadata: entry.metadata,
      },
    });
  }
}
