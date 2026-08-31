import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional } from 'class-validator';
import { RecordQueryDto } from '../../../common/dto/record-query.dto';

export class QueryGrowthDto extends RecordQueryDto {}

/** 趋势查询：宝宝 + 身高/体重指标 */
export class GrowthTrendQueryDto {
  @ApiProperty({ description: '宝宝ID' })
  @Type(() => Number)
  @IsInt()
  babyId: number;

  @ApiPropertyOptional({ enum: ['height', 'weight'], default: 'height', description: '指标' })
  @IsOptional()
  @IsIn(['height', 'weight'])
  metric?: 'height' | 'weight' = 'height';
}