import { BullModule } from '@nestjs/bullmq';
import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from 'joi';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { CommonModule } from './common/common.module';
import { RequestLoggingMiddleware } from './common/middleware/request-logging.middleware';
import { RedisModule } from './infrastructure/redis/redis.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { AuthModule } from './modules/auth/auth.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { AuditModule } from './modules/audit/audit.module';
import { BillingModule } from './modules/billing/billing.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'test', 'production')
          .default('development'),
        PORT: Joi.number().port().default(4000),
        APP_VERSION: Joi.string().default('0.1.0'),
        APP_BASE_URL: Joi.string().uri({ scheme: ['http', 'https'] }).required(),
        JWT_SECRET: Joi.string().min(32).required(),
        AUTH_ACCESS_TTL_SECONDS: Joi.number().integer().min(60).default(300),
        AUTH_REFRESH_TTL_DAYS: Joi.number().integer().min(1).max(90).default(30),
        SMTP_URL: Joi.string().uri({ scheme: ['smtp', 'smtps'] }).when('NODE_ENV', {
          is: 'production',
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
        EMAIL_FROM: Joi.string().min(3).max(254).when('NODE_ENV', {
          is: 'production',
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
        CORS_ORIGIN: Joi.string().required(),
        DATABASE_URL: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).required(),
        REDIS_URL: Joi.string().uri({ scheme: ['redis', 'rediss'] }).required(),
        // Optional: encrypts gateway secrets at rest. When absent the key is derived
        // from JWT_SECRET (see SecretVaultService), so credentials are never plaintext.
        PAYMENT_ENCRYPTION_KEY: Joi.string().min(16).optional(),
      }),
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = new URL(config.getOrThrow<string>('REDIS_URL'));
        const database = redisUrl.pathname.slice(1);
        return {
          connection: {
            host: redisUrl.hostname,
            port: Number(redisUrl.port || 6379),
            username: redisUrl.username ? decodeURIComponent(redisUrl.username) : undefined,
            password: redisUrl.password ? decodeURIComponent(redisUrl.password) : undefined,
            db: database ? Number(database) : 0,
            ...(redisUrl.protocol === 'rediss:' ? { tls: {} } : {}),
          },
        };
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    DatabaseModule,
    RedisModule,
    CommonModule,
    PermissionsModule,
    AuditModule,
    AuthModule,
    BillingModule,
    PaymentsModule,
    WorkspacesModule,
    AdminModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestLoggingMiddleware)
      .forRoutes({ path: '*path', method: RequestMethod.ALL });
  }
}
