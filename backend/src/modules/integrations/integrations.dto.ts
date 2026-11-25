import { IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { SOCIAL_PRODUCTS, type SocialProduct } from './integrations.types';

export class AuthorizeDto {
  @IsIn(SOCIAL_PRODUCTS as unknown as SocialProduct[])
  product!: SocialProduct;
}

export class InsightsQueryDto {
  @IsOptional() @IsDateString() since?: string;
  @IsOptional() @IsDateString() until?: string;
  /** Optional comma-separated subset of metric keys; unknown keys are ignored. */
  @IsOptional() @IsString() @MaxLength(500) metrics?: string;
}
