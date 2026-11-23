import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, Matches } from 'class-validator';
import { BABY_ID_PATTERN } from '../utils/baby-id.util';
import { PaginationDto } from './pagination.dto';

/**
 * 通用记录查询参数：宝宝ID + 时间范围 + 分页
 */
export class RecordQueryDto extends PaginationDto {
  @ApiProperty({ description: '宝宝ID' })
  @IsString()
  @Matches(BABY_ID_PATTERN, { message: '宝宝 ID 必须是 16 位十六进制字符' })
  babyId: string;

  @ApiPropertyOptional({ example: '2026-08-01', description: '开始日期 YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-08-03', description: '结束日期 YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
