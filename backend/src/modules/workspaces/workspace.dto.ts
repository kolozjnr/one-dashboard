import { IsArray, IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateInvitationDto {
  @IsEmail() email!: string;
  @IsOptional() @IsString() @MaxLength(160) displayName?: string;
  @IsString() roleId!: string;
  @IsOptional() @IsString() @MaxLength(1000) message?: string;
}
export class UpdateWorkspaceDto {
  @IsString() @MinLength(2) @MaxLength(160) name!: string;
}
export class ChangeRoleDto { @IsString() roleId!: string; }
export class AcceptInvitationDto { @IsString() token!: string; }
export class CreateRoleDto { @IsString() @MinLength(2) @MaxLength(100) name!: string; @IsOptional() @IsString() @MaxLength(500) description?: string; @IsArray() @IsString({ each: true }) permissions!: string[]; }
