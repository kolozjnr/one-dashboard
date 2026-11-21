import { Transform, Type } from 'class-transformer';
import { PaymentStatus } from '@prisma/client';
import { Equals, IsBoolean, IsEnum, IsNumber, IsObject, IsOptional, IsString, Length, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { PageQueryDto } from '../billing/billing.dto';

export class InitializePaymentDto {
  /** Selects which subscription the payment settles; defaults to the workspace's latest one. */
  @IsOptional() @IsString() subscriptionId?: string;
  /** Selects an active gateway; required when more than one gateway is active. */
  @IsOptional() @IsString() @MaxLength(40) gateway?: string;
}

export class PaymentHistoryQueryDto extends PageQueryDto {
  @IsOptional() @IsEnum(PaymentStatus) status?: PaymentStatus;
}

export class PaymentDetailsQueryDto {
  @IsOptional() @Transform(({ value }) => value === true || value === 'true' || value === 1 || value === '1') @IsBoolean() refresh?: boolean;
}

export class ManualPaymentEvidenceDto {
  @IsNumber() @Min(0.01) @Max(99_999_999) amount!: number;
  @Length(3, 3) currency!: string;
  /** How the money arrived (bank transfer, wire, cash deposit, ...). */
  @IsString() @MinLength(3) @MaxLength(60) method!: string;
  /** The payer's own reference (bank transfer reference, receipt number, ...). */
  @IsOptional() @IsString() @MaxLength(120) reference?: string;
  @IsOptional() @IsString() @MinLength(3) @MaxLength(500) notes?: string;
}

/**
 * Manual activation of a pending subscription. `confirm` must be true and `reason` is
 * stored with the administrator's identity in the audit log, so every manual
 * activation is attributable and reviewable afterwards.
 */
export class ActivateSubscriptionDto {
  @IsOptional() @IsString() paymentReference?: string;
  @IsOptional() @ValidateNested() @Type(() => ManualPaymentEvidenceDto) evidence?: ManualPaymentEvidenceDto;
  @IsString() @MinLength(10) @MaxLength(500) reason!: string;
  @Equals(true, { message: 'Confirmation is required for a manual activation' }) confirm!: boolean;
}

export class ConfigureGatewayDto {
  @IsOptional() @IsObject() credentials: Record<string, string> = {};
  @IsOptional() @IsObject() config: Record<string, string> = {};
  /** Defaults to true; set false to store values without activating the gateway. */
  @IsOptional() @IsBoolean() activate?: boolean;
}

export class RefundPaymentDto {
  @IsOptional() @IsNumber() @Min(0.01) @Max(99_999_999) amount?: number;
  @IsOptional() @IsString() @MinLength(3) @MaxLength(300) reason?: string;
}
