import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { BABY_ID_PATTERN } from '../../../common/utils/baby-id.util';

export class CreateTemperatureDto {
  @ApiProperty({ description: '宝宝ID' })
  @IsString()
  @Matches(BABY_ID_PATTERN, { message: '宝宝 ID 必须是 16 位十六进制字符' })
  babyId: string;

  @ApiProperty({ example: 36.5, description: '体温(℃)，范围 36.0-41.0' })
  @Type(() => Number)
  @IsNumber()
  @Min(36)
  @Max(41)
  temperature: number;

  @ApiProperty({ example: '2026-08-04T10:30:00.000Z', description: '测量时间' })
  @IsDateString()
  measureTime: string;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiProperty({ description: '记录人ID' })
  @Type(() => Number)
  @IsInt()
  creatorId: number;
}
