import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SleepType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

/**
 * 完整创建睡眠记录（可录入一段已结束的睡眠）
 */
export class CreateSleepDto {
  @ApiProperty({ description: '宝宝ID' })
  @Type(() => Number)
  @IsInt()
  babyId: number;

  @ApiPropertyOptional({ enum: SleepType, example: SleepType.NIGHT, description: '睡眠类型（不传时按开始时间自动判断）' })
  @IsOptional()
  @IsEnum(SleepType)
  sleepType?: SleepType;

  @ApiProperty({ example: '2026-08-03T22:00:00.000Z', description: '开始时间' })
  @IsDateString()
  startTime: string;

  @ApiPropertyOptional({ example: '2026-08-04T06:00:00.000Z', description: '结束时间（不传=进行中）' })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiProperty({ description: '记录人ID' })
  @Type(() => Number)
  @IsInt()
  creatorId: number;
}
