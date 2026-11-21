import { Type } from 'class-transformer';
import { SupportPriority, SupportTicketStatus, SubscriptionStatus, UserStatus } from '@prisma/client';
import { IsArray, IsBoolean, IsDefined, IsEnum, IsObject, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { PageQueryDto } from '../billing/billing.dto';

export class ListUsersDto extends PageQueryDto {
  @IsOptional() @IsString() @MaxLength(120) q?: string;
  @IsOptional() @IsEnum(UserStatus) status?: UserStatus;
}

export class UpdateUserDto {
  @IsOptional() @IsEnum(UserStatus) status?: UserStatus;
  @IsOptional() @IsBoolean() emailVerified?: boolean;
}

export class GrantRoleDto {
  @IsString() @MaxLength(80) roleKey!: string;
}

export class ListSubscribersDto extends PageQueryDto {
  @IsOptional() @IsString() @MaxLength(120) q?: string;
  @IsOptional() @IsString() @MaxLength(80) planKey?: string;
  @IsOptional() @IsEnum(SubscriptionStatus) status?: SubscriptionStatus;
}

export class UpdateSubscriberDto {
  @IsString() @MinLength(2) @MaxLength(160) name!: string;
}

export class CreateProviderDto {
  @IsString() @MaxLength(80) key!: string;
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsString() @MaxLength(80) category!: string;
  @IsOptional() @IsBoolean() isEnabled?: boolean;
  @IsOptional() @IsObject() config?: Record<string, unknown>;
}

export class UpdateProviderDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(80) category?: string;
  @IsOptional() @IsBoolean() isEnabled?: boolean;
  @IsOptional() @IsObject() config?: Record<string, unknown>;
}

export class SetSettingDto {
  @IsString() @MaxLength(120) key!: string;
  @IsDefined() value!: unknown;
}

export class SaveSettingsDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => SetSettingDto) settings!: SetSettingDto[];
}

export class ListTicketsDto extends PageQueryDto {
  @IsOptional() @IsEnum(SupportTicketStatus) status?: SupportTicketStatus;
  @IsOptional() @IsEnum(SupportPriority) priority?: SupportPriority;
  @IsOptional() @IsString() workspaceId?: string;
}

export class UpdateTicketDto {
  @IsOptional() @IsEnum(SupportTicketStatus) status?: SupportTicketStatus;
  @IsOptional() @IsEnum(SupportPriority) priority?: SupportPriority;
}

export class ReplyTicketDto {
  @IsString() @MinLength(1) @MaxLength(4000) body!: string;
}
