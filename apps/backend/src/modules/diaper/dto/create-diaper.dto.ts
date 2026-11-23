import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiaperType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Matches } from 'class-validator';
import { BABY_ID_PATTERN } from '../../../common/utils/baby-id.util';

export class CreateDiaperDto {
  @ApiProperty({ description: '宝宝ID' })
  @IsString()
  @Matches(BABY_ID_PATTERN, { message: '宝宝 ID 必须是 16 位十六进制字符' })
  babyId: string;

  @ApiProperty({ enum: DiaperType, example: DiaperType.BOTH, description: '类型' })
  @IsEnum(DiaperType)
  type: DiaperType;

  @ApiProperty({ example: '2026-08-03T08:00:00.000Z', description: '更换时间' })
  @IsDateString()
  changeTime: string;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiProperty({ description: '记录人ID' })
  @Type(() => Number)
  @IsInt()
  creatorId: number;
}
