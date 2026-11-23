import { UserRole } from '@prisma/client';
import { IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { BABY_ID_PATTERN } from '../../common/utils/baby-id.util';

export class FamilyIdentityDto {
  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @Matches(/\S/)
  @MaxLength(40)
  memberName?: string;
}

export class ApplyDto extends FamilyIdentityDto {
  @IsString()
  @Matches(BABY_ID_PATTERN, { message: '宝宝 ID 必须是 16 位十六进制字符' })
  babyId: string;
}

export class ClaimDto extends ApplyDto {
  @Matches(/^[a-f0-9]{32}$/i)
  code: string;
}
