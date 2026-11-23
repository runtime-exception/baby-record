import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { BABY_ID_PATTERN } from '../../../common/utils/baby-id.util';

export class CreateSupplementDto {
  @ApiProperty({ description: '宝宝ID' })
  @IsString()
  @Matches(BABY_ID_PATTERN, { message: '宝宝 ID 必须是 16 位十六进制字符' })
  babyId: string;

  @ApiProperty({ example: '维生素D', description: '补剂名称（维生素D/DHA/钙/其他）' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: '1', description: '剂量' })
  @IsOptional()
  @IsString()
  amount?: string;

  @ApiPropertyOptional({ example: '滴', description: '单位（滴/粒/ml）' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiProperty({ example: '2026-08-03T09:00:00.000Z', description: '服用时间' })
  @IsDateString()
  takeTime: string;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiProperty({ description: '记录人ID' })
  @Type(() => Number)
  @IsInt()
  creatorId: number;
}
