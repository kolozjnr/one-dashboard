import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AccessTokenGuard } from './access-token.guard';
import { EmailDeliveryService } from './email-delivery.service';
import { UsersController } from './users.controller';
import { PermissionsModule } from '../permissions/permissions.module';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    PermissionsModule,
    AuditModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { issuer: 'metrispot' },
      }),
    }),
  ],
  controllers: [AuthController, UsersController],
  providers: [AuthService, AccessTokenGuard, EmailDeliveryService, { provide: APP_GUARD, useClass: AccessTokenGuard }, { provide: APP_GUARD, useClass: PermissionsGuard }],
  exports: [AuthService, AccessTokenGuard, EmailDeliveryService, JwtModule],
})
export class AuthModule {}
