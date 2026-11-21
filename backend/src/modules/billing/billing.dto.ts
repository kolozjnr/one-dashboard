import { Type } from 'class-transformer';
import { BillingInterval, PaymentStatus, SubscriptionStatus } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, Length, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

export class PageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
}

export class CreateSubscriptionDto {
  @IsString() @MaxLength(80) planKey!: string;
  @IsOptional() @IsEnum(BillingInterval) interval?: BillingInterval;
}

export class ChangePlanDto {
  @IsString() @MaxLength(80) planKey!: string;
}

export class ChangeCycleDto {
  @IsEnum(BillingInterval) interval!: BillingInterval;
}

export class CancelSubscriptionDto {
  @IsOptional() @IsBoolean() atPeriodEnd?: boolean;
}

export class ExtendSubscriptionDto {
  @IsInt() @Min(1) @Max(365) days!: number;
}

export class SuspendSubscriptionDto {
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class AdminCreateSubscriptionDto {
  @IsString() workspaceId!: string;
  @IsString() @MaxLength(80) planKey!: string;
  @IsOptional() @IsEnum(BillingInterval) interval?: BillingInterval;
}

export class ListSubscriptionsDto extends PageQueryDto {
  @IsOptional() @IsEnum(SubscriptionStatus) status?: SubscriptionStatus;
  @IsOptional() @IsString() workspaceId?: string;
}

export class ListPaymentsDto extends PageQueryDto {
  @IsOptional() @IsEnum(PaymentStatus) status?: PaymentStatus;
  @IsOptional() @IsString() workspaceId?: string;
}

export class RecordPaymentDto {
  @IsString() subscriptionId!: string;
  @IsNumber() @Min(0.01) @Max(99_999_999) amount!: number;
  @Length(3, 3) currency!: string;
  @IsIn(['PENDING', 'SUCCEEDED', 'FAILED']) status!: PaymentStatus;
  @IsOptional() @IsString() @MaxLength(40) provider?: string;
  @IsOptional() @IsString() @MaxLength(180) providerReference?: string;
}

export class RefundPaymentDto {
  @IsOptional() @IsNumber() @Min(0.01) @Max(99_999_999) amount?: number;
}

export class PlanFeatureDto {
  @IsString() @MaxLength(100) key!: string;
  @IsString() @MaxLength(180) label!: string;
  @IsOptional() @IsString() @MaxLength(500) value?: string;
}

export class CreatePlanDto {
  @Matches(/^[a-z][a-z0-9-]{1,79}$/) key!: string;
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsNumber() @Min(0) @Max(99_999_999) monthlyAmount!: number;
  @IsOptional() @IsNumber() @Min(0) @Max(99_999_999) annualAmount?: number;
  @Length(3, 3) currency!: string;
  @IsEnum(BillingInterval) interval!: BillingInterval;
  @IsOptional() @IsInt() @Min(0) @Max(3650) trialDays?: number;
  @IsInt() @Min(0) @Max(10_000) seatLimit!: number;
  @IsInt() @Min(0) @Max(100_000) maxConnectedAccounts!: number;
  @IsInt() @Min(0) @Max(100_000) maxWebsites!: number;
  @IsInt() @Min(0) @Max(36_500) analyticsHistoryDays!: number;
  @IsInt() @Min(0) @Max(1_000_000) maxReportsPerMonth!: number;
  @IsInt() @Min(0) @Max(1_000_000) maxAiRequestsPerMonth!: number;
  @IsOptional() @IsInt() @Min(0) @Max(10_000) displayOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PlanFeatureDto) features?: PlanFeatureDto[];
}

export class UpdatePlanDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(99_999_999) monthlyAmount?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(99_999_999) annualAmount?: number;
  @IsOptional() @Length(3, 3) currency?: string;
  @IsOptional() @IsEnum(BillingInterval) interval?: BillingInterval;
  @IsOptional() @IsInt() @Min(0) @Max(3650) trialDays?: number;
  @IsOptional() @IsInt() @Min(0) @Max(10_000) seatLimit?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100_000) maxConnectedAccounts?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100_000) maxWebsites?: number;
  @IsOptional() @IsInt() @Min(0) @Max(36_500) analyticsHistoryDays?: number;
  @IsOptional() @IsInt() @Min(0) @Max(1_000_000) maxReportsPerMonth?: number;
  @IsOptional() @IsInt() @Min(0) @Max(1_000_000) maxAiRequestsPerMonth?: number;
  @IsOptional() @IsInt() @Min(0) @Max(10_000) displayOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PlanFeatureDto) features?: PlanFeatureDto[];
}
