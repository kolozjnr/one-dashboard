import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { RedisClientService } from '../infrastructure/redis/redis-client.service';

type DependencyStatus = 'ok' | 'unavailable';

@Injectable()
export class HealthService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisClientService,
  ) {}

  async getStatus() {
    const [database, redis] = await Promise.all([
      this.check(() => this.prisma.$queryRaw`SELECT 1`),
      this.check(() => this.redis.ping()),
    ]);
    return {
      status: database === 'ok' && redis === 'ok' ? 'ok' : 'degraded',
      version: this.config.getOrThrow<string>('APP_VERSION'),
      dependencies: { database, redis },
    };
  }

  private async check(operation: () => Promise<unknown>): Promise<DependencyStatus> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Health check timed out')), 1500);
    });
    try {
      await Promise.race([operation(), timeout]);
      return 'ok';
    } catch {
      return 'unavailable';
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
