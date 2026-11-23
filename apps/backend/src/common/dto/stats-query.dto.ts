import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString, Matches } from 'class-validator';
import { BABY_ID_PATTERN } from '../utils/baby-id.util';

/**
 * 统计/图表通用查询参数：宝宝ID + 时间范围
 */
export class StatsQueryDto {
  @ApiProperty({ description: '宝宝ID' })
  @IsString()
  @Matches(BABY_ID_PATTERN, { message: '宝宝 ID 必须是 16 位十六进制字符' })
  babyId: string;

  @ApiPropertyOptional({ enum: ['today', '7d', '30d', 'custom'], default: 'today', description: '时间范围' })
  @IsOptional()
  @IsIn(['today', '7d', '30d', 'custom'])
  range?: string = 'today';

  @ApiPropertyOptional({ description: '开始日期（range=custom 时必填）YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期（range=custom 时必填）YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
