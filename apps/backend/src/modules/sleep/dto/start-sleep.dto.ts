import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SleepType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Matches } from 'class-validator';
import { BABY_ID_PATTERN } from '../../../common/utils/baby-id.util';

/**
 * 开始睡眠（创建一条进行中的睡眠记录）
 */
export class StartSleepDto {
  @ApiProperty({ description: '宝宝ID' })
  @IsString()
  @Matches(BABY_ID_PATTERN, { message: '宝宝 ID 必须是 16 位十六进制字符' })
  babyId: string;

  @ApiPropertyOptional({ enum: SleepType, default: SleepType.DAYTIME, description: '睡眠类型（默认白天）' })
  @IsOptional()
  @IsEnum(SleepType)
  sleepType?: SleepType;

  @ApiPropertyOptional({ description: '开始时间（不传则取当前时间）' })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiProperty({ description: '记录人ID' })
  @Type(() => Number)
  @IsInt()
  creatorId: number;
}
