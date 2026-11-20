import { UserRole } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, Matches, Max, MaxLength, Min } from 'class-validator';

export class FamilyIdentityDto {
  @IsEnum(UserRole)
  role: UserRole;

  @Matches(/\S/)
  @MaxLength(40)
  memberName: string;
}

export class ApplyDto extends FamilyIdentityDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  babyId: number;
}

export class ClaimDto extends ApplyDto {
  @Matches(/^[a-f0-9]{32}$/i)
  code: string;
}
