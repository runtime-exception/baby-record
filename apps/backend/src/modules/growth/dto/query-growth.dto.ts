import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';
import { BABY_ID_PATTERN } from '../../../common/utils/baby-id.util';
import { RecordQueryDto } from '../../../common/dto/record-query.dto';

export class QueryGrowthDto extends RecordQueryDto {}

/** 趋势查询：宝宝 + 身高/体重指标 */
export class GrowthTrendQueryDto {
  @ApiProperty({ description: '宝宝ID' })
  @IsString()
  @Matches(BABY_ID_PATTERN, { message: '宝宝 ID 必须是 16 位十六进制字符' })
  babyId: string;

  @ApiPropertyOptional({ enum: ['height', 'weight'], default: 'height', description: '指标' })
  @IsOptional()
  @IsIn(['height', 'weight'])
  metric?: 'height' | 'weight' = 'height';
}
