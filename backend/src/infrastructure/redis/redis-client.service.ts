import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisClientService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(config: ConfigService) {
    this.client = new Redis(config.getOrThrow<string>('REDIS_URL'), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: (attempt) => (attempt > 3 ? null : Math.min(attempt * 250, 1000)),
      enableOfflineQueue: false,
    });
  }

  async ping(): Promise<void> {
    await this.client.ping();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.status === 'wait') {
      this.client.disconnect();
      return;
    }
    if (this.client.status !== 'end') await this.client.quit();
  }
}
